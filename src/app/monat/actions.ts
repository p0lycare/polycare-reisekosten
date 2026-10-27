"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { benachrichtigeSammel } from "@/lib/mail/benachrichtigen";
import { monatsname } from "@/lib/reisekosten/monat";

export type MonatStatus = { fehler?: string; eingereicht?: number; benachrichtigt?: number };


/** Reicht die ausgewählten Reisen und Auslagen eines Monats mit einer Bestätigung ein – eine Mail an die genehmigende Person. */
export async function monatEinreichen(_vorher: MonatStatus, formData: FormData): Promise<MonatStatus> {
  const monat = String(formData.get("monat") ?? "");
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (formData.get("richtigkeit") !== "on") return { fehler: "Bitte bestätige die Richtigkeit deiner Angaben." };
  if (!ids.length) return { fehler: "Bitte mindestens eine Abrechnung auswählen." };

  const supabase = await createClient();
  const { data: anzahl, error } = await supabase.rpc("reisen_einreichen", { p_ids: ids });
  if (error) {
    // Eigene Meldungen der Datenbank (z. B. "Reise wurde bereits eingereicht") sind lesbar
    return { fehler: error.code === "P0001" ? error.message : "Das Einreichen hat nicht geklappt. Bitte Seite neu laden." };
  }

  const zeitraum = /^\d{4}-\d{2}$/.test(monat) ? monatsname(monat) : "";
  const benachrichtigt = await benachrichtigeSammel(supabase, ids, zeitraum);

  revalidatePath(`/monat/${monat}`);
  revalidatePath("/");
  revalidatePath("/freigaben");
  return { eingereicht: anzahl ?? ids.length, benachrichtigt };
}
