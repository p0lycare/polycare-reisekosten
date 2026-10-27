import { describe, expect, it } from "vitest";
import { datevAdresseFuer } from "./adresse";

const beide = { datev_upload_mail: "reise@upload.example", datev_upload_mail_auslagen: "auslagen@upload.example" };

describe("datevAdresseFuer", () => {
  it("wählt die Adresse nach Art der Abrechnung", () => {
    expect(datevAdresseFuer("reise", beide)).toBe("reise@upload.example");
    expect(datevAdresseFuer("auslagen", beide)).toBe("auslagen@upload.example");
  });

  it("Auslagen ohne eigene Adresse gehen an die Reisekosten-Adresse", () => {
    expect(datevAdresseFuer("auslagen", { ...beide, datev_upload_mail_auslagen: null })).toBe("reise@upload.example");
  });

  it("ohne Einstellungen keine Adresse", () => {
    expect(datevAdresseFuer("reise", null)).toBeNull();
  });
});
