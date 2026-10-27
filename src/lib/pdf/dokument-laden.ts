import "server-only";
import { istAusland, landName } from "@/lib/reisekosten/laender";
import { projektName } from "@/lib/reisekosten/projekte";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { formatDatum, formatDatumZeit } from "@/lib/format";
import { ladeAbrechnung } from "@/lib/reisekosten/abrechnung-laden";
import { verpflegungFuer, VERKEHRSMITTEL_TEXT } from "@/lib/reisekosten/reise";
import { monatsname } from "@/lib/reisekosten/auslagen";
import type { AbrechnungsDokument, BelegDatei } from "./abrechnung-pdf";

const AKTION: Record<string, string> = {
  eingereicht: "Für die Richtigkeit (eingereicht)",
  zurueckgezogen: "Zurückgezogen",
  genehmigt: "Genehmigung",
  abgelehnt: "Abgelehnt",
  geprueft: "Belegprüfung",
  ausgezahlt: "Ausgezahlt",
};

const zeit = new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });

function typAusPfad(pfad: string): string {
  const endung = pfad.split(".").pop()?.toLowerCase();
  return endung === "pdf" ? "application/pdf" : endung === "png" ? "image/png" : endung === "heic" ? "image/heic" : endung === "webp" ? "image/webp" : "image/jpeg";
}

/** Lädt alles für das Abrechnungs-PDF. Was die angemeldete Person nicht sehen darf (z. B. Personalnummer), bleibt leer. */
export async function ladeDokument(supabase: SupabaseClient<Database>, reiseId: string) {
  const { data: reise } = await supabase.from("reise").select("*").eq("id", reiseId).maybeSingle();
  if (!reise) return null;

  const [{ data: person }, { data: privat }, abrechnung, { data: fahrten }, { data: belege }, { data: verlauf }] = await Promise.all([
    supabase.from("profile").select("name").eq("id", reise.mitarbeiter_id).maybeSingle(),
    supabase.from("profil_privat").select("personalnummer, wohnort").eq("id", reise.mitarbeiter_id).maybeSingle(),
    ladeAbrechnung(supabase, reise),
    supabase.from("fahrt").select("datum, strecke, zweck, km").eq("reise_id", reiseId).order("datum"),
    supabase
      .from("beleg")
      .select("datum, beschreibung, betrag_cent, mwst_prozent, datei_pfad, created_at, lieferant, kostenstelle, zahlungsart, kategorie(bezeichnung)")
      .eq("reise_id", reiseId)
      .order("datum")
      .order("created_at"),
    supabase.from("reise_ereignis").select("zeit, aktion, person_name, kommentar").eq("reise_id", reiseId).order("zeit"),
  ]);

  const { data: projekt } = reise.projekt_id
    ? await supabase.from("projekt").select("bezeichnung, nummer, foerderkennzeichen").eq("id", reise.projekt_id).maybeSingle()
    : { data: null };
  const verpflegung = verpflegungFuer(reise);
  const nummeriert = (belege ?? []).map((b, i) => ({ ...b, nr: i + 1 }));

  const dokument: AbrechnungsDokument = {
    art: reise.art,
    monat: monatsname(reise.beginn.slice(0, 7)),
    belegNr: reise.beleg_nr,
    buchungsmonat: reise.buchungsmonat ? `${reise.buchungsmonat.slice(5, 7)}/${reise.buchungsmonat.slice(0, 4)}` : null,
    erstelltAm: new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin" }).format(new Date()),
    reisende: {
      name: person?.name ?? "",
      personalnummer: privat?.personalnummer ?? null,
      wohnort: privat?.wohnort ?? null,
    },
    kostenstelle: reise.kostenstelle,
    begruendung: reise.begruendung,
    projekt: projekt
      ? `${projektName({ id: "", ...projekt })}${projekt.foerderkennzeichen ? ` (FKZ ${projekt.foerderkennzeichen})` : ""}`
      : null,
    reiseweg: reise.reiseweg,
    ausland: istAusland(reise.land) ? landName(reise.land, Number(reise.beginn.slice(0, 4))) : null,
    besuchteStellen: reise.besuchte_stellen,
    abfahrt: formatDatumZeit(reise.beginn),
    rueckkehr: formatDatumZeit(reise.ende),
    verkehrsmittel:
      reise.verkehrsmittel
        .map((v) =>
          v === "eigener_pkw" && reise.kfz_kennzeichen
            ? `${VERKEHRSMITTEL_TEXT[v]} (${reise.kfz_kennzeichen})`
            : v === "mitfahrt" && reise.mitfahrt_bei
              ? `${VERKEHRSMITTEL_TEXT[v]} bei ${reise.mitfahrt_bei}`
              : VERKEHRSMITTEL_TEXT[v],
        )
        .join(", ") || "–",
    verpflegung: (verpflegung?.tage ?? []).map((t) => ({
      datum: formatDatum(t.datum),
      art: t.art === "voll" ? "24 Stunden" : t.art === "klein" ? "An-/Abreise bzw. über 8 Stunden" : "unter 8 Stunden",
      pauschale: t.pauschale,
      kuerzung: t.kuerzung,
      betrag: t.betrag,
    })),
    verpflegungBemerkung: reise.verpflegung_bemerkung,
    fahrten: (fahrten ?? []).map((f) => ({ datum: formatDatum(f.datum), strecke: f.strecke, zweck: f.zweck, km: Number(f.km) })),
    belege: nummeriert.map((b) => ({
      nr: b.nr,
      datum: formatDatum(b.datum),
      kategorie: b.kategorie?.bezeichnung ?? "",
      beschreibung: b.beschreibung,
      brutto: b.betrag_cent,
      mwstProzent: Number(b.mwst_prozent),
      mitDatei: !!b.datei_pfad,
      lieferant: b.lieferant,
      kostenstelle: b.kostenstelle,
      zahlungsart: b.zahlungsart,
    })),
    abrechnung,
    verlauf: (verlauf ?? []).map((v) => ({
      zeit: zeit.format(new Date(v.zeit)),
      aktion: AKTION[v.aktion] ?? v.aktion,
      person: v.person_name ?? "",
      kommentar: v.aktion === "geprueft" ? `Beleg-Nr. ${v.kommentar}` : v.kommentar,
    })),
  };

  const dateien: BelegDatei[] = [];
  const gesehen = new Set<string>();
  for (const b of nummeriert) {
    // Mehrere Positionen derselben Rechnung teilen sich ein Foto – nur einmal anhängen
    if (!b.datei_pfad || gesehen.has(b.datei_pfad)) continue;
    gesehen.add(b.datei_pfad);
    const { data: blob } = await supabase.storage.from("belege").download(b.datei_pfad);
    if (!blob) continue;
    const endung = b.datei_pfad.split(".").pop();
    dateien.push({
      nr: b.nr,
      name: `Beleg_${String(b.nr).padStart(2, "0")}.${endung}`,
      contentType: blob.type && blob.type !== "application/octet-stream" ? blob.type : typAusPfad(b.datei_pfad),
      inhalt: new Uint8Array(await blob.arrayBuffer()),
    });
  }

  return { reise, dokument, dateien };
}

/** Dateiname ohne Sonderzeichen, z. B. "RK-2026-0001_Reisekosten_Erika_Muster" bzw. "AL-2026-0001_Auslagen_Erika_Muster" */
export function dateiBasis(belegNr: string | null, name: string, art: "reise" | "auslagen" = "reise"): string {
  const sauber = (t: string) =>
    t
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ß/g, "ss")
      .replace(/[^A-Za-z0-9-]+/g, "_")
      .replace(/^_|_$/g, "");
  return [sauber(belegNr ?? "Entwurf"), art === "auslagen" ? "Auslagen" : "Reisekosten", sauber(name)].filter(Boolean).join("_");
}
