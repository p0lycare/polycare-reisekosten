/** Wochentag eines Tages "YYYY-MM-DD" (0 = Sonntag) */
function wochentag(datum: string): number {
  const [j, m, t] = datum.split("-").map(Number);
  return new Date(Date.UTC(j, m - 1, t)).getUTCDay();
}

function istWerktag(datum: string): boolean {
  const w = wochentag(datum);
  return w !== 0 && w !== 6;
}

/** Werktage (Mo–Fr) eines Monats "YYYY-MM"; Feiertage bleiben unberücksichtigt */
function werktage(monat: string): string[] {
  const [j, m] = monat.split("-").map(Number);
  const tage = new Date(Date.UTC(j, m, 0)).getUTCDate();
  return Array.from({ length: tage }, (_, i) => `${monat}-${String(i + 1).padStart(2, "0")}`).filter(istWerktag);
}

/** Monatserinnerung am vorletzten Werktag: Zeit zum Einreichen, bevor der Monat abgerechnet wird */
export function istMonatserinnerung(heute: string): boolean {
  const tage = werktage(heute.slice(0, 7));
  return tage[tage.length - 2] === heute;
}

/** Freigabe-Erinnerung montags */
export function istFreigabeErinnerung(heute: string): boolean {
  return wochentag(heute) === 1;
}

export type OffeneSachen = { entwuerfe: number; abgelehnt: number; eingang: number };

/** Text der Monatserinnerung, oder null wenn nichts offen ist */
export function monatsText(monatsname: string, o: OffeneSachen): { betreff: string; zeilen: string[] } | null {
  const teile = [
    o.entwuerfe && `${o.entwuerfe} ${o.entwuerfe === 1 ? "Reise ist noch nicht eingereicht" : "Reisen sind noch nicht eingereicht"}`,
    o.abgelehnt && `${o.abgelehnt} ${o.abgelehnt === 1 ? "abgelehnte Reise wartet" : "abgelehnte Reisen warten"} auf Korrektur`,
    o.eingang && `${o.eingang} ${o.eingang === 1 ? "Beleg liegt" : "Belege liegen"} noch im Eingang`,
  ].filter(Boolean) as string[];
  if (!teile.length) return null;
  return {
    betreff: `Erinnerung: Reisekosten für ${monatsname} einreichen`,
    zeilen: [
      `Der Monat ${monatsname} geht zu Ende. Bei dir ist noch offen:`,
      ...teile.map((t) => `• ${t}`),
      "Bitte Belege zuordnen und die Reisen gesammelt einreichen – das dauert meist nur ein paar Minuten.",
    ],
  };
}

export type Aufgaben = { genehmigen: number; pruefen: number; auszahlen: number };

/** Text der Freigabe-Erinnerung, oder null wenn nichts wartet */
export function freigabeText(a: Aufgaben): { betreff: string; zeilen: string[] } | null {
  const teile = [
    a.genehmigen && `${a.genehmigen} zu genehmigen`,
    a.pruefen && `${a.pruefen} zur Belegprüfung`,
    a.auszahlen && `${a.auszahlen} zur Auszahlung`,
  ].filter(Boolean) as string[];
  if (!teile.length) return null;
  const n = a.genehmigen + a.pruefen + a.auszahlen;
  return {
    betreff: `Erinnerung: ${n} ${n === 1 ? "Abrechnung wartet" : "Abrechnungen warten"} auf dich`,
    zeilen: [`Diese Abrechnungen warten auf dich: ${teile.join(", ")}.`],
  };
}
