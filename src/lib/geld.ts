/**
 * Liest einen Eurobetrag in deutscher oder englischer Schreibweise ("12,50", "1.234,56", "12.5")
 * und gibt Cent zurück; null bei ungültiger Eingabe.
 */
export function parseEuro(eingabe: string): number | null {
  let s = eingabe.trim().replace(/\s|€/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    // Deutsche Schreibweise: Punkte sind Tausendertrenner
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.234" ohne Komma = 1234 €
    s = s.replace(/\./g, "");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

/** Cent → Eingabewert für Formulare, z. B. 1250 → "12,50" */
export function centAlsEingabe(cent: number): string {
  return (cent / 100).toFixed(2).replace(".", ",");
}
