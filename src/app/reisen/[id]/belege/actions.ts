"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseEuro } from "@/lib/geld";
import { belegAuslesen, type AusgelesenerBeleg } from "@/lib/ki/beleg-auslesen";

export type BelegStatus = { fehler?: string };

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

/** Mehrere Positionen einer Hotelrechnung teilen sich ein Foto – nur löschen, wenn es niemand mehr nutzt. */
async function dateiEntfernenWennUnbenutzt(supabase: Awaited<ReturnType<typeof createClient>>, pfad: string) {
  const { count } = await supabase.from("beleg").select("id", { count: "exact", head: true }).eq("datei_pfad", pfad);
  if (!count) await supabase.storage.from("belege").remove([pfad]);
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
  if (alterPfad && alterPfad !== dateiPfad) await dateiEntfernenWennUnbenutzt(supabase, alterPfad);

  revalidatePath(`/reisen/${reiseId}`);
  redirect(`/reisen/${reiseId}`);
}

export async function belegLoeschen(formData: FormData) {
  const id = text(formData, "id");
  const reiseId = text(formData, "reise_id");
  const supabase = await createClient();

  const { data } = await supabase.from("beleg").delete().eq("id", id).select("datei_pfad");
  const pfad = data?.[0]?.datei_pfad;
  if (pfad) await dateiEntfernenWennUnbenutzt(supabase, pfad);

  revalidatePath(`/reisen/${reiseId}`);
  redirect(`/reisen/${reiseId}`);
}

export type AuslesenErgebnis = { fehler?: string; ergebnis?: AusgelesenerBeleg };

/** Liest ein bereits hochgeladenes Belegfoto per KI aus und liefert einen Vorschlag fürs Formular. */
export async function belegPerKiAuslesen(reiseId: string, pfad: string): Promise<AuslesenErgebnis> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !pfad.startsWith(`${user.id}/${reiseId}/`)) return { fehler: "Ungültige Datei." };

  const [{ data: blob }, { data: kategorien }] = await Promise.all([
    supabase.storage.from("belege").download(pfad),
    supabase.from("kategorie").select("id, bezeichnung, abschnitt, mwst_prozent").eq("beleg_erfassbar", true).eq("aktiv", true),
  ]);
  if (!blob) return { fehler: "Das Foto wurde nicht gefunden." };

  const ergebnis = await belegAuslesen(
    { inhalt: new Uint8Array(await blob.arrayBuffer()), contentType: blob.type },
    (kategorien ?? []).map((k) => ({
      id: k.id,
      bezeichnung: k.bezeichnung,
      abschnitt: k.abschnitt,
      mwstProzent: k.mwst_prozent == null ? null : Number(k.mwst_prozent),
    })),
  );
  return "fehler" in ergebnis ? { fehler: ergebnis.fehler } : { ergebnis };
}

/** Legt mehrere Positionen eines Belegs (z. B. Hotelrechnung) als einzelne Belege mit demselben Foto an. */
export async function belegPositionenAnlegen(_vorher: BelegStatus, formData: FormData): Promise<BelegStatus> {
  const reiseId = text(formData, "reise_id");
  const datum = text(formData, "datum");
  const dateiPfad = text(formData, "datei_pfad") || null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (dateiPfad && !dateiPfad.startsWith(`${user.id}/${reiseId}/`)) return { fehler: "Ungültige Datei." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return { fehler: "Bitte das Belegdatum angeben." };

  let positionen: { kategorieId: string; beschreibung: string; betragCent: number; mwstProzent: number }[];
  try {
    positionen = JSON.parse(text(formData, "positionen"));
  } catch {
    return { fehler: "Positionen konnten nicht gelesen werden." };
  }
  if (!positionen.length || positionen.some((p) => !(p.betragCent > 0) || !(p.mwstProzent >= 0 && p.mwstProzent < 100))) {
    return { fehler: "Ungültige Positionen." };
  }

  const { data, error } = await supabase
    .from("beleg")
    .insert(
      positionen.map((p) => ({
        reise_id: reiseId,
        kategorie_id: p.kategorieId,
        datum,
        beschreibung: p.beschreibung || null,
        betrag_cent: Math.round(p.betragCent),
        mwst_prozent: p.mwstProzent,
        datei_pfad: dateiPfad,
      })),
    )
    .select("id");
  if (error || !data?.length) return { fehler: "Speichern fehlgeschlagen. Ist die Reise noch bearbeitbar?" };

  revalidatePath(`/reisen/${reiseId}`);
  redirect(`/reisen/${reiseId}`);
}
