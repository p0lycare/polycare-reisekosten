"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { ladeTexte } from "@/lib/i18n/server";
import { heuteBerlin } from "@/lib/reisekosten/vertretung";

type Rolle = Database["public"]["Enums"]["rolle"];
const ROLLEN: Rolle[] = ["mitarbeiter", "freigeber", "buchhaltung", "admin"];

export type PersonStatus = { fehler?: string; gespeichert?: boolean };

export async function personSpeichern(_vorher: PersonStatus, formData: FormData): Promise<PersonStatus> {
  const id = String(formData.get("id") ?? "");
  const rolle = String(formData.get("rolle") ?? "") as Rolle;
  const vorgesetzter = String(formData.get("vorgesetzter_id") ?? "") || null;
  const t = (await ladeTexte()).einstellungen.personen;

  if (!ROLLEN.includes(rolle)) return { fehler: t.ungueltigeRolle };
  if (vorgesetzter === id) return { fehler: t.selbstGenehmigen };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (id === user?.id && rolle !== "admin") {
    return { fehler: t.adminSelbst };
  }

  // Wer genehmigt, braucht eine genehmigende Rolle – sonst kommen Mails, aber keine Freigaben-Seite
  if (vorgesetzter) {
    const { data: genehmigend } = await supabase.from("profile").select("name, rolle").eq("id", vorgesetzter).maybeSingle();
    if (genehmigend?.rolle === "mitarbeiter") {
      return { fehler: t.kannNichtGenehmigen(genehmigend.name) };
    }
  }
  if (rolle === "mitarbeiter") {
    const { data: abhaengig } = await supabase.from("profile").select("name").eq("vorgesetzter_id", id);
    if (abhaengig?.length) {
      return {
        fehler: t.genehmigtNoch(abhaengig.map((p) => p.name).join(", ")),
      };
    }
    // Als Vertretung eingetragen (laufend oder geplant)? Dann erst dort ändern
    const { data: vertritt } = await supabase
      .from("vertretung")
      .select("bis, bis_auf_weiteres, vertretene:profile!vertretung_vertretene_id_fkey(name)")
      .eq("vertreter_id", id);
    const heute = heuteBerlin();
    const offen = (vertritt ?? []).filter((v) => v.bis_auf_weiteres || (v.bis !== null && v.bis >= heute));
    if (offen.length) {
      return { fehler: (await ladeTexte()).einstellungen.vertretung.istVertretung(offen.map((v) => v.vertretene?.name ?? "").join(", ")) };
    }
  }

  // RLS und Trigger lassen nur Admins diese Felder ändern
  const { data, error } = await supabase
    .from("profile")
    .update({
      rolle,
      vorgesetzter_id: vorgesetzter,
      erste_taetigkeitsstaette_id: String(formData.get("erste_taetigkeitsstaette_id") ?? "") || null,
    })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { fehler: t.speichernFehlgeschlagen };

  revalidatePath("/einstellungen/personen");
  return { gespeichert: true };
}
