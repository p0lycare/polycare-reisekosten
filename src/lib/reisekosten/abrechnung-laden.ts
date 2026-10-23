import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { berechneAbrechnung, type Abrechnung } from "./abrechnung";
import { berechneKmGeld } from "./fahrtkosten";
import { verpflegungFuer, type Reise } from "./reise";

/** Lädt alle Daten einer Reise und berechnet die Abrechnung (Abschnitte A–F). */
export async function ladeAbrechnung(supabase: SupabaseClient<Database>, reise: Reise): Promise<Abrechnung> {
  const [{ data: belege }, { data: fahrten }, { data: einstellungen }, { data: systemKategorien }] = await Promise.all([
    supabase.from("beleg").select("kategorie_id, betrag_cent, mwst_prozent, kategorie(abschnitt, bezeichnung, konto)").eq("reise_id", reise.id),
    supabase.from("fahrt").select("km").eq("reise_id", reise.id),
    supabase.from("einstellungen").select("km_satz_cent, km_steuerfrei_cent").single(),
    supabase.from("kategorie").select("id, bezeichnung, konto").in("id", ["km_geld", "verpflegung"]),
  ]);

  const kmGesamt = (fahrten ?? []).reduce((s, f) => s + Number(f.km), 0);
  const kontierung = (id: string, ersatz: string) => {
    const k = systemKategorien?.find((x) => x.id === id);
    return { bezeichnung: k?.bezeichnung ?? ersatz, konto: k?.konto ?? null };
  };

  return berechneAbrechnung({
    belege: (belege ?? []).map((b) => ({
      kategorieId: b.kategorie_id,
      abschnitt: b.kategorie!.abschnitt,
      bezeichnung: b.kategorie!.bezeichnung,
      konto: b.kategorie!.konto,
      betragCent: b.betrag_cent,
      mwstProzent: Number(b.mwst_prozent),
    })),
    verpflegung: verpflegungFuer(reise),
    // Beim Einreichen festgeschriebene Sätze haben Vorrang vor den aktuellen Einstellungen
    kmGeld:
      kmGesamt > 0
        ? berechneKmGeld(
            kmGesamt,
            reise.km_satz_cent ?? einstellungen?.km_satz_cent ?? 0,
            reise.km_steuerfrei_cent ?? einstellungen?.km_steuerfrei_cent ?? 0,
          )
        : null,
    kmKategorie: kontierung("km_geld", "Km-Geld"),
    verpflegungKategorie: kontierung("verpflegung", "Verpflegungspauschale"),
    vorschussCent: reise.vorschuss_cent,
  });
}
