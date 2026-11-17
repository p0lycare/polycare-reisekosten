"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { benachrichtige, benachrichtigeSammel } from "@/lib/mail/benachrichtigen";
import { sendeAnDatev } from "@/lib/datev/senden";
import { ladeTexte } from "@/lib/i18n/server";

export type SammelStatus = { fehler?: string; erledigt?: number; hinweis?: string };

function ids(formData: FormData): string[] {
  return formData.getAll("ids").map(String).filter(Boolean);
}

async function meldung(error: { message: string; code?: string }): Promise<SammelStatus> {
  return { fehler: error.code === "P0001" ? error.message : (await ladeTexte()).freigaben.meldung.allgemein };
}

function aktualisieren() {
  revalidatePath("/freigaben");
  revalidatePath("/uebersicht", "layout");
  revalidatePath("/");
}

export async function sammelGenehmigen(_vorher: SammelStatus, formData: FormData): Promise<SammelStatus> {
  const auswahl = ids(formData);
  const t = (await ladeTexte()).freigaben.meldung;
  if (!auswahl.length) return { fehler: t.auswahl };
  const kommentar = String(formData.get("kommentar") ?? "").trim().slice(0, 500) || undefined;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reisen_genehmigen", { p_ids: auswahl, p_kommentar: kommentar });
  if (error) return meldung(error);
  await benachrichtigeSammel(supabase, auswahl, "", "genehmigt", { kommentar });
  aktualisieren();
  return { erledigt: data ?? auswahl.length };
}

export async function sammelPruefen(_vorher: SammelStatus, formData: FormData): Promise<SammelStatus> {
  const auswahl = ids(formData);
  const monat = String(formData.get("buchungsmonat") ?? "");
  const t = (await ladeTexte()).freigaben.meldung;
  if (!auswahl.length) return { fehler: t.auswahl };
  if (!/^\d{4}-\d{2}$/.test(monat)) return { fehler: t.buchungsmonat };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reisen_pruefen", { p_ids: auswahl, p_buchungsmonat: `${monat}-01` });
  if (error) return meldung(error);

  await benachrichtigeSammel(supabase, auswahl, "", "geprueft");
  // Übergabe an DATEV je Reise (eigene Beleg-Nr.); Fehler werden protokolliert und blockieren nichts
  const fehlgeschlagen: string[] = [];
  for (const id of auswahl) {
    const { fehler } = await sendeAnDatev(supabase, id);
    if (fehler) fehlgeschlagen.push(fehler);
  }
  aktualisieren();
  return {
    erledigt: data ?? auswahl.length,
    hinweis: fehlgeschlagen.length
      ? t.datevFehlgeschlagen(fehlgeschlagen.length, [...new Set(fehlgeschlagen)].join("; "))
      : undefined,
  };
}

export async function sammelAuszahlen(_vorher: SammelStatus, formData: FormData): Promise<SammelStatus> {
  const auswahl = ids(formData);
  if (!auswahl.length) return { fehler: (await ladeTexte()).freigaben.meldung.auswahl };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reisen_auszahlen", { p_ids: auswahl });
  if (error) return meldung(error);
  await benachrichtigeSammel(supabase, auswahl, "", "ausgezahlt");
  aktualisieren();
  return { erledigt: data ?? auswahl.length };
}

/** Ausgewählte Reisen mit einem gemeinsamen Grund ablehnen (bei Genehmigung oder Belegprüfung) */
export async function sammelAblehnen(_vorher: SammelStatus, formData: FormData): Promise<SammelStatus> {
  const auswahl = ids(formData);
  const grund = String(formData.get("grund") ?? "").trim().slice(0, 500);
  const t = (await ladeTexte()).freigaben.meldung;
  if (!auswahl.length) return { fehler: t.auswahl };
  if (!grund) return { fehler: t.grund };
  const supabase = await createClient();
  let erledigt = 0;
  for (const id of auswahl) {
    const { error } = await supabase.rpc("reise_ablehnen", { p_id: id, p_grund: grund });
    if (error) {
      aktualisieren();
      return { ...(await meldung(error)), erledigt: erledigt || undefined };
    }
    await benachrichtige(supabase, id, "abgelehnt", { grund });
    erledigt += 1;
  }
  aktualisieren();
  return { erledigt, hinweis: t.abgelehnt };
}
