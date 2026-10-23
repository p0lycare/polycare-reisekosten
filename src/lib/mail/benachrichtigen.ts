import "server-only";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { formatDatum, formatEuro } from "@/lib/format";
import { ladeAbrechnung } from "@/lib/reisekosten/abrechnung-laden";
import { mailKonfiguration, sendeMail } from "./graph";
import { alsMail, alsSammelMail, type Benachrichtigung } from "./vorlagen";
import { mailEmpfaenger, protokolliereMail } from "@/lib/supabase/admin";

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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    an = await mailEmpfaenger(reiseId, art);
    if (!an.length) return;

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
      await protokolliereMail({ reiseId, art, an, betreff, status: "nicht_eingerichtet", personId: user.id });
      return;
    }

    await sendeMail({ an, betreff: mail.betreff, text: mail.text, html: mail.html });
    await protokolliereMail({ reiseId, art, an, betreff, status: "gesendet", personId: user.id });
  } catch (e) {
    console.error("Benachrichtigung fehlgeschlagen", e);
    await protokolliereMail({
      reiseId,
      art,
      an,
      betreff: betreff ?? art,
      status: "fehler",
      fehler: e instanceof Error ? e.message : String(e),
    });
  }
}

/** Benachrichtigt die genehmigende(n) Person(en) einmal für mehrere eingereichte Reisen. */
export async function benachrichtigeSammel(supabase: SupabaseClient<Database>, reiseIds: string[], zeitraum: string): Promise<void> {
  if (reiseIds.length === 1) return benachrichtige(supabase, reiseIds[0], "eingereicht");
  let an: string[] = [];
  let betreff = "Sammeleinreichung";
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    // Alle Reisen gehören derselben Person, die Empfänger sind daher gleich
    an = await mailEmpfaenger(reiseIds[0], "eingereicht");
    if (!an.length) return;

    const [{ data: reisen }, { data: ich }] = await Promise.all([
      supabase.from("reise").select("*").in("id", reiseIds).order("beginn"),
      supabase.from("profile").select("name").eq("id", user.id).single(),
    ]);
    const abrechnungen = await Promise.all((reisen ?? []).map((r) => ladeAbrechnung(supabase, r)));
    const gesamt = abrechnungen.reduce((s, a) => s + a.auszuzahlen, 0);

    const mail = alsSammelMail({
      reisende: ich?.name ?? "",
      zeitraum,
      reisen: (reisen ?? []).map((r, i) => {
        const von = formatDatum(r.beginn);
        const bis = formatDatum(r.ende);
        return { begruendung: r.begruendung, zeitraum: von === bis ? von : `${von} – ${bis}`, betrag: formatEuro(abrechnungen[i].auszuzahlen) };
      }),
      gesamt: formatEuro(gesamt),
      link: `${await appUrl()}/freigaben`,
    });
    betreff = mail.betreff;

    if (!mailKonfiguration()) {
      await protokolliereMail({ reiseId: reiseIds[0], art: "eingereicht", an, betreff, status: "nicht_eingerichtet", personId: user.id });
      return;
    }
    await sendeMail({ an, betreff: mail.betreff, text: mail.text, html: mail.html });
    await protokolliereMail({ reiseId: reiseIds[0], art: "eingereicht", an, betreff, status: "gesendet", personId: user.id });
  } catch (e) {
    console.error("Sammelbenachrichtigung fehlgeschlagen", e);
    await protokolliereMail({ reiseId: reiseIds[0], art: "eingereicht", an, betreff, status: "fehler", fehler: e instanceof Error ? e.message : String(e) });
  }
}
