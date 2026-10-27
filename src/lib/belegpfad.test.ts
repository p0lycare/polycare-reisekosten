import { describe, expect, it } from "vitest";
import { eingangPfad, istBelegPfad } from "./belegpfad";

const u = "11111111-1111-1111-1111-111111111111";
const r = "22222222-2222-2222-2222-222222222222";
const f = "33333333-3333-3333-3333-333333333333";

describe("istBelegPfad", () => {
  it("akzeptiert eigene Pfade", () => {
    expect(istBelegPfad(`${u}/${r}/${f}.jpg`, u, r)).toBe(true);
    expect(istBelegPfad(`${u}/${r}/${f}.pdf`, u, r)).toBe(true);
  });

  it("lehnt fremde Reise, fremde Person und Pfad-Tricks ab", () => {
    expect(istBelegPfad(`${u}/${f}/${f}.jpg`, u, r)).toBe(false);
    expect(istBelegPfad(`${f}/${r}/${f}.jpg`, u, r)).toBe(false);
    expect(istBelegPfad(`${u}/${r}/../../${f}/${r}/${f}.jpg`, u, r)).toBe(false);
    expect(istBelegPfad(`${u}/${r}/${f}.exe`, u, r)).toBe(false);
    // Neue Uploads nur einbettbar, gespeicherte Altformate bleiben verwendbar
    expect(istBelegPfad(`${u}/${r}/${f}.heic`, u, r)).toBe(false);
    expect(istBelegPfad(`${u}/${r}/${f}.heic`, u, r, true)).toBe(true);
    expect(istBelegPfad(`${u}/${r}/${f}.exe`, u, r, true)).toBe(false);
    expect(istBelegPfad(`${u}/${r}/name.jpg`, u, r)).toBe(false);
  });
});

describe("Belegeingang", () => {
  it("Eingangsfotos sind für die eigene Person gültig", () => {
    expect(istBelegPfad(`${u}/eingang/${f}.jpg`, u, r)).toBe(true);
    expect(eingangPfad(`${u}/eingang/${f}.jpg`, u)).toBe(true);
    expect(eingangPfad(`${u}/${r}/${f}.jpg`, u)).toBe(false);
    expect(eingangPfad(`${f}/eingang/${f}.jpg`, u)).toBe(false);
  });
});
