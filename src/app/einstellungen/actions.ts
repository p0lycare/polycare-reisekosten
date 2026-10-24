"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ERFASSBARE_ABSCHNITTE, type Abschnitt } from "@/lib/reisekosten/kategorie";

export type AktionStatus = { fehler?: string; gespeichert?: boolean };

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

/** "" → null (Satz je Beleg wählbar), sonst Prozentwert; undefined bei ungültiger Eingabe */
function mwstAus(eingabe: string): number | null | undefined {
  if (eingabe === "") return null;
  const wert = Number(eingabe.replace(",", "."));
  return Number.isFinite(wert) && wert >= 0 && wert < 100 ? wert : undefined;
}

function kontoAus(eingabe: string): string | null | undefined {
  if (eingabe === "") return null;
  return /^\d{4,8}$/.test(eingabe) ? eingabe : undefined;
}

/** Kurzer, lesbarer Schlüssel aus der Bezeichnung */
function idAus(bezeichnung: string): string {
  const basis = bezeichnung
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 30);
  return `${basis || "kategorie"}_${Math.random().toString(36).slice(2, 6)}`;
}

export async function kategorieSpeichern(_vorher: AktionStatus, formData: FormData): Promise<AktionStatus> {
  const id = text(formData, "id");
  const bezeichnung = text(formData, "bezeichnung");
  const mwst = mwstAus(text(formData, "mwst_prozent"));
  const konto = kontoAus(text(formData, "konto"));

  if (!bezeichnung) return { fehler: "Bezeichnung fehlt." };
  if (mwst === undefined) return { fehler: "MwSt-Satz muss zwischen 0 und 99 % liegen." };
  if (konto === undefined) return { fehler: "Konto: 4 bis 8 Ziffern." };

  const supabase = await createClient();
  const daten = { bezeichnung, mwst_prozent: mwst, konto, aktiv: formData.get("aktiv") === "on" };

  if (id) {
    const { data, error } = await supabase.from("kategorie").update(daten).eq("id", id).select("id");
    if (error || !data?.length) return { fehler: "Speichern fehlgeschlagen. Fehlt die Berechtigung?" };
  } else {
    const abschnitt = text(formData, "abschnitt") as Abschnitt;
    if (!ERFASSBARE_ABSCHNITTE.includes(abschnitt)) return { fehler: "Ungültiger Abschnitt." };
    const { error } = await supabase
      .from("kategorie")
      .insert({ ...daten, id: idAus(bezeichnung), abschnitt, sortierung: 1000 });
    if (error) return { fehler: "Anlegen fehlgeschlagen. Fehlt die Berechtigung?" };
  }

  revalidatePath("/einstellungen");
  return { gespeichert: true };
}

function centAus(eingabe: string): number | undefined {
  const wert = Number(eingabe.replace(",", "."));
  return Number.isFinite(wert) && wert >= 0 && wert < 10 ? Math.round(wert * 100) : undefined;
}

export async function saetzeSpeichern(_vorher: AktionStatus, formData: FormData): Promise<AktionStatus> {
  const kmSatz = centAus(text(formData, "km_satz"));
  const kmSteuerfrei = centAus(text(formData, "km_steuerfrei"));
  if (kmSatz === undefined || kmSteuerfrei === undefined) {
    return { fehler: "Bitte Beträge in Euro angeben, z. B. 0,38." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("einstellungen")
    .update({ km_satz_cent: kmSatz, km_steuerfrei_cent: kmSteuerfrei, updated_at: new Date().toISOString() })
    .eq("id", true)
    .select("id");
  if (error || !data?.length) return { fehler: "Speichern fehlgeschlagen. Fehlt die Berechtigung?" };

  revalidatePath("/einstellungen");
  return { gespeichert: true };
}

/** Büro-Orte: eine Angabe je Zeile, z. B. Straße oder Ort der ersten Tätigkeitsstätte */
export async function bueroOrteSpeichern(_vorher: AktionStatus, formData: FormData): Promise<AktionStatus> {
  const orte = text(formData, "buero_orte")
    .split(/\r?\n|,/)
    .map((o) => o.trim())
    .filter(Boolean)
    .slice(0, 20);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("einstellungen")
    .update({ buero_orte: orte, updated_at: new Date().toISOString() })
    .eq("id", true)
    .select("id");
  if (error || !data?.length) return { fehler: "Speichern fehlgeschlagen. Fehlt die Berechtigung?" };

  revalidatePath("/einstellungen");
  return { gespeichert: true };
}
