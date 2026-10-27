import type { Database } from "@/lib/supabase/database.types";

export type Kategorie = Database["public"]["Tables"]["kategorie"]["Row"];
export type Abschnitt = "A" | "B" | "C" | "D" | "E" | "F" | "G";

/** Abschnitte des Formblatts FB 06 */
export const ABSCHNITT_TEXT: Record<Abschnitt, string> = {
  A: "Fahrtkosten",
  B: "Verpflegungskosten pauschal",
  C: "Übernachtungskosten",
  D: "Abzüglich Verpflegungspauschale",
  E: "Bewirtung (mit Fremden)",
  F: "Sonstige Ausgaben",
  G: "Auslagen (ohne Reise)",
};

export const ERFASSBARE_ABSCHNITTE: Abschnitt[] = ["A", "C", "E", "F", "G"];

/** Welche Abschnitte bei welcher Art von Abrechnung erfasst werden */
export function abschnitteFuer(art: "reise" | "auslagen"): Abschnitt[] {
  // Bewirtungen gibt es auch ohne Reise (z. B. Geschäftsessen am eigenen Standort)
  return art === "auslagen" ? ["E", "G"] : ["A", "C", "E", "F"];
}

/** Gleichwertige Kategorien in Reisekosten (F) und Auslagen (G); Porto je nach Steuersatz */
const GEGENSTUECK: Record<string, (mwst: number) => string> = {
  aus_buero: () => "buerobedarf",
  aus_porto: (mwst) => (mwst > 0 ? "telefon_porto" : "telefon_porto_ohne"),
  buerobedarf: () => "aus_buero",
  telefon_porto: () => "aus_porto",
  telefon_porto_ohne: () => "aus_porto",
};

/**
 * Die KI kennt alle Kategorien und weiß nicht, ob ein Beleg zu einer Reise oder zu den Auslagen kommt.
 * Liefert die Kategorie, die zur Art der Abrechnung passt – das Gegenstück, falls es eines gibt, sonst null
 * (dann wird die Kategorie von Hand gewählt).
 */
export function passendeKategorie(
  position: { kategorieId: string; mwstProzent: number },
  art: "reise" | "auslagen",
  kategorien: { id: string; abschnitt: string }[],
): string | null {
  const erlaubt = (id: string) => kategorien.some((k) => k.id === id && abschnitteFuer(art).includes(k.abschnitt as Abschnitt));
  if (erlaubt(position.kategorieId)) return position.kategorieId;
  const ersatz = GEGENSTUECK[position.kategorieId]?.(position.mwstProzent);
  return ersatz && erlaubt(ersatz) ? ersatz : null;
}
