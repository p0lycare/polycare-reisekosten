import { describe, expect, it } from "vitest";
import { berechneAbrechnung, type AbrechnungInput } from "./abrechnung";
import { berechneKmGeld } from "./fahrtkosten";
import { berechneVerpflegung } from "./verpflegung";

// Erfundene Testreise; Konten sind Platzhalter
const basis: AbrechnungInput = {
  belege: [],
  verpflegung: null,
  kmGeld: null,
  kmKategorie: { bezeichnung: "Km-Geld", konto: "1000" },
  verpflegungKategorie: { bezeichnung: "Verpflegung", konto: "2000" },
  vorschussCent: 0,
};

describe("berechneAbrechnung", () => {
  it("Auslagen (Abschnitt G) zählen zur Auszahlung", () => {
    const r = berechneAbrechnung({
      ...basis,
      belege: [
        { kategorieId: "aus_material", abschnitt: "G", bezeichnung: "Material", konto: "3000", betragCent: 11878, mwstProzent: 19 },
        { kategorieId: "aus_material", abschnitt: "G", bezeichnung: "Material", konto: "3000", betragCent: 30081, mwstProzent: 19 },
      ],
    });
    expect(r.abschnitte.map((a) => a.abschnitt)).toEqual(["G"]);
    expect(r.auszuzahlen).toBe(41959);
  });

  it("leere Reise ergibt 0", () => {
    const r = berechneAbrechnung(basis);
    expect(r.abschnitte).toEqual([]);
    expect(r.auszuzahlen).toBe(0);
  });

  it("dreitägige Reise mit Hotel, Zug, Km-Geld, Frühstück und Vorschuss", () => {
    const r = berechneAbrechnung({
      ...basis,
      belege: [
        { kategorieId: "bahn", abschnitt: "A", bezeichnung: "Zugticket", konto: "3000", betragCent: 8990, mwstProzent: 7 },
        { kategorieId: "uebernachtung", abschnitt: "C", bezeichnung: "Übernachtung", konto: "4000", betragCent: 10700, mwstProzent: 7 },
        { kategorieId: "uebernachtung", abschnitt: "C", bezeichnung: "Übernachtung", konto: "4000", betragCent: 10700, mwstProzent: 7 },
        { kategorieId: "trinkgeld", abschnitt: "F", bezeichnung: "Trinkgeld", konto: null, betragCent: 500, mwstProzent: 0 },
      ],
      verpflegung: berechneVerpflegung({
        beginn: "2026-10-21T07:00",
        ende: "2026-10-23T18:00",
        mahlzeiten: { "2026-10-22": { fruehstueck: true }, "2026-10-23": { fruehstueck: true } },
      }),
      kmGeld: berechneKmGeld(126, 38, 30),
      vorschussCent: 10000,
    });

    expect(r.abschnitte.map((a) => a.abschnitt)).toEqual(["A", "B", "C", "D", "F"]);

    const a = r.abschnitte.find((x) => x.abschnitt === "A")!;
    expect(a.positionen.map((p) => p.brutto)).toEqual([8990, 4788]);
    expect(a.summe).toEqual({ netto: 8402 + 4788, mwst: 588, brutto: 8990 + 4788 });

    // Zwei Übernachtungen derselben Kategorie werden zusammengefasst
    const c = r.abschnitte.find((x) => x.abschnitt === "C")!;
    expect(c.positionen).toHaveLength(1);
    expect(c.summe).toEqual({ netto: 20000, mwst: 1400, brutto: 21400 });

    expect(r.abschnitte.find((x) => x.abschnitt === "B")!.summe.brutto).toBe(5600);
    expect(r.abschnitte.find((x) => x.abschnitt === "D")!.summe.brutto).toBe(-1120);

    expect(r.gesamt.brutto).toBe(8990 + 4788 + 5600 + 21400 - 1120 + 500);
    expect(r.auszuzahlen).toBe(r.gesamt.brutto - 10000);
    expect(r.steuerpflichtig).toBe(1008);
  });

  it("gleiche Kategorie mit unterschiedlichem MwSt-Satz bleibt getrennt", () => {
    const r = berechneAbrechnung({
      ...basis,
      belege: [
        { kategorieId: "hotel_parken", abschnitt: "C", bezeichnung: "Parken", konto: null, betragCent: 1190, mwstProzent: 19 },
        { kategorieId: "hotel_parken", abschnitt: "C", bezeichnung: "Parken", konto: null, betragCent: 500, mwstProzent: 0 },
      ],
    });
    expect(r.abschnitte[0].positionen).toHaveLength(2);
  });

  it("Vorschuss höher als Kosten ergibt Rückzahlung", () => {
    const r = berechneAbrechnung({
      ...basis,
      belege: [{ kategorieId: "taxi", abschnitt: "A", bezeichnung: "Taxi", konto: null, betragCent: 2000, mwstProzent: 7 }],
      vorschussCent: 5000,
    });
    expect(r.auszuzahlen).toBe(-3000);
  });
});
