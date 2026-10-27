import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { berechneAbrechnung } from "@/lib/reisekosten/abrechnung";
import { erzeugeAbrechnungsPdf, erzeugePdfMitBelegen, winAnsi, type AbrechnungsDokument, type BelegDatei } from "./abrechnung-pdf";

// Erfundene Testdaten
const dokument: AbrechnungsDokument = {
  belegNr: "RK-2026-0001",
  buchungsmonat: "10/2026",
  erstelltAm: "23.10.2026",
  reisende: { name: "Erika Muster", personalnummer: "0815", wohnort: "Musterstadt" },
  kostenstelle: "100",
  begruendung: "Messe – Planung „Neubau“",
  reiseweg: "Köln – Essen – Köln",
  ausland: null,
  projekt: null,
  besuchteStellen: "Beispiel GmbH",
  abfahrt: "21.10.2026, 07:00",
  rueckkehr: "23.10.2026, 18:00",
  verkehrsmittel: "Eisenbahn",
  verpflegung: [{ datum: "21.10.2026", art: "An-/Abreise", pauschale: 1400, kuerzung: 0, betrag: 1400 }],
  verpflegungBemerkung: null,
  fahrten: [{ datum: "21.10.2026", strecke: "Köln – Essen", zweck: null, km: 63 }],
  belege: [
    { nr: 1, datum: "21.10.2026", kategorie: "Zugticket", beschreibung: null, brutto: 8990, mwstProzent: 7, mitDatei: true, angaben: "Anlass: Messe – Planung ".repeat(8) },
  ],
  abrechnung: berechneAbrechnung({
    belege: [{ kategorieId: "bahn", abschnitt: "A", bezeichnung: "Zugticket", konto: "1000", betragCent: 8990, mwstProzent: 7 }],
    verpflegung: null,
    kmGeld: null,
    kmKategorie: { bezeichnung: "Km-Geld", konto: null },
    verpflegungKategorie: { bezeichnung: "Verpflegung", konto: null },
    vorschussCent: 0,
  }),
  verlauf: [{ zeit: "22.10.26, 09:00", aktion: "Eingereicht", person: "Erika Muster", kommentar: null }],
};

async function testbildPng(): Promise<Uint8Array> {
  // 1×1-PNG
  return Uint8Array.from(
    atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="),
    (c) => c.charCodeAt(0),
  );
}

describe("winAnsi", () => {
  it("behält Umlaute, Euro und Anführungszeichen, ersetzt Minuszeichen", () => {
    expect(winAnsi("Übernachtung – „Köln“ −5,60 € ß")).toBe("Übernachtung – „Köln“ -5,60 € ß");
  });
  it("ersetzt nicht darstellbare Zeichen", () => {
    expect(winAnsi("Łódź ✓")).toBe("?ód? ?");
  });
});

describe("Abrechnungs-PDF", () => {
  it("erzeugt ein gültiges PDF", async () => {
    const doc = await erzeugeAbrechnungsPdf(dokument);
    const bytes = await doc.save();
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(doc.getPageCount()).toBe(1);
  });

  it("Auslagenabrechnung nach FB 21", async () => {
    const auslagen: AbrechnungsDokument = {
      ...dokument,
      art: "auslagen",
      monat: "Oktober 2026",
      belegNr: "AL-2026-0001",
      reiseweg: "",
      fahrten: [],
      verpflegung: [],
      belege: [
        {
          nr: 1,
          datum: "17.10.2026",
          kategorie: "Material",
          beschreibung: "Aufbau Mockup",
          brutto: 30081,
          mwstProzent: 19,
          mitDatei: true,
          lieferant: "Baumarkt Beispiel",
          kostenstelle: "100",
          zahlungsart: "ec",
        },
      ],
    };
    const doc = await erzeugeAbrechnungsPdf(auslagen);
    expect(doc.getTitle()).toBe("Auslagenabrechnung AL-2026-0001 Erika Muster");
    expect(doc.getPageCount()).toBe(1);
  });

  it("hängt Bilder und PDFs an, HEIC separat", async () => {
    const anhang = await PDFDocument.create();
    anhang.addPage();
    anhang.addPage();
    const dateien: BelegDatei[] = [
      { nr: 1, name: "1.png", contentType: "image/png", inhalt: await testbildPng(), beschriftung: "Übernachtung · Person: Erika Muster · Anlass: Messe" },
      { nr: 2, name: "2.pdf", contentType: "application/pdf", inhalt: await anhang.save(), beschriftung: "Auto tanken · Kfz: K-AB 123 ".repeat(20) },
      { nr: 3, name: "3.heic", contentType: "image/heic", inhalt: new Uint8Array(10) },
    ];
    const { teile, separat } = await erzeugePdfMitBelegen(dokument, dateien, 10_000_000);
    expect(teile).toHaveLength(1);
    expect((await PDFDocument.load(teile[0])).getPageCount()).toBe(1 + 1 + 2);
    expect(separat.map((s) => s.name)).toEqual(["3.heic"]);
  });

  it("verteilt große Belege auf mehrere Teile", async () => {
    const png = await testbildPng();
    const gross = (nr: number): BelegDatei => ({ nr, name: `${nr}.png`, contentType: "image/png", inhalt: png });
    const einzeln = (await (await erzeugeAbrechnungsPdf(dokument)).save()).byteLength;
    const { teile } = await erzeugePdfMitBelegen(dokument, [gross(1), gross(2)], einzeln + png.byteLength + 1);
    expect(teile).toHaveLength(2);
  });
});
