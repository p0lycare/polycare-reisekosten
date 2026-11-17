import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { monatsgrenzen, monatsname } from "./monat";
import { istBearbeitbar } from "./reise";
import { monatsnameIn, texte } from "@/lib/i18n/woerterbuch";
import type { Sprache } from "@/lib/i18n/sprache";

/**
 * Eine Auslagenabrechnung umfasst genau einen Kalendermonat (wie das Formblatt FB 21):
 * vom Ersten 00:00 bis zum Letzten 23:59.
 */
export function auslagenZeitraum(monat: string): { beginn: string; ende: string; begruendung: string } | null {
  const grenzen = monatsgrenzen(monat);
  if (!grenzen) return null;
  const [jahr, mon] = monat.split("-").map(Number);
  const letzter = new Date(Date.UTC(jahr, mon, 0)).getUTCDate();
  return {
    beginn: `${grenzen.von}T00:00:00`,
    ende: `${monat}-${String(letzter).padStart(2, "0")}T23:59:00`,
    begruendung: `Auslagen ${monatsname(monat)}`,
  };
}

/**
 * Eine Auslagenabrechnung ohne Belege ist nur ein angefangener Platzhalter (z. B. Formular abgebrochen):
 * Sie wird weder zum Einreichen vorgeschlagen noch angemahnt – einreichen ließe sie sich ohnehin nicht.
 */
export function istLeereAuslage(r: { art: "reise" | "auslagen"; anzahlBelege: number }): boolean {
  return r.art === "auslagen" && r.anzahlBelege === 0;
}

export type AuslagenErgebnis = { id: string } | { fehler: string };

/**
 * Liefert die eigene Auslagenabrechnung des Monats und legt sie bei Bedarf an.
 * Ist sie schon eingereicht, können keine Belege mehr dazukommen.
 */
export async function auslagenAbrechnungHolen(
  supabase: SupabaseClient<Database>,
  userId: string,
  monat: string,
  sprache: Sprache = "de",
): Promise<AuslagenErgebnis> {
  const t = texte(sprache).hinweise.auslagen;
  const zeitraum = auslagenZeitraum(monat);
  if (!zeitraum) return { fehler: t.ungueltigerMonat };

  const suchen = () =>
    supabase
      .from("reise")
      .select("id, status")
      .eq("mitarbeiter_id", userId)
      .eq("art", "auslagen")
      .eq("beginn", zeitraum.beginn)
      .maybeSingle();

  let { data: vorhanden } = await suchen();
  if (!vorhanden) {
    const { error } = await supabase.from("reise").insert({
      mitarbeiter_id: userId,
      art: "auslagen",
      begruendung: zeitraum.begruendung,
      reiseweg: "",
      beginn: zeitraum.beginn,
      ende: zeitraum.ende,
      mit_uebernachtung: false,
    });
    // Bei gleichzeitigem Anlegen greift der eindeutige Index – dann die andere Zeile nehmen
    if (error && error.code !== "23505") return { fehler: t.nichtAngelegt };
    ({ data: vorhanden } = await suchen());
  }
  if (!vorhanden) return { fehler: t.nichtAngelegt };
  if (!istBearbeitbar(vorhanden.status)) {
    return { fehler: t.schonEingereicht(monatsnameIn(monat, sprache)) };
  }
  return { id: vorhanden.id };
}
