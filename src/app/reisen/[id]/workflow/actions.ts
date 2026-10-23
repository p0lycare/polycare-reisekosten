"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { benachrichtige } from "@/lib/mail/benachrichtigen";
import { sendeAnDatev } from "@/lib/datev/senden";

export type WorkflowStatus = { fehler?: string };

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

/** Fehlermeldungen der Datenbankfunktionen sind bereits für Menschen formuliert */
function meldung(error: { message: string } | null): WorkflowStatus {
  return error ? { fehler: error.message } : {};
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
  const { error } = await supabase.rpc("reise_genehmigen", { p_id: id });
  if (!error) await benachrichtige(supabase, id, "genehmigt");
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
  const belegNr = text(formData, "beleg_nr");
  const monat = text(formData, "buchungsmonat");
  if (!belegNr) return { fehler: "Bitte eine Beleg-Nr. angeben." };
  if (!/^\d{4}-\d{2}$/.test(monat)) return { fehler: "Bitte den Buchungsmonat angeben." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reise_pruefen", {
    p_id: id,
    p_beleg_nr: belegNr,
    p_buchungsmonat: `${monat}-01`,
  });
  if (!error) {
    await benachrichtige(supabase, id, "geprueft");
    // Abrechnung und Belege automatisch an DATEV; ein Fehler blockiert die Prüfung nicht
    await sendeAnDatev(supabase, id);
  }
  aktualisieren(id);
  if (error?.message.includes("beleg_nr")) return { fehler: "Diese Beleg-Nr. ist bereits vergeben." };
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
