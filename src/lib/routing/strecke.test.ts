import { describe, expect, it } from "vitest";
import { weichtAb, zerlegeStrecke } from "./strecke";

describe("zerlegeStrecke", () => {
  it("trennt an Gedankenstrichen, Pfeilen und Bindestrichen mit Leerzeichen", () => {
    expect(zerlegeStrecke("Köln – Essen – Köln")).toEqual(["Köln", "Essen", "Köln"]);
    expect(zerlegeStrecke("Köln → Essen→Dortmund")).toEqual(["Köln", "Essen", "Dortmund"]);
    expect(zerlegeStrecke("Köln - Bonn")).toEqual(["Köln", "Bonn"]);
  });

  it("lässt Bindestriche in Ortsnamen und Adressen mit Komma ganz", () => {
    expect(zerlegeStrecke("Castrop-Rauxel – Musterstraße 1, 50667 Köln")).toEqual(["Castrop-Rauxel", "Musterstraße 1, 50667 Köln"]);
  });

  it("liefert für eine einzelne Angabe nur einen Ort", () => {
    expect(zerlegeStrecke("Essen")).toEqual(["Essen"]);
    expect(zerlegeStrecke("  ")).toEqual([]);
  });
});

describe("weichtAb", () => {
  it("toleriert kleine Abweichungen", () => {
    expect(weichtAb(104, 100)).toBe(false);
    expect(weichtAb(110, 100)).toBe(false);
    expect(weichtAb(24, 20)).toBe(false);
  });

  it("kennzeichnet deutliche Abweichungen", () => {
    expect(weichtAb(120, 100)).toBe(true);
    expect(weichtAb(80, 100)).toBe(true);
  });

  it("ohne Route keine Kennzeichnung", () => {
    expect(weichtAb(500, null)).toBe(false);
  });
});
