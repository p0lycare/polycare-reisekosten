import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { verpflegungBerechnen } from "./reise";

/**
 * Schreibt nach dem Einreichen die Verpflegungspauschale fest. Läuft mit dem Server-Zugang, weil Reisende
 * das Feld nicht selbst setzen dürfen; nur für tatsächlich eingereichte Reisen.
 */
export async function verpflegungFestschreiben(reiseIds: string[]): Promise<void> {
  if (!reiseIds.length) return;
  try {
    const db = createAdminClient();
    const { data: reisen } = await db.from("reise").select("*").in("id", reiseIds).eq("status", "eingereicht");
    for (const r of reisen ?? []) {
      const ergebnis = verpflegungBerechnen(r);
      await db.from("reise").update({ verpflegung_fest: (ergebnis ?? null) as unknown as Json }).eq("id", r.id);
    }
  } catch (e) {
    // Ohne Festschreiben wird weiter live berechnet – das blockiert das Einreichen nicht
    console.error("Verpflegung konnte nicht festgeschrieben werden", e);
  }
}
