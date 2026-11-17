"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/mail/benachrichtigen";
import { mailKonfiguration, sendeMail } from "@/lib/mail/graph";
import { alsKurzmail } from "@/lib/mail/vorlagen";
import { createAdminClient, protokolliereMail } from "@/lib/supabase/admin";
import { ladeTexte } from "@/lib/i18n/server";

export type MeldungStatus = { fehler?: string; gesendet?: boolean };

// Für die Mail an die Admins (bleibt deutsch)
const ART_TEXT = { fehler: "Fehler", wunsch: "Wunsch", frage: "Frage" } as const;
type Art = keyof typeof ART_TEXT;

function text(formData: FormData, feld: string, max: number): string {
  return String(formData.get(feld) ?? "").trim().slice(0, max);
}

/** Admins per Mail informieren; Probleme beim Versand blockieren die Meldung nicht */
async function adminsInformieren(art: Art, name: string, inhalt: string, seite: string | null) {
  let an: string[] = [];
  const betreff = `${ART_TEXT[art]} gemeldet von ${name}`;
  try {
    const { data } = await createAdminClient().from("profile").select("email").eq("rolle", "admin");
    an = (data ?? []).map((p) => p.email).filter(Boolean);
    if (!an.length) return;
    if (!mailKonfiguration()) {
      await protokolliereMail({ reiseId: null, art: "meldung", an, betreff, status: "nicht_eingerichtet" });
      return;
    }
    const kurz = inhalt.length > 600 ? `${inhalt.slice(0, 600)} …` : inhalt;
    const mail = alsKurzmail({
      betreff,
      zeilen: [`${name} hat im Reisekosten-Tool etwas gemeldet (${ART_TEXT[art]}):`, kurz, ...(seite ? [`Seite: ${seite}`] : [])],
      knopf: "Meldungen öffnen",
      link: `${await appUrl()}/einstellungen/meldungen`,
    });
    await sendeMail({ an, ...mail });
    await protokolliereMail({ reiseId: null, art: "meldung", an, betreff, status: "gesendet" });
  } catch (e) {
    await protokolliereMail({ reiseId: null, art: "meldung", an, betreff, status: "fehler", fehler: e instanceof Error ? e.message : String(e) });
  }
}

export async function meldungAbsenden(_vorher: MeldungStatus, formData: FormData): Promise<MeldungStatus> {
  const art = text(formData, "art", 10) as Art;
  const inhalt = text(formData, "text", 4000);
  const seite = text(formData, "seite", 300) || null;
  const t = (await ladeTexte()).melden.fehler;
  if (!(art in ART_TEXT)) return { fehler: t.art };
  if (inhalt.length < 3) return { fehler: t.beschreibung };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { fehler: t.anmelden };
  const { count } = await supabase
    .from("meldung")
    .select("id", { count: "exact", head: true })
    .eq("person_id", user.id)
    .gte("erstellt_am", new Date(Date.now() - 3600_000).toISOString());
  if ((count ?? 0) >= 5) return { fehler: t.zuViele };
  const { error } = await supabase.from("meldung").insert({ art, text: inhalt, seite, browser: text(formData, "browser", 300) || null });
  if (error) return { fehler: t.senden };

  const { data: ich } = await supabase.from("profile").select("name").eq("id", user.id).single();
  await adminsInformieren(art, ich?.name ?? "", inhalt, seite);
  revalidatePath("/melden");
  revalidatePath("/einstellungen/meldungen");
  return { gesendet: true };
}

/** Admins: Status und interne Notiz pflegen */
export async function meldungBearbeiten(_vorher: MeldungStatus, formData: FormData): Promise<MeldungStatus> {
  const status = text(formData, "status", 20);
  const t = (await ladeTexte()).melden.fehler;
  if (!["offen", "in_arbeit", "erledigt"].includes(status)) return { fehler: t.status };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meldung")
    .update({ status, notiz: text(formData, "notiz", 2000) || null })
    .eq("id", text(formData, "id", 40))
    .select("id");
  if (error || !data?.length) return { fehler: t.speichern };
  revalidatePath("/einstellungen/meldungen");
  revalidatePath("/melden");
  return { gesendet: true };
}
