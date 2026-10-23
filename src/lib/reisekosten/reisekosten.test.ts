import { describe, expect, it } from "vitest";
import { berechneVerpflegung } from "./verpflegung";
import { berechneFahrtkosten } from "./fahrtkosten";

describe("berechneVerpflegung", () => {
  it("eintägig unter 8 Stunden: keine Pauschale", () => {
    const r = berechneVerpflegung({ beginn: "2026-10-23T08:00", ende: "2026-10-23T15:30" });
    expect(r.summe).toBe(0);
  });

  it("eintägig über 8 Stunden: 14 €", () => {
    const r = berechneVerpflegung({ beginn: "2026-10-23T07:00", ende: "2026-10-23T16:00" });
    expect(r.summe).toBe(1400);
  });

  it("dreitägig mit Übernachtung: 14 + 28 + 14 €", () => {
    const r = berechneVerpflegung({ beginn: "2026-10-21T10:00", ende: "2026-10-23T12:00" });
    expect(r.tage.map((t) => t.art)).toEqual(["klein", "voll", "klein"]);
    expect(r.summe).toBe(5600);
  });

  it("kürzt gestelltes Frühstück um 5,60 € und Abendessen um 11,20 €", () => {
    const r = berechneVerpflegung({
      beginn: "2026-10-21T10:00",
      ende: "2026-10-23T12:00",
      mahlzeiten: { "2026-10-22": { fruehstueck: true, abend: true } },
    });
    expect(r.tage[1].betrag).toBe(2800 - 560 - 1120);
  });

  it("Kürzung macht den Tag nicht negativ", () => {
    const r = berechneVerpflegung({
      beginn: "2026-10-23T07:00",
      ende: "2026-10-23T18:00",
      mahlzeiten: { "2026-10-23": { mittag: true, abend: true } },
    });
    expect(r.summe).toBe(0);
  });

  it("über Mitternacht ohne Übernachtung: zusammengerechnet, Tag mit mehr Stunden", () => {
    const r = berechneVerpflegung({
      beginn: "2026-10-22T19:00",
      ende: "2026-10-23T05:00",
      mitUebernachtung: false,
    });
    expect(r.tage.map((t) => t.art)).toEqual(["keine", "klein"]);
    expect(r.summe).toBe(1400);
  });

  it("unbekanntes Land wirft einen Fehler", () => {
    expect(() =>
      berechneVerpflegung({ beginn: "2026-10-23T07:00", ende: "2026-10-23T18:00", land: "XX" }),
    ).toThrow();
  });
});

describe("berechneFahrtkosten", () => {
  it("PKW 0,30 €/km", () => {
    expect(berechneFahrtkosten(123)).toBe(3690);
  });

  it("Motorrad 0,20 €/km", () => {
    expect(berechneFahrtkosten(50, "motorrad")).toBe(1000);
  });
});
