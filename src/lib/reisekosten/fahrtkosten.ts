/**
 * Km-Geld für Dienstfahrten mit dem privaten PKW (Beträge in Cent).
 *
 * Steuerfrei erstattbar ist der Satz nach § 9 Abs. 1 Satz 3 Nr. 4a EStG (0,30 €/km).
 * Zahlt der Arbeitgeber mehr, ist die Differenz steuerpflichtiger Arbeitslohn.
 * Beide Sätze kommen aus den Einstellungen.
 */
export type KmGeld = {
  betrag: number;
  steuerfrei: number;
  steuerpflichtig: number;
};

export function berechneKmGeld(km: number, satzCent: number, steuerfreiCent: number): KmGeld {
  if (!Number.isFinite(km) || km < 0) throw new Error("Kilometer müssen eine positive Zahl sein");
  const betrag = Math.round(km * satzCent);
  const steuerfrei = Math.min(betrag, Math.round(km * steuerfreiCent));
  return { betrag, steuerfrei, steuerpflichtig: betrag - steuerfrei };
}
