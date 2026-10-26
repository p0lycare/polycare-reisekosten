import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { orteOhneReise } from "./vorschlaege";

/** Orte ohne Reise für die angemeldete Person: eigener Wohnort, bei Zuordnung zum Büro auch die Büro-Orte */
export async function ladeOrteOhneReise(supabase: SupabaseClient<Database>, userId: string): Promise<string[]> {
  const [{ data: profil }, { data: privat }, { data: einstellungen }] = await Promise.all([
    supabase.from("profile").select("buero_ist_taetigkeitsstaette").eq("id", userId).single(),
    supabase.from("profil_privat").select("wohnort").eq("id", userId).maybeSingle(),
    supabase.from("einstellungen").select("buero_orte").single(),
  ]);
  return orteOhneReise({
    bueroOrte: einstellungen?.buero_orte ?? [],
    wohnort: privat?.wohnort,
    bueroIstTaetigkeitsstaette: profil?.buero_ist_taetigkeitsstaette ?? true,
  });
}
