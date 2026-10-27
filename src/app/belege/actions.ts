"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { eingangPfad } from "@/lib/belegpfad";
import { liesGespeichertenBeleg } from "@/lib/ki/auslesen-server";
import type { AusgelesenerBeleg } from "@/lib/ki/beleg-auslesen";
import { ladePflichtangaben, positionenFuerArt, pruefePositionen } from "@/lib/reisekosten/beleg-pruefung";
import { angabenSpalten, vorbelegung } from "@/lib/reisekosten/pflichtangaben";
import { istBearbeitbar } from "@/lib/reisekosten/reise";
import { auslagenAbrechnungHolen } from "@/lib/reisekosten/auslagen";
import { aktuellerMonatBerlin } from "@/lib/reisekosten/monat";

export type EingangStatus = { fehler?: string; ok?: boolean };

/** Legt ein hochgeladenes Foto im Belegeingang an und liest es (wenn möglich) per KI aus. */
export async function eingangAnlegen(pfad: string): Promise<EingangStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !eingangPfad(pfad, user.id)) return { fehler: "Ungültige Datei." };

  const { data: zeile, error } = await supabase.from("beleg_eingang").insert({ datei_pfad: pfad }).select("id").single();
  if (error || !zeile) return { fehler: "Der Beleg konnte nicht gespeichert werden." };

  const { ergebnis, fehler } = await liesGespeichertenBeleg(supabase, pfad);
  await supabase
    .from("beleg_eingang")
    .update({ ki_ergebnis: ergebnis ?? null, ki_fehler: fehler ?? null })
    .eq("id", zeile.id);

  revalidatePath("/belege");
  return { ok: true };
}

/**
 * Ordnet einen Beleg aus dem Eingang einer eigenen, bearbeitbaren Reise zu: Jede ausgelesene Position
 * wird ein Beleg mit demselben Foto. Bewirtungen und unklare Belege werden von Hand erfasst.
 */
export async function eingangZuordnen(eingangId: string, reiseId: string): Promise<EingangStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { fehler: "Bitte neu anmelden." };

  const [{ data: eintrag }, { data: reise }, { data: profil }] = await Promise.all([
    supabase.from("beleg_eingang").select("*").eq("id", eingangId).maybeSingle(),
    supabase.from("reise").select("id, mitarbeiter_id, status, art, begruendung, reiseweg, kfz_kennzeichen, verkehrsmittel").eq("id", reiseId).maybeSingle(),
    supabase.from("profile").select("name").eq("id", user.id).maybeSingle(),
  ]);
  if (!eintrag) return { fehler: "Beleg nicht gefunden." };
  if (!reise || reise.mitarbeiter_id !== user.id || !istBearbeitbar(reise.status)) {
    return { fehler: "Die Reise kann nicht mehr bearbeitet werden." };
  }
  // Auslagen brauchen Zweck und Lieferant – die gibt es nur im Formular
  if (reise.art === "auslagen") return { fehler: "Auslagen bitte über „Als Auslage erfassen“ mit Zweck erfassen." };

  const e = eintrag.ki_ergebnis as AusgelesenerBeleg | null;
  if (!e?.istBeleg || !e.positionen.length || !e.datum) {
    return { fehler: "Der Beleg wurde nicht vollständig erkannt – bitte von Hand erfassen." };
  }
  if (e.waehrung !== "EUR") return { fehler: "Der Beleg ist nicht in Euro – bitte von Hand erfassen." };

  const passend = await positionenFuerArt(supabase, e.positionen, reise.art);
  if ("fehler" in passend) return passend;
  // Pflichtangaben aus der Reise: wer reist, warum, mit welchem Auto – was fehlt (z. B. Kennzeichen
  // des Mietwagens), wird von Hand ergänzt
  const angaben = vorbelegung(reise, profil?.name ?? "");
  const pflicht = await ladePflichtangaben(supabase, passend.positionen.map((p) => p.kategorieId));
  const fehler = await pruefePositionen(
    supabase,
    passend.positionen.map((p) => ({ ...p, bewirtungAnlass: null, bewirtungTeilnehmer: null, angaben })),
    false,
    reise.art,
  );
  if (fehler) {
    if (fehler.startsWith("Bei Bewirtungen")) return { fehler: "Bewirtungen bitte von Hand mit Anlass und Teilnehmenden erfassen." };
    if (fehler.startsWith("Bitte angeben")) return { fehler: `${fehler} Bitte „Von Hand erfassen“.` };
    return { fehler };
  }

  const { error } = await supabase.from("beleg").insert(
    passend.positionen.map((p) => ({
      reise_id: reiseId,
      kategorie_id: p.kategorieId,
      datum: e.datum!,
      beschreibung: p.beschreibung || e.haendler || null,
      betrag_cent: p.betragCent,
      mwst_prozent: p.mwstProzent,
      datei_pfad: eintrag.datei_pfad,
      ...angabenSpalten(pflicht.get(p.kategorieId) ?? [], angaben),
    })),
  );
  if (error) return { fehler: "Zuordnen fehlgeschlagen. Ist die Reise noch bearbeitbar?" };

  await supabase.from("beleg_eingang").delete().eq("id", eingangId);
  revalidatePath("/belege");
  revalidatePath(`/reisen/${reiseId}`);
  return { ok: true };
}

/**
 * Beleg als Auslage (ohne Reise) erfassen: in die Auslagenabrechnung des Belegmonats – ist die schon
 * eingereicht, in die des laufenden Monats. Zweck und Lieferant ergänzt die Person im Formular.
 */
export async function eingangAlsAuslage(eingangId: string): Promise<EingangStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { fehler: "Bitte neu anmelden." };

  const { data: eintrag } = await supabase.from("beleg_eingang").select("id, ki_ergebnis").eq("id", eingangId).maybeSingle();
  if (!eintrag) return { fehler: "Beleg nicht gefunden." };

  const datum = (eintrag.ki_ergebnis as AusgelesenerBeleg | null)?.datum;
  const aktuell = aktuellerMonatBerlin();
  const belegMonat = datum && datum.slice(0, 7) <= aktuell ? datum.slice(0, 7) : aktuell;
  let ergebnis = await auslagenAbrechnungHolen(supabase, user.id, belegMonat);
  if ("fehler" in ergebnis && belegMonat !== aktuell) ergebnis = await auslagenAbrechnungHolen(supabase, user.id, aktuell);
  if ("fehler" in ergebnis) return { fehler: ergebnis.fehler };

  revalidatePath("/auslagen");
  redirect(`/reisen/${ergebnis.id}/belege/neu?eingang=${eingangId}`);
}

export async function eingangLoeschen(eingangId: string): Promise<EingangStatus> {
  const supabase = await createClient();
  const { data } = await supabase.from("beleg_eingang").delete().eq("id", eingangId).select("datei_pfad");
  const pfad = data?.[0]?.datei_pfad;
  if (pfad) {
    // Foto nur löschen, wenn kein Beleg es nutzt (die Speicherregel prüft das ebenfalls)
    const { count } = await supabase.from("beleg").select("id", { count: "exact", head: true }).eq("datei_pfad", pfad);
    if (!count) await supabase.storage.from("belege").remove([pfad]);
  }
  revalidatePath("/belege");
  return { ok: true };
}

/** Liest einen Eingangsbeleg erneut aus, z. B. nachdem das Kontingent wieder frei ist. */
export async function eingangNeuAuslesen(eingangId: string): Promise<EingangStatus> {
  const supabase = await createClient();
  const { data: eintrag } = await supabase.from("beleg_eingang").select("id, datei_pfad").eq("id", eingangId).maybeSingle();
  if (!eintrag) return { fehler: "Beleg nicht gefunden." };
  const { ergebnis, fehler } = await liesGespeichertenBeleg(supabase, eintrag.datei_pfad);
  await supabase.from("beleg_eingang").update({ ki_ergebnis: ergebnis ?? null, ki_fehler: fehler ?? null }).eq("id", eingangId);
  revalidatePath("/belege");
  return fehler ? { fehler } : { ok: true };
}
