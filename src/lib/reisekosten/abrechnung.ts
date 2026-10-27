import type { Abschnitt } from "./kategorie";
import type { KmGeld } from "./fahrtkosten";
import { nettoAusBrutto } from "./mwst";
import type { VerpflegungErgebnis } from "./verpflegung";

/** Beträge in Cent */
export type Betrag = { netto: number; mwst: number; brutto: number };

export type Position = Betrag & {
  bezeichnung: string;
  konto: string | null;
  mwstProzent: number;
};

export type AbschnittSumme = {
  abschnitt: Abschnitt;
  positionen: Position[];
  summe: Betrag;
};

export type Abrechnung = {
  abschnitte: AbschnittSumme[];
  gesamt: Betrag;
  vorschuss: number;
  /** Negativ = Rückzahlung an Polycare */
  auszuzahlen: number;
  /** Steuerpflichtiger Anteil (Km-Geld über dem steuerfreien Satz) für die Lohnabrechnung */
  steuerpflichtig: number;
};

export type AbrechnungBeleg = {
  kategorieId: string;
  abschnitt: string;
  bezeichnung: string;
  konto: string | null;
  betragCent: number;
  mwstProzent: number;
};

type Kontierung = { bezeichnung: string; konto: string | null };

export type AbrechnungInput = {
  belege: AbrechnungBeleg[];
  verpflegung: VerpflegungErgebnis | null;
  kmGeld: KmGeld | null;
  kmKategorie: Kontierung;
  verpflegungKategorie: Kontierung;
  vorschussCent: number;
};

const REIHENFOLGE: Abschnitt[] = ["A", "B", "C", "D", "E", "F", "G"];

function addiere(betraege: Betrag[]): Betrag {
  return betraege.reduce(
    (s, b) => ({ netto: s.netto + b.netto, mwst: s.mwst + b.mwst, brutto: s.brutto + b.brutto }),
    { netto: 0, mwst: 0, brutto: 0 },
  );
}

function ohneMwst(cent: number): Betrag {
  return { netto: cent, mwst: 0, brutto: cent };
}

/**
 * Baut die Abrechnung im Aufbau des Formblatts FB 06 (Abschnitte A–F).
 * Belege derselben Kategorie und desselben MwSt-Satzes werden zu einer Position zusammengefasst;
 * Netto/MwSt werden je Beleg gerechnet und dann summiert, damit sie mit den Einzelbelegen übereinstimmen.
 */
export function berechneAbrechnung(input: AbrechnungInput): Abrechnung {
  const positionen = new Map<string, { abschnitt: Abschnitt; position: Position }>();

  for (const b of input.belege) {
    const schluessel = `${b.kategorieId}|${b.mwstProzent}`;
    const { netto, mwst } = nettoAusBrutto(b.betragCent, b.mwstProzent);
    const vorhanden = positionen.get(schluessel);
    if (vorhanden) {
      vorhanden.position.netto += netto;
      vorhanden.position.mwst += mwst;
      vorhanden.position.brutto += b.betragCent;
    } else {
      positionen.set(schluessel, {
        abschnitt: b.abschnitt as Abschnitt,
        position: { bezeichnung: b.bezeichnung, konto: b.konto, mwstProzent: b.mwstProzent, netto, mwst, brutto: b.betragCent },
      });
    }
  }

  const proAbschnitt = new Map<Abschnitt, Position[]>();
  const hinzufuegen = (a: Abschnitt, p: Position) => proAbschnitt.set(a, [...(proAbschnitt.get(a) ?? []), p]);

  for (const { abschnitt, position } of positionen.values()) hinzufuegen(abschnitt, position);

  if (input.kmGeld && input.kmGeld.betrag > 0) {
    hinzufuegen("A", { ...input.kmKategorie, mwstProzent: 0, ...ohneMwst(input.kmGeld.betrag) });
  }

  if (input.verpflegung) {
    const pauschale = input.verpflegung.tage.reduce((s, t) => s + t.pauschale, 0);
    const kuerzung = input.verpflegung.tage.reduce((s, t) => s + t.kuerzung, 0);
    if (pauschale > 0) hinzufuegen("B", { ...input.verpflegungKategorie, mwstProzent: 0, ...ohneMwst(pauschale) });
    if (kuerzung > 0) {
      hinzufuegen("D", {
        bezeichnung: "Gestellte Mahlzeiten",
        konto: input.verpflegungKategorie.konto,
        mwstProzent: 0,
        ...ohneMwst(-kuerzung),
      });
    }
  }

  const abschnitte = REIHENFOLGE.filter((a) => proAbschnitt.has(a)).map((abschnitt) => {
    const p = proAbschnitt.get(abschnitt)!;
    return { abschnitt, positionen: p, summe: addiere(p) };
  });

  const gesamt = addiere(abschnitte.map((a) => a.summe));
  return {
    abschnitte,
    gesamt,
    vorschuss: input.vorschussCent,
    auszuzahlen: gesamt.brutto - input.vorschussCent,
    steuerpflichtig: input.kmGeld?.steuerpflichtig ?? 0,
  };
}
