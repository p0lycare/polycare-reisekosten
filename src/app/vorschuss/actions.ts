"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatEuro } from "@/lib/format";
import { parseEuro } from "@/lib/geld";
import { appUrl } from "@/lib/mail/benachrichtigen";
import { mailKonfiguration, sendeMail } from "@/lib/mail/graph";
import { alsKurzmail } from "@/lib/mail/vorlagen";
import { mailEmpfaenger, nachSprache, protokolliereMail } from "@/lib/supabase/admin";
import { texte } from "@/lib/i18n/woerterbuch";
import type { Sprache } from "@/lib/i18n/sprache";
import { ladeTexte } from "@/lib/i18n/server";

export type VorschussStatus = { fehler?: string; erledigt?: string };

type Schritt = "beantragt" | "genehmigt" | "abgelehnt" | "ausgezahlt";

// Empfänger wie im Reise-Workflow: Antrag → Führungskraft, genehmigt → Buchhaltung, sonst → reisende Person
const EMPFAENGER: Record<Schritt, string> = { beantragt: "eingereicht", genehmigt: "genehmigt", abgelehnt: "abgelehnt", ausgezahlt: "ausgezahlt" };

async function meldung(error: { message: string; code?: string }): Promise<VorschussStatus> {
  if (error.code === "P0001") return { fehler: error.message };
  return { fehler: (await ladeTexte()).vorschuss.fehler.allgemein };
}

/** Benachrichtigt nach einem Vorschuss-Schritt; Mailprobleme blockieren nichts und landen im Protokoll. */
async function benachrichtige(vorschussId: string, schritt: Schritt, grund?: string) {
  const supabase = await createClient();
  const { data: v } = await supabase
    .from("vorschuss")
    .select("reise_id, betrag_cent, grund, reise_anlass, mitarbeiter:profile!vorschuss_mitarbeiter_id_fkey(name)")
    .eq("id", vorschussId)
    .maybeSingle();
  if (!v) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const an = await mailEmpfaenger(v.reise_id, EMPFAENGER[schritt], user?.email);
  if (!an.length) return;

  const daten = { name: v.mitarbeiter?.name ?? "", betrag: formatEuro(v.betrag_cent), reise: v.reise_anlass };
  const basis = await appUrl();
  // In der Sprache der empfangenden Person
  const mailFuer = (sprache: Sprache) => {
    const t = texte(sprache).mails.vorschuss;
    const inhalt = {
      beantragt: {
        betreff: t.beantragt.betreff(daten),
        zeilen: [t.beantragt.zeile(daten), ...(v.grund ? [t.beantragt.begruendung(v.grund)] : [])],
        knopf: t.beantragt.knopf,
        link: `${basis}/freigaben`,
      },
      genehmigt: {
        betreff: t.genehmigt.betreff(daten),
        zeilen: [t.genehmigt.zeile(daten)],
        knopf: t.genehmigt.knopf,
        link: `${basis}/freigaben`,
      },
      abgelehnt: {
        betreff: t.abgelehnt.betreff(daten),
        zeilen: [t.abgelehnt.zeile(daten), ...(grund ? [t.abgelehnt.grund(grund)] : [])],
        knopf: t.abgelehnt.knopf,
        link: `${basis}/reisen/${v.reise_id}`,
      },
      ausgezahlt: {
        betreff: t.ausgezahlt.betreff(daten),
        zeilen: [t.ausgezahlt.zeile(daten)],
        knopf: t.ausgezahlt.knopf,
        link: `${basis}/reisen/${v.reise_id}`,
      },
    }[schritt];
    return alsKurzmail({ ...inhalt, sprache });
  };
  const art = `vorschuss_${schritt}`;

  if (!mailKonfiguration()) {
    await protokolliereMail({ reiseId: v.reise_id, art, an, betreff: mailFuer("de").betreff, status: "nicht_eingerichtet", personId: user?.id });
    return;
  }
  for (const gruppe of await nachSprache(an)) {
    const mail = mailFuer(gruppe.sprache);
    try {
      await sendeMail({ an: gruppe.an, ...mail });
      await protokolliereMail({ reiseId: v.reise_id, art, an: gruppe.an, betreff: mail.betreff, status: "gesendet", personId: user?.id });
    } catch (e) {
      const fehler = e instanceof Error ? e.message : String(e);
      await protokolliereMail({ reiseId: v.reise_id, art, an: gruppe.an, betreff: mail.betreff, status: "fehler", fehler, personId: user?.id });
    }
  }
}

function aktualisieren(reiseId?: string) {
  if (reiseId) revalidatePath(`/reisen/${reiseId}`);
  revalidatePath("/freigaben");
  revalidatePath("/", "layout");
}

export async function vorschussBeantragen(_vorher: VorschussStatus, formData: FormData): Promise<VorschussStatus> {
  const reiseId = String(formData.get("reise_id") ?? "");
  const betrag = parseEuro(String(formData.get("betrag") ?? ""));
  const t = (await ladeTexte()).vorschuss;
  if (!betrag) return { fehler: t.fehler.betrag };
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("vorschuss_beantragen", {
    p_reise: reiseId,
    p_betrag_cent: betrag,
    p_grund: String(formData.get("grund") ?? ""),
  });
  if (error) return await meldung(error);
  await benachrichtige(id, "beantragt");
  aktualisieren(reiseId);
  return { erledigt: t.erledigt.beantragt };
}

export async function vorschussZurueckziehen(_vorher: VorschussStatus, formData: FormData): Promise<VorschussStatus> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("vorschuss_zurueckziehen", { p_id: String(formData.get("id") ?? "") });
  if (error) return await meldung(error);
  aktualisieren(String(formData.get("reise_id") ?? ""));
  return { erledigt: (await ladeTexte()).vorschuss.erledigt.zurueckgezogen };
}

export async function vorschussEntscheiden(_vorher: VorschussStatus, formData: FormData): Promise<VorschussStatus> {
  const id = String(formData.get("id") ?? "");
  const aktion = String(formData.get("aktion") ?? "");
  const grund = String(formData.get("grund") ?? "").trim();
  const supabase = await createClient();

  const { error } =
    aktion === "genehmigen"
      ? await supabase.rpc("vorschuss_genehmigen", { p_id: id })
      : aktion === "auszahlen"
        ? await supabase.rpc("vorschuss_auszahlen", { p_id: id })
        : await supabase.rpc("vorschuss_ablehnen", { p_id: id, p_grund: grund });
  if (error) return await meldung(error);

  const schritt: Schritt = aktion === "genehmigen" ? "genehmigt" : aktion === "auszahlen" ? "ausgezahlt" : "abgelehnt";
  await benachrichtige(id, schritt, grund || undefined);
  aktualisieren(String(formData.get("reise_id") ?? ""));
  const erledigt = (await ladeTexte()).vorschuss.erledigt;
  return { erledigt: { genehmigt: erledigt.genehmigt, ausgezahlt: erledigt.ausgezahlt, abgelehnt: erledigt.abgelehnt, beantragt: "" }[schritt] };
}
