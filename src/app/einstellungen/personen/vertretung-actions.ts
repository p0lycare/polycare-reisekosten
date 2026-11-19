"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ladeTexte } from "@/lib/i18n/server";
import { pruefeVertretung } from "@/lib/reisekosten/vertretung";

export type VertretungStatus = { fehler?: string; gespeichert?: boolean };

function aktualisieren() {
  revalidatePath("/einstellungen/personen");
  revalidatePath("/profil");
  revalidatePath("/freigaben");
  revalidatePath("/", "layout");
}

/**
 * Legt die Vertretung einer genehmigenden Person fest, ändert oder entfernt sie (leere Auswahl).
 * Wer das darf, entscheidet RLS: Admins für alle (Personen und Rollen), sonst nur für sich selbst (Profil).
 */
export async function vertretungSpeichern(_vorher: VertretungStatus, formData: FormData): Promise<VertretungStatus> {
  const t = (await ladeTexte()).einstellungen.vertretung;
  const vertreteneId = String(formData.get("vertretene_id") ?? "");
  const vertreterId = String(formData.get("vertreter_id") ?? "");
  if (!vertreteneId) return { fehler: t.fehler.speichern };

  const supabase = await createClient();

  if (!vertreterId) {
    const { error } = await supabase.from("vertretung").delete().eq("vertretene_id", vertreteneId);
    if (error) return { fehler: t.fehler.speichern };
    aktualisieren();
    return { gespeichert: true };
  }

  const bisAufWeiteres = formData.get("bis_auf_weiteres") === "on";
  const von = String(formData.get("von") ?? "");
  const bis = bisAufWeiteres ? null : String(formData.get("bis") ?? "") || null;
  const fehler = pruefeVertretung({ vertreteneId, vertreterId, von, bis, bisAufWeiteres });
  if (fehler) return { fehler: t.fehler[fehler] };

  // Die Vertretung braucht eine genehmigende Rolle (prüft auch der Trigger vertretung_pruefen)
  const { data: vertreter } = await supabase.from("profile").select("name, rolle").eq("id", vertreterId).maybeSingle();
  if (!vertreter) return { fehler: t.fehler.speichern };
  if (vertreter.rolle === "mitarbeiter") return { fehler: t.fehler.rolle(vertreter.name) };

  const { data, error } = await supabase
    .from("vertretung")
    .upsert(
      { vertretene_id: vertreteneId, vertreter_id: vertreterId, von, bis, bis_auf_weiteres: bisAufWeiteres },
      { onConflict: "vertretene_id" },
    )
    .select("vertretene_id");
  if (error || !data?.length) return { fehler: t.fehler.speichern };

  aktualisieren();
  return { gespeichert: true };
}
