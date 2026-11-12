import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { entferneVerwaisteObjektStreams } from "./pdf-reparatur";

/**
 * Baut ein PDF nach dem Muster der DB-Rechnung (RK-2026-0004): klassische xref-Tabelle, daneben ein
 * veralteter Objekt-Container, der eine andere "Nummer 1" enthält als der echte Katalog.
 */
function pdfMitVeraltetemObjektStream(mitXRefStm = false): Uint8Array {
  const alt = "1 0 << /S /Div /K [ 2 0 R ] >>";
  const objekte = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [ 3 0 R ] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 300 400 ] >>",
    `<< /Type /ObjStm /N 1 /First 4 /Length ${alt.length} >>\nstream\n${alt}\nendstream`,
  ];
  let text = "%PDF-1.7\n";
  const offsets: number[] = [];
  objekte.forEach((o, i) => {
    offsets.push(text.length);
    text += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = text.length;
  text += `xref\n0 ${objekte.length + 1}\n0000000000 65535 f \n`;
  text += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  text += `trailer\n<< /Size ${objekte.length + 1} /Root 1 0 R${mitXRefStm ? " /XRefStm 0" : ""} >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(text);
}

describe("entferneVerwaisteObjektStreams", () => {
  it("pdf-lib scheitert am Original, die reparierte Kopie lädt mit allen Seiten", async () => {
    const original = pdfMitVeraltetemObjektStream();
    // Der veraltete Container überschreibt den Katalog – spätestens beim Zugriff auf die Seiten scheitert pdf-lib
    await expect(PDFDocument.load(original).then((d) => d.getPageCount())).rejects.toThrow();

    const repariert = entferneVerwaisteObjektStreams(original);
    expect(repariert).not.toBeNull();
    expect(repariert!.byteLength).toBe(original.byteLength); // Offsets bleiben gültig
    const doc = await PDFDocument.load(repariert!);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getSize()).toEqual({ width: 300, height: 400 });
  });

  it("lässt Dateien in Ruhe, deren Objekt-Container noch gebraucht werden", () => {
    expect(entferneVerwaisteObjektStreams(pdfMitVeraltetemObjektStream(true))).toBeNull();
  });

  it("lässt Dateien ohne Objekt-Container in Ruhe", async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    expect(entferneVerwaisteObjektStreams(await doc.save({ useObjectStreams: false }))).toBeNull();
  });

  it("lässt Dateien mit xref-Stream in Ruhe (dort sind die Container gültig)", async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    expect(entferneVerwaisteObjektStreams(await doc.save({ useObjectStreams: true }))).toBeNull();
  });
});
