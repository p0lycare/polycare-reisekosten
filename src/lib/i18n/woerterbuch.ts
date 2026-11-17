// Alle Wörterbücher der Oberfläche. Neue Bereiche hier eintragen.
import * as allgemein from "./texte/allgemein";
import * as rahmen from "./texte/rahmen";
import * as mails from "./texte/mails";
import * as hinweise from "./texte/hinweise";
import * as reisen from "./texte/reisen";
import * as workflow from "./texte/workflow";
import * as fahrten from "./texte/fahrten";
import * as freigaben from "./texte/freigaben";
import * as belege from "./texte/belege";
import * as auslagen from "./texte/auslagen";
import * as monat from "./texte/monat";
import * as uebersicht from "./texte/uebersicht";
import * as vorschuss from "./texte/vorschuss";
import * as melden from "./texte/melden";
import * as projekte from "./texte/projekte";
import * as einstellungen from "./texte/einstellungen";
import * as einfuehrung from "./texte/einfuehrung";
import { locale, type Sprache } from "./sprache";
import type { Uebersetzung } from "./typen";

const DE = {
  allgemein: allgemein.de,
  rahmen: rahmen.de,
  mails: mails.de,
  hinweise: hinweise.de,
  reisen: reisen.de,
  workflow: workflow.de,
  fahrten: fahrten.de,
  freigaben: freigaben.de,
  belege: belege.de,
  auslagen: auslagen.de,
  monat: monat.de,
  uebersicht: uebersicht.de,
  vorschuss: vorschuss.de,
  melden: melden.de,
  projekte: projekte.de,
  einstellungen: einstellungen.de,
  einfuehrung: einfuehrung.de,
};

/** Form aller Wörterbücher; Texte sind je Sprache unterschiedlich, die Schlüssel gleich */
export type Texte = Uebersetzung<typeof DE>;

const EN: Texte = {
  allgemein: allgemein.en,
  rahmen: rahmen.en,
  mails: mails.en,
  hinweise: hinweise.en,
  reisen: reisen.en,
  workflow: workflow.en,
  fahrten: fahrten.en,
  freigaben: freigaben.en,
  belege: belege.en,
  auslagen: auslagen.en,
  monat: monat.en,
  uebersicht: uebersicht.en,
  vorschuss: vorschuss.en,
  melden: melden.en,
  projekte: projekte.en,
  einstellungen: einstellungen.en,
  einfuehrung: einfuehrung.en,
};

export const WOERTERBUECHER: Record<Sprache, Texte> = { de: DE, en: EN };

export function texte(sprache: Sprache): Texte {
  return WOERTERBUECHER[sprache];
}

/**
 * Anzeigename einer Kategorie. Auf Deutsch gilt die Bezeichnung aus der Datenbank (die Buchhaltung kann
 * sie ändern), auf Englisch die Übersetzung der Standardkategorie – eigene Kategorien bleiben deutsch.
 */
export function kategorieName(sprache: Sprache, id: string | null | undefined, bezeichnung: string): string {
  if (sprache === "de" || !id) return bezeichnung;
  return EN.allgemein.kategorie[id] ?? bezeichnung;
}

/** "2026-10-23" → "Fr" bzw. "Fri" */
export function wochentagName(datum: string, sprache: Sprache): string {
  const [j, m, t] = datum.split("-").map(Number);
  return texte(sprache).allgemein.wochentageKurz[new Date(Date.UTC(j, m - 1, t)).getUTCDay()];
}

/** "2026-10" → "Oktober 2026" bzw. "October 2026" */
export function monatsnameIn(monat: string, sprache: Sprache): string {
  return new Intl.DateTimeFormat(locale(sprache), { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${monat}-01T00:00:00Z`));
}
