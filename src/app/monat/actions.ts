"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { benachrichtigeSammel } from "@/lib/mail/benachrichtigen";
import { monatsname } from "@/lib/reisekosten/monat";
import { verpflegungFestschreiben } from "@/lib/reisekosten/verpflegung-fest";
import { ladeTexte } from "@/lib/i18n/server";

export type MonatStatus = { fehler?: string; eingereicht?: number; benachrichtigt?: number };


/** Reicht die ausgewählten Reisen und Auslagen eines Monats mit einer Bestätigung ein – eine Mail an die genehmigende Person. */
export async function monatEinreichen(_vorher: MonatStatus, formData: FormData): Promise<MonatStatus> {
  const monat = String(formData.get("monat") ?? "");
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const t = (await ladeTexte()).monat.fehler;
  if (formData.get("richtigkeit") !== "on") return { fehler: t.richtigkeit };
  if (!ids.length) return { fehler: t.auswahl };

  const supabase = await createClient();
  const { data: anzahl, error } = await supabase.rpc("reisen_einreichen", { p_ids: ids });
  if (error) {
    // Eigene Meldungen der Datenbank (z. B. "Reise wurde bereits eingereicht") sind lesbar
    return { fehler: error.code === "P0001" ? error.message : t.einreichen };
  }

  await verpflegungFestschreiben(ids);
  // Den Monatsnamen setzt die Mail in der Sprache der empfangenden Person ein
  const gueltig = /^\d{4}-\d{2}$/.test(monat);
  const benachrichtigt = await benachrichtigeSammel(supabase, ids, gueltig ? monatsname(monat) : "", "eingereicht", gueltig ? { monat } : {});

  revalidatePath(`/monat/${monat}`);
  revalidatePath("/");
  revalidatePath("/freigaben");
  return { eingereicht: anzahl ?? ids.length, benachrichtigt };
}
