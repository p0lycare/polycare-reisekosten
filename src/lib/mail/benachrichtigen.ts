import "server-only";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { formatDatum, formatEuro } from "@/lib/format";
import { ladeAbrechnung } from "@/lib/reisekosten/abrechnung-laden";
import { mailKonfiguration, sendeMail } from "./graph";
import { alsMail, type Benachrichtigung } from "./vorlagen";

export async function appUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

/**
 * Benachrichtigt die nächsten Beteiligten nach einem Workflow-Schritt. Schlägt nie fehl:
 * Ein Mailproblem darf den Workflow nicht blockieren, es wird nur protokolliert.
 */
export async function benachrichtige(
  supabase: SupabaseClient<Database>,
  reiseId: string,
  art: Benachrichtigung,
  extra: { grund?: string } = {},
): Promise<void> {
  let an: string[] = [];
  let betreff: string | null = null;
  try {
    const { data: empfaenger } = await supabase.rpc("mail_empfaenger", { p_reise: reiseId, p_art: art });
    an = (empfaenger ?? []).map((e) => e.email).filter(Boolean);
    if (!an.length) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: reise } = await supabase.from("reise").select("*").eq("id", reiseId).single();
    if (!reise || !user) return;

    const [{ data: reisende }, { data: handelnde }, abrechnung] = await Promise.all([
      supabase.from("profile").select("name").eq("id", reise.mitarbeiter_id).maybeSingle(),
      supabase.from("profile").select("name").eq("id", user.id).maybeSingle(),
      ladeAbrechnung(supabase, reise),
    ]);

    const von = formatDatum(reise.beginn);
    const bis = formatDatum(reise.ende);
    const mail = alsMail(art, {
      reisende: reisende?.name ?? "",
      begruendung: reise.begruendung,
      zeitraum: von === bis ? von : `${von} – ${bis}`,
      betrag: formatEuro(abrechnung.auszuzahlen),
      link: `${await appUrl()}/reisen/${reiseId}`,
      handelnde: handelnde?.name ?? "",
      grund: extra.grund,
      belegNr: reise.beleg_nr ?? undefined,
    });
    betreff = mail.betreff;

    if (!mailKonfiguration()) {
      await supabase.rpc("mail_protokollieren", {
        p_reise: reiseId, p_art: art, p_an: an, p_betreff: betreff, p_status: "nicht_eingerichtet", p_fehler: "",
      });
      return;
    }

    await sendeMail({ an, betreff: mail.betreff, text: mail.text, html: mail.html });
    await supabase.rpc("mail_protokollieren", {
      p_reise: reiseId, p_art: art, p_an: an, p_betreff: betreff, p_status: "gesendet", p_fehler: "",
    });
  } catch (e) {
    console.error("Benachrichtigung fehlgeschlagen", e);
    await supabase
      .rpc("mail_protokollieren", {
        p_reise: reiseId,
        p_art: art,
        p_an: an,
        p_betreff: betreff ?? art,
        p_status: "fehler",
        p_fehler: e instanceof Error ? e.message : String(e),
      })
      .then(
        () => undefined,
        () => undefined,
      );
  }
}
