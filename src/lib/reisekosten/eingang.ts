import type { AusgelesenerBeleg } from "@/lib/ki/beleg-auslesen";

export type ReiseKurz = { id: string; begruendung: string; reiseweg: string; beginn: string; ende: string };

/**
 * Schlägt die Reise vor, in deren Zeitraum das Belegdatum fällt. Bei mehreren Treffern die kürzeste
 * (z. B. Tagesreise innerhalb einer längeren Reise).
 */
export function passendeReise(datum: string | null | undefined, reisen: ReiseKurz[]): ReiseKurz | null {
  if (!datum) return null;
  const treffer = reisen.filter((r) => r.beginn.slice(0, 10) <= datum && datum <= r.ende.slice(0, 10));
  if (!treffer.length) return null;
  return treffer.sort((a, b) => dauer(a) - dauer(b))[0];
}

function dauer(r: ReiseKurz): number {
  return new Date(r.ende).getTime() - new Date(r.beginn).getTime();
}

/** Summe aller Positionen eines ausgelesenen Belegs in Cent */
export function summeAusErgebnis(e: AusgelesenerBeleg | null | undefined): number | null {
  if (!e?.positionen.length) return null;
  return e.positionen.reduce((s, p) => s + p.betragCent, 0);
}

/**
 * Vorschlag für eine neue Reise aus einem Beleg: vom Anreisetag (Hotel) bzw. Belegdatum 08:00
 * bis Belegdatum 18:00, Ort als Ziel.
 */
export function reiseVorschlagAusBeleg(e: AusgelesenerBeleg | null | undefined): { beginn: string; ende: string; reiseweg: string } | null {
  if (!e?.datum) return null;
  const von = e.anreise && e.anreise <= e.datum ? e.anreise : e.datum;
  return { beginn: `${von}T08:00`, ende: `${e.datum}T18:00`, reiseweg: e.ort ?? "" };
}

/** Passt ein Beleg zu einer Reise, auch wenn eine Hotelrechnung erst am Abreisetag ausgestellt wurde */
export function belegDatumFuerZuordnung(e: AusgelesenerBeleg | null | undefined): string | null {
  return e?.anreise ?? e?.datum ?? null;
}
