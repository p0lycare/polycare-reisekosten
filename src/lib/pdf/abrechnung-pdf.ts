import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Abrechnung } from "@/lib/reisekosten/abrechnung";
import { ABSCHNITT_TEXT } from "@/lib/reisekosten/kategorie";
import { nettoAusBrutto } from "@/lib/reisekosten/mwst";
import { zahlungsartKurz } from "@/lib/reisekosten/zahlungsart";

/** Alles, was auf der Abrechnung steht – entspricht dem Formblatt FB 06 (Reise) bzw. FB 21 (Auslagen) */
export type AbrechnungsDokument = {
  art?: "reise" | "auslagen";
  /** Abrechnungsmonat der Auslagen, z. B. "Oktober 2026" */
  monat?: string;
  belegNr: string | null;
  buchungsmonat: string | null; // "MM/JJJJ"
  erstelltAm: string; // "TT.MM.JJJJ"
  reisende: { name: string; personalnummer: string | null; wohnort: string | null };
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
  belege: {
    nr: number;
    datum: string;
    kategorie: string;
    beschreibung: string | null;
    brutto: number;
    mwstProzent: number;
    mitDatei: boolean;
    lieferant?: string | null;
    kostenstelle?: string | null;
    zahlungsart?: string | null;
    /** Pflichtangaben, z. B. "Person: … · Anlass: …" */
    angaben?: string | null;
    /** Nummer des Belegs, dessen Datei dieses Foto/PDF ist (mehrere Positionen einer Hotelrechnung teilen eine) */
    dateiNr?: number | null;
  }[];
  abrechnung: Abrechnung;
  verlauf: { zeit: string; aktion: string; person: string; kommentar: string | null }[];
};

export type BelegDatei = { nr: number; name: string; contentType: string; inhalt: Uint8Array };

/** Startseite des Originals im PDF je Datei (Schlüssel: dateiNr) – steht auf dem Deckblatt */
export type Seitenverweise = Map<number, number>;

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

function umbrechen(t: string, breite: number, messen: (z: string) => number): string[] {
  const zeilen: string[] = [];
  let aktuell = "";
  for (const wort of t.split(/\s+/).filter(Boolean)) {
    const probe = aktuell ? `${aktuell} ${wort}` : wort;
    if (messen(probe) <= breite || !aktuell) aktuell = probe;
    else {
      zeilen.push(aktuell);
      aktuell = wort;
    }
  }
  if (aktuell) zeilen.push(aktuell);
  return zeilen;
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
  /** Bricht Text an Wortgrenzen auf eine Breite um (für Angaben, die nicht gekürzt werden dürfen) */
  umbrechen(t: string, breite: number, groesse = 9): string[] {
    return umbrechen(winAnsi(t), breite, (z) => this.normal.widthOfTextAtSize(z, groesse));
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

/** Kopf der Auslagenabrechnung (FB 21): Person, Monat, keine Reisedaten */
function auslagenKopf(l: Layout, d: AbrechnungsDokument) {
  const spalte = (A4[0] - 2 * RAND) / 4;
  l.feld("Vor- und Zuname", d.reisende.name, RAND, spalte * 2 - 8);
  l.feld("Pers.-Nr.", d.reisende.personalnummer, RAND + spalte * 2, spalte - 8);
  l.feld("Abrechnungsmonat", d.monat, RAND + spalte * 3, spalte - 8);
  l.zeile(24);
}

/** Einzelbelege wie im FB 21: Datum, Lieferant, Zweck, Kostenstelle, Zahlungsart, Netto, MwSt, Brutto */
function auslagenPositionen(l: Layout, d: AbrechnungsDokument, seiten: Seitenverweise) {
  const xText = RAND + 74;
  const xKst = RAND + 282;
  const xNetto = RAND + 380;
  const xMwst = RAND + 440;
  l.ueberschrift(einzelbelegeTitel(seiten));
  l.text("Nr.", RAND, { groesse: 7, farbe: GRAU });
  l.text("Datum", RAND + 20, { groesse: 7, farbe: GRAU });
  l.text("Lieferant · Zweck (Zahlungsart)", xText, { groesse: 7, farbe: GRAU });
  l.text("KSt", xKst, { groesse: 7, farbe: GRAU });
  l.text("Netto", 0, { groesse: 7, farbe: GRAU, rechts: xNetto });
  l.text("MwSt", 0, { groesse: 7, farbe: GRAU, rechts: xMwst });
  l.text("Brutto", 0, { groesse: 7, farbe: GRAU, rechts: RECHTS });
  l.zeile(13);
  for (const b of d.belege) {
    l.platz(14);
    const { netto, mwst } = nettoAusBrutto(b.brutto, b.mwstProzent);
    const zahlung = b.zahlungsart ? ` (${zahlungsartKurz(b.zahlungsart)})` : "";
    const text = [b.lieferant || b.kategorie, b.beschreibung].filter(Boolean).join(" · ") + zahlung + (b.mitDatei ? "" : " – ohne Beleg");
    l.text(`${b.nr}.`, RAND);
    l.text(b.datum, RAND + 20);
    l.text(l.passend(text, xKst - xText - 6), xText);
    l.text(l.passend(b.kostenstelle ?? "–", xNetto - xKst - 50), xKst, { farbe: GRAU });
    l.text(fmt(netto), 0, { rechts: xNetto });
    l.text(mwst ? fmt(mwst) : "–", 0, { rechts: xMwst, farbe: GRAU });
    l.text(fmt(b.brutto), 0, { rechts: RECHTS });
    l.zeile(12);
    const seite = b.dateiNr ? seiten.get(b.dateiNr) : undefined;
    if (seite) {
      l.platz(11);
      l.text(`Original S. ${seite}`, xText, { groesse: 8, farbe: GRAU });
      l.zeile(10);
    }
  }
}

/** Überschrift der Belegliste, mit Hinweis, wo die Originale beginnen */
function einzelbelegeTitel(seiten: Seitenverweise): string {
  const erste = Math.min(...seiten.values());
  return seiten.size ? `Einzelbelege (Originale ab Seite ${erste})` : "Einzelbelege";
}

/** Kopf der Reisekostenabrechnung (FB 06) */
function reiseKopf(l: Layout, d: AbrechnungsDokument) {
  const spalte = (A4[0] - 2 * RAND) / 4;
  l.feld("Vor- und Zuname", d.reisende.name, RAND, spalte * 2 - 8);
  l.feld("Pers.-Nr.", d.reisende.personalnummer, RAND + spalte * 2, spalte - 8);
  l.feld("Kostenstelle", d.kostenstelle, RAND + spalte * 3, spalte - 8);
  l.zeile(26);
  l.feld("Wohnort", d.reisende.wohnort, RAND, spalte * 4 - 8);
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
}

/** Erzeugt die Abrechnungsseiten (ohne Belege). */
export async function erzeugeAbrechnungsPdf(d: AbrechnungsDokument, seiten: Seitenverweise = new Map()): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  const auslagen = d.art === "auslagen";
  doc.setTitle(winAnsi(`${auslagen ? "Auslagenabrechnung" : "Reisekostenabrechnung"} ${d.belegNr ?? ""} ${d.reisende.name}`.trim()));
  doc.setProducer("Polycare Reisekosten");
  const l = new Layout(doc, await doc.embedFont(StandardFonts.Helvetica), await doc.embedFont(StandardFonts.HelveticaBold));

  // Kopf
  l.text(auslagen ? "Auslagenabrechnung" : `Reisekostenabrechnung ${d.ausland ? "Ausland" : "Inland"}`, RAND, { groesse: 16, fett: true });
  l.text(`Beleg-Nr. ${d.belegNr ?? "–"}`, 0, { groesse: 10, fett: true, rechts: RECHTS });
  l.zeile(14);
  l.text(`Buchungsmonat ${d.buchungsmonat ?? "–"} · erstellt am ${d.erstelltAm}`, 0, { groesse: 8, farbe: GRAU, rechts: RECHTS });
  l.zeile(26);

  if (auslagen) auslagenKopf(l, d);
  else reiseKopf(l, d);

  // Abschnitte A–G
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
  if (auslagen && d.belege.length) {
    auslagenPositionen(l, d, seiten);
  } else if (d.belege.length) {
    l.ueberschrift(einzelbelegeTitel(seiten));
    for (const b of d.belege) {
      l.platz(14);
      l.text(`${b.nr}.`, RAND);
      l.text(b.datum, RAND + 20);
      l.text(l.passend(b.kategorie + (b.beschreibung ? ` · ${b.beschreibung}` : ""), 260), RAND + 80);
      const seite = b.dateiNr ? seiten.get(b.dateiNr) : undefined;
      if (seite) l.text(`S. ${seite}`, 0, { rechts: RAND + 385, farbe: GRAU });
      l.text(b.mitDatei ? `${String(b.mwstProzent).replace(".", ",")} %` : "ohne Beleg", 0, { rechts: xMwst, farbe: GRAU });
      l.text(fmt(b.brutto), 0, { rechts: RECHTS });
      l.zeile(12);
      // Pflichtangaben vollständig (umgebrochen), nicht gekürzt – sie sind für die Prüfung gedacht
      for (const z of b.angaben ? l.umbrechen(b.angaben, RECHTS - RAND - 80, 8) : []) {
        l.platz(11);
        l.text(z, RAND + 80, { groesse: 8, farbe: GRAU });
        l.zeile(10);
      }
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
  l.text(`Elektronisch bestätigt im Polycare-Reisekosten-Tool; ersetzt die Unterschriften des Formblatts ${auslagen ? "FB 21" : "FB 06"}.`, RAND, {
    groesse: 7,
    farbe: GRAU,
  });

  // Seitenzahlen der Abrechnung; angehängte Belege tragen "Beleg n"
  const deckblatt = doc.getPages();
  deckblatt.forEach((s, i) =>
    s.drawText(winAnsi(`${d.belegNr ?? ""}  Abrechnung, Seite ${i + 1}/${deckblatt.length}`.trim()), {
      x: RAND,
      y: 24,
      size: 7,
      font: l.normal,
      color: GRAU,
    }),
  );
  return doc;
}

/** PDF-Belege vorab laden (Seitenzahl fürs Deckblatt); Fotos belegen immer eine Seite */
async function vorbereiten(datei: BelegDatei) {
  if (datei.contentType === "image/jpeg" || datei.contentType === "image/png") return { art: "bild" as const, seiten: 1 };
  if (datei.contentType !== "application/pdf") return null;
  try {
    const quelle = await PDFDocument.load(datei.inhalt, { ignoreEncryption: true });
    return { art: "pdf" as const, quelle, seiten: quelle.getPageCount() };
  } catch {
    return null;
  }
}

async function bildEinbetten(doc: PDFDocument, datei: BelegDatei) {
  try {
    return datei.contentType === "image/png" ? await doc.embedPng(datei.inhalt) : await doc.embedJpg(datei.inhalt);
  } catch {
    return null;
  }
}

export type AbrechnungsPdf = {
  pdf: Uint8Array;
  /** Belege, die nicht eingebettet werden konnten (stattdessen steht dort eine Hinweisseite) */
  nichtEingebettet: number[];
};

/**
 * Ein PDF je Abrechnung – in DATEV genau ein Beleg: vorne die Abrechnung als Deckblatt (mit Seitenangabe je
 * Original), dahinter die Originale unverändert in der Reihenfolge der Belegliste. Fotos stehen auf einer eigenen
 * Seite mit der Belegnummer; PDFs werden Seite für Seite übernommen, ohne Aufdruck.
 */
export async function erzeugePdfMitBelegen(d: AbrechnungsDokument, dateien: BelegDatei[]): Promise<AbrechnungsPdf> {
  const probe = await erzeugeAbrechnungsPdf(d);
  const vorbereitet = await Promise.all(dateien.map(vorbereiten));
  const seitenJeDatei = vorbereitet.map((v) => v?.seiten ?? 1);

  // Seitenzahlen hängen von der Länge des Deckblatts ab – das bleibt mit Verweisen gleich lang, sonst erneut rechnen
  const verweise = (deckblatt: number): Seitenverweise => {
    const karte: Seitenverweise = new Map();
    let seite = deckblatt + 1;
    dateien.forEach((datei, i) => {
      karte.set(datei.nr, seite);
      seite += seitenJeDatei[i];
    });
    return karte;
  };
  let deckblatt = probe.getPageCount();
  let doc = await erzeugeAbrechnungsPdf(d, verweise(deckblatt));
  if (doc.getPageCount() !== deckblatt) {
    deckblatt = doc.getPageCount();
    doc = await erzeugeAbrechnungsPdf(d, verweise(deckblatt));
  }

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const nichtEingebettet: number[] = [];
  for (const [i, datei] of dateien.entries()) {
    const v = vorbereitet[i];
    if (v?.art === "pdf") {
      const seiten = await doc.copyPages(v.quelle, v.quelle.getPageIndices());
      seiten.forEach((s) => doc.addPage(s));
      continue;
    }
    const seite = doc.addPage(A4);
    seite.drawText(winAnsi(`Beleg ${datei.nr}`), { x: RAND, y: A4[1] - RAND, size: 9, font, color: GRAU });
    const bild = v?.art === "bild" ? await bildEinbetten(doc, datei) : null;
    if (bild) {
      const maxB = A4[0] - 2 * RAND;
      const maxH = A4[1] - 2 * RAND - 20;
      const f = Math.min(maxB / bild.width, maxH / bild.height, 1);
      seite.drawImage(bild, { x: RAND, y: A4[1] - RAND - 20 - bild.height * f, width: bild.width * f, height: bild.height * f });
    } else {
      nichtEingebettet.push(datei.nr);
      seite.drawText(winAnsi(`Die Datei „${datei.name}“ konnte nicht eingebettet werden – das Original liegt im Reisekosten-Tool.`), {
        x: RAND,
        y: A4[1] - RAND - 24,
        size: 9,
        font,
      });
    }
  }
  return { pdf: await doc.save(), nichtEingebettet };
}
