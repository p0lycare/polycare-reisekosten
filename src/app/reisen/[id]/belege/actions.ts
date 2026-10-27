"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseEuro } from "@/lib/geld";
import type { AusgelesenerBeleg } from "@/lib/ki/beleg-auslesen";
import { liesGespeichertenBeleg } from "@/lib/ki/auslesen-server";
import { istBelegPfad } from "@/lib/belegpfad";
import { istBearbeitbar } from "@/lib/reisekosten/reise";
import { positionenFuerArt, pruefePositionen } from "@/lib/reisekosten/beleg-pruefung";
import { istZahlungsart } from "@/lib/reisekosten/zahlungsart";

export type BelegStatus = { fehler?: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;

const MAX_POSITIONEN = 20;

/** Art der Abrechnung (Reise oder Auslagen) – bestimmt die zulässigen Kategorien */
async function artDerAbrechnung(supabase: Supabase, reiseId: string): Promise<"reise" | "auslagen"> {
  const { data } = await supabase.from("reise").select("art").eq("id", reiseId).maybeSingle();
  return data?.art ?? "reise";
}

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

/** Mehrere Positionen einer Hotelrechnung teilen sich ein Foto – nur löschen, wenn es niemand mehr nutzt. */
async function dateiEntfernenWennUnbenutzt(supabase: Supabase, pfad: string) {
  const { count } = await supabase.from("beleg").select("id", { count: "exact", head: true }).eq("datei_pfad", pfad);
  if (!count) await supabase.storage.from("belege").remove([pfad]);
}

/** Beleg aus dem Eingang wurde erfasst – Eintrag entfernen (das Foto bleibt beim Beleg) */
async function eingangErledigt(supabase: Supabase, eingangId: string) {
  if (eingangId) await supabase.from("beleg_eingang").delete().eq("id", eingangId);
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

  const art = await artDerAbrechnung(supabase, reiseId);
  const beschreibung = text(formData, "beschreibung") || null;
  const zahlungsart = text(formData, "zahlungsart") || null;
  if (art === "auslagen" && !beschreibung) return { fehler: "Bitte den Zweck angeben, z. B. „Aufbau Mockup Köln“." };
  if (zahlungsart && !istZahlungsart(zahlungsart)) return { fehler: "Bitte eine Zahlungsart wählen." };

  const fehler = await pruefePositionen(
    supabase,
    [{ kategorieId, betragCent: betrag, mwstProzent: mwst, bewirtungAnlass: anlass, bewirtungTeilnehmer: teilnehmer }],
    !!id,
    art,
  );
  if (fehler) return { fehler };

  const { data: kategorie } = await supabase.from("kategorie").select("abschnitt").eq("id", kategorieId).single();
  const daten = {
    reise_id: reiseId,
    kategorie_id: kategorieId,
    datum,
    beschreibung,
    betrag_cent: betrag,
    mwst_prozent: mwst,
    datei_pfad: dateiPfad,
    bewirtung_anlass: kategorie?.abschnitt === "E" ? anlass : null,
    bewirtung_teilnehmer: kategorie?.abschnitt === "E" ? teilnehmer : null,
    lieferant: art === "auslagen" ? text(formData, "lieferant").slice(0, 120) || null : null,
    kostenstelle: art === "auslagen" ? text(formData, "kostenstelle").slice(0, 40) || null : null,
    zahlungsart: art === "auslagen" ? zahlungsart : null,
  };

  // RLS erlaubt Änderungen nur an Belegen eigener, bearbeitbarer Reisen
  const { data, error } = id
    ? await supabase.from("beleg").update(daten).eq("id", id).eq("reise_id", reiseId).select("id")
    : await supabase.from("beleg").insert(daten).select("id");
  if (error || !data?.length) return { fehler: "Speichern fehlgeschlagen. Ist die Reise noch bearbeitbar?" };
  await eingangErledigt(supabase, text(formData, "eingang_id"));

  const alterPfad = text(formData, "datei_alt");
  if (alterPfad && alterPfad !== dateiPfad && istBelegPfad(alterPfad, user.id, reiseId)) {
    await dateiEntfernenWennUnbenutzt(supabase, alterPfad);
  }

  revalidatePath(`/reisen/${reiseId}`);
  redirect(`/reisen/${reiseId}?gespeichert=beleg`);
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

  return liesGespeichertenBeleg(supabase, pfad);
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
  const art = await artDerAbrechnung(supabase, reiseId);
  // Auslagen werden einzeln mit Zweck erfasst; das Formular bietet das Sammelanlegen dort nicht an
  if (art === "auslagen") return { fehler: "Auslagen bitte einzeln mit Zweck erfassen." };
  const gelesen = roh.map((p) => ({
    kategorieId: String(p?.kategorieId ?? ""),
    beschreibung: String(p?.beschreibung ?? "").slice(0, 200),
    betragCent: Number(p?.betragCent),
    mwstProzent: Number(p?.mwstProzent),
  }));
  const passend = await positionenFuerArt(supabase, gelesen, art);
  if ("fehler" in passend) return passend;
  const { positionen } = passend;

  // Bewirtungen brauchen Anlass und Teilnehmende – dafür gibt es im Sammelanlegen keine Felder
  const fehler = await pruefePositionen(
    supabase,
    positionen.map((p) => ({ ...p, bewirtungAnlass: null, bewirtungTeilnehmer: null })),
    false,
    art,
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
  await eingangErledigt(supabase, text(formData, "eingang_id"));

  revalidatePath(`/reisen/${reiseId}`);
  redirect(`/reisen/${reiseId}?gespeichert=belege`);
}
