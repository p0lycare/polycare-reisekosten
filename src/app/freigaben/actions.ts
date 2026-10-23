"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { benachrichtigeSammel } from "@/lib/mail/benachrichtigen";
import { sendeAnDatev } from "@/lib/datev/senden";

export type SammelStatus = { fehler?: string; erledigt?: number; hinweis?: string };

function ids(formData: FormData): string[] {
  return formData.getAll("ids").map(String).filter(Boolean);
}

function meldung(error: { message: string; code?: string }): SammelStatus {
  return { fehler: error.code === "P0001" ? error.message : "Das hat nicht geklappt. Bitte Seite neu laden." };
}

function aktualisieren() {
  revalidatePath("/freigaben");
  revalidatePath("/uebersicht", "layout");
  revalidatePath("/");
}

export async function sammelGenehmigen(_vorher: SammelStatus, formData: FormData): Promise<SammelStatus> {
  const auswahl = ids(formData);
  if (!auswahl.length) return { fehler: "Bitte mindestens eine Reise auswählen." };
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
  if (!auswahl.length) return { fehler: "Bitte mindestens eine Reise auswählen." };
  if (!/^\d{4}-\d{2}$/.test(monat)) return { fehler: "Bitte den Buchungsmonat angeben." };
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
      ? `${fehlgeschlagen.length} Übertragung(en) an DATEV fehlgeschlagen: ${[...new Set(fehlgeschlagen)].join("; ")}`
      : undefined,
  };
}

export async function sammelAuszahlen(_vorher: SammelStatus, formData: FormData): Promise<SammelStatus> {
  const auswahl = ids(formData);
  if (!auswahl.length) return { fehler: "Bitte mindestens eine Reise auswählen." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reisen_auszahlen", { p_ids: auswahl });
  if (error) return meldung(error);
  await benachrichtigeSammel(supabase, auswahl, "", "ausgezahlt");
  aktualisieren();
  return { erledigt: data ?? auswahl.length };
}
