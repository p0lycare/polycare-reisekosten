"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { berechneVerpflegung, type Mahlzeiten } from "@/lib/reisekosten/verpflegung";
import { VERKEHRSMITTEL, type Verkehrsmittel } from "@/lib/reisekosten/reise";
import { parseEuro } from "@/lib/geld";
import { eingangZuordnen } from "@/app/belege/actions";
import { z } from "zod";

// Nur Tage (YYYY-MM-DD) mit optionalen Ja/Nein-Werten – alles andere würde Seiten zum Absturz bringen
const MahlzeitenSchema = z.record(
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  z.object({ fruehstueck: z.boolean().optional(), mittag: z.boolean().optional(), abend: z.boolean().optional() }).strict(),
);

export type FormularStatus = { fehler?: string };

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

export async function reiseSpeichern(
  _vorher: FormularStatus,
  formData: FormData,
): Promise<FormularStatus> {
  const id = text(formData, "id") || null;
  const begruendung = text(formData, "begruendung");
  const reiseweg = text(formData, "reiseweg");
  const land = text(formData, "land") || "DE";
  const beginn = text(formData, "beginn");
  const ende = text(formData, "ende");
  const mitUebernachtung = formData.get("mit_uebernachtung") === "on";
  const verkehrsmittel = formData
    .getAll("verkehrsmittel")
    .map(String)
    .filter((v): v is Verkehrsmittel => (VERKEHRSMITTEL as string[]).includes(v));
  const kfzKennzeichen = verkehrsmittel.includes("eigener_pkw")
    ? text(formData, "kfz_kennzeichen").toUpperCase() || null
    : null;
  const mitfahrtBei = verkehrsmittel.includes("mitfahrt") ? text(formData, "mitfahrt_bei") || null : null;

  if (!begruendung || !reiseweg || !beginn || !ende) {
    return { fehler: "Bitte Begründung, Reiseweg, Beginn und Ende ausfüllen." };
  }
  if (!verkehrsmittel.length) {
    return { fehler: "Bitte mindestens ein Verkehrsmittel auswählen." };
  }
  if (verkehrsmittel.includes("eigener_pkw") && !kfzKennzeichen) {
    return { fehler: "Bitte das Kennzeichen des eigenen PKW angeben." };
  }
  const vorschussEingabe = text(formData, "vorschuss");
  const vorschuss = vorschussEingabe ? parseEuro(vorschussEingabe) : 0;
  if (vorschuss === null) return { fehler: "Bitte den Vorschuss als Betrag angeben, z. B. 100,00." };

  let mahlzeiten: Record<string, Mahlzeiten>;
  try {
    mahlzeiten = MahlzeitenSchema.parse(JSON.parse(text(formData, "mahlzeiten") || "{}"));
  } catch {
    return { fehler: "Mahlzeiten konnten nicht gelesen werden." };
  }

  let tage: string[];
  try {
    tage = berechneVerpflegung({ beginn, ende, land, mitUebernachtung, mahlzeiten }).tage.map(
      (t) => t.datum,
    );
  } catch (e) {
    return { fehler: e instanceof Error ? e.message : "Reisedaten sind ungültig." };
  }
  // Nur Mahlzeiten für Tage innerhalb der Reise speichern
  mahlzeiten = Object.fromEntries(Object.entries(mahlzeiten).filter(([d]) => tage.includes(d)));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const daten = {
    begruendung,
    reiseweg,
    besuchte_stellen: text(formData, "besuchte_stellen") || null,
    land,
    beginn,
    ende,
    mit_uebernachtung: mitUebernachtung,
    mahlzeiten,
    verkehrsmittel,
    kfz_kennzeichen: kfzKennzeichen,
    mitfahrt_bei: mitfahrtBei,
    kostenstelle: text(formData, "kostenstelle") || null,
    verpflegung_bemerkung: text(formData, "verpflegung_bemerkung") || null,
    vorschuss_cent: vorschuss,
  };

  if (id) {
    // RLS lässt nicht bearbeitbare Reisen still aus – daher die geänderten Zeilen prüfen
    const { data, error } = await supabase.from("reise").update(daten).eq("id", id).select("id");
    if (error || !data?.length) return { fehler: "Speichern fehlgeschlagen. Ist die Reise noch bearbeitbar?" };
    revalidatePath(`/reisen/${id}`);
    revalidatePath("/");
    redirect(`/reisen/${id}`);
  }

  const { data, error } = await supabase
    .from("reise")
    .insert({ ...daten, mitarbeiter_id: user.id })
    .select("id")
    .single();
  if (error || !data) return { fehler: "Speichern fehlgeschlagen." };

  // Neue Reise aus einem Eingangsbeleg: Beleg gleich zuordnen (klappt das nicht, bleibt er im Eingang)
  const eingangId = text(formData, "eingang_id");
  if (eingangId) await eingangZuordnen(eingangId, data.id);

  revalidatePath("/");
  redirect(`/reisen/${data.id}`);
}

export async function reiseLoeschen(formData: FormData) {
  const id = text(formData, "id");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Nur eigene Entwürfe – sonst würden Fotos gelöscht, während die Reise bestehen bleibt
  const { data: reise } = await supabase.from("reise").select("mitarbeiter_id, status").eq("id", id).maybeSingle();
  if (!user || !reise || reise.mitarbeiter_id !== user.id || reise.status !== "entwurf") redirect(`/reisen/${id}`);

  // Reihenfolge: Belege, dann Fotos (Storage-Regel: nur unbenutzte Fotos löschbar), dann die Reise
  const { data: belege } = await supabase.from("beleg").delete().eq("reise_id", id).select("datei_pfad");
  const pfade = [...new Set((belege ?? []).flatMap((b) => (b.datei_pfad ? [b.datei_pfad] : [])))];
  if (pfade.length) {
    const { error } = await supabase.storage.from("belege").remove(pfade);
    if (error) console.error("Belegfotos konnten nicht gelöscht werden", error);
  }
  await supabase.from("reise").delete().eq("id", id);
  revalidatePath("/");
  redirect("/");
}
