import "server-only";
import { createAdminClient, protokolliereMail } from "@/lib/supabase/admin";
import { mailKonfiguration, sendeMail } from "@/lib/mail/graph";
import { alsErinnerung } from "@/lib/mail/vorlagen";
import { verteileAufgaben, verteileVorschuesse } from "@/lib/reisekosten/freigaben";
import { heuteBerlin, vertreteneHeute, type Vertretung } from "@/lib/reisekosten/vertretung";
import { istLeereAuslage } from "@/lib/reisekosten/auslagen";
import { freigabeText, istFreigabeErinnerung, istMonatserinnerung, monatsText } from "./plan";
import { monatsnameIn, texte } from "@/lib/i18n/woerterbuch";
import { alsSprache, type Sprache } from "@/lib/i18n/sprache";

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
  // Testläufe getrennt protokollieren, damit sie die Tagessperre des echten Laufs nicht auslösen
  const praefix = erzwingen ? "test_" : "";
  // Ein Lauf je Tag: wurde in den letzten 20 Stunden erinnert (z. B. Wiederholung des Cron-Aufrufs), nichts doppelt senden
  const { count } = await db
    .from("mail_protokoll")
    .select("id", { count: "exact", head: true })
    .like("art", "erinnerung_%")
    .gte("zeit", new Date(Date.now() - 20 * 3600_000).toISOString());
  if (count && !erzwingen) return { ...lauf, uebersprungen: "heute bereits erinnert" };

  const [{ data: personen }, { data: reisen }, { data: eingang }] = await Promise.all([
    db.from("profile").select("id, name, email, rolle, sprache"),
    db
      .from("reise")
      .select("id, status, art, mitarbeiter_id, freigeber_id, beleg(count), mitarbeiter:profile!reise_mitarbeiter_id_fkey(vorgesetzter_id, rolle)")
      .in("status", ["entwurf", "abgelehnt", "eingereicht", "freigegeben", "geprueft"]),
    db.from("beleg_eingang").select("mitarbeiter_id"),
  ]);
  const [{ data: vorschuesse }, { data: vertretungen }] = await Promise.all([
    db
      .from("vorschuss")
      .select("status, mitarbeiter_id, mitarbeiter:profile!vorschuss_mitarbeiter_id_fkey(vorgesetzter_id)")
      .in("status", ["beantragt", "genehmigt"]),
    db.from("vertretung").select("vertretene_id, vertreter_id, von, bis, bis_auf_weiteres"),
  ]);
  const tag = heuteBerlin();

  async function senden(
    person: { id: string; email: string },
    art: string,
    inhalt: { betreff: string; zeilen: string[] },
    knopf: string,
    pfad: string,
    sprache: Sprache,
  ) {
    const mail = alsErinnerung({ ...inhalt, knopf, link: `${basis}${pfad}`, sprache });
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
    const sprache = alsSprache(person.sprache);
    const t = texte(sprache).mails.erinnerung;

    if (monat) {
      const eigene = (reisen ?? []).filter((r) => r.mitarbeiter_id === person.id && !istLeereAuslage({ art: r.art, anzahlBelege: r.beleg[0]?.count ?? 0 }));
      const text = monatsText(
        monatsnameIn(heute.slice(0, 7), sprache),
        {
          entwuerfe: eigene.filter((r) => r.status === "entwurf").length,
          abgelehnt: eigene.filter((r) => r.status === "abgelehnt").length,
          eingang: (eingang ?? []).filter((e) => e.mitarbeiter_id === person.id).length,
        },
        sprache,
      );
      if (text && (await senden(person, `${praefix}erinnerung_monat`, text, t.monatKnopf, `/monat/${heute.slice(0, 7)}`, sprache))) lauf.monat++;
    }

    if (freigaben) {
      // Vertretungen: wer heute jemanden vertritt, wird auch an dessen offene Genehmigungen erinnert
      const vertretene = vertreteneHeute((vertretungen ?? []) as Vertretung[], person.id, tag);
      const a = verteileAufgaben(reisen ?? [], person.id, person.rolle, vertretene);
      const v = verteileVorschuesse(vorschuesse ?? [], person.id, person.rolle, vertretene);
      const text = freigabeText(
        {
          genehmigen: a.genehmigen.length + v.genehmigen.length,
          pruefen: a.pruefen.length,
          auszahlen: a.auszahlen.length + v.auszahlen.length,
        },
        sprache,
      );
      if (text && (await senden(person, `${praefix}erinnerung_freigabe`, text, t.freigabeKnopf, "/freigaben", sprache))) lauf.freigaben++;
    }
  }
  return lauf;
}
