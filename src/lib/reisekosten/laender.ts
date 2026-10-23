/**
 * Verpflegungspauschalen je Land in Cent.
 *
 * - `voll`:  Abwesenheit von 24 Stunden (Zwischentage einer mehrtägigen Reise)
 * - `klein`: An-/Abreisetag bzw. eintägige Reise mit mehr als 8 Stunden Abwesenheit
 *
 * Inland: § 9 Abs. 4a Satz 3 EStG.
 * Ausland: jährliches BMF-Schreiben zu den Auslandsreisekosten. Die Tabelle ist
 * absichtlich noch leer und muss aus dem aktuell gültigen BMF-Schreiben befüllt
 * werden – keine Werte aus dem Gedächtnis eintragen.
 */
export type Pauschale = {
  voll: number;
  klein: number;
};

export const INLAND: Pauschale = { voll: 2800, klein: 1400 };

export const LAENDER: Record<string, Pauschale> = {
  DE: INLAND,
  // TODO: Auslandspauschalen aus dem BMF-Schreiben (ISO-3166-Alpha-2 → Pauschale)
};

export function pauschaleFuer(land: string): Pauschale {
  const p = LAENDER[land.toUpperCase()];
  if (!p) {
    throw new Error(`Keine Verpflegungspauschale für Land "${land}" hinterlegt`);
  }
  return p;
}
