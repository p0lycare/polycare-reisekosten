import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { belegAuslesen, kiVerfuegbar, type AusgelesenerBeleg } from "./beleg-auslesen";

/** Liest ein bereits gespeichertes Belegfoto aus (mit Tageskontingent). */
export async function liesGespeichertenBeleg(
  supabase: SupabaseClient<Database>,
  pfad: string,
): Promise<{ ergebnis?: AusgelesenerBeleg; fehler?: string }> {
  if (!kiVerfuegbar()) return { fehler: "Das automatische Auslesen ist nicht eingerichtet." };

  const { data: kontingent } = await supabase.rpc("ki_kontingent_nutzen");
  if (!kontingent) return { fehler: "Das Tageskontingent für das automatische Auslesen ist erreicht." };

  const [{ data: blob }, { data: kategorien }] = await Promise.all([
    supabase.storage.from("belege").download(pfad),
    supabase.from("kategorie").select("id, bezeichnung, abschnitt, mwst_prozent").eq("beleg_erfassbar", true).eq("aktiv", true),
  ]);
  if (!blob) return { fehler: "Das Foto wurde nicht gefunden." };

  const ergebnis = await belegAuslesen(
    { inhalt: new Uint8Array(await blob.arrayBuffer()), contentType: blob.type },
    (kategorien ?? []).map((k) => ({
      id: k.id,
      bezeichnung: k.bezeichnung,
      abschnitt: k.abschnitt,
      mwstProzent: k.mwst_prozent == null ? null : Number(k.mwst_prozent),
    })),
  );
  return "fehler" in ergebnis ? { fehler: ergebnis.fehler } : { ergebnis };
}
