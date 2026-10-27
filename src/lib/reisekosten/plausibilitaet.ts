import { berechneVerpflegung, type Mahlzeiten } from "./verpflegung";
import type { Verkehrsmittel } from "./reise";
import { weichtAb } from "../routing/strecke";

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
};

/** km_route: per Routing berechnete Strecke, falls bekannt */
export type PlausiFahrt = { datum: string; km?: number | string; km_route?: number | string | null };

/** Kategorien, für die es üblicherweise keinen Beleg gibt */
const OHNE_BELEG_UEBLICH = new Set(["trinkgeld"]);

/** Grenze für Kleinbetragsrechnungen (§ 33 UStDV): darüber muss die Rechnung auf Polycare lauten */
const KLEINBETRAG_CENT = 25000;

/** Prüfungen für eine Auslagenabrechnung (Monat, Belege mit Zweck) */
function pruefeAuslagen(reise: PlausiReise, belege: PlausiBeleg[]): string[] {
  const hinweise: string[] = [];
  const von = reise.beginn.slice(0, 10);
  const bis = reise.ende.slice(0, 10);
  if (!belege.length) hinweise.push("Es ist noch kein Beleg erfasst.");
  const ausserhalb = belege.filter((b) => b.datum < von || b.datum > bis);
  if (ausserhalb.length) {
    hinweise.push(`${ausserhalb.length === 1 ? "Ein Beleg liegt" : `${ausserhalb.length} Belege liegen`} außerhalb des Abrechnungsmonats (nachgereicht?).`);
  }
  const ohneZweck = belege.filter((b) => !b.beschreibung?.trim());
  if (ohneZweck.length) {
    hinweise.push(`${ohneZweck.length === 1 ? "Bei einem Beleg fehlt" : `Bei ${ohneZweck.length} Belegen fehlt`} der Zweck (wofür wurde gekauft?).`);
  }
  const gross = belege.filter((b) => b.betragCent > KLEINBETRAG_CENT);
  if (gross.length) {
    hinweise.push(
      `${gross.length === 1 ? "Ein Beleg ist" : `${gross.length} Belege sind`} über 250 €: Die Rechnung muss auf Polycare ausgestellt sein (Name und Anschrift), sonst ist kein Vorsteuerabzug möglich.`,
    );
  }
  const gruppen = new Map<string, number>();
  for (const b of belege) gruppen.set(`${b.datum}|${b.betragCent}`, (gruppen.get(`${b.datum}|${b.betragCent}`) ?? 0) + 1);
  if ([...gruppen.values()].some((n) => n > 1)) hinweise.push("Möglicher Doppelbeleg: zwei Belege am selben Tag mit gleichem Betrag.");
  const ohneDatei = belege.filter((b) => !b.hatDatei);
  if (ohneDatei.length) hinweise.push(`Ohne Belegfoto: ${ohneDatei.map((b) => b.beschreibung || b.bezeichnung).join(", ")}.`);
  return hinweise;
}

/**
 * Prüft eine Reise vor dem Einreichen auf typische Fehler, die sonst zu Rückfragen der
 * Buchhaltung führen. Liefert Hinweise; das Einreichen bleibt möglich.
 */
export function pruefePlausibilitaet(reise: PlausiReise, belege: PlausiBeleg[], fahrten: PlausiFahrt[]): string[] {
  if (reise.art === "auslagen") return pruefeAuslagen(reise, belege);
  const hinweise: string[] = [];
  if (reise.land) {
    try {
      berechneVerpflegung({ ...reise, land: reise.land, beginn: reise.beginn.slice(0, 16), ende: reise.ende.slice(0, 16) });
    } catch (e) {
      hinweise.push(`Die Verpflegungspauschale kann nicht berechnet werden (${e instanceof Error ? e.message : "ungültige Angaben"}) – bitte die Reise bearbeiten.`);
    }
  }
  const von = reise.beginn.slice(0, 10);
  const bis = reise.ende.slice(0, 10);
  const hat = (id: string) => belege.some((b) => b.kategorieId === id);
  const pkw = reise.verkehrsmittel.includes("eigener_pkw");

  const ausserhalb = belege.filter((b) => b.datum < von || b.datum > bis);
  if (ausserhalb.length) {
    hinweise.push(
      `${ausserhalb.length === 1 ? "Ein Beleg liegt" : `${ausserhalb.length} Belege liegen`} außerhalb des Reisezeitraums: ${ausserhalb.map((b) => b.bezeichnung).join(", ")}.`,
    );
  }

  const fahrtenAusserhalb = fahrten.filter((f) => f.datum < von || f.datum > bis);
  if (fahrtenAusserhalb.length) hinweise.push("Mindestens eine Fahrt liegt außerhalb des Reisezeitraums.");

  // Gleiche Kategorie, gleicher Tag, gleicher Betrag – je Kombination ein Hinweis
  const gruppen = new Map<string, PlausiBeleg[]>();
  for (const b of belege) {
    const schluessel = `${b.kategorieId}|${b.datum}|${b.betragCent}`;
    gruppen.set(schluessel, [...(gruppen.get(schluessel) ?? []), b]);
  }
  for (const gruppe of gruppen.values()) {
    if (gruppe.length > 1) hinweise.push(`Möglicher Doppelbeleg: ${gruppe[0].bezeichnung} am selben Tag mit gleichem Betrag.`);
  }

  if (pkw && !fahrten.length) {
    hinweise.push("Eigener PKW ist gewählt, aber es sind keine Fahrten erfasst – es wird kein Km-Geld berechnet.");
  }
  const abweichend = fahrten.filter((f) => f.km != null && f.km_route != null && weichtAb(Number(f.km), Number(f.km_route)));
  if (abweichend.length) {
    hinweise.push(
      `${abweichend.length === 1 ? "Eine Fahrt weicht" : `${abweichend.length} Fahrten weichen`} deutlich von der berechneten Route ab.`,
    );
  }
  const ohneRoute = fahrten.filter((f) => "km_route" in f && f.km != null && f.km_route == null);
  if (ohneRoute.length) {
    hinweise.push(
      `${ohneRoute.length === 1 ? "Für eine Fahrt" : `Für ${ohneRoute.length} Fahrten`} gibt es keine berechnete Route – Kilometer bitte prüfen.`,
    );
  }
  if (fahrten.length && !pkw) {
    hinweise.push("Es sind Fahrten erfasst, aber „Eigener PKW“ ist nicht als Verkehrsmittel gewählt.");
  }
  if (pkw && fahrten.length && hat("tanken")) {
    hinweise.push(
      "Tankbelege und Km-Geld zusammen: Mit dem Km-Geld sind die Kosten des eigenen PKW abgegolten. Tanken nur für Firmen- oder Mietwagen abrechnen.",
    );
  }
  if (hat("mietwagen") && !reise.verkehrsmittel.includes("mietwagen")) {
    hinweise.push("Es gibt einen Mietwagenbeleg, aber „Mietwagen“ ist nicht als Verkehrsmittel gewählt.");
  }

  if (hat("uebernachtung") && !reise.mitUebernachtung) {
    hinweise.push("Es gibt einen Übernachtungsbeleg, die Reise ist aber ohne Übernachtung erfasst.");
  }
  if (reise.mitUebernachtung && von !== bis && !hat("uebernachtung")) {
    hinweise.push("Die Reise hat eine Übernachtung, aber es ist keine Hotelrechnung erfasst.");
  }

  const fruehstueckGestellt = Object.values(reise.mahlzeiten).some((m) => m.fruehstueck);
  if (hat("hotel_fruehstueck") && !fruehstueckGestellt) {
    hinweise.push(
      "Die Hotelrechnung enthält Frühstück, es ist aber an keinem Tag als gestellt markiert. Gestelltes Frühstück kürzt die Verpflegungspauschale um 5,60 € pro Tag.",
    );
  }

  const ohneDatei = belege.filter((b) => !b.hatDatei && !OHNE_BELEG_UEBLICH.has(b.kategorieId));
  if (ohneDatei.length) {
    hinweise.push(`Ohne Belegfoto: ${ohneDatei.map((b) => b.bezeichnung).join(", ")}.`);
  }

  return hinweise;
}
