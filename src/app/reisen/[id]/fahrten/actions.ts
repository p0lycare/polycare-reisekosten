"use server";

import { mitUebersetzterMeldung } from "@/lib/i18n/meldungen";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { berechneRoute, type RoutenErgebnis } from "@/lib/routing/osm";
import { routeNachtragen } from "@/lib/routing/route-nachtragen";
import { ladeSprache, ladeTexte } from "@/lib/i18n/server";

export type FahrtStatus = { fehler?: string; gespeichert?: boolean };

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

/** Route für die Fahrstrecke berechnen (Vorschlag für das km-Feld) */
export async function kmBerechnen(strecke: string): Promise<RoutenErgebnis> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { fehler: (await ladeTexte()).fahrten.fehler.anmelden };
  return mitUebersetzterMeldung(await berechneRoute(strecke.slice(0, 300)), await ladeSprache());
}

export async function fahrtSpeichern(_vorher: FahrtStatus, formData: FormData): Promise<FahrtStatus> {
  const id = text(formData, "id") || null;
  const reiseId = text(formData, "reise_id");
  const datum = text(formData, "datum");
  const strecke = text(formData, "strecke");
  const km = Number(text(formData, "km").replace(",", "."));
  const t = (await ladeTexte()).fahrten.fehler;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return { fehler: t.datum };
  if (!strecke) return { fehler: t.strecke };
  if (!Number.isFinite(km) || km <= 0 || km >= 10000) return { fehler: t.km };

  const daten = { reise_id: reiseId, datum, strecke, zweck: text(formData, "zweck") || null, km: Math.round(km * 10) / 10 };
  const supabase = await createClient();
  const { data: reise } = await supabase.from("reise").select("art").eq("id", reiseId).maybeSingle();
  if (reise?.art !== "reise") return { fehler: t.nurReisen };
  // RLS erlaubt Änderungen nur in eigenen, bearbeitbaren Reisen
  const { data, error } = id
    ? await supabase.from("fahrt").update(daten).eq("id", id).select("id")
    : await supabase.from("fahrt").insert(daten).select("id");
  if (error || !data?.length) return { fehler: t.speichern };

  routeNachtragen(data[0].id, strecke);

  revalidatePath(`/reisen/${reiseId}`);
  return { gespeichert: true };
}

export async function fahrtLoeschen(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("fahrt").delete().eq("id", text(formData, "id"));
  revalidatePath(`/reisen/${text(formData, "reise_id")}`);
}
