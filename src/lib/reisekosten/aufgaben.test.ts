import { describe, expect, it } from "vitest";
import { verteileAufgaben } from "./freigaben";

type Rolle = "mitarbeiter" | "freigeber" | "buchhaltung" | "admin";
const reise = (status: "eingereicht" | "freigegeben" | "geprueft", mitarbeiter_id: string, rolle: Rolle, vorgesetzter_id: string | null, freigeber_id: string | null = null) => ({
  status,
  mitarbeiter_id,
  freigeber_id,
  mitarbeiter: { vorgesetzter_id, rolle },
});

describe("verteileAufgaben – Vier-Augen-Prinzip", () => {
  it("wer genehmigt hat, prüft keine Reisen von Mitarbeitenden", () => {
    const a = verteileAufgaben([reise("freigegeben", "ma", "mitarbeiter", "silvia", "silvia")], "silvia", "buchhaltung");
    expect(a.pruefen).toEqual([]);
  });

  it("Ausnahme: Reisen der Buchhaltung darf die genehmigende Person auch prüfen", () => {
    const a = verteileAufgaben([reise("freigegeben", "silvia", "buchhaltung", "andreas", "andreas")], "andreas", "admin");
    expect(a.pruefen).toHaveLength(1);
  });

  it("Ausnahme: Reisen von Admins prüft die Buchhaltung auch nach eigener Genehmigung", () => {
    const a = verteileAufgaben([reise("freigegeben", "andreas", "admin", "silvia", "silvia")], "silvia", "buchhaltung");
    expect(a.pruefen).toHaveLength(1);
  });

  it("eigene Reisen tauchen nie als Aufgabe auf", () => {
    const a = verteileAufgaben([reise("eingereicht", "silvia", "buchhaltung", "andreas"), reise("geprueft", "silvia", "buchhaltung", "andreas")], "silvia", "buchhaltung");
    expect([...a.genehmigen, ...a.pruefen, ...a.auszahlen]).toEqual([]);
  });

  it("Führungskraft genehmigt ihr Team", () => {
    const a = verteileAufgaben([reise("eingereicht", "felix", "mitarbeiter", "michel")], "michel", "freigeber");
    expect(a.genehmigen).toHaveLength(1);
  });
});
