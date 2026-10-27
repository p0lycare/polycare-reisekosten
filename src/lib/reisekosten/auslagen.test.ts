import { describe, expect, it } from "vitest";
import { auslagenZeitraum, monatsname } from "./auslagen";
import { abschnitteFuer } from "./kategorie";

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
