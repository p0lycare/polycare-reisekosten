import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { istBearbeitbar } from "@/lib/reisekosten/reise";

/** Lädt Reise und erfassbare Kategorien; nur für eigene, bearbeitbare Reisen. */
export async function ladeFuerBeleg(reiseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: reise } = await supabase.from("reise").select("id, mitarbeiter_id, status, beginn, ende").eq("id", reiseId).maybeSingle();
  if (!reise) notFound();
  if (reise.mitarbeiter_id !== user?.id || !istBearbeitbar(reise.status)) redirect(`/reisen/${reiseId}`);

  const { data: kategorien } = await supabase
    .from("kategorie")
    .select("*")
    .eq("beleg_erfassbar", true)
    .order("abschnitt")
    .order("sortierung");

  return { supabase, user: user!, reise, kategorien: kategorien ?? [] };
}
