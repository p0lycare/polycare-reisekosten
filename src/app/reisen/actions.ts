"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { berechneVerpflegung, type Mahlzeiten } from "@/lib/reisekosten/verpflegung";

export type FormularStatus = { fehler?: string };

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

export async function reiseSpeichern(
  _vorher: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const id = text(formData, "id") || null;
  const anlass = text(formData, "anlass");
  const ziel = text(formData, "ziel");
  const land = text(formData, "land") || "DE";
  const beginn = text(formData, "beginn");
  const ende = text(formData, "ende");
  const mitUebernachtung = formData.get("mit_uebernachtung") === "on";

  if (!anlass || !ziel || !beginn || !ende) {
    return { fehler: "Bitte Anlass, Ziel, Beginn und Ende ausfüllen." };
  }

  let mahlzeiten: Record<string, Mahlzeiten>;
  try {
    mahlzeiten = JSON.parse(text(formData, "mahlzeiten") || "{}");
  } catch {
    return { fehler: "Mahlzeiten konnten nicht gelesen werden." };
  }

  let tage: string[];
  try {
    tage = berechneVerpflegung({ beginn, ende, land, mitUebernachtung, mahlzeiten }).tage.map(
      (t) => t.datum,
    );
  } catch (e) {
    return { fehler: e instanceof Error ? e.message : "Reisedaten sind ungültig." };
  }
  // Nur Mahlzeiten für Tage innerhalb der Reise speichern
  mahlzeiten = Object.fromEntries(Object.entries(mahlzeiten).filter(([d]) => tage.includes(d)));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const daten = { anlass, ziel, land, beginn, ende, mit_uebernachtung: mitUebernachtung, mahlzeiten };

  if (id) {
    // RLS lässt nicht bearbeitbare Reisen still aus – daher die geänderten Zeilen prüfen
    const { data, error } = await supabase.from("reise").update(daten).eq("id", id).select("id");
    if (error || !data?.length) return { fehler: "Speichern fehlgeschlagen. Ist die Reise noch bearbeitbar?" };
    revalidatePath(`/reisen/${id}`);
    revalidatePath("/");
    redirect(`/reisen/${id}`);
  }

  const { data, error } = await supabase
    .from("reise")
    .insert({ ...daten, mitarbeiter_id: user.id })
    .select("id")
    .single();
  if (error || !data) return { fehler: "Speichern fehlgeschlagen." };

  revalidatePath("/");
  redirect(`/reisen/${data.id}`);
}

export async function reiseLoeschen(formData: FormData) {
  const id = text(formData, "id");
  const supabase = await createClient();
  await supabase.from("reise").delete().eq("id", id);
  revalidatePath("/");
  redirect("/");
}
