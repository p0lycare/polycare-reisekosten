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
  return art === "auslagen" ? ["G"] : ["A", "C", "E", "F"];
}
