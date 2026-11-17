import { texte } from "@/lib/i18n/woerterbuch";
import type { Sprache } from "@/lib/i18n/sprache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { abschnitteFuer, passendeKategorie, type Abschnitt } from "./kategorie";
import { fehlendeAngaben, type Angaben } from "./pflichtangaben";

export const MAX_BETRAG_CENT = 10_000_000; // 100.000 €

export type Position = {
  kategorieId: string;
  betragCent: number;
  mwstProzent: number;
  bewirtungAnlass: string | null;
  bewirtungTeilnehmer: string | null;
  /** Pflichtangaben (Person, Anlass, Kfz-Kennzeichen) – welche nötig sind, bestimmt die Kategorie */
  angaben: Angaben;
};

/** Verlangte Angaben je Kategorie */
export async function ladePflichtangaben(supabase: SupabaseClient<Database>, ids: string[]): Promise<Map<string, string[]>> {
  const { data } = await supabase.from("kategorie").select("id, pflichtangaben").in("id", ids);
  return new Map((data ?? []).map((k) => [k.id, k.pflichtangaben]));
}

/** Gemeinsame Prüfung für einzelne Belege und für mehrere Positionen auf einmal. */
export async function pruefePositionen(
  supabase: SupabaseClient<Database>,
  positionen: Position[],
  bestehend: boolean,
  art: "reise" | "auslagen",
  sprache: Sprache = "de",
): Promise<string | null> {
  const t = texte(sprache);
  const m = t.hinweise.beleg;
  const ids = [...new Set(positionen.map((p) => p.kategorieId))];
  const { data: kategorien } = await supabase.from("kategorie").select("id, abschnitt, beleg_erfassbar, aktiv, pflichtangaben").in("id", ids);
  const nachId = new Map((kategorien ?? []).map((k) => [k.id, k]));

  for (const p of positionen) {
    const k = nachId.get(p.kategorieId);
    if (!k?.beleg_erfassbar || (!bestehend && !k.aktiv)) return m.kategorieWaehlen;
    // Reisekosten und Auslagen haben getrennte Kategorien (und Buchungskonten)
    if (!abschnitteFuer(art).includes(k.abschnitt as Abschnitt)) {
      return art === "auslagen" ? m.auslagenKategorie : m.nurAuslagen;
    }
    if (!Number.isInteger(p.betragCent) || p.betragCent <= 0 || p.betragCent > MAX_BETRAG_CENT) {
      return m.betrag;
    }
    if (!Number.isFinite(p.mwstProzent) || p.mwstProzent < 0 || p.mwstProzent >= 100) return m.mwst;
    if (k.abschnitt === "E" && (!p.bewirtungAnlass || !p.bewirtungTeilnehmer)) {
      return m.bewirtung;
    }
    const fehlt = fehlendeAngaben(k.pflichtangaben, p.angaben);
    if (fehlt.length) return m.angeben(fehlt.map((a) => t.allgemein.pflichtangabe.label(a, k.abschnitt)).join(", "));
  }
  return null;
}

/**
 * Stellt KI-Positionen auf die Kategorien der Abrechnungsart um (z. B. Büromaterial G → Bürobedarf F).
 * Fehler, wenn eine Position kein Gegenstück hat – dann von Hand erfassen.
 */
export async function positionenFuerArt<P extends { kategorieId: string; mwstProzent: number }>(
  supabase: SupabaseClient<Database>,
  positionen: P[],
  art: "reise" | "auslagen",
  sprache: Sprache = "de",
): Promise<{ positionen: P[] } | { fehler: string }> {
  const m = texte(sprache).hinweise.beleg;
  const { data: kategorien } = await supabase.from("kategorie").select("id, abschnitt").eq("beleg_erfassbar", true);
  const umgestellt = positionen.map((p) => ({ ...p, kategorieId: passendeKategorie(p, art, kategorien ?? []) }));
  if (umgestellt.some((p) => !p.kategorieId)) {
    return {
      fehler: art === "auslagen" ? m.eherReise : m.eherAuslage,
    };
  }
  return { positionen: umgestellt as P[] };
}
