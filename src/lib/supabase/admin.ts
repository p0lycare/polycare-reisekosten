import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { alsSprache, type Sprache } from "@/lib/i18n/sprache";

/**
 * Supabase-Client mit Service-Rolle – umgeht RLS. Nur für eng begrenzte Server-Aufgaben verwenden:
 * Mailprotokoll schreiben, Empfänger ermitteln, nachdem ein Workflow-Schritt erfolgreich war,
 * und der tägliche Erinnerungslauf (Cron).
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

/**
 * Empfänger der Benachrichtigung zu einem Workflow-Schritt – ohne die handelnde Person selbst
 * (z. B. wer genehmigt und zugleich Buchhaltung ist, bekommt keine Mail über die eigene Genehmigung).
 */
export async function mailEmpfaenger(reiseId: string, art: string, ohne?: string | null): Promise<string[]> {
  const { data, error } = await createAdminClient().rpc("mail_empfaenger", { p_reise: reiseId, p_art: art });
  if (error) console.error("Mail-Empfänger konnten nicht ermittelt werden", error.message);
  const selbst = ohne?.toLowerCase();
  // Doppelte Adressen (z. B. Admin, der zugleich Vertretung ist) nur einmal
  const adressen = (data ?? []).map((e) => e.email).filter((e) => e && e.toLowerCase() !== selbst);
  return [...new Map(adressen.map((e) => [e.toLowerCase(), e])).values()];
}

/**
 * Teilt Mail-Empfänger nach ihrer Sprache auf (Profileinstellung; unbekannte Adressen deutsch),
 * damit jede Person Benachrichtigungen in ihrer Sprache bekommt. Schlägt nie fehl.
 */
export async function nachSprache(an: string[]): Promise<{ sprache: Sprache; an: string[] }[]> {
  const sprachen = new Map<string, Sprache>();
  try {
    const { data } = await createAdminClient().from("profile").select("email, sprache").in("email", an);
    for (const p of data ?? []) sprachen.set(p.email.toLowerCase(), alsSprache(p.sprache));
  } catch (e) {
    console.error("Sprache der Empfänger konnte nicht ermittelt werden", e);
  }
  const gruppen = new Map<Sprache, string[]>();
  for (const e of an) {
    const s = sprachen.get(e.toLowerCase()) ?? "de";
    gruppen.set(s, [...(gruppen.get(s) ?? []), e]);
  }
  return [...gruppen].map(([sprache, an]) => ({ sprache, an }));
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
