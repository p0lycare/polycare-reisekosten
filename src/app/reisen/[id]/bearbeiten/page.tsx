import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { istBearbeitbar } from "@/lib/reisekosten/reise";
import type { Mahlzeiten } from "@/lib/reisekosten/verpflegung";
import { alsLokal } from "@/lib/format";
import { ReiseFormular } from "../../reise-formular";

export default async function ReiseBearbeitenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: reise } = await supabase.from("reise").select("*").eq("id", id).maybeSingle();
  if (!reise) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (reise.mitarbeiter_id !== user?.id || !istBearbeitbar(reise.status)) redirect(`/reisen/${id}`);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 font-sans">
      <h1 className="text-xl font-semibold">Reise bearbeiten</h1>
      <ReiseFormular
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
          verpflegungBemerkung: reise.verpflegung_bemerkung ?? "",
        }}
      />
    </main>
  );
}
