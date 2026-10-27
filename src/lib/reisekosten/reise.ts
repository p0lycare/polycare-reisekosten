import type { Database } from "@/lib/supabase/database.types";
import { berechneVerpflegung, type Mahlzeiten, type VerpflegungErgebnis } from "./verpflegung";

export type Reise = Database["public"]["Tables"]["reise"]["Row"];
export type ReiseStatus = Database["public"]["Enums"]["reise_status"];
export type Verkehrsmittel = Database["public"]["Enums"]["verkehrsmittel"];

/** Reihenfolge und Beschriftung wie im Formblatt FB 06 */
export const VERKEHRSMITTEL_TEXT: Record<Verkehrsmittel, string> = {
  flugzeug: "Flugzeug",
  eisenbahn: "Eisenbahn",
  firmenwagen: "Firmenwagen",
  eigener_pkw: "Eigener PKW",
  mitfahrt: "Mitfahrt",
  mietwagen: "Mietwagen",
};

export const VERKEHRSMITTEL = Object.keys(VERKEHRSMITTEL_TEXT) as Verkehrsmittel[];

export const STATUS_TEXT: Record<ReiseStatus, string> = {
  entwurf: "Entwurf",
  eingereicht: "Eingereicht",
  freigegeben: "Genehmigt",
  geprueft: "Geprüft",
  abgelehnt: "Abgelehnt",
  ausgezahlt: "Ausgezahlt",
};

export function istBearbeitbar(status: ReiseStatus): boolean {
  return status === "entwurf" || status === "abgelehnt";
}

/**
 * Verpflegungspauschale einer gespeicherten Reise; null, falls nicht berechenbar. Nach dem Einreichen gilt
 * der festgeschriebene Stand – spätere Änderungen an den Pauschalentabellen ändern genehmigte Beträge nicht.
 */
export function verpflegungFuer(reise: Reise): VerpflegungErgebnis | null {
  // Auslagenabrechnungen haben keine Verpflegungspauschale
  if (reise.art === "auslagen") return null;
  if (!istBearbeitbar(reise.status) && reise.verpflegung_fest) return reise.verpflegung_fest as unknown as VerpflegungErgebnis;
  return verpflegungBerechnen(reise);
}

/** Pauschale nach den aktuellen Tabellen berechnen (zum Anzeigen von Entwürfen und zum Festschreiben) */
export function verpflegungBerechnen(reise: Reise): VerpflegungErgebnis | null {
  if (reise.art === "auslagen") return null;
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
