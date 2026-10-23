import { describe, expect, it } from "vitest";
import { formatIban, istGueltigeIban, normalisiereIban } from "./iban";

// Offizielle Beispiel-IBANs (keine echten Konten)
describe("IBAN", () => {
  it("normalisiert Leerzeichen und Kleinbuchstaben", () => {
    expect(normalisiereIban(" de89 3704 0044 0532 0130 00 ")).toBe("DE89370400440532013000");
  });

  it("akzeptiert gültige IBANs", () => {
    expect(istGueltigeIban("DE89370400440532013000")).toBe(true);
    expect(istGueltigeIban("GB82WEST12345698765432")).toBe(true);
  });

  it("lehnt falsche Prüfziffer und Länge ab", () => {
    expect(istGueltigeIban("DE89370400440532013001")).toBe(false);
    expect(istGueltigeIban("DE8937040044053201300")).toBe(false);
    expect(istGueltigeIban("")).toBe(false);
  });

  it("formatiert in Viererblöcken", () => {
    expect(formatIban("DE89370400440532013000")).toBe("DE89 3704 0044 0532 0130 00");
  });
});
