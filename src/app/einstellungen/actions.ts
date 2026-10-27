"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ERFASSBARE_ABSCHNITTE, type Abschnitt } from "@/lib/reisekosten/kategorie";
import { erinnerungenSenden } from "@/lib/erinnerungen/senden";
import { appUrl } from "@/lib/mail/benachrichtigen";

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

/** Standort anlegen oder ändern; Adresse bzw. Suchbegriffe eine je Zeile */
export async function standortSpeichern(_vorher: AktionStatus, formData: FormData): Promise<AktionStatus> {
  const id = text(formData, "id");
  const name = text(formData, "name").slice(0, 80);
  if (!name) return { fehler: "Name fehlt." };
  const orte = text(formData, "orte")
    .split(/\r?\n/)
    .map((o) => o.trim())
    .filter(Boolean)
    .slice(0, 10);
  if (!orte.length) return { fehler: "Bitte mindestens die Adresse angeben." };
  const daten = { name, orte, aktiv: id ? formData.get("aktiv") === "on" : true };

  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("standort").update(daten).eq("id", id).select("id")
    : await supabase.from("standort").insert({ ...daten, sortierung: 100 }).select("id");
  if (error || !data?.length) return { fehler: "Speichern fehlgeschlagen. Fehlt die Berechtigung?" };

  revalidatePath("/einstellungen");
  revalidatePath("/einstellungen/personen");
  return { gespeichert: true };
}

/** Beide Erinnerungen sofort an die angemeldete Person senden, um Inhalt und Zustellung zu prüfen */
export async function erinnerungTesten(): Promise<AktionStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = user ? await supabase.from("profile").select("rolle").eq("id", user.id).single() : { data: null };
  if (!user || profil?.rolle !== "admin") return { fehler: "Nur für Admins." };

  const lauf = await erinnerungenSenden({ basis: await appUrl(), erzwingen: true, nurAn: user.id });
  revalidatePath("/einstellungen");
  if (lauf.uebersprungen) return { fehler: lauf.uebersprungen };
  if (!lauf.monat && !lauf.freigaben) return { fehler: "Bei dir ist gerade nichts offen – es wurde keine Erinnerung gesendet." };
  return { gespeichert: true };
}

/** Projekt anlegen oder ändern (nur Buchhaltung/Admin, per RLS abgesichert) */
export async function projektSpeichern(_vorher: AktionStatus, formData: FormData): Promise<AktionStatus> {
  const id = text(formData, "id");
  const bezeichnung = text(formData, "bezeichnung").slice(0, 120);
  if (!bezeichnung) return { fehler: "Bezeichnung fehlt." };
  const daten = {
    bezeichnung,
    nummer: text(formData, "nummer").slice(0, 40) || null,
    foerdergeber: text(formData, "foerdergeber").slice(0, 120) || null,
    foerderkennzeichen: text(formData, "foerderkennzeichen").slice(0, 60) || null,
    aktiv: id ? formData.get("aktiv") === "on" : true,
  };

  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("projekt").update(daten).eq("id", id).select("id")
    : await supabase.from("projekt").insert(daten).select("id");
  if (error || !data?.length) return { fehler: "Speichern fehlgeschlagen. Fehlt die Berechtigung?" };

  revalidatePath("/einstellungen");
  return { gespeichert: true };
}
