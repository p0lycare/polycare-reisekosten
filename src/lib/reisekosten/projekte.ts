import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type ProjektKurz = { id: string; bezeichnung: string; nummer: string | null };

export function projektName(p: ProjektKurz): string {
  return p.nummer ? `${p.nummer} – ${p.bezeichnung}` : p.bezeichnung;
}

/** Auswahl für das Reiseformular: aktive Projekte und das bereits zugeordnete (auch wenn inaktiv) */
export async function ladeProjektAuswahl(supabase: SupabaseClient<Database>, aktuell?: string | null) {
  const { data } = await supabase.from("projekt").select("id, bezeichnung, nummer, aktiv").order("bezeichnung");
  return (data ?? []).filter((p) => p.aktiv || p.id === aktuell).map((p) => ({ id: p.id, name: projektName(p) }));
}
