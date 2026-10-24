import { AUSLAND_2026 } from "./ausland-2026";

/**
 * Verpflegungspauschalen je Land in Cent.
 *
 * - `voll`:  Abwesenheit von 24 Stunden (Zwischentage einer mehrtägigen Reise)
 * - `klein`: An-/Abreisetag bzw. eintägige Reise mit mehr als 8 Stunden Abwesenheit
 *
 * Inland: § 9 Abs. 4a Satz 3 EStG.
 * Ausland: jährliches BMF-Schreiben zu den Auslandsreisekosten, je Jahr eine eigene Tabelle.
 */
export type Pauschale = {
  voll: number;
  klein: number;
};

/** Auslandspauschale mit Anzeigename und Übernachtungspauschale (Erstattung ohne Einzelnachweis) */
export type Auslandspauschale = Pauschale & { name: string; uebernachtung: number };

export const INLAND: Pauschale = { voll: 2800, klein: 1400 };

/** Gültige BMF-Tabellen, ab Jahr; neue Jahre oben ergänzen */
const AUSLAND: { abJahr: number; laender: Record<string, Auslandspauschale> }[] = [{ abJahr: 2026, laender: AUSLAND_2026 }];

function auslandFuer(jahr: number): Record<string, Auslandspauschale> {
  return (AUSLAND.find((t) => t.abJahr <= jahr) ?? AUSLAND[AUSLAND.length - 1]).laender;
}

/** Pauschale für Land (z. B. "DE", "FR", "US:New York City") im Jahr des Reisetags */
export function pauschaleFuer(land: string, jahr: number = new Date().getFullYear()): Pauschale {
  if (land === "DE") return INLAND;
  const p = auslandFuer(jahr)[land];
  if (!p) {
    throw new Error(`Keine Verpflegungspauschale für Land "${land}" hinterlegt`);
  }
  return p;
}

export function istAusland(land: string): boolean {
  return land !== "DE";
}

export function landName(land: string, jahr: number = new Date().getFullYear()): string {
  return land === "DE" ? "Deutschland" : (auslandFuer(jahr)[land]?.name ?? land);
}

/** Auswahlliste: Deutschland zuerst, dann alle Länder und Städte alphabetisch */
export function laenderAuswahl(jahr: number = new Date().getFullYear()): { code: string; name: string }[] {
  const ausland = Object.entries(auslandFuer(jahr))
    .map(([code, p]) => ({ code, name: p.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
  return [{ code: "DE", name: "Deutschland" }, ...ausland];
}
