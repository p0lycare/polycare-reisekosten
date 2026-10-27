import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { orteOhneReise } from "./vorschlaege";

/** Orte ohne Reise für die angemeldete Person: eigener Wohnort und der Standort der ersten Tätigkeitsstätte */
export async function ladeOrteOhneReise(supabase: SupabaseClient<Database>, userId: string): Promise<string[]> {
  const [{ data: profil }, { data: privat }] = await Promise.all([
    supabase.from("profile").select("erste_taetigkeitsstaette_id").eq("id", userId).single(),
    supabase.from("profil_privat").select("wohnort").eq("id", userId).maybeSingle(),
  ]);
  const { data: standort } = profil?.erste_taetigkeitsstaette_id
    ? await supabase.from("standort").select("orte").eq("id", profil.erste_taetigkeitsstaette_id).maybeSingle()
    : { data: null };
  return orteOhneReise({ standortOrte: standort?.orte ?? [], wohnort: privat?.wohnort });
}
