import { describe, expect, it } from "vitest";
import { monatsgrenzen } from "./monat";

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
