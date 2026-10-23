"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { eingangPfad } from "@/lib/belegpfad";
import { liesGespeichertenBeleg } from "@/lib/ki/auslesen-server";
import type { AusgelesenerBeleg } from "@/lib/ki/beleg-auslesen";
import { pruefePositionen } from "@/lib/reisekosten/beleg-pruefung";
import { istBearbeitbar } from "@/lib/reisekosten/reise";

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

  const [{ data: eintrag }, { data: reise }] = await Promise.all([
    supabase.from("beleg_eingang").select("*").eq("id", eingangId).maybeSingle(),
    supabase.from("reise").select("id, mitarbeiter_id, status").eq("id", reiseId).maybeSingle(),
  ]);
  if (!eintrag) return { fehler: "Beleg nicht gefunden." };
  if (!reise || reise.mitarbeiter_id !== user.id || !istBearbeitbar(reise.status)) {
    return { fehler: "Die Reise kann nicht mehr bearbeitet werden." };
  }

  const e = eintrag.ki_ergebnis as AusgelesenerBeleg | null;
  if (!e?.istBeleg || !e.positionen.length || !e.datum) {
    return { fehler: "Der Beleg wurde nicht vollständig erkannt – bitte von Hand erfassen." };
  }
  if (e.waehrung !== "EUR") return { fehler: "Der Beleg ist nicht in Euro – bitte von Hand erfassen." };

  const fehler = await pruefePositionen(
    supabase,
    e.positionen.map((p) => ({ ...p, bewirtungAnlass: null, bewirtungTeilnehmer: null })),
    false,
  );
  if (fehler) {
    return { fehler: fehler.startsWith("Bei Bewirtungen") ? "Bewirtungen bitte von Hand mit Anlass und Teilnehmenden erfassen." : fehler };
  }

  const { error } = await supabase.from("beleg").insert(
    e.positionen.map((p) => ({
      reise_id: reiseId,
      kategorie_id: p.kategorieId,
      datum: e.datum!,
      beschreibung: p.beschreibung || e.haendler || null,
      betrag_cent: p.betragCent,
      mwst_prozent: p.mwstProzent,
      datei_pfad: eintrag.datei_pfad,
    })),
  );
  if (error) return { fehler: "Zuordnen fehlgeschlagen. Ist die Reise noch bearbeitbar?" };

  await supabase.from("beleg_eingang").delete().eq("id", eingangId);
  revalidatePath("/belege");
  revalidatePath(`/reisen/${reiseId}`);
  return { ok: true };
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
