"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseEuro } from "@/lib/geld";

export type BelegStatus = { fehler?: string };

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

export async function belegSpeichern(_vorher: BelegStatus, formData: FormData): Promise<BelegStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = text(formData, "id") || null;
  const reiseId = text(formData, "reise_id");
  const kategorieId = text(formData, "kategorie_id");
  const datum = text(formData, "datum");
  const betrag = parseEuro(text(formData, "betrag"));
  const mwst = Number(text(formData, "mwst_prozent").replace(",", "."));
  const dateiPfad = text(formData, "datei_pfad") || null;
  const anlass = text(formData, "bewirtung_anlass") || null;
  const teilnehmer = text(formData, "bewirtung_teilnehmer") || null;

  const { data: kategorie } = await supabase
    .from("kategorie")
    .select("abschnitt, beleg_erfassbar, aktiv")
    .eq("id", kategorieId)
    .maybeSingle();

  if (!kategorie?.beleg_erfassbar || (!id && !kategorie.aktiv)) return { fehler: "Bitte eine Kategorie wählen." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return { fehler: "Bitte das Belegdatum angeben." };
  if (betrag === null || betrag <= 0) return { fehler: "Bitte einen gültigen Betrag angeben, z. B. 12,50." };
  if (!Number.isFinite(mwst) || mwst < 0 || mwst >= 100) return { fehler: "Bitte den MwSt-Satz angeben." };
  if (kategorie.abschnitt === "E" && (!anlass || !teilnehmer)) {
    return { fehler: "Bei Bewirtungen sind Anlass und Teilnehmende Pflicht." };
  }
  if (dateiPfad && !dateiPfad.startsWith(`${user.id}/${reiseId}/`)) return { fehler: "Ungültige Datei." };

  const daten = {
    reise_id: reiseId,
    kategorie_id: kategorieId,
    datum,
    beschreibung: text(formData, "beschreibung") || null,
    betrag_cent: betrag,
    mwst_prozent: mwst,
    datei_pfad: dateiPfad,
    bewirtung_anlass: kategorie.abschnitt === "E" ? anlass : null,
    bewirtung_teilnehmer: kategorie.abschnitt === "E" ? teilnehmer : null,
  };

  // RLS erlaubt Änderungen nur an Belegen eigener, bearbeitbarer Reisen
  const { data, error } = id
    ? await supabase.from("beleg").update(daten).eq("id", id).select("id")
    : await supabase.from("beleg").insert(daten).select("id");
  if (error || !data?.length) return { fehler: "Speichern fehlgeschlagen. Ist die Reise noch bearbeitbar?" };

  const alterPfad = text(formData, "datei_alt");
  if (alterPfad && alterPfad !== dateiPfad) {
    await supabase.storage.from("belege").remove([alterPfad]);
  }

  revalidatePath(`/reisen/${reiseId}`);
  redirect(`/reisen/${reiseId}`);
}

export async function belegLoeschen(formData: FormData) {
  const id = text(formData, "id");
  const reiseId = text(formData, "reise_id");
  const supabase = await createClient();

  const { data } = await supabase.from("beleg").delete().eq("id", id).select("datei_pfad");
  const pfad = data?.[0]?.datei_pfad;
  if (pfad) await supabase.storage.from("belege").remove([pfad]);

  revalidatePath(`/reisen/${reiseId}`);
  redirect(`/reisen/${reiseId}`);
}
