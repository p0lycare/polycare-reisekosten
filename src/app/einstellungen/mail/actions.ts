"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mailKonfiguration, sendeMail } from "@/lib/mail/graph";
import { appUrl } from "@/lib/mail/benachrichtigen";
import { protokolliereMail } from "@/lib/supabase/admin";
import { ladeTexte } from "@/lib/i18n/server";

export type TestmailStatus = { fehler?: string; gesendetAn?: string };

export async function testmailSenden(): Promise<TestmailStatus> {
  const alle = await ladeTexte();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profile").select("email, rolle").eq("id", user!.id).single();
  if (profil?.rolle !== "admin" && profil?.rolle !== "buchhaltung") return { fehler: alle.allgemein.fehler.keineBerechtigung };
  if (!mailKonfiguration()) return { fehler: alle.einstellungen.mail.nichtKonfiguriert };

  // Die Testmail selbst bleibt deutsch
  const betreff = "Testmail – Polycare Reisekosten";
  try {
    const link = await appUrl();
    await sendeMail({
      an: [profil.email],
      betreff,
      text: `Der E-Mail-Versand funktioniert.\n\n${link}`,
      html: `<p>Der E-Mail-Versand funktioniert.</p><p><a href="${link}">${link}</a></p>`,
    });
    await protokolliereMail({ reiseId: null, art: "test", an: [profil.email], betreff, status: "gesendet", personId: user!.id });
    revalidatePath("/einstellungen");
    return { gesendetAn: profil.email };
  } catch (e) {
    const fehler = e instanceof Error ? e.message : String(e);
    await protokolliereMail({ reiseId: null, art: "test", an: [profil.email], betreff, status: "fehler", fehler, personId: user!.id });
    revalidatePath("/einstellungen");
    return { fehler };
  }
}

export type DatevAdresseStatus = { fehler?: string; gespeichert?: boolean };

export async function datevAdresseSpeichern(_vorher: DatevAdresseStatus, formData: FormData): Promise<DatevAdresseStatus> {
  const t = (await ladeTexte()).einstellungen;
  const adresse = String(formData.get("datev_upload_mail") ?? "").trim() || null;
  const auslagen = String(formData.get("datev_upload_mail_auslagen") ?? "").trim() || null;
  const gueltig = (a: string | null) => !a || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a);
  if (!gueltig(adresse) || !gueltig(auslagen)) return { fehler: t.mail.ungueltigeAdresse };
  const supabase = await createClient();
  // RLS: nur Buchhaltung/Admin
  const { data, error } = await supabase
    .from("einstellungen_intern")
    .update({ datev_upload_mail: adresse, datev_upload_mail_auslagen: auslagen, updated_at: new Date().toISOString() })
    .eq("id", true)
    .select("id");
  if (error || !data?.length) return { fehler: t.formular.speichernFehlgeschlagen };
  revalidatePath("/einstellungen");
  return { gespeichert: true };
}
