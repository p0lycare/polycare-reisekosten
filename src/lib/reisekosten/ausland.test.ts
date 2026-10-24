import { describe, expect, it } from "vitest";
import { laenderAuswahl, landName, pauschaleFuer } from "./laender";
import { berechneVerpflegung } from "./verpflegung";

describe("Auslandspauschalen 2026", () => {
  it("Werte aus dem BMF-Schreiben vom 5.12.2025", () => {
    expect(pauschaleFuer("AT", 2026)).toMatchObject({ voll: 5000, klein: 3300 });
    expect(pauschaleFuer("FR:Paris", 2026)).toMatchObject({ voll: 5800, klein: 3900 });
    expect(pauschaleFuer("FR", 2026)).toMatchObject({ voll: 5300, klein: 3600 });
    expect(pauschaleFuer("US:New York City", 2026)).toMatchObject({ voll: 6600, klein: 4400 });
    expect(pauschaleFuer("DE", 2026)).toEqual({ voll: 2800, klein: 1400 });
  });

  it("unbekanntes Land wirft", () => {
    expect(() => pauschaleFuer("XX", 2026)).toThrow();
  });

  it("Auswahl beginnt mit Deutschland und enthält Städte", () => {
    const liste = laenderAuswahl(2026);
    expect(liste[0]).toEqual({ code: "DE", name: "Deutschland" });
    expect(liste.length).toBe(215);
    expect(landName("CH:Genf", 2026)).toBe("Schweiz – Genf");
  });
});

describe("Verpflegung im Ausland", () => {
  it("Reiseland gilt an allen Tagen", () => {
    const r = berechneVerpflegung({ beginn: "2026-10-05T07:00", ende: "2026-10-07T19:00", land: "AT" });
    expect(r.tage.map((t) => t.pauschale)).toEqual([3300, 5000, 3300]);
  });

  it("abweichendes Land je Tag bei Reisen durch mehrere Staaten", () => {
    const r = berechneVerpflegung({
      beginn: "2026-10-05T07:00",
      ende: "2026-10-07T19:00",
      land: "AT",
      mahlzeiten: { "2026-10-06": { land: "CH" } },
    });
    expect(r.tage.map((t) => t.pauschale)).toEqual([3300, 7000, 3300]);
  });

  it("Kürzung nach der vollen Pauschale des Tageslandes", () => {
    const r = berechneVerpflegung({
      beginn: "2026-10-05T07:00",
      ende: "2026-10-06T19:00",
      land: "FR:Paris",
      mahlzeiten: { "2026-10-06": { fruehstueck: true } },
    });
    // 20 % von 58 € = 11,60 €
    expect(r.tage[1]).toMatchObject({ pauschale: 3900, kuerzung: 1160, betrag: 2740 });
  });
});
