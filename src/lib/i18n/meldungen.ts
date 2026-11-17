import type { Sprache } from "./sprache";

/**
 * Englische Fassung deutscher Meldungen aus Hilfsmodulen (KI-Auslesen, Routing, Verpflegungsberechnung,
 * Bildformat). Diese Module liefern bewusst deutsche Texte – sie werden auch protokolliert oder in der
 * Datenbank gespeichert (z. B. beleg_eingang.ki_fehler). Übersetzt wird erst bei der Anzeige.
 * Unbekannte Meldungen bleiben unverändert.
 */
const MELDUNGEN: [RegExp, (...teile: string[]) => string][] = [
  // src/lib/reisekosten/verpflegung.ts
  [/^Ungültiges Datum "(.*)", erwartet YYYY-MM-DDTHH:mm$/, (w) => `Invalid date "${w}", expected YYYY-MM-DDTHH:mm`],
  [/^Ende muss nach dem Beginn liegen$/, () => "The end must be after the start"],
  [/^Reisen über mehr als zwei Kalendertage erfordern eine Übernachtung$/, () => "Trips spanning more than two calendar days require an overnight stay"],
  [/^Keine Verpflegungspauschale für Land "(.*)" hinterlegt$/, (l) => `No meal allowance stored for country "${l}"`],
  // src/lib/routing/osm.ts
  [/^Ortssuche fehlgeschlagen \((.*)\)$/, (s) => `Place search failed (${s})`],
  [/^Bitte Start und Ziel angeben, z\. B\. „Köln – Essen – Köln“\.$/, () => "Please enter a start and destination, e.g. “Köln – Essen – Köln”."],
  [/^„(.*)“ wurde nicht gefunden\. Bitte genauer angeben, z\. B\. mit Postleitzahl\.$/, (o) => `“${o}” was not found. Please be more specific, e.g. with a postcode.`],
  [/^Für diese Strecke wurde keine Route gefunden\.$/, () => "No route was found for this journey."],
  [/^Die Strecke konnte gerade nicht berechnet werden\. Bitte km selbst eintragen\.$/, () => "The route could not be calculated right now. Please enter the km yourself."],
  // src/lib/bild.ts
  [
    /^Dieses Format kann nicht verarbeitet werden – bitte als Foto \(JPEG\) oder PDF\./,
    () => "This format can't be processed – please use a photo (JPEG) or PDF. On iPhone: Settings → Camera → Formats → “Most Compatible”.",
  ],
  // src/lib/ki/**
  [/^Das Auslesen per KI ist noch nicht eingerichtet\.$/, () => "AI reading has not been set up yet."],
  [/^Das PDF hat (\d+) Seiten – ausgelesen werden Belege bis (\d+) Seiten\.$/, (n, max) => `The PDF has ${n} pages – receipts of up to ${max} pages can be read.`],
  [/^Das PDF konnte nicht gelesen werden\.$/, () => "The PDF could not be read."],
  [/^Dieses Dateiformat kann nicht ausgelesen werden \(bitte JPEG, PNG oder PDF\)\.$/, () => "This file format can't be read (please use JPEG, PNG or PDF)."],
  [/^Der Beleg konnte nicht ausgelesen werden\.$/, () => "The receipt could not be read."],
  [/^Der Beleg konnte gerade nicht ausgelesen werden\.$/, () => "The receipt could not be read right now."],
  [/^Gerade sind zu viele Anfragen unterwegs – bitte gleich noch einmal versuchen\.$/, () => "Too many requests right now – please try again in a moment."],
  [/^Der KI-Zugang ist ungültig \(API-Schlüssel prüfen\)\.$/, () => "The AI access is invalid (check the API key)."],
  [/^Das automatische Auslesen ist nicht eingerichtet\.$/, () => "Automatic reading has not been set up."],
  [/^Das Tageskontingent für das automatische Auslesen ist erreicht\.$/, () => "The daily quota for automatic reading has been reached."],
  [/^Das Foto wurde nicht gefunden\.$/, () => "The photo was not found."],
];

export function uebersetzeMeldung(text: string, sprache: Sprache): string {
  if (sprache === "de") return text;
  for (const [muster, englisch] of MELDUNGEN) {
    const treffer = muster.exec(text);
    if (treffer) return englisch(...treffer.slice(1));
  }
  return text;
}

/** Für Ergebnisse der Form { fehler } aus Hilfsmodulen */
export function mitUebersetzterMeldung<T extends object>(ergebnis: T, sprache: Sprache): T {
  if ("fehler" in ergebnis && typeof ergebnis.fehler === "string") return { ...ergebnis, fehler: uebersetzeMeldung(ergebnis.fehler, sprache) };
  return ergebnis;
}
