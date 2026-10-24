"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatEuro } from "@/lib/format";
import { parseEuro } from "@/lib/geld";
import { appUrl } from "@/lib/mail/benachrichtigen";
import { mailKonfiguration, sendeMail } from "@/lib/mail/graph";
import { alsKurzmail } from "@/lib/mail/vorlagen";
import { mailEmpfaenger, protokolliereMail } from "@/lib/supabase/admin";

export type VorschussStatus = { fehler?: string; erledigt?: string };

type Schritt = "beantragt" | "genehmigt" | "abgelehnt" | "ausgezahlt";

// Empfänger wie im Reise-Workflow: Antrag → Führungskraft, genehmigt → Buchhaltung, sonst → reisende Person
const EMPFAENGER: Record<Schritt, string> = { beantragt: "eingereicht", genehmigt: "genehmigt", abgelehnt: "abgelehnt", ausgezahlt: "ausgezahlt" };

function meldung(error: { message: string; code?: string }): VorschussStatus {
  return { fehler: error.code === "P0001" ? error.message : "Das hat nicht geklappt. Bitte Seite neu laden." };
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
  const an = await mailEmpfaenger(v.reise_id, EMPFAENGER[schritt]);
  if (!an.length) return;

  const betrag = formatEuro(v.betrag_cent);
  const reise = v.reise_anlass;
  const name = v.mitarbeiter?.name ?? "";
  const basis = await appUrl();
  const inhalt = {
    beantragt: {
      betreff: `Vorschuss zur Genehmigung: ${name} – ${betrag}`,
      zeilen: [`${name} beantragt einen Reisekostenvorschuss von ${betrag} für „${reise}“.`, ...(v.grund ? [`Begründung: ${v.grund}`] : [])],
      knopf: "Freigaben öffnen",
      link: `${basis}/freigaben`,
    },
    genehmigt: {
      betreff: `Vorschuss zur Auszahlung: ${name} – ${betrag}`,
      zeilen: [`Der Vorschuss von ${betrag} für ${name} („${reise}“) ist genehmigt und kann ausgezahlt werden.`],
      knopf: "Freigaben öffnen",
      link: `${basis}/freigaben`,
    },
    abgelehnt: {
      betreff: `Vorschuss abgelehnt: ${betrag}`,
      zeilen: [`Dein Vorschuss von ${betrag} für „${reise}“ wurde abgelehnt.`, ...(grund ? [`Grund: ${grund}`] : [])],
      knopf: "Reise öffnen",
      link: `${basis}/reisen/${v.reise_id}`,
    },
    ausgezahlt: {
      betreff: `Vorschuss ausgezahlt: ${betrag}`,
      zeilen: [`Dein Vorschuss von ${betrag} für „${reise}“ wurde ausgezahlt. Er wird bei der Abrechnung der Reise automatisch abgezogen.`],
      knopf: "Reise öffnen",
      link: `${basis}/reisen/${v.reise_id}`,
    },
  }[schritt];
  const mail = alsKurzmail(inhalt);
  const art = `vorschuss_${schritt}`;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!mailKonfiguration()) {
    await protokolliereMail({ reiseId: v.reise_id, art, an, betreff: mail.betreff, status: "nicht_eingerichtet", personId: user?.id });
    return;
  }
  try {
    await sendeMail({ an, ...mail });
    await protokolliereMail({ reiseId: v.reise_id, art, an, betreff: mail.betreff, status: "gesendet", personId: user?.id });
  } catch (e) {
    const fehler = e instanceof Error ? e.message : String(e);
    await protokolliereMail({ reiseId: v.reise_id, art, an, betreff: mail.betreff, status: "fehler", fehler, personId: user?.id });
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
  if (!betrag) return { fehler: "Bitte den Betrag angeben, z. B. 300,00." };
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("vorschuss_beantragen", {
    p_reise: reiseId,
    p_betrag_cent: betrag,
    p_grund: String(formData.get("grund") ?? ""),
  });
  if (error) return meldung(error);
  await benachrichtige(id, "beantragt");
  aktualisieren(reiseId);
  return { erledigt: "Beantragt – deine Führungskraft bekommt eine Mail." };
}

export async function vorschussZurueckziehen(_vorher: VorschussStatus, formData: FormData): Promise<VorschussStatus> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("vorschuss_zurueckziehen", { p_id: String(formData.get("id") ?? "") });
  if (error) return meldung(error);
  aktualisieren(String(formData.get("reise_id") ?? ""));
  return { erledigt: "Antrag zurückgezogen." };
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
  if (error) return meldung(error);

  const schritt: Schritt = aktion === "genehmigen" ? "genehmigt" : aktion === "auszahlen" ? "ausgezahlt" : "abgelehnt";
  await benachrichtige(id, schritt, grund || undefined);
  aktualisieren(String(formData.get("reise_id") ?? ""));
  return { erledigt: { genehmigt: "Genehmigt", ausgezahlt: "Als ausgezahlt markiert", abgelehnt: "Abgelehnt", beantragt: "" }[schritt] };
}
