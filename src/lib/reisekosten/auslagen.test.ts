import { describe, expect, it } from "vitest";
import { auslagenZeitraum } from "./auslagen";
import { monatsname } from "./monat";
import { abschnitteFuer, passendeKategorie } from "./kategorie";

describe("auslagenZeitraum", () => {
  it("umfasst den ganzen Kalendermonat", () => {
    expect(auslagenZeitraum("2026-10")).toEqual({
      beginn: "2026-10-01T00:00:00",
      ende: "2026-10-31T23:59:00",
      begruendung: "Auslagen Oktober 2026",
    });
  });

  it("Februar im Schaltjahr und Dezember", () => {
    expect(auslagenZeitraum("2028-02")?.ende).toBe("2028-02-29T23:59:00");
    expect(auslagenZeitraum("2026-12")?.ende).toBe("2026-12-31T23:59:00");
  });

  it("ungültiger Monat", () => {
    expect(auslagenZeitraum("2026-13")).toBeNull();
    expect(auslagenZeitraum("Oktober")).toBeNull();
  });

  it("Monatsname", () => {
    expect(monatsname("2026-03")).toBe("März 2026");
  });
});

describe("abschnitteFuer", () => {
  it("trennt Reise- und Auslagenkategorien", () => {
    expect(abschnitteFuer("auslagen")).toEqual(["G"]);
    expect(abschnitteFuer("reise")).not.toContain("G");
  });
});

describe("passendeKategorie", () => {
  const kategorien = [
    { id: "buerobedarf", abschnitt: "F" },
    { id: "telefon_porto", abschnitt: "F" },
    { id: "telefon_porto_ohne", abschnitt: "F" },
    { id: "aus_buero", abschnitt: "G" },
    { id: "aus_porto", abschnitt: "G" },
    { id: "aus_material", abschnitt: "G" },
    { id: "bahn", abschnitt: "A" },
  ];

  it("lässt passende Kategorien unverändert", () => {
    expect(passendeKategorie({ kategorieId: "bahn", mwstProzent: 7 }, "reise", kategorien)).toBe("bahn");
    expect(passendeKategorie({ kategorieId: "aus_material", mwstProzent: 19 }, "auslagen", kategorien)).toBe("aus_material");
  });

  it("stellt auf das Gegenstück um", () => {
    expect(passendeKategorie({ kategorieId: "aus_buero", mwstProzent: 19 }, "reise", kategorien)).toBe("buerobedarf");
    expect(passendeKategorie({ kategorieId: "aus_porto", mwstProzent: 0 }, "reise", kategorien)).toBe("telefon_porto_ohne");
    expect(passendeKategorie({ kategorieId: "telefon_porto", mwstProzent: 19 }, "auslagen", kategorien)).toBe("aus_porto");
  });

  it("ohne Gegenstück: von Hand wählen", () => {
    expect(passendeKategorie({ kategorieId: "aus_material", mwstProzent: 19 }, "reise", kategorien)).toBeNull();
    expect(passendeKategorie({ kategorieId: "bahn", mwstProzent: 7 }, "auslagen", kategorien)).toBeNull();
  });
});
