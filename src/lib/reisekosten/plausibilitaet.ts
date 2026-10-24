import type { Mahlzeiten } from "./verpflegung";
import type { Verkehrsmittel } from "./reise";
import { weichtAb } from "../routing/strecke";

export type PlausiReise = {
  beginn: string;
  ende: string;
  mitUebernachtung: boolean;
  verkehrsmittel: Verkehrsmittel[];
  mahlzeiten: Record<string, Mahlzeiten>;
};

export type PlausiBeleg = {
  kategorieId: string;
  bezeichnung: string;
  datum: string;
  betragCent: number;
  hatDatei: boolean;
};

/** km_route: per Routing berechnete Strecke, falls bekannt */
export type PlausiFahrt = { datum: string; km?: number | string; km_route?: number | string | null };

/** Kategorien, für die es üblicherweise keinen Beleg gibt */
const OHNE_BELEG_UEBLICH = new Set(["trinkgeld"]);

/**
 * Prüft eine Reise vor dem Einreichen auf typische Fehler, die sonst zu Rückfragen der
 * Buchhaltung führen. Liefert Hinweise; das Einreichen bleibt möglich.
 */
export function pruefePlausibilitaet(reise: PlausiReise, belege: PlausiBeleg[], fahrten: PlausiFahrt[]): string[] {
  const hinweise: string[] = [];
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
