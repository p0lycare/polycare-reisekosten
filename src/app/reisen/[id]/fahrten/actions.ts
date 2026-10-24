"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { berechneRoute, type RoutenErgebnis } from "@/lib/routing/osm";
import { createAdminClient } from "@/lib/supabase/admin";

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
  if (!user) return { fehler: "Bitte neu anmelden." };
  return berechneRoute(strecke.slice(0, 300));
}

export async function fahrtSpeichern(_vorher: FahrtStatus, formData: FormData): Promise<FahrtStatus> {
  const id = text(formData, "id") || null;
  const reiseId = text(formData, "reise_id");
  const datum = text(formData, "datum");
  const strecke = text(formData, "strecke");
  const km = Number(text(formData, "km").replace(",", "."));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return { fehler: "Datum fehlt." };
  if (!strecke) return { fehler: "Fahrstrecke fehlt." };
  if (!Number.isFinite(km) || km <= 0 || km >= 10000) return { fehler: "Kilometer müssen größer als 0 sein." };

  const daten = { reise_id: reiseId, datum, strecke, zweck: text(formData, "zweck") || null, km: Math.round(km * 10) / 10 };
  const supabase = await createClient();
  // RLS erlaubt Änderungen nur in eigenen, bearbeitbaren Reisen
  const { data, error } = id
    ? await supabase.from("fahrt").update(daten).eq("id", id).select("id")
    : await supabase.from("fahrt").insert(daten).select("id");
  if (error || !data?.length) return { fehler: "Speichern fehlgeschlagen. Ist die Reise noch bearbeitbar?" };

  // Route erst nach der Antwort bestimmen (meist aus dem Zwischenspeicher), damit Speichern nie auf OpenStreetMap wartet.
  // Nur der Server setzt sie (die Datenbank verwirft Nutzeränderungen); die Zeile ist durch den
  // RLS-geprüften Schreibvorgang oben als eigene, bearbeitbare Fahrt belegt.
  const fahrtId = data[0].id;
  after(async () => {
    const route = await berechneRoute(strecke);
    const kmRoute = "km" in route && route.km > 0 && route.km < 10000 ? route.km : null;
    const { error: routeFehler } = await createAdminClient().from("fahrt").update({ km_route: kmRoute }).eq("id", fahrtId);
    if (routeFehler) console.error("Route konnte nicht gespeichert werden", routeFehler.message);
  });

  revalidatePath(`/reisen/${reiseId}`);
  return { gespeichert: true };
}

export async function fahrtLoeschen(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("fahrt").delete().eq("id", text(formData, "id"));
  revalidatePath(`/reisen/${text(formData, "reise_id")}`);
}
