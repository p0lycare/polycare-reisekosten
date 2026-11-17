import { texte } from "@/lib/i18n/woerterbuch";
import type { Sprache } from "@/lib/i18n/sprache";

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
export function monatsText(monatsname: string, o: OffeneSachen, sprache: Sprache = "de"): { betreff: string; zeilen: string[] } | null {
  const t = texte(sprache).mails.erinnerung;
  const teile = [o.entwuerfe && t.entwuerfe(o.entwuerfe), o.abgelehnt && t.abgelehnt(o.abgelehnt), o.eingang && t.eingang(o.eingang)].filter(
    Boolean,
  ) as string[];
  if (!teile.length) return null;
  return {
    betreff: t.monatBetreff(monatsname),
    zeilen: [t.monatKopf(monatsname), ...teile.map((z) => `• ${z}`), t.monatFuss],
  };
}

export type Aufgaben = { genehmigen: number; pruefen: number; auszahlen: number };

/** Text der Freigabe-Erinnerung, oder null wenn nichts wartet */
export function freigabeText(a: Aufgaben, sprache: Sprache = "de"): { betreff: string; zeilen: string[] } | null {
  const t = texte(sprache).mails.erinnerung;
  const teile = [a.genehmigen && t.genehmigen(a.genehmigen), a.pruefen && t.pruefen(a.pruefen), a.auszahlen && t.auszahlen(a.auszahlen)].filter(
    Boolean,
  ) as string[];
  if (!teile.length) return null;
  const n = a.genehmigen + a.pruefen + a.auszahlen;
  return {
    betreff: t.freigabeBetreff(n),
    zeilen: [t.freigabeZeile(teile.join(", "))],
  };
}
