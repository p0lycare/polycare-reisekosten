"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseEuro } from "@/lib/geld";
import { belegAuslesen, type AusgelesenerBeleg } from "@/lib/ki/beleg-auslesen";
import { istBelegPfad } from "@/lib/belegpfad";
import { istBearbeitbar } from "@/lib/reisekosten/reise";

export type BelegStatus = { fehler?: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;

const MAX_BETRAG_CENT = 10_000_000; // 100.000 €
const MAX_POSITIONEN = 20;

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

/** Mehrere Positionen einer Hotelrechnung teilen sich ein Foto – nur löschen, wenn es niemand mehr nutzt. */
async function dateiEntfernenWennUnbenutzt(supabase: Supabase, pfad: string) {
  const { count } = await supabase.from("beleg").select("id", { count: "exact", head: true }).eq("datei_pfad", pfad);
  if (!count) await supabase.storage.from("belege").remove([pfad]);
}

type Position = {
  kategorieId: string;
  betragCent: number;
  mwstProzent: number;
  bewirtungAnlass: string | null;
  bewirtungTeilnehmer: string | null;
};

/** Gemeinsame Prüfung für einzelne Belege und für mehrere Positionen auf einmal. */
async function pruefePositionen(supabase: Supabase, positionen: Position[], bestehend: boolean): Promise<string | null> {
  const ids = [...new Set(positionen.map((p) => p.kategorieId))];
  const { data: kategorien } = await supabase.from("kategorie").select("id, abschnitt, beleg_erfassbar, aktiv").in("id", ids);
  const nachId = new Map((kategorien ?? []).map((k) => [k.id, k]));

  for (const p of positionen) {
    const k = nachId.get(p.kategorieId);
    if (!k?.beleg_erfassbar || (!bestehend && !k.aktiv)) return "Bitte eine Kategorie wählen.";
    if (!Number.isInteger(p.betragCent) || p.betragCent <= 0 || p.betragCent > MAX_BETRAG_CENT) {
      return "Bitte einen gültigen Betrag angeben, z. B. 12,50.";
    }
    if (!Number.isFinite(p.mwstProzent) || p.mwstProzent < 0 || p.mwstProzent >= 100) return "Bitte den MwSt-Satz angeben.";
    if (k.abschnitt === "E" && (!p.bewirtungAnlass || !p.bewirtungTeilnehmer)) {
      return "Bei Bewirtungen sind Anlass und Teilnehmende Pflicht.";
    }
  }
  return null;
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

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return { fehler: "Bitte das Belegdatum angeben." };
  if (betrag === null) return { fehler: "Bitte einen gültigen Betrag angeben, z. B. 12,50." };
  if (dateiPfad && !istBelegPfad(dateiPfad, user.id, reiseId)) return { fehler: "Ungültige Datei." };

  const fehler = await pruefePositionen(
    supabase,
    [{ kategorieId, betragCent: betrag, mwstProzent: mwst, bewirtungAnlass: anlass, bewirtungTeilnehmer: teilnehmer }],
    !!id,
  );
  if (fehler) return { fehler };

  const { data: kategorie } = await supabase.from("kategorie").select("abschnitt").eq("id", kategorieId).single();
  const daten = {
    reise_id: reiseId,
    kategorie_id: kategorieId,
    datum,
    beschreibung: text(formData, "beschreibung") || null,
    betrag_cent: betrag,
    mwst_prozent: mwst,
    datei_pfad: dateiPfad,
    bewirtung_anlass: kategorie?.abschnitt === "E" ? anlass : null,
    bewirtung_teilnehmer: kategorie?.abschnitt === "E" ? teilnehmer : null,
  };

  // RLS erlaubt Änderungen nur an Belegen eigener, bearbeitbarer Reisen
  const { data, error } = id
    ? await supabase.from("beleg").update(daten).eq("id", id).eq("reise_id", reiseId).select("id")
    : await supabase.from("beleg").insert(daten).select("id");
  if (error || !data?.length) return { fehler: "Speichern fehlgeschlagen. Ist die Reise noch bearbeitbar?" };

  const alterPfad = text(formData, "datei_alt");
  if (alterPfad && alterPfad !== dateiPfad && istBelegPfad(alterPfad, user.id, reiseId)) {
    await dateiEntfernenWennUnbenutzt(supabase, alterPfad);
  }

  revalidatePath(`/reisen/${reiseId}`);
  redirect(`/reisen/${reiseId}`);
}

export async function belegLoeschen(formData: FormData) {
  const id = text(formData, "id");
  const reiseId = text(formData, "reise_id");
  const supabase = await createClient();

  const { data } = await supabase.from("beleg").delete().eq("id", id).eq("reise_id", reiseId).select("datei_pfad");
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
  if (!user || !istBelegPfad(pfad, user.id, reiseId)) return { fehler: "Ungültige Datei." };

  // Nur für eigene, noch bearbeitbare Reisen – verhindert unnötige KI-Kosten
  const { data: reise } = await supabase.from("reise").select("mitarbeiter_id, status").eq("id", reiseId).maybeSingle();
  if (!reise || reise.mitarbeiter_id !== user.id || !istBearbeitbar(reise.status)) {
    return { fehler: "Die Reise kann nicht mehr bearbeitet werden." };
  }

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
  const waehrung = text(formData, "waehrung") || "EUR";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (dateiPfad && !istBelegPfad(dateiPfad, user.id, reiseId)) return { fehler: "Ungültige Datei." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return { fehler: "Bitte das Belegdatum angeben." };
  if (waehrung !== "EUR") return { fehler: "Der Beleg ist nicht in Euro – bitte die Positionen einzeln in Euro erfassen." };

  let roh: unknown;
  try {
    roh = JSON.parse(text(formData, "positionen"));
  } catch {
    return { fehler: "Positionen konnten nicht gelesen werden." };
  }
  if (!Array.isArray(roh) || !roh.length || roh.length > MAX_POSITIONEN) return { fehler: "Ungültige Positionen." };
  const positionen = roh.map((p) => ({
    kategorieId: String(p?.kategorieId ?? ""),
    beschreibung: String(p?.beschreibung ?? "").slice(0, 200),
    betragCent: Number(p?.betragCent),
    mwstProzent: Number(p?.mwstProzent),
  }));

  // Bewirtungen brauchen Anlass und Teilnehmende – dafür gibt es im Sammelanlegen keine Felder
  const fehler = await pruefePositionen(
    supabase,
    positionen.map((p) => ({ ...p, bewirtungAnlass: null, bewirtungTeilnehmer: null })),
    false,
  );
  if (fehler) {
    return {
      fehler: fehler.startsWith("Bei Bewirtungen") ? "Bewirtungen bitte einzeln mit Anlass und Teilnehmenden erfassen." : fehler,
    };
  }

  const { data, error } = await supabase
    .from("beleg")
    .insert(
      positionen.map((p) => ({
        reise_id: reiseId,
        kategorie_id: p.kategorieId,
        datum,
        beschreibung: p.beschreibung || null,
        betrag_cent: p.betragCent,
        mwst_prozent: p.mwstProzent,
        datei_pfad: dateiPfad,
      })),
    )
    .select("id");
  if (error || !data?.length) return { fehler: "Speichern fehlgeschlagen. Ist die Reise noch bearbeitbar?" };

  revalidatePath(`/reisen/${reiseId}`);
  redirect(`/reisen/${reiseId}`);
}
