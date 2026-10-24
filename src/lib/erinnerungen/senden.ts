import "server-only";
import { createAdminClient, protokolliereMail } from "@/lib/supabase/admin";
import { mailKonfiguration, sendeMail } from "@/lib/mail/graph";
import { alsErinnerung } from "@/lib/mail/vorlagen";
import { verteileAufgaben } from "@/lib/reisekosten/freigaben";
import { freigabeText, istFreigabeErinnerung, istMonatserinnerung, monatsText } from "./plan";

const MONATSNAME = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });

function heuteInBerlin(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
}

export type Lauf = { heute: string; monat: number; freigaben: number; uebersprungen?: string };

/**
 * Täglicher Lauf (Vercel Cron): am vorletzten Werktag des Monats Erinnerung an offene Entwürfe,
 * abgelehnte Reisen und Belege im Eingang; montags Erinnerung an wartende Freigaben.
 * Liest personenübergreifend und braucht deshalb die Service-Rolle; versendet nur Zähler, keine Beträge.
 */
export async function erinnerungenSenden({
  basis,
  heute = heuteInBerlin(),
  erzwingen = false,
  nurAn,
}: {
  basis: string;
  heute?: string;
  /** Test aus den Einstellungen: beide Erinnerungen sofort, nur an diese Person, ohne Tagessperre */
  erzwingen?: boolean;
  nurAn?: string;
}): Promise<Lauf> {
  const lauf: Lauf = { heute, monat: 0, freigaben: 0 };
  const monat = erzwingen || istMonatserinnerung(heute);
  const freigaben = erzwingen || istFreigabeErinnerung(heute);
  if (!monat && !freigaben) return { ...lauf, uebersprungen: "heute keine Erinnerung fällig" };
  if (!mailKonfiguration()) return { ...lauf, uebersprungen: "E-Mail-Versand ist nicht eingerichtet" };

  const db = createAdminClient();
  // Ein Lauf je Tag: wurde in den letzten 20 Stunden erinnert (z. B. Wiederholung des Cron-Aufrufs), nichts doppelt senden
  const { count } = await db
    .from("mail_protokoll")
    .select("id", { count: "exact", head: true })
    .like("art", "erinnerung_%")
    .gte("zeit", new Date(Date.now() - 20 * 3600_000).toISOString());
  if (count && !erzwingen) return { ...lauf, uebersprungen: "heute bereits erinnert" };

  const [{ data: personen }, { data: reisen }, { data: eingang }] = await Promise.all([
    db.from("profile").select("id, name, email, rolle"),
    db
      .from("reise")
      .select("id, status, mitarbeiter_id, freigeber_id, mitarbeiter:profile!reise_mitarbeiter_id_fkey(vorgesetzter_id, rolle)")
      .in("status", ["entwurf", "abgelehnt", "eingereicht", "freigegeben", "geprueft"]),
    db.from("beleg_eingang").select("mitarbeiter_id"),
  ]);

  async function senden(person: { id: string; email: string }, art: string, inhalt: { betreff: string; zeilen: string[] }, knopf: string, pfad: string) {
    const mail = alsErinnerung({ ...inhalt, knopf, link: `${basis}${pfad}` });
    try {
      await sendeMail({ an: [person.email], ...mail });
      await protokolliereMail({ reiseId: null, art, an: [person.email], betreff: mail.betreff, status: "gesendet", personId: null });
      return true;
    } catch (e) {
      const fehler = e instanceof Error ? e.message : String(e);
      await protokolliereMail({ reiseId: null, art, an: [person.email], betreff: mail.betreff, status: "fehler", fehler, personId: null });
      return false;
    }
  }

  for (const person of personen ?? []) {
    if (!person.email || (nurAn && person.id !== nurAn)) continue;

    if (monat) {
      const eigene = (reisen ?? []).filter((r) => r.mitarbeiter_id === person.id);
      const text = monatsText(MONATSNAME.format(new Date(`${heute.slice(0, 7)}-01T00:00:00Z`)), {
        entwuerfe: eigene.filter((r) => r.status === "entwurf").length,
        abgelehnt: eigene.filter((r) => r.status === "abgelehnt").length,
        eingang: (eingang ?? []).filter((e) => e.mitarbeiter_id === person.id).length,
      });
      if (text && (await senden(person, "erinnerung_monat", text, "Monat abrechnen", `/monat/${heute.slice(0, 7)}`))) lauf.monat++;
    }

    if (freigaben) {
      const a = verteileAufgaben(reisen ?? [], person.id, person.rolle);
      const text = freigabeText({ genehmigen: a.genehmigen.length, pruefen: a.pruefen.length, auszahlen: a.auszahlen.length });
      if (text && (await senden(person, "erinnerung_freigabe", text, "Freigaben öffnen", "/freigaben"))) lauf.freigaben++;
    }
  }
  return lauf;
}
