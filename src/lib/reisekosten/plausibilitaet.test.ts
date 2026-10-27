import { describe, expect, it } from "vitest";
import { pruefePlausibilitaet, type PlausiBeleg, type PlausiReise } from "./plausibilitaet";

const reise: PlausiReise = {
  beginn: "2026-10-21T07:00",
  ende: "2026-10-23T18:00",
  mitUebernachtung: true,
  verkehrsmittel: ["eisenbahn"],
  mahlzeiten: {},
};

function beleg(kategorieId: string, extra: Partial<PlausiBeleg> = {}): PlausiBeleg {
  return { kategorieId, bezeichnung: kategorieId, datum: "2026-10-21", betragCent: 1000, hatDatei: true, ...extra };
}

describe("pruefePlausibilitaet", () => {
  it("saubere Reise ohne Hinweise", () => {
    expect(pruefePlausibilitaet(reise, [beleg("bahn"), beleg("uebernachtung")], [])).toEqual([]);
  });

  it("eintägige Reise ohne Belege ist unauffällig", () => {
    const eintaegig = { ...reise, ende: "2026-10-21T18:00", mitUebernachtung: false };
    expect(pruefePlausibilitaet(eintaegig, [], [])).toEqual([]);
  });

  it("Beleg außerhalb des Zeitraums", () => {
    const h = pruefePlausibilitaet(reise, [beleg("uebernachtung"), beleg("taxi", { datum: "2026-10-25" })], []);
    expect(h).toEqual([expect.stringContaining("außerhalb des Reisezeitraums: taxi")]);
  });

  it("Doppelbeleg", () => {
    const h = pruefePlausibilitaet(reise, [beleg("uebernachtung"), beleg("taxi"), beleg("taxi")], []);
    expect(h).toEqual([expect.stringContaining("Doppelbeleg")]);
  });

  it("eigener PKW ohne Fahrten und Fahrten ohne PKW", () => {
    expect(pruefePlausibilitaet({ ...reise, verkehrsmittel: ["eigener_pkw"] }, [beleg("uebernachtung")], [])[0]).toContain(
      "keine Fahrten",
    );
    expect(pruefePlausibilitaet(reise, [beleg("uebernachtung")], [{ datum: "2026-10-21" }])[0]).toContain("nicht als Verkehrsmittel");
  });

  it("Tanken neben Km-Geld", () => {
    const h = pruefePlausibilitaet({ ...reise, verkehrsmittel: ["eigener_pkw"] }, [beleg("uebernachtung"), beleg("tanken")], [
      { datum: "2026-10-21" },
    ]);
    expect(h).toEqual([expect.stringContaining("Tankbelege und Km-Geld")]);
  });

  it("Übernachtung ohne Hotelrechnung und Hotelrechnung ohne Übernachtung", () => {
    expect(pruefePlausibilitaet(reise, [], [])).toEqual([expect.stringContaining("keine Hotelrechnung")]);
    const ohne = { ...reise, mitUebernachtung: false };
    expect(pruefePlausibilitaet(ohne, [beleg("uebernachtung")], [])).toEqual([expect.stringContaining("ohne Übernachtung")]);
  });

  it("Hotelfrühstück bezahlt, aber nicht als gestellt markiert", () => {
    const belege = [beleg("uebernachtung"), beleg("hotel_fruehstueck")];
    expect(pruefePlausibilitaet(reise, belege, [])).toEqual([expect.stringContaining("Frühstück")]);
    const markiert = { ...reise, mahlzeiten: { "2026-10-22": { fruehstueck: true } } };
    expect(pruefePlausibilitaet(markiert, belege, [])).toEqual([]);
  });

  it("fehlendes Belegfoto, außer bei Trinkgeld", () => {
    const h = pruefePlausibilitaet(reise, [beleg("uebernachtung", { hatDatei: false }), beleg("trinkgeld", { hatDatei: false })], []);
    expect(h).toEqual(["Ohne Belegfoto: uebernachtung."]);
  });

  it("Fahrt weicht deutlich von der Route ab", () => {
    const pkw = { ...reise, verkehrsmittel: ["eigener_pkw" as const] };
    const passend = { datum: "2026-10-21", km: 150, km_route: 145.7 };
    const abweichend = { datum: "2026-10-21", km: 220, km_route: 145.7 };
    expect(pruefePlausibilitaet(pkw, [beleg("uebernachtung")], [passend])).toEqual([]);
    expect(pruefePlausibilitaet(pkw, [beleg("uebernachtung")], [abweichend])).toEqual([expect.stringContaining("berechneten Route")]);
  });

  it("Pauschale nicht berechenbar (z. B. unbekanntes Land)", () => {
    expect(pruefePlausibilitaet({ ...reise, land: "XX" }, [beleg("uebernachtung")], [])).toEqual([expect.stringContaining("Verpflegungspauschale kann nicht berechnet")]);
    expect(pruefePlausibilitaet({ ...reise, land: "AT" }, [beleg("uebernachtung")], [])).toEqual([]);
  });
});

describe("pruefePlausibilitaet für Auslagen", () => {
  const auslagen: PlausiReise = { ...reise, beginn: "2026-10-01T00:00", ende: "2026-10-31T23:59", mitUebernachtung: false, verkehrsmittel: [], art: "auslagen" };
  const einkauf = (extra: Partial<PlausiBeleg> = {}) => beleg("aus_material", { datum: "2026-10-17", beschreibung: "Aufbau Mockup", ...extra });

  it("vollständige Auslagen ohne Hinweise – keine Reiseprüfungen", () => {
    expect(pruefePlausibilitaet(auslagen, [einkauf()], [])).toEqual([]);
  });

  it("ohne Belege", () => {
    expect(pruefePlausibilitaet(auslagen, [], [])).toEqual(["Es ist noch kein Beleg erfasst."]);
  });

  it("fehlender Zweck, Beleg aus dem Vormonat und ohne Foto", () => {
    const h = pruefePlausibilitaet(auslagen, [einkauf({ beschreibung: " ", datum: "2026-09-30", hatDatei: false })], []);
    expect(h).toEqual([
      expect.stringContaining("außerhalb des Abrechnungsmonats"),
      expect.stringContaining("fehlt der Zweck"),
      expect.stringContaining("Ohne Belegfoto"),
    ]);
  });

  it("über 250 € muss die Rechnung auf Polycare lauten, genau 250 € nicht", () => {
    expect(pruefePlausibilitaet(auslagen, [einkauf({ betragCent: 25000 })], [])).toEqual([]);
    expect(pruefePlausibilitaet(auslagen, [einkauf({ betragCent: 30081 })], [])).toEqual([expect.stringContaining("auf Polycare ausgestellt")]);
  });

  it("möglicher Doppelbeleg", () => {
    expect(pruefePlausibilitaet(auslagen, [einkauf(), einkauf()], [])).toEqual([expect.stringContaining("Doppelbeleg")]);
  });
});
