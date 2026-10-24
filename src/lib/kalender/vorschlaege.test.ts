import { describe, expect, it } from "vitest";
import { reiseVorschlaege, reiseZeiten, type Termin } from "./vorschlaege";

function termin(teil: Partial<Termin>): Termin {
  return {
    id: "t1",
    betreff: "Kundentermin",
    ort: "Messe Essen",
    beginn: "2026-10-05T09:00",
    ende: "2026-10-05T15:00",
    ganztaegig: false,
    online: false,
    abgesagt: false,
    ...teil,
  };
}

const leer = { bueroOrte: [], reisen: [] };

describe("reiseZeiten", () => {
  it("übernimmt Uhrzeiten normaler Termine", () => {
    expect(reiseZeiten(termin({}))).toEqual({ beginn: "2026-10-05T09:00", ende: "2026-10-05T15:00" });
  });

  it("macht aus ganztägigen Terminen 08:00 bis 18:00 am letzten Tag", () => {
    expect(reiseZeiten(termin({ ganztaegig: true, beginn: "2026-10-05T00:00", ende: "2026-10-08T00:00" }))).toEqual({
      beginn: "2026-10-05T08:00",
      ende: "2026-10-07T18:00",
    });
    expect(reiseZeiten(termin({ ganztaegig: true, beginn: "2026-10-05T00:00", ende: "2026-10-06T00:00" }))).toEqual({
      beginn: "2026-10-05T08:00",
      ende: "2026-10-05T18:00",
    });
  });
});

describe("reiseVorschlaege", () => {
  it("schlägt Termine mit Ort vor", () => {
    expect(reiseVorschlaege([termin({})], leer)).toEqual([
      { terminId: "t1", betreff: "Kundentermin", ort: "Messe Essen", beginn: "2026-10-05T09:00", ende: "2026-10-05T15:00" },
    ]);
  });

  it("lässt Termine ohne Ort, online, abgesagt oder im Büro weg", () => {
    const termine = [
      termin({ id: "a", ort: "" }),
      termin({ id: "b", online: true }),
      termin({ id: "c", ort: "Microsoft Teams-Besprechung" }),
      termin({ id: "d", abgesagt: true }),
      termin({ id: "e", ort: "Besprechungsraum 2, Musterstraße 1" }),
    ];
    expect(reiseVorschlaege(termine, { bueroOrte: ["musterstraße"], reisen: [] })).toEqual([]);
  });

  it("lässt Termine weg, die schon als Reise erfasst sind", () => {
    const reisen = [{ beginn: "2026-10-04T18:00:00", ende: "2026-10-05T20:00:00" }];
    expect(reiseVorschlaege([termin({})], { bueroOrte: [], reisen })).toEqual([]);
  });

  it("fasst Termine am selben Ort und Tag zusammen", () => {
    const termine = [
      termin({ id: "a", betreff: "Workshop", beginn: "2026-10-05T09:00", ende: "2026-10-05T12:00" }),
      termin({ id: "b", betreff: "Abendessen", ort: "messe essen", beginn: "2026-10-05T18:00", ende: "2026-10-05T21:00" }),
    ];
    expect(reiseVorschlaege(termine, leer)).toEqual([
      { terminId: "a", betreff: "Workshop; Abendessen", ort: "Messe Essen", beginn: "2026-10-05T09:00", ende: "2026-10-05T21:00" },
    ]);
  });
});
