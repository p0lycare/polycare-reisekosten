import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Supabase-Client mit Service-Rolle – umgeht RLS. Nur für eng begrenzte Server-Aufgaben verwenden:
 * Mailprotokoll schreiben und Empfänger ermitteln, nachdem ein Workflow-Schritt erfolgreich war.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY fehlt");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type Protokoll = {
  reiseId: string | null;
  art: string;
  an: string[];
  betreff: string;
  status: "gesendet" | "fehler" | "nicht_eingerichtet";
  fehler?: string;
  personId?: string | null;
};

/** Schreibt einen Eintrag ins Versandprotokoll; scheitert nie laut. */
export async function protokolliereMail(p: Protokoll): Promise<void> {
  try {
    const { error } = await createAdminClient().rpc("mail_protokollieren", {
      p_reise: p.reiseId as string,
      p_art: p.art,
      p_an: p.an,
      p_betreff: p.betreff,
      p_status: p.status,
      p_fehler: p.fehler ?? "",
      p_person: p.personId ?? undefined,
    });
    if (error) console.error("Mailprotokoll konnte nicht geschrieben werden", error.message);
  } catch (e) {
    console.error("Mailprotokoll konnte nicht geschrieben werden", e);
  }
}

/** Empfänger der Benachrichtigung zu einem Workflow-Schritt */
export async function mailEmpfaenger(reiseId: string, art: string): Promise<string[]> {
  const { data, error } = await createAdminClient().rpc("mail_empfaenger", { p_reise: reiseId, p_art: art });
  if (error) console.error("Mail-Empfänger konnten nicht ermittelt werden", error.message);
  return (data ?? []).map((e) => e.email).filter(Boolean);
}

/** Prüft, ob der serverseitige Zugang (Service-Rolle) funktioniert – für die Anzeige in den Einstellungen */
export async function adminZugangOk(): Promise<boolean> {
  try {
    const { error } = await createAdminClient().rpc("mail_empfaenger", {
      p_reise: "00000000-0000-0000-0000-000000000000",
      p_art: "eingereicht",
    });
    return !error;
  } catch {
    return false;
  }
}
