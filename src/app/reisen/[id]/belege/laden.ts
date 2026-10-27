import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { istBearbeitbar } from "@/lib/reisekosten/reise";
import { abschnitteFuer } from "@/lib/reisekosten/kategorie";
import { vorbelegung } from "@/lib/reisekosten/pflichtangaben";

/** Lädt Reise bzw. Auslagenabrechnung und die dazu passenden Kategorien; nur eigene, bearbeitbare. */
export async function ladeFuerBeleg(reiseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: reise } = await supabase.from("reise").select("id, mitarbeiter_id, status, beginn, ende, art, begruendung, reiseweg, kfz_kennzeichen").eq("id", reiseId).maybeSingle();
  if (!reise) notFound();
  if (reise.mitarbeiter_id !== user?.id || !istBearbeitbar(reise.status)) redirect(`/reisen/${reiseId}`);

  const { data: profil } = await supabase.from("profile").select("name").eq("id", user!.id).maybeSingle();
  const { data: kategorien } = await supabase
    .from("kategorie")
    .select("*")
    .eq("beleg_erfassbar", true)
    .in("abschnitt", abschnitteFuer(reise.art))
    .order("abschnitt")
    .order("sortierung");

  // Pflichtangaben (Person, Anlass, Kennzeichen) aus der Reise vorbelegen
  const vorbelegt = vorbelegung(reise, profil?.name ?? "");
  return { supabase, user: user!, reise, kategorien: kategorien ?? [], vorbelegt };
}
