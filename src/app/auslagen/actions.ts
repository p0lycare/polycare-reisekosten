"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { auslagenAbrechnungHolen } from "@/lib/reisekosten/auslagen";

export type AuslagenStatus = { fehler?: string };

/** Öffnet die Auslagenabrechnung des gewählten Monats (legt sie bei Bedarf an) und springt zum Belegformular. */
export async function auslageErfassen(_vorher: AuslagenStatus, formData: FormData): Promise<AuslagenStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ergebnis = await auslagenAbrechnungHolen(supabase, user.id, String(formData.get("monat") ?? ""));
  if ("fehler" in ergebnis) return { fehler: ergebnis.fehler };
  redirect(`/reisen/${ergebnis.id}/belege/neu`);
}
