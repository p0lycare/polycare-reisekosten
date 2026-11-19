import { describe, expect, it } from "vitest";
import { brauchtRueckfall, genehmigungsrecht, heuteBerlin, istAktiv, pruefeVertretung, vertreteneHeute, type Vertretung } from "./vertretung";
import { verteileAufgaben, verteileVorschuesse } from "./freigaben";

// Michel genehmigt Felix und Vera. Vera vertritt Michel im Urlaub.
const urlaub: Vertretung = { vertretene_id: "michel", vertreter_id: "vera", von: "2026-12-21", bis: "2027-01-06", bis_auf_weiteres: false };
const felix = { id: "felix", vorgesetzter_id: "michel" };
const vera = { id: "vera", vorgesetzter_id: "michel" };

describe("istAktiv – Zeitraum der Vertretung", () => {
  it("gilt ganztägig vom ersten bis zum letzten Tag", () => {
    expect(istAktiv(urlaub, "2026-12-20")).toBe(false);
    expect(istAktiv(urlaub, "2026-12-21")).toBe(true);
    expect(istAktiv(urlaub, "2027-01-06")).toBe(true);
    expect(istAktiv(urlaub, "2027-01-07")).toBe(false);
  });

  it("„bis auf Weiteres“ gilt ab Beginn ohne Ende", () => {
    const offen = { ...urlaub, bis: null, bis_auf_weiteres: true };
    expect(istAktiv(offen, "2026-12-20")).toBe(false);
    expect(istAktiv(offen, "2030-05-01")).toBe(true);
  });

  it("ohne Ende und ohne „bis auf Weiteres“ gilt sie nicht", () => {
    expect(istAktiv({ ...urlaub, bis: null }, "2026-12-22")).toBe(false);
  });

  it("vertreteneHeute liefert nur aktive Vertretungen der Person", () => {
    const andere: Vertretung = { ...urlaub, vertretene_id: "andreas", von: "2027-02-01", bis: "2027-02-10" };
    expect(vertreteneHeute([urlaub, andere], "vera", "2026-12-24")).toEqual(["michel"]);
    expect(vertreteneHeute([urlaub, andere], "vera", "2027-02-05")).toEqual(["andreas"]);
    expect(vertreteneHeute([urlaub], "silvia", "2026-12-24")).toEqual([]);
  });

  it("heuteBerlin rechnet in deutscher Zeit (kurz nach Mitternacht schon der neue Tag)", () => {
    expect(heuteBerlin(new Date("2026-12-20T23:30:00Z"))).toBe("2026-12-21");
    expect(heuteBerlin(new Date("2026-07-01T21:59:00Z"))).toBe("2026-07-01");
  });
});

describe("genehmigungsrecht – wer wann genehmigen darf", () => {
  it("während der Vertretung darf die Vertretung genehmigen – mit „in Vertretung für“", () => {
    expect(genehmigungsrecht({ id: "vera", rolle: "freigeber" }, felix, ["michel"])).toEqual({ darf: true, inVertretungFuer: "michel" });
  });

  it("außerhalb des Zeitraums nicht", () => {
    const vertretene = vertreteneHeute([urlaub], "vera", "2027-01-07");
    expect(genehmigungsrecht({ id: "vera", rolle: "freigeber" }, felix, vertretene)).toEqual({ darf: false });
  });

  it("die vertretene Person behält ihr Recht", () => {
    expect(genehmigungsrecht({ id: "michel", rolle: "freigeber" }, felix, [])).toEqual({ darf: true, inVertretungFuer: null });
  });

  it("Vier-Augen: die Vertretung genehmigt nie die eigene Abrechnung", () => {
    expect(genehmigungsrecht({ id: "vera", rolle: "freigeber" }, vera, ["michel"])).toEqual({ darf: false });
  });

  it("Rückfall: reicht die Vertretung selbst ein, bleiben die vertretene Person und Admins zuständig", () => {
    expect(brauchtRueckfall(vera, [urlaub], "2026-12-24")).toBe(true);
    expect(brauchtRueckfall(felix, [urlaub], "2026-12-24")).toBe(false);
    expect(brauchtRueckfall(vera, [urlaub], "2027-01-10")).toBe(false);
    expect(genehmigungsrecht({ id: "michel", rolle: "freigeber" }, vera, [])).toEqual({ darf: true, inVertretungFuer: null });
    expect(genehmigungsrecht({ id: "andreas", rolle: "admin" }, vera, [])).toEqual({ darf: true, inVertretungFuer: null });
  });

  it("Vertretung gilt nur für Personen mit der vertretenen Person als „Genehmigt durch“", () => {
    expect(genehmigungsrecht({ id: "vera", rolle: "buchhaltung" }, { id: "olaf", vorgesetzter_id: "andreas" }, ["michel"])).toEqual({ darf: false });
    // ohne Eintrag gilt die bisherige Regel (jede Führungskraft) – keine Vertretung nötig, keine Erweiterung
    expect(genehmigungsrecht({ id: "vera", rolle: "buchhaltung" }, { id: "olaf", vorgesetzter_id: null }, ["michel"])).toEqual({ darf: false });
  });

  it("eigenes Recht geht vor: kein „in Vertretung“, wenn man ohnehin genehmigen darf", () => {
    expect(genehmigungsrecht({ id: "andreas", rolle: "admin" }, felix, ["michel"])).toEqual({ darf: true, inVertretungFuer: null });
  });

  it("eine Vertretung mit Rolle Mitarbeiter/in darf nicht genehmigen", () => {
    expect(genehmigungsrecht({ id: "vera", rolle: "mitarbeiter" }, felix, ["michel"])).toEqual({ darf: false });
  });

  it("Vertretungen werden nicht weitergereicht (keine Kette)", () => {
    // Vera vertritt Michel, Silvia vertritt Vera – Silvia darf Felix (Michels Team) nicht genehmigen
    expect(genehmigungsrecht({ id: "silvia", rolle: "buchhaltung" }, felix, ["vera"])).toEqual({ darf: false });
  });
});

describe("Freigabeliste mit Vertretung", () => {
  const reise = (mitarbeiter_id: string, vorgesetzter_id: string | null) => ({
    status: "eingereicht" as const,
    mitarbeiter_id,
    freigeber_id: null,
    mitarbeiter: { vorgesetzter_id, rolle: "mitarbeiter" as const },
  });

  it("die Vertretung sieht die offenen Freigaben mit Hinweis, ihre eigene nicht", () => {
    const a = verteileAufgaben([reise("felix", "michel"), reise("vera", "michel"), reise("olaf", "andreas")], "vera", "buchhaltung", ["michel"]);
    expect(a.genehmigen.map((r) => [r.mitarbeiter_id, r.inVertretungFuer])).toEqual([["felix", "michel"]]);
  });

  it("ohne aktive Vertretung bleibt alles wie bisher", () => {
    const a = verteileAufgaben([reise("felix", "michel")], "vera", "freigeber");
    expect(a.genehmigen).toEqual([]);
  });

  it("Vorschüsse folgen derselben Regel", () => {
    const v = (mitarbeiter_id: string) => ({ status: "beantragt" as const, mitarbeiter_id, mitarbeiter: { vorgesetzter_id: "michel" } });
    expect(verteileVorschuesse([v("felix"), v("vera")], "vera", "freigeber", ["michel"]).genehmigen.map((x) => x.mitarbeiter_id)).toEqual(["felix"]);
  });
});

describe("pruefeVertretung – Eingaben", () => {
  const basis = { vertreteneId: "michel", vertreterId: "vera", von: "2026-12-21", bis: "2027-01-06", bisAufWeiteres: false };
  it("akzeptiert Zeitraum und „bis auf Weiteres“", () => {
    expect(pruefeVertretung(basis)).toBeNull();
    expect(pruefeVertretung({ ...basis, bis: null, bisAufWeiteres: true })).toBeNull();
  });
  it("lehnt Selbstvertretung, fehlendes Ende und vertauschte Daten ab", () => {
    expect(pruefeVertretung({ ...basis, vertreterId: "michel" })).toBe("selbst");
    expect(pruefeVertretung({ ...basis, bis: null })).toBe("bis");
    expect(pruefeVertretung({ ...basis, bis: "2026-12-01" })).toBe("reihenfolge");
    expect(pruefeVertretung({ ...basis, von: "" })).toBe("von");
  });
});
