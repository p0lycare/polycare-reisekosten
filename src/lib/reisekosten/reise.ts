import type { Database } from "@/lib/supabase/database.types";
import { berechneVerpflegung, type Mahlzeiten, type VerpflegungErgebnis } from "./verpflegung";

export type Reise = Database["public"]["Tables"]["reise"]["Row"];
export type ReiseStatus = Database["public"]["Enums"]["reise_status"];

export const STATUS_TEXT: Record<ReiseStatus, string> = {
  entwurf: "Entwurf",
  eingereicht: "Eingereicht",
  freigegeben: "Freigegeben",
  abgelehnt: "Abgelehnt",
  ausgezahlt: "Ausgezahlt",
};

export function istBearbeitbar(status: ReiseStatus): boolean {
  return status === "entwurf" || status === "abgelehnt";
}

/** Verpflegungspauschale einer gespeicherten Reise; null, falls nicht berechenbar. */
export function verpflegungFuer(reise: Reise): VerpflegungErgebnis | null {
  try {
    return berechneVerpflegung({
      beginn: reise.beginn.slice(0, 16),
      ende: reise.ende.slice(0, 16),
      land: reise.land,
      mitUebernachtung: reise.mit_uebernachtung,
      mahlzeiten: (reise.mahlzeiten ?? {}) as Record<string, Mahlzeiten>,
    });
  } catch {
    return null;
  }
}
