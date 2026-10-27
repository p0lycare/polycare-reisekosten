import { describe, expect, it } from "vitest";
import { auslagenVorschlag, passendeReise, reiseVorschlagAusBeleg, summeAusErgebnis } from "./eingang";

const reisen = [
  { id: "woche", begruendung: "Messe", reiseweg: "Köln – Berlin", beginn: "2026-10-19T07:00:00", ende: "2026-10-23T18:00:00" },
  { id: "tag", begruendung: "Kunde", reiseweg: "Köln – Essen", beginn: "2026-10-21T08:00:00", ende: "2026-10-21T17:00:00" },
];

describe("passendeReise", () => {
  it("findet die Reise im Zeitraum, bei Überschneidung die kürzere", () => {
    expect(passendeReise("2026-10-20", reisen)?.id).toBe("woche");
    expect(passendeReise("2026-10-21", reisen)?.id).toBe("tag");
    expect(passendeReise("2026-10-23", reisen)?.id).toBe("woche");
  });

  it("kein Treffer außerhalb oder ohne Datum", () => {
    expect(passendeReise("2026-10-25", reisen)).toBeNull();
    expect(passendeReise(null, reisen)).toBeNull();
  });
});

describe("Vorschläge aus dem Beleg", () => {
  const ergebnis = {
    istBeleg: true,
    haendler: "Hotel",
    ort: "Berlin",
    datum: "2026-10-22",
    waehrung: "EUR",
    positionen: [
      { kategorieId: "uebernachtung", beschreibung: "", betragCent: 10700, mwstProzent: 7 },
      { kategorieId: "hotel_fruehstueck", beschreibung: "", betragCent: 1500, mwstProzent: 19 },
    ],
    fruehstueckEnthalten: true,
    hinweis: null,
  };

  it("Summe und neue Reise", () => {
    expect(summeAusErgebnis(ergebnis)).toBe(12200);
    expect(reiseVorschlagAusBeleg(ergebnis)).toEqual({ beginn: "2026-10-22T08:00", ende: "2026-10-22T18:00", reiseweg: "Berlin" });
    expect(reiseVorschlagAusBeleg({ ...ergebnis, datum: null })).toBeNull();
    expect(reiseVorschlagAusBeleg({ ...ergebnis, anreise: "2026-10-20" })?.beginn).toBe("2026-10-20T08:00");
  });

  it("Auslage: Gesamtbetrag bei einem Steuersatz, sonst erste Position", () => {
    const baumarkt = {
      ...ergebnis,
      positionen: [
        { kategorieId: "aus_material", beschreibung: "", betragCent: 11878, mwstProzent: 19 },
        { kategorieId: "aus_material", beschreibung: "", betragCent: 30081, mwstProzent: 19 },
      ],
    };
    expect(auslagenVorschlag(baumarkt)).toEqual({ betragCent: 41959, mwstProzent: 19 });
    expect(auslagenVorschlag(ergebnis)).toEqual({ betragCent: 10700, mwstProzent: 7 });
    expect(auslagenVorschlag({ ...ergebnis, positionen: [] })).toBeNull();
  });
});
