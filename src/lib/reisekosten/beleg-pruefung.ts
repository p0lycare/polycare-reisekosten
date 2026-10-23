import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const MAX_BETRAG_CENT = 10_000_000; // 100.000 €

export type Position = {
  kategorieId: string;
  betragCent: number;
  mwstProzent: number;
  bewirtungAnlass: string | null;
  bewirtungTeilnehmer: string | null;
};

/** Gemeinsame Prüfung für einzelne Belege und für mehrere Positionen auf einmal. */
export async function pruefePositionen(supabase: SupabaseClient<Database>, positionen: Position[], bestehend: boolean): Promise<string | null> {
  const ids = [...new Set(positionen.map((p) => p.kategorieId))];
  const { data: kategorien } = await supabase.from("kategorie").select("id, abschnitt, beleg_erfassbar, aktiv").in("id", ids);
  const nachId = new Map((kategorien ?? []).map((k) => [k.id, k]));

  for (const p of positionen) {
    const k = nachId.get(p.kategorieId);
    if (!k?.beleg_erfassbar || (!bestehend && !k.aktiv)) return "Bitte eine Kategorie wählen.";
    if (!Number.isInteger(p.betragCent) || p.betragCent <= 0 || p.betragCent > MAX_BETRAG_CENT) {
      return "Bitte einen gültigen Betrag angeben, z. B. 12,50.";
    }
    if (!Number.isFinite(p.mwstProzent) || p.mwstProzent < 0 || p.mwstProzent >= 100) return "Bitte den MwSt-Satz angeben.";
    if (k.abschnitt === "E" && (!p.bewirtungAnlass || !p.bewirtungTeilnehmer)) {
      return "Bei Bewirtungen sind Anlass und Teilnehmende Pflicht.";
    }
  }
  return null;
}
