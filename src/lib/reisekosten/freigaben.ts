import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Rolle = Database["public"]["Enums"]["rolle"];

export function istFreigebend(rolle: Rolle | undefined): boolean {
  return rolle === "freigeber" || rolle === "buchhaltung" || rolle === "admin";
}

/**
 * Offene Aufgaben der angemeldeten Person: zu genehmigende, zu prüfende und auszuzahlende Reisen.
 * Spiegelt die Regeln von darf_genehmigen/darf_pruefen in der Datenbank; die Datenbank prüft beim Ausführen erneut.
 */
export async function ladeAufgaben(supabase: SupabaseClient<Database>, userId: string, rolle: Rolle | undefined) {
  if (!istFreigebend(rolle)) return { genehmigen: [], pruefen: [], auszahlen: [] };

  const { data: reisen } = await supabase
    .from("reise")
    .select("*, mitarbeiter:profile!reise_mitarbeiter_id_fkey(name, vorgesetzter_id, rolle)")
    .neq("mitarbeiter_id", userId)
    .in("status", ["eingereicht", "freigegeben", "geprueft"])
    .order("eingereicht_am");

  const alle = reisen ?? [];
  const buchhaltung = rolle === "buchhaltung" || rolle === "admin";

  return {
    genehmigen: alle.filter(
      (r) =>
        r.status === "eingereicht" &&
        (r.mitarbeiter?.vorgesetzter_id === userId ||
          rolle === "admin" ||
          (rolle === "freigeber" && !r.mitarbeiter?.vorgesetzter_id)),
    ),
    // Vier-Augen-Prinzip wie in reise_pruefen
    pruefen: buchhaltung
      ? alle.filter((r) => r.status === "freigegeben" && (r.freigeber_id !== userId || r.mitarbeiter?.rolle === "admin"))
      : [],
    auszahlen: buchhaltung ? alle.filter((r) => r.status === "geprueft") : [],
  };
}
