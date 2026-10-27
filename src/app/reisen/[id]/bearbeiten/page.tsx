import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { istBearbeitbar } from "@/lib/reisekosten/reise";
import type { Mahlzeiten } from "@/lib/reisekosten/verpflegung";
import { alsLokal } from "@/lib/format";
import { centAlsEingabe } from "@/lib/geld";
import { ReiseFormular } from "../../reise-formular";
import { ladeProjektAuswahl } from "@/lib/reisekosten/projekte";

export default async function ReiseBearbeitenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: reise } = await supabase.from("reise").select("*").eq("id", id).maybeSingle();
  if (!reise) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Auslagenabrechnungen haben keine Reisedaten zum Bearbeiten
  if (reise.mitarbeiter_id !== user?.id || !istBearbeitbar(reise.status) || reise.art === "auslagen") redirect(`/reisen/${id}`);

  const projekte = await ladeProjektAuswahl(supabase, reise.projekt_id);
  const { data: antrag } = await supabase.from("vorschuss").select("id").eq("reise_id", reise.id).neq("status", "abgelehnt").maybeSingle();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 font-sans">
      <h1 className="text-xl font-semibold">Reise bearbeiten</h1>
      <ReiseFormular
        projekte={projekte}
        werte={{
          id: reise.id,
          begruendung: reise.begruendung,
          reiseweg: reise.reiseweg,
          besuchteStellen: reise.besuchte_stellen ?? "",
          land: reise.land,
          beginn: alsLokal(reise.beginn),
          ende: alsLokal(reise.ende),
          mitUebernachtung: reise.mit_uebernachtung,
          mahlzeiten: (reise.mahlzeiten ?? {}) as Record<string, Mahlzeiten>,
          verkehrsmittel: reise.verkehrsmittel,
          kfzKennzeichen: reise.kfz_kennzeichen ?? "",
          mitfahrtBei: reise.mitfahrt_bei ?? "",
          kostenstelle: reise.kostenstelle ?? "",
          projektId: reise.projekt_id ?? "",
          verpflegungBemerkung: reise.verpflegung_bemerkung ?? "",
          vorschuss: reise.vorschuss_cent ? centAlsEingabe(reise.vorschuss_cent) : "",
          vorschussFest: !!antrag,
        }}
      />
    </main>
  );
}
