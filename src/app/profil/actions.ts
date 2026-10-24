"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatIban, istGueltigeIban, normalisiereIban } from "@/lib/iban";
import { appUrl } from "@/lib/mail/benachrichtigen";
import { mailKonfiguration, sendeMail } from "@/lib/mail/graph";
import { alsKurzmail } from "@/lib/mail/vorlagen";
import { createAdminClient, protokolliereMail } from "@/lib/supabase/admin";

export type ProfilStatus = { fehler?: string; gespeichert?: boolean };

function text(formData: FormData, feld: string): string | null {
  return String(formData.get(feld) ?? "").trim() || null;
}

export async function profilSpeichern(_vorher: ProfilStatus, formData: FormData): Promise<ProfilStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ibanEingabe = text(formData, "iban");
  const iban = ibanEingabe ? normalisiereIban(ibanEingabe) : null;
  if (iban && !istGueltigeIban(iban)) {
    return { fehler: "Die IBAN ist ungültig. Bitte Eingabe prüfen." };
  }

  const { data: bisher } = await supabase.from("profil_privat").select("iban").eq("id", user.id).maybeSingle();

  const kennzeichen = text(formData, "kfz_kennzeichen");
  const { error: fehlerProfil } = await supabase
    .from("profile")
    .update({
      kostenstelle: text(formData, "kostenstelle"),
      kfz_kennzeichen: kennzeichen?.toUpperCase() ?? null,
      kalender_vorschlaege: formData.get("kalender_vorschlaege") === "on",
    })
    .eq("id", user.id);

  const { error: fehlerPrivat } = await supabase.from("profil_privat").upsert({
    id: user.id,
    personalnummer: text(formData, "personalnummer"),
    wohnort: text(formData, "wohnort"),
    iban,
    updated_at: new Date().toISOString(),
  });

  if (fehlerProfil || fehlerPrivat) return { fehler: "Speichern fehlgeschlagen." };

  if (bisher?.iban && iban !== bisher.iban) await ibanAenderungMelden(user.id, iban);

  revalidatePath("/profil");
  return { gespeichert: true };
}

/**
 * Schutz vor umgeleiteten Auszahlungen: Bei geänderter IBAN erfahren es die Person selbst
 * (falls jemand anderes ihr Konto nutzt) und die Buchhaltung. Die IBAN selbst steht nicht in der Mail.
 */
async function ibanAenderungMelden(personId: string, neu: string | null) {
  let an: string[] = [];
  const betreff = "Sicherheitshinweis: IBAN im Reisekosten-Profil geändert";
  try {
    const db = createAdminClient();
    const [{ data: person }, { data: buchhaltung }] = await Promise.all([
      db.from("profile").select("name, email").eq("id", personId).single(),
      db.from("profile").select("email").in("rolle", ["buchhaltung", "admin"]),
    ]);
    an = [...new Set([person?.email, ...(buchhaltung ?? []).map((b) => b.email)].filter(Boolean) as string[])];
    if (!an.length) return;
    if (!mailKonfiguration()) {
      await protokolliereMail({ reiseId: null, art: "iban_geaendert", an, betreff, status: "nicht_eingerichtet", personId });
      return;
    }
    const endung = neu ? formatIban(neu).slice(-4) : null;
    const mail = alsKurzmail({
      betreff,
      zeilen: [
        `Im Reisekosten-Profil von ${person?.name ?? ""} wurde die IBAN ${endung ? `geändert (endet jetzt auf ${endung})` : "entfernt"}.`,
        "Wenn diese Änderung nicht von dir stammt, melde dich bitte sofort bei der Buchhaltung – Auszahlungen gehen auf das hinterlegte Konto.",
      ],
      knopf: "Profil öffnen",
      link: `${await appUrl()}/profil`,
    });
    await sendeMail({ an, ...mail });
    await protokolliereMail({ reiseId: null, art: "iban_geaendert", an, betreff, status: "gesendet", personId });
  } catch (e) {
    await protokolliereMail({ reiseId: null, art: "iban_geaendert", an, betreff, status: "fehler", fehler: e instanceof Error ? e.message : String(e), personId });
  }
}
