import { describe, expect, it } from "vitest";
import { freigabeText, istFreigabeErinnerung, istMonatserinnerung, monatsText } from "./plan";

describe("istMonatserinnerung", () => {
  it("trifft den vorletzten Werktag", () => {
    // Oktober 2026 endet Samstag 31.; letzte Werktage: Do 29., Fr 30.
    expect(istMonatserinnerung("2026-10-29")).toBe(true);
    expect(istMonatserinnerung("2026-10-30")).toBe(false);
    expect(istMonatserinnerung("2026-10-28")).toBe(false);
    // November 2026 endet Montag 30.; vorletzter Werktag ist Freitag 27.
    expect(istMonatserinnerung("2026-11-27")).toBe(true);
  });
});

describe("istFreigabeErinnerung", () => {
  it("nur montags", () => {
    expect(istFreigabeErinnerung("2026-10-26")).toBe(true);
    expect(istFreigabeErinnerung("2026-10-27")).toBe(false);
  });
});

describe("monatsText", () => {
  it("listet nur, was offen ist", () => {
    const t = monatsText("Oktober 2026", { entwuerfe: 2, abgelehnt: 0, eingang: 1 });
    expect(t?.betreff).toBe("Erinnerung: Reisekosten für Oktober 2026 einreichen");
    expect(t?.zeilen).toContain("• 2 Reisen sind noch nicht eingereicht");
    expect(t?.zeilen).toContain("• 1 Beleg liegt noch im Eingang");
    expect(t?.zeilen.join(" ")).not.toContain("abgelehnt");
  });

  it("nichts offen, keine Mail", () => {
    expect(monatsText("Oktober 2026", { entwuerfe: 0, abgelehnt: 0, eingang: 0 })).toBeNull();
  });
});

describe("freigabeText", () => {
  it("fasst die Aufgaben zusammen", () => {
    expect(freigabeText({ genehmigen: 1, pruefen: 2, auszahlen: 0 })).toEqual({
      betreff: "Erinnerung: 3 Abrechnungen warten auf dich",
      zeilen: ["Diese Abrechnungen warten auf dich: 1 zu genehmigen, 2 zur Belegprüfung."],
    });
    expect(freigabeText({ genehmigen: 0, pruefen: 0, auszahlen: 0 })).toBeNull();
  });
});
