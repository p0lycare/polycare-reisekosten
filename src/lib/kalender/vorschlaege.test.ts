import { describe, expect, it } from "vitest";
import { reiseVorschlaege, reiseZeiten, zielAus, type Termin } from "./vorschlaege";

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

describe("Fahrten ohne Ortsfeld (aus dem Betreff)", () => {
  const ohneOrt = (id: string, betreff: string, beginn: string, ende: string, teil: Partial<Termin> = {}) =>
    termin({ id, betreff, ort: "", beginn, ende, ...teil });
  const buero = { bueroOrte: ["Musterstraße 1", "Köln"], reisen: [] };

  it("liest das Ziel aus „nach …“", () => {
    expect(zielAus("Fahrt nach Kassel")).toBe("Kassel");
    expect(zielAus("Anreise nach Frankfurt am Main")).toBe("Frankfurt");
    expect(zielAus("Rückfahrt nach Bad Hersfeld")).toBe("Bad Hersfeld");
    expect(zielAus("Kundentermin")).toBeNull();
  });

  it("Hinfahrt bis Rückfahrt wird eine Reise, Termine dazwischen werden zur Begründung", () => {
    const termine = [
      ohneOrt("a", "Abstimmung Team", "2026-10-08T09:00", "2026-10-08T09:50", { ort: "Microsoft Teams-Besprechung", online: true }),
      ohneOrt("b", "Fahrt nach Kassel", "2026-10-08T10:20", "2026-10-08T13:00"),
      ohneOrt("c", "Besprechung vor Ort", "2026-10-08T10:45", "2026-10-08T12:15", { ort: "Microsoft Teams-Besprechung", online: true }),
      ohneOrt("d", "Material abholen", "2026-10-08T13:00", "2026-10-08T14:00"),
      ohneOrt("e", "Rückfahrt nach Köln", "2026-10-08T14:05", "2026-10-08T16:30"),
    ];
    expect(reiseVorschlaege(termine, buero)).toEqual([
      { terminId: "b", betreff: "Material abholen", ort: "Kassel", beginn: "2026-10-08T10:20", ende: "2026-10-08T16:30" },
    ]);
  });

  it("mehrtägige Fahrt: Anreise und Rückreise an verschiedenen Tagen", () => {
    const termine = [
      ohneOrt("a", "Anreise nach Berlin", "2026-10-12T07:00", "2026-10-12T11:00"),
      termin({ id: "b", betreff: "Messe", ort: "Messe Berlin", beginn: "2026-10-12T12:00", ende: "2026-10-13T17:00" }),
      ohneOrt("c", "Rückreise", "2026-10-14T08:00", "2026-10-14T12:00"),
    ];
    expect(reiseVorschlaege(termine, buero)).toEqual([
      { terminId: "a", betreff: "Messe", ort: "Berlin", beginn: "2026-10-12T07:00", ende: "2026-10-14T12:00" },
    ]);
  });

  it("Fahrt ins Büro ist keine Reise; schon erfasste Reisen werden nicht vorgeschlagen", () => {
    expect(reiseVorschlaege([ohneOrt("a", "Fahrt nach Köln", "2026-10-08T08:00", "2026-10-08T09:00")], buero)).toEqual([]);
    const reisen = [{ beginn: "2026-10-08T10:00:00", ende: "2026-10-08T17:00:00" }];
    expect(reiseVorschlaege([ohneOrt("b", "Fahrt nach Kassel", "2026-10-08T10:20", "2026-10-08T13:00")], { ...buero, reisen })).toEqual([]);
  });
});
