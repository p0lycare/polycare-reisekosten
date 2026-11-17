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
import { ladeSprache, ladeTexte } from "@/lib/i18n/server";

/** Meldungen der Aktionen in der Sprache der Person */
async function meldungen() {
  return (await ladeTexte()).belege.aktion;
}

export type EingangStatus = { fehler?: string; ok?: boolean };

/** Legt ein hochgeladenes Foto im Belegeingang an und liest es (wenn möglich) per KI aus. */
export async function eingangAnlegen(pfad: string): Promise<EingangStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Bestandsformate zulassen: offline vorgemerkte Fotos können noch aus der Zeit vor der Formatumstellung stammen
  if (!user || !eingangPfad(pfad, user.id, true)) return { fehler: (await meldungen()).ungueltigeDatei };

  const { data: zeile, error } = await supabase.from("beleg_eingang").insert({ datei_pfad: pfad }).select("id").single();
  if (error || !zeile) return { fehler: (await meldungen()).nichtGespeichert };

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
  if (!user) return { fehler: (await meldungen()).neuAnmelden };

  const [{ data: eintrag }, { data: reise }, { data: profil }] = await Promise.all([
    supabase.from("beleg_eingang").select("*").eq("id", eingangId).maybeSingle(),
    supabase.from("reise").select("id, mitarbeiter_id, status, art, begruendung, reiseweg, kfz_kennzeichen, verkehrsmittel").eq("id", reiseId).maybeSingle(),
    supabase.from("profile").select("name").eq("id", user.id).maybeSingle(),
  ]);
  if (!eintrag) return { fehler: (await meldungen()).nichtGefunden };
  if (!reise || reise.mitarbeiter_id !== user.id || !istBearbeitbar(reise.status)) {
    return { fehler: (await meldungen()).reiseGesperrt };
  }
  // Auslagen brauchen Zweck und Lieferant – die gibt es nur im Formular
  if (reise.art === "auslagen") return { fehler: (await meldungen()).auslagenUeberFormular };

  const e = eintrag.ki_ergebnis as AusgelesenerBeleg | null;
  if (!e?.istBeleg || !e.positionen.length || !e.datum) {
    return { fehler: (await meldungen()).nichtErkannt };
  }
  if (e.waehrung !== "EUR") return { fehler: (await meldungen()).nichtEuro };

  const passend = await positionenFuerArt(supabase, e.positionen, reise.art, await ladeSprache());
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
    await ladeSprache(),
  );
  if (fehler) {
    // Meldungen der Belegprüfung erkennen (in der Sprache der Person) und um den Weg „von Hand“ ergänzen
    const pruefung = (await ladeTexte()).hinweise.beleg;
    if (fehler === pruefung.bewirtung) return { fehler: (await meldungen()).bewirtungVonHand };
    if (fehler.startsWith(pruefung.angeben("").slice(0, -1))) return { fehler: (await meldungen()).vonHandErfassen(fehler) };
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
  if (error) return { fehler: (await meldungen()).zuordnenFehlgeschlagen };

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
  if (!user) return { fehler: (await meldungen()).neuAnmelden };

  const { data: eintrag } = await supabase.from("beleg_eingang").select("id, ki_ergebnis").eq("id", eingangId).maybeSingle();
  if (!eintrag) return { fehler: (await meldungen()).nichtGefunden };

  const datum = (eintrag.ki_ergebnis as AusgelesenerBeleg | null)?.datum;
  const aktuell = aktuellerMonatBerlin();
  const belegMonat = datum && datum.slice(0, 7) <= aktuell ? datum.slice(0, 7) : aktuell;
  let ergebnis = await auslagenAbrechnungHolen(supabase, user.id, belegMonat, await ladeSprache());
  if ("fehler" in ergebnis && belegMonat !== aktuell) ergebnis = await auslagenAbrechnungHolen(supabase, user.id, aktuell, await ladeSprache());
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
  if (!eintrag) return { fehler: (await meldungen()).nichtGefunden };
  const { ergebnis, fehler } = await liesGespeichertenBeleg(supabase, eintrag.datei_pfad);
  await supabase.from("beleg_eingang").update({ ki_ergebnis: ergebnis ?? null, ki_fehler: fehler ?? null }).eq("id", eingangId);
  revalidatePath("/belege");
  return fehler ? { fehler } : { ok: true };
}
