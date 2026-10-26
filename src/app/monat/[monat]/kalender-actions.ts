"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Einen Kalendervorschlag dauerhaft ausblenden (nur für die angemeldete Person) */
export async function vorschlagAusblenden(formData: FormData) {
  const terminId = String(formData.get("termin_id") ?? "").slice(0, 500);
  if (!terminId) return;
  const supabase = await createClient();
  await supabase.from("kalender_ausgeblendet").upsert({ termin_id: terminId }, { onConflict: "person_id,termin_id", ignoreDuplicates: true });
  revalidatePath("/monat", "layout");
}

/** Alle ausgeblendeten Vorschläge wieder anzeigen */
export async function vorschlaegeEinblenden() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("kalender_ausgeblendet").delete().eq("person_id", user.id);
  revalidatePath("/monat", "layout");
}
