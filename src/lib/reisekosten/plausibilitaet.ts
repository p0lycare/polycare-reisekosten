import { texte } from "@/lib/i18n/woerterbuch";
import type { Sprache } from "@/lib/i18n/sprache";
import { berechneVerpflegung, type Mahlzeiten } from "./verpflegung";
import type { Verkehrsmittel } from "./reise";
import { weichtAb } from "../routing/strecke";

type Hinweise = ReturnType<typeof texte>["hinweise"]["plausi"];

export type PlausiReise = {
  beginn: string;
  ende: string;
  mitUebernachtung: boolean;
  verkehrsmittel: Verkehrsmittel[];
  mahlzeiten: Record<string, Mahlzeiten>;
  /** Reiseland; ohne Angabe wird die Pauschale nicht geprüft */
  land?: string;
  /** Auslagenabrechnung: nur die Belegprüfungen, keine Reiselogik */
  art?: "reise" | "auslagen";
};

export type PlausiBeleg = {
  kategorieId: string;
  bezeichnung: string;
  datum: string;
  betragCent: number;
  hatDatei: boolean;
  /** Zweck / Beschreibung (bei Auslagen Pflicht) */
  beschreibung?: string | null;
  /** Pflichtangaben der Kategorie, die fehlen (z. B. ältere Belege vor Einführung der Pflicht) */
  fehlendeAngaben?: string[];
};

/** Hinweis auf Belege ohne Pflichtangaben – sonst fragt die Buchhaltung nach */
function angabenHinweis(belege: PlausiBeleg[], t: Hinweise): string | null {
  const ohne = belege.filter((b) => b.fehlendeAngaben?.length);
  if (!ohne.length) return null;
  return t.angabenFehlen(ohne.map((b) => `${b.bezeichnung} (${b.fehlendeAngaben!.join(", ")})`).join("; "));
}

/** km_route: per Routing berechnete Strecke, falls bekannt */
export type PlausiFahrt = { datum: string; km?: number | string; km_route?: number | string | null };

/** Kategorien, für die es üblicherweise keinen Beleg gibt */
const OHNE_BELEG_UEBLICH = new Set(["trinkgeld"]);

/** Grenze für Kleinbetragsrechnungen (§ 33 UStDV): darüber muss die Rechnung auf Polycare lauten */
const KLEINBETRAG_CENT = 25000;

/** Prüfungen für eine Auslagenabrechnung (Monat, Belege mit Zweck) */
function pruefeAuslagen(reise: PlausiReise, belege: PlausiBeleg[], t: Hinweise): string[] {
  const hinweise: string[] = [];
  const von = reise.beginn.slice(0, 10);
  const bis = reise.ende.slice(0, 10);
  if (!belege.length) hinweise.push(t.keinBeleg);
  const ausserhalb = belege.filter((b) => b.datum < von || b.datum > bis);
  if (ausserhalb.length) {
    hinweise.push(t.ausserhalbMonat(ausserhalb.length));
  }
  const ohneZweck = belege.filter((b) => !b.beschreibung?.trim());
  if (ohneZweck.length) {
    hinweise.push(t.ohneZweck(ohneZweck.length));
  }
  const gross = belege.filter((b) => b.betragCent > KLEINBETRAG_CENT);
  if (gross.length) {
    hinweise.push(t.ueber250(gross.length));
  }
  const gruppen = new Map<string, number>();
  for (const b of belege) gruppen.set(`${b.datum}|${b.betragCent}`, (gruppen.get(`${b.datum}|${b.betragCent}`) ?? 0) + 1);
  if ([...gruppen.values()].some((n) => n > 1)) hinweise.push(t.doppelAuslage);
  const ohneDatei = belege.filter((b) => !b.hatDatei);
  if (ohneDatei.length) hinweise.push(t.ohneFoto(ohneDatei.map((b) => b.beschreibung || b.bezeichnung).join(", ")));
  const angaben = angabenHinweis(belege, t);
  if (angaben) hinweise.push(angaben);
  return hinweise;
}

/**
 * Prüft eine Reise vor dem Einreichen auf typische Fehler, die sonst zu Rückfragen der
 * Buchhaltung führen. Liefert Hinweise; das Einreichen bleibt möglich.
 */
export function pruefePlausibilitaet(reise: PlausiReise, belege: PlausiBeleg[], fahrten: PlausiFahrt[], sprache: Sprache = "de"): string[] {
  const t = texte(sprache).hinweise.plausi;
  if (reise.art === "auslagen") return pruefeAuslagen(reise, belege, t);
  const hinweise: string[] = [];
  if (reise.land) {
    try {
      berechneVerpflegung({ ...reise, land: reise.land, beginn: reise.beginn.slice(0, 16), ende: reise.ende.slice(0, 16) });
    } catch (e) {
      hinweise.push(t.verpflegung(e instanceof Error ? e.message : t.ungueltig));
    }
  }
  const von = reise.beginn.slice(0, 10);
  const bis = reise.ende.slice(0, 10);
  const hat = (id: string) => belege.some((b) => b.kategorieId === id);
  const pkw = reise.verkehrsmittel.includes("eigener_pkw");

  const ausserhalb = belege.filter((b) => b.datum < von || b.datum > bis);
  if (ausserhalb.length) {
    hinweise.push(t.ausserhalbReise(ausserhalb.length, ausserhalb.map((b) => b.bezeichnung).join(", ")));
  }

  const fahrtenAusserhalb = fahrten.filter((f) => f.datum < von || f.datum > bis);
  if (fahrtenAusserhalb.length) hinweise.push(t.fahrtAusserhalb);

  // Gleiche Kategorie, gleicher Tag, gleicher Betrag – je Kombination ein Hinweis
  const gruppen = new Map<string, PlausiBeleg[]>();
  for (const b of belege) {
    const schluessel = `${b.kategorieId}|${b.datum}|${b.betragCent}`;
    gruppen.set(schluessel, [...(gruppen.get(schluessel) ?? []), b]);
  }
  for (const gruppe of gruppen.values()) {
    if (gruppe.length > 1) hinweise.push(t.doppel(gruppe[0].bezeichnung));
  }

  if (pkw && !fahrten.length) {
    hinweise.push(t.pkwOhneFahrten);
  }
  const abweichend = fahrten.filter((f) => f.km != null && f.km_route != null && weichtAb(Number(f.km), Number(f.km_route)));
  if (abweichend.length) {
    hinweise.push(t.routeAbweichung(abweichend.length));
  }
  const ohneRoute = fahrten.filter((f) => "km_route" in f && f.km != null && f.km_route == null);
  if (ohneRoute.length) {
    hinweise.push(t.ohneRoute(ohneRoute.length));
  }
  if (fahrten.length && !pkw) {
    hinweise.push(t.fahrtenOhnePkw);
  }
  if (pkw && fahrten.length && hat("tanken")) {
    hinweise.push(t.tankenUndKm);
  }
  if (hat("mietwagen") && !reise.verkehrsmittel.includes("mietwagen")) {
    hinweise.push(t.mietwagen);
  }

  if (hat("uebernachtung") && !reise.mitUebernachtung) {
    hinweise.push(t.uebernachtungOhne);
  }
  if (reise.mitUebernachtung && von !== bis && !hat("uebernachtung")) {
    hinweise.push(t.keineHotelrechnung);
  }

  const fruehstueckGestellt = Object.values(reise.mahlzeiten).some((m) => m.fruehstueck);
  if (hat("hotel_fruehstueck") && !fruehstueckGestellt) {
    hinweise.push(t.fruehstueck);
  }

  const ohneDatei = belege.filter((b) => !b.hatDatei && !OHNE_BELEG_UEBLICH.has(b.kategorieId));
  if (ohneDatei.length) {
    hinweise.push(t.ohneFoto(ohneDatei.map((b) => b.bezeichnung).join(", ")));
  }

  const angaben = angabenHinweis(belege, t);
  if (angaben) hinweise.push(angaben);
  return hinweise;
}
