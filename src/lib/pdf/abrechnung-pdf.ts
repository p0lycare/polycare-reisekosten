import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Abrechnung } from "@/lib/reisekosten/abrechnung";
import { ABSCHNITT_TEXT } from "@/lib/reisekosten/kategorie";

/** Alles, was auf der Abrechnung steht – entspricht dem Formblatt FB 06 */
export type AbrechnungsDokument = {
  belegNr: string | null;
  buchungsmonat: string | null; // "MM/JJJJ"
  erstelltAm: string; // "TT.MM.JJJJ"
  reisende: { name: string; personalnummer: string | null; wohnort: string | null; iban: string | null };
  kostenstelle: string | null;
  begruendung: string;
  reiseweg: string;
  /** Projekt mit Nummer und ggf. Förderkennzeichen */
  projekt: string | null;
  /** Anzeigename des Reiselands, null bei Inlandsreisen */
  ausland: string | null;
  besuchteStellen: string | null;
  abfahrt: string;
  rueckkehr: string;
  verkehrsmittel: string;
  verpflegung: { datum: string; art: string; pauschale: number; kuerzung: number; betrag: number }[];
  verpflegungBemerkung: string | null;
  fahrten: { datum: string; strecke: string; zweck: string | null; km: number }[];
  belege: { nr: number; datum: string; kategorie: string; beschreibung: string | null; brutto: number; mwstProzent: number; mitDatei: boolean }[];
  abrechnung: Abrechnung;
  verlauf: { zeit: string; aktion: string; person: string; kommentar: string | null }[];
};

export type BelegDatei = { nr: number; name: string; contentType: string; inhalt: Uint8Array };

const A4: [number, number] = [595.28, 841.89];
const RAND = 48;
const GRAU = rgb(0.45, 0.45, 0.45);
const LINIE = rgb(0.8, 0.8, 0.8);

const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const fmt = (cent: number) => euro.format(cent / 100);

/** Standardschriften kennen nur WinAnsi – Zeichen außerhalb werden ersetzt */
export function winAnsi(text: string): string {
  return text
    .replace(/[−‐‑]/g, "-")
    .replace(/ | /g, " ")
    .replace(/[^\x20-\x7e -ÿ€„“”‚‘’–—…•]/g, "?");
}

class Layout {
  doc: PDFDocument;
  normal: PDFFont;
  fett: PDFFont;
  seite!: PDFPage;
  y = 0;
  constructor(doc: PDFDocument, normal: PDFFont, fett: PDFFont) {
    this.doc = doc;
    this.normal = normal;
    this.fett = fett;
    this.neueSeite();
  }
  neueSeite() {
    this.seite = this.doc.addPage(A4);
    this.y = A4[1] - RAND;
  }
  platz(hoehe: number) {
    if (this.y - hoehe < RAND) this.neueSeite();
  }
  text(t: string, x: number, opt: { groesse?: number; fett?: boolean; farbe?: ReturnType<typeof rgb>; rechts?: number } = {}) {
    const font = opt.fett ? this.fett : this.normal;
    const groesse = opt.groesse ?? 9;
    const s = winAnsi(t);
    const breite = font.widthOfTextAtSize(s, groesse);
    this.seite.drawText(s, {
      x: opt.rechts !== undefined ? opt.rechts - breite : x,
      y: this.y,
      size: groesse,
      font,
      color: opt.farbe ?? rgb(0.1, 0.1, 0.1),
    });
  }
  /** Kürzt Text auf eine Breite */
  passend(t: string, breite: number, groesse = 9, fett = false): string {
    const font = fett ? this.fett : this.normal;
    let s = winAnsi(t);
    while (s.length > 1 && font.widthOfTextAtSize(s, groesse) > breite) s = s.slice(0, -2) + "…";
    return s;
  }
  zeile(abstand = 13) {
    this.y -= abstand;
  }
  linie() {
    this.seite.drawLine({ start: { x: RAND, y: this.y + 9 }, end: { x: A4[0] - RAND, y: this.y + 9 }, thickness: 0.5, color: LINIE });
  }
  ueberschrift(t: string) {
    this.platz(40);
    this.zeile(10);
    this.text(t, RAND, { groesse: 11, fett: true });
    this.zeile(16);
  }
  feld(label: string, wert: string | null | undefined, x: number, breite: number) {
    this.text(label, x, { groesse: 7, farbe: GRAU });
    this.y -= 10;
    this.text(this.passend(wert || "–", breite), x);
    this.y += 10;
  }
}

const RECHTS = A4[0] - RAND;

/** Erzeugt die Abrechnungsseiten (ohne Belege). */
export async function erzeugeAbrechnungsPdf(d: AbrechnungsDokument): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  doc.setTitle(winAnsi(`Reisekostenabrechnung ${d.belegNr ?? ""} ${d.reisende.name}`.trim()));
  doc.setProducer("Polycare Reisekosten");
  const l = new Layout(doc, await doc.embedFont(StandardFonts.Helvetica), await doc.embedFont(StandardFonts.HelveticaBold));

  // Kopf
  l.text(`Reisekostenabrechnung ${d.ausland ? "Ausland" : "Inland"}`, RAND, { groesse: 16, fett: true });
  l.text(`Beleg-Nr. ${d.belegNr ?? "–"}`, 0, { groesse: 10, fett: true, rechts: RECHTS });
  l.zeile(14);
  l.text(`Buchungsmonat ${d.buchungsmonat ?? "–"} · erstellt am ${d.erstelltAm}`, 0, { groesse: 8, farbe: GRAU, rechts: RECHTS });
  l.zeile(26);

  const spalte = (A4[0] - 2 * RAND) / 4;
  l.feld("Vor- und Zuname", d.reisende.name, RAND, spalte * 2 - 8);
  l.feld("Pers.-Nr.", d.reisende.personalnummer, RAND + spalte * 2, spalte - 8);
  l.feld("Kostenstelle", d.kostenstelle, RAND + spalte * 3, spalte - 8);
  l.zeile(26);
  l.feld("Wohnort", d.reisende.wohnort, RAND, spalte * 2 - 8);
  l.feld("IBAN", d.reisende.iban, RAND + spalte * 2, spalte * 2 - 8);
  l.zeile(26);
  l.feld("Reiseweg", d.ausland ? `${d.reiseweg} (${d.ausland})` : d.reiseweg, RAND, spalte * 2 - 8);
  l.feld("Besuchte Stellen", d.besuchteStellen, RAND + spalte * 2, spalte * 2 - 8);
  l.zeile(26);
  if (d.projekt) {
    l.feld("Begründung", d.begruendung, RAND, spalte * 2 - 8);
    l.feld("Projekt", d.projekt, RAND + spalte * 2, spalte * 2 - 8);
  } else {
    l.feld("Begründung", d.begruendung, RAND, spalte * 4 - 8);
  }
  l.zeile(26);
  l.feld("Abfahrt", d.abfahrt, RAND, spalte - 8);
  l.feld("Rückkehr", d.rueckkehr, RAND + spalte, spalte - 8);
  l.feld("Benutzte Verkehrsmittel", d.verkehrsmittel, RAND + spalte * 2, spalte * 2 - 8);
  l.zeile(24);

  // Abschnitte A–F
  l.ueberschrift("Abrechnung");
  const xKonto = RAND + 250;
  const xNetto = RAND + 340;
  const xMwst = RAND + 420;
  l.text("Position", RAND, { groesse: 7, farbe: GRAU });
  l.text("Konto", xKonto, { groesse: 7, farbe: GRAU });
  l.text("Netto", 0, { groesse: 7, farbe: GRAU, rechts: xNetto });
  l.text("MwSt", 0, { groesse: 7, farbe: GRAU, rechts: xMwst });
  l.text("Betrag", 0, { groesse: 7, farbe: GRAU, rechts: RECHTS });
  l.zeile(14);
  for (const a of d.abrechnung.abschnitte) {
    l.platz(30);
    l.text(`${a.abschnitt} – ${ABSCHNITT_TEXT[a.abschnitt]}`, RAND, { groesse: 8, fett: true });
    l.zeile(12);
    for (const p of a.positionen) {
      l.platz(14);
      l.text(l.passend(p.bezeichnung, 240), RAND + 8);
      l.text(p.konto ?? "–", xKonto, { farbe: GRAU });
      l.text(fmt(p.netto), 0, { rechts: xNetto });
      l.text(p.mwst ? `${fmt(p.mwst)} (${String(p.mwstProzent).replace(".", ",")} %)` : "–", 0, { rechts: xMwst, farbe: GRAU });
      l.text(fmt(p.brutto), 0, { rechts: RECHTS });
      l.zeile(12);
    }
  }
  l.zeile(4);
  l.linie();
  l.text("Gesamt", RAND, { fett: true });
  l.text(fmt(d.abrechnung.gesamt.netto), 0, { rechts: xNetto, fett: true });
  l.text(fmt(d.abrechnung.gesamt.mwst), 0, { rechts: xMwst, fett: true });
  l.text(fmt(d.abrechnung.gesamt.brutto), 0, { rechts: RECHTS, fett: true });
  l.zeile(13);
  if (d.abrechnung.vorschuss > 0) {
    l.text("abzüglich Vorschuss", RAND);
    l.text(`-${fmt(d.abrechnung.vorschuss)}`, 0, { rechts: RECHTS });
    l.zeile(13);
  }
  l.text(d.abrechnung.auszuzahlen < 0 ? "Rückzahlung an Polycare" : "Auszuzahlender Betrag", RAND, { groesse: 11, fett: true });
  l.text(fmt(Math.abs(d.abrechnung.auszuzahlen)), 0, { groesse: 11, fett: true, rechts: RECHTS });
  l.zeile(13);
  if (d.abrechnung.steuerpflichtig > 0) {
    l.text(`Davon ${fmt(d.abrechnung.steuerpflichtig)} steuerpflichtiger Arbeitslohn (Km-Geld über dem steuerfreien Satz).`, RAND, {
      groesse: 8,
      farbe: GRAU,
    });
    l.zeile(13);
  }

  // Verpflegung je Tag
  if (d.verpflegung.length) {
    l.ueberschrift("Verpflegungspauschale je Tag");
    for (const t of d.verpflegung) {
      l.platz(14);
      l.text(t.datum, RAND);
      l.text(t.art, RAND + 90, { farbe: GRAU });
      l.text(fmt(t.pauschale), 0, { rechts: xNetto });
      l.text(t.kuerzung ? `-${fmt(t.kuerzung)}` : "", 0, { rechts: xMwst, farbe: GRAU });
      l.text(fmt(t.betrag), 0, { rechts: RECHTS });
      l.zeile(12);
    }
    if (d.verpflegungBemerkung) {
      l.text(l.passend(`Bemerkung: ${d.verpflegungBemerkung}`, RECHTS - RAND), RAND, { farbe: GRAU });
      l.zeile(12);
    }
  }

  // Fahrten
  if (d.fahrten.length) {
    l.ueberschrift("Fahrten mit privatem PKW");
    for (const f of d.fahrten) {
      l.platz(14);
      l.text(f.datum, RAND);
      l.text(l.passend(f.strecke + (f.zweck ? ` · ${f.zweck}` : ""), 330), RAND + 70);
      l.text(`${f.km.toLocaleString("de-DE", { maximumFractionDigits: 1 })} km`, 0, { rechts: RECHTS });
      l.zeile(12);
    }
  }

  // Belegliste
  if (d.belege.length) {
    l.ueberschrift("Einzelbelege");
    for (const b of d.belege) {
      l.platz(14);
      l.text(`${b.nr}.`, RAND);
      l.text(b.datum, RAND + 20);
      l.text(l.passend(b.kategorie + (b.beschreibung ? ` · ${b.beschreibung}` : ""), 260), RAND + 80);
      l.text(b.mitDatei ? `${String(b.mwstProzent).replace(".", ",")} %` : "ohne Beleg", 0, { rechts: xMwst, farbe: GRAU });
      l.text(fmt(b.brutto), 0, { rechts: RECHTS });
      l.zeile(12);
    }
  }

  // Freigaben (ersetzt Unterschriften)
  l.ueberschrift("Bestätigungen");
  for (const v of d.verlauf) {
    l.platz(14);
    l.text(v.zeit, RAND);
    l.text(l.passend(`${v.aktion} – ${v.person}${v.kommentar ? ` („${v.kommentar}“)` : ""}`, RECHTS - RAND - 90), RAND + 90);
    l.zeile(12);
  }
  l.zeile(6);
  l.text("Elektronisch bestätigt im Polycare-Reisekosten-Tool; ersetzt die Unterschriften des Formblatts FB 06.", RAND, {
    groesse: 7,
    farbe: GRAU,
  });

  // Seitenzahlen der Abrechnung; angehängte Belege tragen "Beleg n"
  const seiten = doc.getPages();
  seiten.forEach((s, i) =>
    s.drawText(winAnsi(`${d.belegNr ?? ""}  Abrechnung, Seite ${i + 1}/${seiten.length}`.trim()), {
      x: RAND,
      y: 24,
      size: 7,
      font: l.normal,
      color: GRAU,
    }),
  );
  return doc;
}

/** Hängt einen Beleg an: PDFs seitenweise, JPEG/PNG skaliert auf eine A4-Seite. Andere Formate: false. */
async function belegAnhaengen(doc: PDFDocument, datei: BelegDatei, font: PDFFont): Promise<boolean> {
  try {
    if (datei.contentType === "application/pdf") {
      const quelle = await PDFDocument.load(datei.inhalt, { ignoreEncryption: true });
      const seiten = await doc.copyPages(quelle, quelle.getPageIndices());
      seiten.forEach((s) => doc.addPage(s));
      return true;
    }
    const bild =
      datei.contentType === "image/jpeg"
        ? await doc.embedJpg(datei.inhalt)
        : datei.contentType === "image/png"
          ? await doc.embedPng(datei.inhalt)
          : null;
    if (!bild) return false;
    const seite = doc.addPage(A4);
    const maxB = A4[0] - 2 * RAND;
    const maxH = A4[1] - 2 * RAND - 20;
    const f = Math.min(maxB / bild.width, maxH / bild.height, 1);
    seite.drawImage(bild, { x: RAND, y: A4[1] - RAND - 20 - bild.height * f, width: bild.width * f, height: bild.height * f });
    seite.drawText(winAnsi(`Beleg ${datei.nr}`), { x: RAND, y: A4[1] - RAND, size: 9, font, color: GRAU });
    return true;
  } catch {
    return false;
  }
}

export type PdfTeile = {
  /** PDF-Dateien, jeweils unter der Größengrenze (Teil 1 enthält die Abrechnung) */
  teile: Uint8Array[];
  /** Belege, die nicht ins PDF eingebettet werden konnten (z. B. HEIC) – separat anhängen */
  separat: BelegDatei[];
};

/**
 * Erzeugt die Abrechnung samt Belegen als PDF. Passt alles nicht in eine Mail, werden die Belege
 * auf weitere PDF-Teile verteilt (DATEV legt jede Datei als eigenen Beleg ab).
 */
export async function erzeugePdfMitBelegen(d: AbrechnungsDokument, dateien: BelegDatei[], maxBytes: number): Promise<PdfTeile> {
  const teile: Uint8Array[] = [];
  const separat: BelegDatei[] = [];
  let aktuell = await erzeugeAbrechnungsPdf(d);
  let font = await aktuell.embedFont(StandardFonts.Helvetica);
  let groesse = (await aktuell.save()).byteLength;

  for (const datei of dateien) {
    if (groesse + datei.inhalt.byteLength > maxBytes && aktuell.getPageCount() > 0) {
      teile.push(await aktuell.save());
      aktuell = await PDFDocument.create();
      font = await aktuell.embedFont(StandardFonts.Helvetica);
      groesse = 0;
    }
    if (await belegAnhaengen(aktuell, datei, font)) groesse += datei.inhalt.byteLength;
    else separat.push(datei);
  }
  if (aktuell.getPageCount() > 0) teile.push(await aktuell.save());
  return { teile, separat };
}
