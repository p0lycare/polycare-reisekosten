import { describe, expect, it } from "vitest";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { anweisung, belegSchema } from "./beleg-schema";

const kategorien = [
  { id: "uebernachtung", bezeichnung: "Übernachtung", abschnitt: "C", mwstProzent: 7 },
  { id: "hotel_fruehstueck", bezeichnung: "Frühstück (Hotelrechnung)", abschnitt: "C", mwstProzent: 19 },
];

describe("Belegschema für Claude", () => {
  it("erzeugt ein JSON-Schema mit den Kategorien als Auswahl", () => {
    const format = betaZodOutputFormat(belegSchema(kategorien));
    const text = JSON.stringify(format);
    expect(text).toContain("uebernachtung");
    expect(text).toContain("hotel_fruehstueck");
    expect(text).toContain("betrag_brutto");
  });

  it("validiert eine plausible Antwort", () => {
    const ergebnis = belegSchema(kategorien).parse({
      ist_beleg: true,
      haendler: "Hotel Beispiel",
      ort: "Berlin",
      datum: "2026-10-23",
      waehrung: "EUR",
      positionen: [
        { kategorie_id: "uebernachtung", beschreibung: "1 Nacht", betrag_brutto: 107, mwst_prozent: 7 },
        { kategorie_id: "hotel_fruehstueck", beschreibung: "Frühstück", betrag_brutto: 15, mwst_prozent: 19 },
      ],
      fruehstueck_enthalten: true,
      hinweis: null,
    });
    expect(ergebnis.positionen).toHaveLength(2);
  });

  it("lehnt unbekannte Kategorien ab", () => {
    expect(() =>
      belegSchema(kategorien).parse({
        ist_beleg: true, haendler: null, ort: null, datum: null, waehrung: "EUR",
        positionen: [{ kategorie_id: "erfunden", beschreibung: "", betrag_brutto: 1, mwst_prozent: 0 }],
        fruehstueck_enthalten: false, hinweis: null,
      }),
    ).toThrow();
  });

  it("Anweisung nennt alle Kategorien", () => {
    expect(anweisung(kategorien)).toContain("- hotel_fruehstueck: Frühstück (Hotelrechnung) (Abschnitt C, üblich 19 %)");
  });
});
