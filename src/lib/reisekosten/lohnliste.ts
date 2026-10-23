import type { Abrechnung } from "./abrechnung";

export type LohnEintrag = {
  mitarbeiterId: string;
  name: string;
  personalnummer: string | null;
  belegNr: string | null;
  abrechnung: Abrechnung;
};

export type LohnZeile = {
  mitarbeiterId: string;
  name: string;
  personalnummer: string | null;
  belegNummern: string[];
  /** Erstattung gesamt (brutto, vor Vorschuss) */
  erstattung: number;
  /** davon steuerfreie Reisekosten nach § 3 Nr. 16 EStG (Abschnitte A–D ohne steuerpflichtiges Km-Geld) */
  steuerfrei: number;
  /** davon Auslagenersatz bzw. Betriebsausgaben (Abschnitte E Bewirtung und F Sonstiges) */
  auslagen: number;
  /** davon steuerpflichtiger Arbeitslohn (Km-Geld über dem steuerfreien Satz) */
  steuerpflichtig: number;
  vorschuss: number;
  auszuzahlen: number;
};

/**
 * Monatsliste für die Lohnabrechnung: je Person die im Buchungsmonat geprüften Reisekosten,
 * getrennt nach steuerfreiem und steuerpflichtigem Anteil. Beträge in Cent.
 */
export function erstelleLohnliste(eintraege: LohnEintrag[]): { zeilen: LohnZeile[]; summe: Omit<LohnZeile, "mitarbeiterId" | "name" | "personalnummer" | "belegNummern"> } {
  const proPerson = new Map<string, LohnZeile>();

  for (const e of eintraege) {
    const z =
      proPerson.get(e.mitarbeiterId) ??
      ({
        mitarbeiterId: e.mitarbeiterId,
        name: e.name,
        personalnummer: e.personalnummer,
        belegNummern: [],
        erstattung: 0,
        steuerfrei: 0,
        auslagen: 0,
        steuerpflichtig: 0,
        vorschuss: 0,
        auszuzahlen: 0,
      } satisfies LohnZeile);
    if (e.belegNr) z.belegNummern.push(e.belegNr);
    z.erstattung += e.abrechnung.gesamt.brutto;
    z.steuerpflichtig += e.abrechnung.steuerpflichtig;
    const auslagen = e.abrechnung.abschnitte
      .filter((a) => a.abschnitt === "E" || a.abschnitt === "F")
      .reduce((s, a) => s + a.summe.brutto, 0);
    z.auslagen += auslagen;
    z.steuerfrei += e.abrechnung.gesamt.brutto - auslagen - e.abrechnung.steuerpflichtig;
    z.vorschuss += e.abrechnung.vorschuss;
    z.auszuzahlen += e.abrechnung.auszuzahlen;
    proPerson.set(e.mitarbeiterId, z);
  }

  const zeilen = [...proPerson.values()]
    .map((z) => ({ ...z, belegNummern: [...z.belegNummern].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
  const summe = zeilen.reduce(
    (s, z) => ({
      erstattung: s.erstattung + z.erstattung,
      steuerfrei: s.steuerfrei + z.steuerfrei,
      auslagen: s.auslagen + z.auslagen,
      steuerpflichtig: s.steuerpflichtig + z.steuerpflichtig,
      vorschuss: s.vorschuss + z.vorschuss,
      auszuzahlen: s.auszuzahlen + z.auszuzahlen,
    }),
    { erstattung: 0, steuerfrei: 0, auslagen: 0, steuerpflichtig: 0, vorschuss: 0, auszuzahlen: 0 },
  );
  return { zeilen, summe };
}

/** "2026-10" → { von: "2026-10-01", bis: "2026-11-01" } für Abfragen auf das Buchungsmonat */
export function monatsgrenzen(monat: string): { von: string; bis: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(monat);
  if (!m) return null;
  const jahr = Number(m[1]);
  const mon = Number(m[2]);
  if (mon < 1 || mon > 12) return null;
  const folge = mon === 12 ? `${jahr + 1}-01` : `${jahr}-${String(mon + 1).padStart(2, "0")}`;
  return { von: `${monat}-01`, bis: `${folge}-01` };
}
