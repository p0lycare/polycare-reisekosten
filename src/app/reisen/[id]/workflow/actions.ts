"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { benachrichtige } from "@/lib/mail/benachrichtigen";
import { sendeAnDatev } from "@/lib/datev/senden";

export type WorkflowStatus = { fehler?: string };

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

/**
 * Eigene Fehlermeldungen der Workflow-Funktionen (raise exception, Code P0001) sind für Menschen
 * formuliert; technische Fehler (Constraints usw.) werden nicht ungefiltert angezeigt.
 */
function meldung(error: { message: string; code?: string } | null): WorkflowStatus {
  if (!error) return {};
  if (error.code === "P0001") return { fehler: error.message };
  console.error("Workflow-Fehler", error);
  return { fehler: "Das hat nicht geklappt. Bitte Seite neu laden und erneut versuchen." };
}

function aktualisieren(reiseId: string) {
  revalidatePath(`/reisen/${reiseId}`);
  revalidatePath("/");
  revalidatePath("/freigaben");
}

export async function einreichen(_vorher: WorkflowStatus, formData: FormData): Promise<WorkflowStatus> {
  const id = text(formData, "id");
  if (formData.get("richtigkeit") !== "on") {
    return { fehler: "Bitte bestätige die Richtigkeit deiner Angaben." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("reise_einreichen", { p_id: id });
  if (!error) await benachrichtige(supabase, id, "eingereicht");
  aktualisieren(id);
  return meldung(error);
}

export async function genehmigen(_vorher: WorkflowStatus, formData: FormData): Promise<WorkflowStatus> {
  const id = text(formData, "id");
  const supabase = await createClient();
  const kommentar = text(formData, "kommentar").slice(0, 500);
  const { error } = await supabase.rpc("reise_genehmigen", { p_id: id, p_kommentar: kommentar || undefined });
  if (!error) await benachrichtige(supabase, id, "genehmigt", { grund: kommentar || undefined });
  aktualisieren(id);
  return meldung(error);
}

export async function zurueckziehen(_vorher: WorkflowStatus, formData: FormData): Promise<WorkflowStatus> {
  const id = text(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase.rpc("reise_zurueckziehen", { p_id: id });
  aktualisieren(id);
  return meldung(error);
}

export async function ablehnen(_vorher: WorkflowStatus, formData: FormData): Promise<WorkflowStatus> {
  const id = text(formData, "id");
  const grund = text(formData, "grund");
  if (!grund) return { fehler: "Bitte einen Grund für die Ablehnung angeben." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reise_ablehnen", { p_id: id, p_grund: grund });
  if (!error) await benachrichtige(supabase, id, "abgelehnt", { grund });
  aktualisieren(id);
  return meldung(error);
}

export async function pruefen(_vorher: WorkflowStatus, formData: FormData): Promise<WorkflowStatus> {
  const id = text(formData, "id");
  const monat = text(formData, "buchungsmonat");
  if (!/^\d{4}-\d{2}$/.test(monat)) return { fehler: "Bitte den Buchungsmonat angeben." };
  const supabase = await createClient();
  // Die Beleg-Nr. vergibt die Datenbank fortlaufend
  const { error } = await supabase.rpc("reise_pruefen", { p_id: id, p_buchungsmonat: `${monat}-01` });
  if (!error) {
    await benachrichtige(supabase, id, "geprueft");
    // Abrechnung und Belege automatisch an DATEV; ein Fehler blockiert die Prüfung nicht
    await sendeAnDatev(supabase, id);
  }
  aktualisieren(id);
  return meldung(error);
}

export async function auszahlen(_vorher: WorkflowStatus, formData: FormData): Promise<WorkflowStatus> {
  const id = text(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase.rpc("reise_auszahlen", { p_id: id });
  if (!error) await benachrichtige(supabase, id, "ausgezahlt");
  aktualisieren(id);
  return meldung(error);
}

export async function erneutAnDatev(_vorher: WorkflowStatus, formData: FormData): Promise<WorkflowStatus & { gesendet?: boolean }> {
  const id = text(formData, "id");
  const supabase = await createClient();
  const ergebnis = await sendeAnDatev(supabase, id);
  aktualisieren(id);
  return ergebnis.fehler ? { fehler: ergebnis.fehler } : { gesendet: true };
}
