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
  // In Produktion nie aus dem (fälschbaren) Host-Header ableiten
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
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
    an = await mailEmpfaenger(reiseId, art, user?.email);
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
/**
 * Benachrichtigt nach einem Sammel-Schritt einmal je reisender Person statt einmal je Reise.
 * Gibt die Zahl der verschickten Mails zurück.
 */
export async function benachrichtigeSammel(
  supabase: SupabaseClient<Database>,
  reiseIds: string[],
  zeitraum: string,
  art: Benachrichtigung = "eingereicht",
  extra: { kommentar?: string } = {},
): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !reiseIds.length) return 0;

  const [{ data: reisen }, { data: ich }] = await Promise.all([
    supabase.from("reise").select("*").in("id", reiseIds).order("beginn"),
    supabase.from("profile").select("name").eq("id", user.id).single(),
  ]);
  const gruppen = new Map<string, NonNullable<typeof reisen>>();
  for (const r of reisen ?? []) gruppen.set(r.mitarbeiter_id, [...(gruppen.get(r.mitarbeiter_id) ?? []), r]);

  let gesendet = 0;
  for (const [mitarbeiterId, gruppe] of gruppen) {
    if (gruppe.length === 1) {
      await benachrichtige(supabase, gruppe[0].id, art, { grund: extra.kommentar });
      if ((await mailEmpfaenger(gruppe[0].id, art, user.email)).length && mailKonfiguration()) gesendet += 1;
      continue;
    }
    let an: string[] = [];
    let betreff = `Sammelbenachrichtigung ${art}`;
    try {
      an = await mailEmpfaenger(gruppe[0].id, art, user.email);
      if (!an.length) continue;
      const { data: person } = await supabase.from("profile").select("name").eq("id", mitarbeiterId).maybeSingle();
      const abrechnungen = await Promise.all(gruppe.map((r) => ladeAbrechnung(supabase, r)));
      const mail = alsSammelMail({
        art: art === "abgelehnt" ? "eingereicht" : art,
        reisende: person?.name ?? "",
        handelnde: ich?.name ?? "",
        zeitraum,
        reisen: gruppe.map((r, i) => {
          const von = formatDatum(r.beginn);
          const bis = formatDatum(r.ende);
          return { begruendung: r.begruendung, zeitraum: von === bis ? von : `${von} – ${bis}`, betrag: formatEuro(abrechnungen[i].auszuzahlen) };
        }),
        gesamt: formatEuro(abrechnungen.reduce((s, a) => s + a.auszuzahlen, 0)),
        link: `${await appUrl()}${art === "eingereicht" || art === "genehmigt" ? "/freigaben" : "/"}`,
        kommentar: extra.kommentar,
      });
      betreff = mail.betreff;
      if (!mailKonfiguration()) {
        await protokolliereMail({ reiseId: gruppe[0].id, art, an, betreff, status: "nicht_eingerichtet", personId: user.id });
        continue;
      }
      await sendeMail({ an, betreff: mail.betreff, text: mail.text, html: mail.html });
      await protokolliereMail({ reiseId: gruppe[0].id, art, an, betreff, status: "gesendet", personId: user.id });
      gesendet += 1;
    } catch (e) {
      console.error("Sammelbenachrichtigung fehlgeschlagen", e);
      await protokolliereMail({ reiseId: gruppe[0].id, art, an, betreff, status: "fehler", fehler: e instanceof Error ? e.message : String(e) });
    }
  }
  return gesendet;
}
