"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Rolle = Database["public"]["Enums"]["rolle"];
const ROLLEN: Rolle[] = ["mitarbeiter", "freigeber", "buchhaltung", "admin"];

export type PersonStatus = { fehler?: string; gespeichert?: boolean };

export async function personSpeichern(_vorher: PersonStatus, formData: FormData): Promise<PersonStatus> {
  const id = String(formData.get("id") ?? "");
  const rolle = String(formData.get("rolle") ?? "") as Rolle;
  const vorgesetzter = String(formData.get("vorgesetzter_id") ?? "") || null;

  if (!ROLLEN.includes(rolle)) return { fehler: "Ungültige Rolle." };
  if (vorgesetzter === id) return { fehler: "Niemand kann sich selbst genehmigen." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (id === user?.id && rolle !== "admin") {
    return { fehler: "Du kannst dir die Admin-Rolle nicht selbst entziehen." };
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
  if (error || !data?.length) return { fehler: "Speichern fehlgeschlagen. Fehlt die Admin-Berechtigung?" };

  revalidatePath("/einstellungen/personen");
  return { gespeichert: true };
}
