import { describe, expect, it } from "vitest";
import { angabenText, fehlendeAngaben, nurPflichtangaben, vorbelegung } from "./pflichtangaben";

const leer = { anlass: null, person: null, kfzKennzeichen: null };

describe("Pflichtangaben", () => {
  it("meldet fehlende Angaben je Kategorie", () => {
    expect(fehlendeAngaben(["person", "anlass"], { ...leer, person: "Erika Muster", anlass: "  " })).toEqual(["anlass"]);
    expect(fehlendeAngaben(["kfz"], { ...leer, kfzKennzeichen: "K-AB 123" })).toEqual([]);
    expect(fehlendeAngaben([], leer)).toEqual([]);
  });

  it("belegt aus der Reise vor", () => {
    expect(vorbelegung({ begruendung: "Messe", reiseweg: "Köln – Berlin – Köln", kfz_kennzeichen: "K-AB 123" }, "Erika Muster")).toEqual({
      anlass: "Messe – Köln – Berlin – Köln",
      person: "Erika Muster",
      kfzKennzeichen: "K-AB 123",
    });
  });

  it("mit Mietwagen kein Kennzeichen vorbelegen", () => {
    const reise = { begruendung: "Messe", reiseweg: "", kfz_kennzeichen: "K-AB 123", verkehrsmittel: ["eigener_pkw", "mietwagen"] };
    expect(vorbelegung(reise, "Erika Muster").kfzKennzeichen).toBeNull();
  });

  it("speichert nur verlangte Angaben", () => {
    expect(nurPflichtangaben(["kfz"], { anlass: "Messe", person: "Erika", kfzKennzeichen: " K-AB 123 " })).toEqual({
      anlass: null,
      person: null,
      kfzKennzeichen: "K-AB 123",
    });
  });

  it("Text für PDF und Liste", () => {
    expect(angabenText({ person: "Erika Muster", anlass: "Messe" })).toBe("Person: Erika Muster · Anlass: Messe");
    expect(angabenText({ bewirtungAnlass: "Projektstart", bewirtungTeilnehmer: "Max Beispiel (Beispiel GmbH)" })).toBe(
      "Anlass: Projektstart · Bewirtete Personen: Max Beispiel (Beispiel GmbH)",
    );
  });
});
