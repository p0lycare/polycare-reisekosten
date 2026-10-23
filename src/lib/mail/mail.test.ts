import { describe, expect, it } from "vitest";
import { teileAnhaenge, type Anhang } from "./anhaenge";
import { alsMail } from "./vorlagen";

const datei = (name: string, bytes: number): Anhang => ({ name, contentType: "image/jpeg", inhalt: new Uint8Array(bytes) });

describe("teileAnhaenge", () => {
  it("ohne Anhänge eine Mail", () => {
    expect(teileAnhaenge([])).toEqual([[]]);
  });

  it("verteilt auf mehrere Mails unter der Grenze", () => {
    const pakete = teileAnhaenge([datei("a", 600), datei("b", 500), datei("c", 300), datei("d", 900)], 1000);
    expect(pakete.map((p) => p.map((a) => a.name))).toEqual([["a"], ["b", "c"], ["d"]]);
  });

  it("zu große Einzeldatei landet allein in einer Mail", () => {
    expect(teileAnhaenge([datei("gross", 5000), datei("klein", 10)], 1000).map((p) => p.length)).toEqual([1, 1]);
  });
});

describe("alsMail", () => {
  const daten = {
    reisende: "Erika Muster",
    begruendung: "Messe <BAU>",
    zeitraum: "21.10.–23.10.2026",
    betrag: "248,60 €",
    link: "https://example.invalid/reisen/1",
    handelnde: "Max Beispiel",
    grund: "Hotelrechnung fehlt",
  };

  it("Einreichung nennt Reisende, Reise und Betrag", () => {
    const m = alsMail("eingereicht", daten);
    expect(m.betreff).toBe("Reisekosten zur Genehmigung: Erika Muster – Messe <BAU>");
    expect(m.text).toContain("248,60 €");
    expect(m.text).toContain("https://example.invalid/reisen/1");
  });

  it("Ablehnung enthält den Grund", () => {
    expect(alsMail("abgelehnt", daten).text).toContain("Grund: Hotelrechnung fehlt");
  });

  it("HTML ist escaped", () => {
    expect(alsMail("eingereicht", daten).html).toContain("Messe &lt;BAU&gt;");
    expect(alsMail("eingereicht", daten).html).not.toContain("<BAU>");
  });
});
