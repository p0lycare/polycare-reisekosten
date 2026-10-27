/** Zahlungsarten einer Auslage wie im Formblatt FB 21 (Werte wie im DB-Check von beleg.zahlungsart) */
export const ZAHLUNGSARTEN = [
  { wert: "ec", text: "EC-Karte", kurz: "EC" },
  { wert: "kreditkarte", text: "Kreditkarte (privat)", kurz: "Kreditkarte" },
  { wert: "bar", text: "Bar", kurz: "bar" },
  { wert: "ueberweisung", text: "Überweisung", kurz: "Überweisung" },
  { wert: "sonstige", text: "Sonstige (z. B. PayPal)", kurz: "sonstige" },
] as const;

export function istZahlungsart(wert: string): boolean {
  return ZAHLUNGSARTEN.some((z) => z.wert === wert);
}

/** Kurzform fürs PDF, z. B. "EC" */
export function zahlungsartKurz(wert: string): string {
  return ZAHLUNGSARTEN.find((z) => z.wert === wert)?.kurz ?? wert;
}
