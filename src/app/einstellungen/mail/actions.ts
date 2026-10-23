"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mailKonfiguration, sendeMail } from "@/lib/mail/graph";
import { appUrl } from "@/lib/mail/benachrichtigen";

export type TestmailStatus = { fehler?: string; gesendetAn?: string };

export async function testmailSenden(): Promise<TestmailStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profile").select("email, rolle").eq("id", user!.id).single();
  if (profil?.rolle !== "admin" && profil?.rolle !== "buchhaltung") return { fehler: "Keine Berechtigung." };
  if (!mailKonfiguration()) return { fehler: "E-Mail-Versand ist noch nicht eingerichtet (Env-Variablen fehlen)." };

  const betreff = "Testmail – Polycare Reisekosten";
  try {
    const link = await appUrl();
    await sendeMail({
      an: [profil.email],
      betreff,
      text: `Der E-Mail-Versand funktioniert.\n\n${link}`,
      html: `<p>Der E-Mail-Versand funktioniert.</p><p><a href="${link}">${link}</a></p>`,
    });
    await supabase.rpc("mail_protokollieren", {
      p_reise: null as unknown as string, p_art: "test", p_an: [profil.email], p_betreff: betreff, p_status: "gesendet", p_fehler: "",
    });
    revalidatePath("/einstellungen");
    return { gesendetAn: profil.email };
  } catch (e) {
    const fehler = e instanceof Error ? e.message : String(e);
    await supabase.rpc("mail_protokollieren", {
      p_reise: null as unknown as string, p_art: "test", p_an: [profil.email], p_betreff: betreff, p_status: "fehler", p_fehler: fehler,
    });
    revalidatePath("/einstellungen");
    return { fehler };
  }
}
