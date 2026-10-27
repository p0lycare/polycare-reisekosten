import { describe, expect, it } from "vitest";
import { brauchtUploadSession, uploadBereiche, type Anhang } from "./anhaenge";
import { alsMail, alsSammelMail } from "./vorlagen";

const datei = (name: string, bytes: number): Anhang => ({ name, contentType: "image/jpeg", inhalt: new Uint8Array(bytes) });

describe("Anhänge", () => {
  it("kleine Mails direkt, große über die Upload-Session", () => {
    expect(brauchtUploadSession([])).toBe(false);
    expect(brauchtUploadSession([datei("a", 1_000_000), datei("b", 1_000_000)])).toBe(false);
    expect(brauchtUploadSession([datei("a", 2_000_000), datei("b", 1_000_000)])).toBe(true);
  });

  it("teilt den Upload in lückenlose Stücke", () => {
    expect(uploadBereiche(10, 4)).toEqual([
      { von: 0, bis: 4 },
      { von: 4, bis: 8 },
      { von: 8, bis: 10 },
    ]);
    expect(uploadBereiche(0)).toEqual([]);
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
    expect(m.betreff).toBe("Abrechnung zur Genehmigung: Erika Muster – Messe <BAU>");
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

describe("alsSammelMail", () => {
  it("fasst mehrere Reisen in einer Mail zusammen", () => {
    const m = alsSammelMail({
      reisende: "Erika Muster",
      zeitraum: "Oktober 2026",
      reisen: [
        { begruendung: "Messe <A>", zeitraum: "14.10.", betrag: "120,00 €" },
        { begruendung: "Kunde", zeitraum: "21.10.", betrag: "30,00 €" },
      ],
      gesamt: "150,00 €",
      link: "https://example.invalid/freigaben",
    });
    expect(m.betreff).toBe("Abrechnung zur Genehmigung: Erika Muster – Oktober 2026 (2 Abrechnungen, 150,00 €)");
    expect(m.text).toContain("• 21.10. – Kunde: 30,00 €");
    expect(m.html).toContain("Messe &lt;A&gt;");
  });
});
