import { describe, expect, it } from "vitest";
import { kategorieName, monatsnameIn, texte, wochentagName, WOERTERBUECHER } from "./woerterbuch";
import { landNameIn } from "./land";
import { uebersetzeMeldung } from "./meldungen";
import { alsSprache, spracheBeimLogin } from "./sprache";

type Eintrag = { pfad: string; art: string; wert: unknown };

/** Alle Blätter eines Wörterbuchs mit Pfad, z. B. "rahmen.kopfzeile.belege" */
function blaetter(objekt: unknown, pfad = ""): Eintrag[] {
  if (typeof objekt === "string" || typeof objekt === "function" || Array.isArray(objekt)) {
    return [{ pfad, art: Array.isArray(objekt) ? "array" : typeof objekt, wert: objekt }];
  }
  return Object.entries(objekt as Record<string, unknown>).flatMap(([k, v]) => blaetter(v, pfad ? `${pfad}.${k}` : k));
}

const de = blaetter(WOERTERBUECHER.de);
const en = blaetter(WOERTERBUECHER.en);

/** Felder, die auf Deutsch bewusst leer sind (Hinweise nur für die englische Fassung) */
const NUR_ENGLISCH = /\.pdfHinweis$/;

describe("Wörterbücher", () => {
  it("Englisch hat genau die Schlüssel des deutschen Wörterbuchs", () => {
    expect(en.map((e) => e.pfad)).toEqual(de.map((e) => e.pfad));
  });

  it("Texte, Funktionen und Listen haben in beiden Sprachen dieselbe Form", () => {
    const enNachPfad = new Map(en.map((e) => [e.pfad, e]));
    for (const d of de) {
      const e = enNachPfad.get(d.pfad)!;
      expect(e.art, d.pfad).toBe(d.art);
      if (d.art === "function") expect((e.wert as () => string).length, d.pfad).toBe((d.wert as () => string).length);
      if (d.art === "array") expect((e.wert as unknown[]).length, d.pfad).toBe((d.wert as unknown[]).length);
    }
  });

  it("kein englischer Text ist leer", () => {
    const leer = en.filter((e) => (e.art === "string" && !(e.wert as string).trim()) || (e.art === "array" && (e.wert as string[]).some((z) => !z.trim())));
    expect(leer.map((e) => e.pfad)).toEqual([]);
  });

  it("kein deutscher Text ist leer, außer den reinen Englisch-Hinweisen", () => {
    const leer = de.filter((e) => e.art === "string" && !(e.wert as string).trim() && !NUR_ENGLISCH.test(e.pfad));
    expect(leer.map((e) => e.pfad)).toEqual([]);
  });

  it("alle Standardkategorien sind übersetzt", () => {
    expect(Object.keys(texte("en").allgemein.kategorie).sort()).toEqual(Object.keys(texte("de").allgemein.kategorie).sort());
  });
});

describe("Anzeigehelfer", () => {
  it("Kategorien: auf Deutsch die DB-Bezeichnung, auf Englisch die Übersetzung, eigene bleiben deutsch", () => {
    expect(kategorieName("de", "bahn", "Bahnticket (umbenannt)")).toBe("Bahnticket (umbenannt)");
    expect(kategorieName("en", "bahn", "Zugticket")).toBe("Train ticket");
    expect(kategorieName("en", "eigene_kategorie", "Eigene Kategorie")).toBe("Eigene Kategorie");
  });

  it("Monate, Wochentage, Länder", () => {
    expect(monatsnameIn("2026-03", "de")).toBe("März 2026");
    expect(monatsnameIn("2026-03", "en")).toBe("March 2026");
    expect(wochentagName("2026-10-23", "de")).toBe("Fr");
    expect(wochentagName("2026-10-23", "en")).toBe("Fri");
    expect(landNameIn("FR", "en", 2026)).toBe("France");
    expect(landNameIn("CH:Genf", "de", 2026)).toBe("Schweiz – Genf");
    expect(landNameIn("CH:Genf", "en", 2026)).toBe("Switzerland – Genf");
  });

  it("deutsche Meldungen aus Hilfsmodulen werden für die Anzeige übersetzt", () => {
    expect(uebersetzeMeldung("Ende muss nach dem Beginn liegen", "en")).toBe("The end must be after the start");
    expect(uebersetzeMeldung("„Kölle“ wurde nicht gefunden. Bitte genauer angeben, z. B. mit Postleitzahl.", "en")).toContain("“Kölle” was not found");
    expect(uebersetzeMeldung("Ende muss nach dem Beginn liegen", "de")).toBe("Ende muss nach dem Beginn liegen");
    expect(uebersetzeMeldung("Unbekannte Meldung", "en")).toBe("Unbekannte Meldung");
  });

  it("unbekannte Sprachwerte fallen auf Deutsch zurück", () => {
    expect(alsSprache("en")).toBe("en");
    expect(alsSprache("fr")).toBe("de");
    expect(alsSprache(undefined)).toBe("de");
  });
});

describe("Sprache beim Login", () => {
  it("die Wahl auf der Login-Seite kommt ins Profil, wenn sie abweicht", () => {
    expect(spracheBeimLogin("en", true, "de")).toEqual({ sprache: "en", insProfil: true });
    expect(spracheBeimLogin("en", true, "en")).toEqual({ sprache: "en", insProfil: false });
    expect(spracheBeimLogin("de", true, "en")).toEqual({ sprache: "de", insProfil: true });
  });

  it("ohne Wahl auf der Login-Seite gilt das Profil – ein altes Cookie überschreibt es nicht", () => {
    expect(spracheBeimLogin("en", false, "de")).toEqual({ sprache: "de", insProfil: false });
    expect(spracheBeimLogin(undefined, false, "en")).toEqual({ sprache: "en", insProfil: false });
    expect(spracheBeimLogin(undefined, false, null)).toEqual({ sprache: "de", insProfil: false });
  });

  it("ungültige Cookie-Werte werden ignoriert", () => {
    expect(spracheBeimLogin("fr", true, "en")).toEqual({ sprache: "en", insProfil: false });
  });
});
