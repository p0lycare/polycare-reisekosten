import { describe, expect, it } from "vitest";
import { centAlsEingabe, parseEuro } from "./geld";

describe("parseEuro", () => {
  it.each([
    ["12,50", 1250],
    ["12,5", 1250],
    ["12", 1200],
    ["1.234,56", 123456],
    ["1.234", 123400],
    ["12.50", 1250],
    [" 89,90 € ", 8990],
    ["0,07", 7],
  ])("%s → %i Cent", (eingabe, cent) => {
    expect(parseEuro(eingabe)).toBe(cent);
  });

  it.each(["", "abc", "12,505", "-5", "1,2,3"])("%s ist ungültig", (eingabe) => {
    expect(parseEuro(eingabe)).toBeNull();
  });
});

describe("centAlsEingabe", () => {
  it("formatiert mit Komma", () => {
    expect(centAlsEingabe(1250)).toBe("12,50");
    expect(centAlsEingabe(7)).toBe("0,07");
  });
});
