import { describe, expect, it } from "vitest";
import { berechneAbrechnung } from "./abrechnung";
import { berechneKmGeld } from "./fahrtkosten";
import { erstelleLohnliste, monatsgrenzen } from "./lohnliste";

// Erfundene Personen und Beträge
function abrechnung(km: number, belegCent: number, vorschuss = 0) {
  return berechneAbrechnung({
    belege: belegCent ? [{ kategorieId: "bahn", abschnitt: "A", bezeichnung: "Zug", konto: null, betragCent: belegCent, mwstProzent: 7 }] : [],
    verpflegung: null,
    kmGeld: km ? berechneKmGeld(km, 38, 30) : null,
    kmKategorie: { bezeichnung: "Km-Geld", konto: null },
    verpflegungKategorie: { bezeichnung: "Verpflegung", konto: null },
    vorschussCent: vorschuss,
  });
}

describe("erstelleLohnliste", () => {
  it("fasst je Person zusammen und trennt steuerfrei/steuerpflichtig", () => {
    const { zeilen, summe } = erstelleLohnliste([
      { mitarbeiterId: "b", name: "Bea Beispiel", personalnummer: "2", belegNr: "RK-2026-0003", abrechnung: abrechnung(0, 5000) },
      { mitarbeiterId: "a", name: "Anton Muster", personalnummer: "1", belegNr: "RK-2026-0002", abrechnung: abrechnung(100, 0) },
      { mitarbeiterId: "a", name: "Anton Muster", personalnummer: "1", belegNr: "RK-2026-0001", abrechnung: abrechnung(26, 1000, 2000) },
    ]);

    expect(zeilen.map((z) => z.name)).toEqual(["Anton Muster", "Bea Beispiel"]);
    const anton = zeilen[0];
    expect(anton.belegNummern).toEqual(["RK-2026-0001", "RK-2026-0002"]);
    // 126 km × 0,38 = 47,88 €, davon 10,08 € steuerpflichtig; dazu 10 € Zug
    expect(anton.erstattung).toBe(4788 + 1000);
    expect(anton.steuerpflichtig).toBe(1008);
    expect(anton.steuerfrei).toBe(4788 + 1000 - 1008);
    expect(anton.auslagen).toBe(0);
    expect(anton.auszuzahlen).toBe(4788 + 1000 - 2000);
    expect(zeilen[1].steuerpflichtig).toBe(0);
    expect(summe.erstattung).toBe(4788 + 1000 + 5000);
  });

  it("leere Liste", () => {
    expect(erstelleLohnliste([]).zeilen).toEqual([]);
  });
});

describe("monatsgrenzen", () => {
  it("normaler Monat und Jahreswechsel", () => {
    expect(monatsgrenzen("2026-10")).toEqual({ von: "2026-10-01", bis: "2026-11-01" });
    expect(monatsgrenzen("2026-12")).toEqual({ von: "2026-12-01", bis: "2027-01-01" });
  });
  it("ungültig", () => {
    expect(monatsgrenzen("2026-13")).toBeNull();
    expect(monatsgrenzen("Oktober")).toBeNull();
  });
});

describe("Auslagen getrennt ausweisen", () => {
  it("Bewirtung und Sonstiges zählen nicht zu § 3 Nr. 16", () => {
    const a = berechneAbrechnung({
      belege: [
        { kategorieId: "bewirtung_19", abschnitt: "E", bezeichnung: "Bewirtung", konto: null, betragCent: 5950, mwstProzent: 19 },
        { kategorieId: "bahn", abschnitt: "A", bezeichnung: "Zug", konto: null, betragCent: 1000, mwstProzent: 7 },
      ],
      verpflegung: null,
      kmGeld: null,
      kmKategorie: { bezeichnung: "Km-Geld", konto: null },
      verpflegungKategorie: { bezeichnung: "Verpflegung", konto: null },
      vorschussCent: 0,
    });
    const [z] = erstelleLohnliste([{ mitarbeiterId: "x", name: "X", personalnummer: null, belegNr: null, abrechnung: a }]).zeilen;
    expect(z.steuerfrei).toBe(1000);
    expect(z.auslagen).toBe(5950);
  });
});
