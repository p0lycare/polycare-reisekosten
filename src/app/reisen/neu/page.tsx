import { createClient } from "@/lib/supabase/server";
import { ReiseFormular } from "../reise-formular";
import type { AusgelesenerBeleg } from "@/lib/ki/beleg-auslesen";
import { reiseVorschlagAusBeleg } from "@/lib/reisekosten/eingang";

export default async function NeueReisePage({ searchParams }: { searchParams: Promise<{ eingang?: string; vorlage?: string }> }) {
  const { eingang: eingangId, vorlage: vorlageId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = await supabase
    .from("profile")
    .select("kostenstelle, kfz_kennzeichen")
    .eq("id", user!.id)
    .single();
  // Aus einem Beleg im Eingang: Datum und Ort vorbelegen, der Beleg wird nach dem Speichern zugeordnet
  const { data: eingang } = eingangId
    ? await supabase.from("beleg_eingang").select("id, ki_ergebnis").eq("id", eingangId).maybeSingle()
    : { data: null };
  const ergebnis = (eingang?.ki_ergebnis ?? null) as AusgelesenerBeleg | null;
  const vorschlag = reiseVorschlagAusBeleg(ergebnis);
  const mitHotel = !!ergebnis?.positionen.some((p) => p.kategorieId === "uebernachtung");
  // Vorlage: wiederkehrende Reise kopieren – alles außer Datum, Mahlzeiten und Vorschuss
  const { data: vorlage } = vorlageId
    ? await supabase.from("reise").select("*").eq("id", vorlageId).eq("mitarbeiter_id", user!.id).maybeSingle()
    : { data: null };

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 font-sans">
      <h1 className="text-xl font-semibold">Neue Reise</h1>
      {vorlage && (
        <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-950 dark:bg-blue-950 dark:text-blue-50">
          Angaben aus „{vorlage.begruendung}“ übernommen – bitte Beginn und Ende eintragen.
        </p>
      )}
      {eingang && (
        <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-950 dark:bg-blue-950 dark:text-blue-50">
          Datum und Ort stammen aus dem Beleg{ergebnis?.haendler ? ` (${ergebnis.haendler})` : ""}. Bitte Zeiten und Reiseweg prüfen –
          der Beleg wird nach dem Speichern automatisch zugeordnet.
        </p>
      )}
      <ReiseFormular
        eingangId={eingang?.id}
        werte={{
          begruendung: vorlage?.begruendung ?? "",
          reiseweg: vorlage?.reiseweg ?? vorschlag?.reiseweg ?? "",
          besuchteStellen: vorlage?.besuchte_stellen ?? "",
          land: "DE",
          beginn: vorschlag?.beginn ?? "",
          ende: vorschlag?.ende ?? "",
          mitUebernachtung: vorlage ? vorlage.mit_uebernachtung : eingang ? mitHotel : true,
          mahlzeiten: {},
          verkehrsmittel: vorlage?.verkehrsmittel ?? [],
          kfzKennzeichen: vorlage?.kfz_kennzeichen ?? profil?.kfz_kennzeichen ?? "",
          mitfahrtBei: vorlage?.mitfahrt_bei ?? "",
          kostenstelle: vorlage?.kostenstelle ?? profil?.kostenstelle ?? "",
          verpflegungBemerkung: "",
          vorschuss: "",
        }}
      />
    </main>
  );
}
