import { createClient } from "@/lib/supabase/server";
import { ReiseFormular } from "../reise-formular";
import type { AusgelesenerBeleg } from "@/lib/ki/beleg-auslesen";
import { reiseVorschlagAusBeleg } from "@/lib/reisekosten/eingang";
import { ladeTermin } from "@/lib/kalender/graph";
import { reiseZeiten } from "@/lib/kalender/vorschlaege";

export default async function NeueReisePage({ searchParams }: { searchParams: Promise<{ eingang?: string; vorlage?: string; termin?: string }> }) {
  const { eingang: eingangId, vorlage: vorlageId, termin: terminId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = await supabase
    .from("profile")
    .select("email, kostenstelle, kfz_kennzeichen, kalender_vorschlaege")
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
  // Aus einem Outlook-Termin: Betreff, Ort und Zeiten vorbelegen (nur mit Zustimmung im Profil)
  const termin = terminId && profil?.kalender_vorschlaege ? await ladeTermin(profil.email, terminId) : null;
  const terminZeiten = termin ? reiseZeiten(termin) : null;
  const { data: privat } = termin
    ? await supabase.from("profil_privat").select("wohnort").eq("id", user!.id).maybeSingle()
    : { data: null };
  const terminReiseweg = termin?.ort ? (privat?.wohnort ? `${privat.wohnort} – ${termin.ort} – ${privat.wohnort}` : termin.ort) : "";

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 font-sans">
      <h1 className="text-xl font-semibold">Neue Reise</h1>
      {vorlage && (
        <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-950 dark:bg-blue-950 dark:text-blue-50">
          Angaben aus „{vorlage.begruendung}“ übernommen – bitte Beginn und Ende eintragen.
        </p>
      )}
      {termin && (
        <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-950 dark:bg-blue-950 dark:text-blue-50">
          Angaben aus deinem Kalendertermin übernommen. Bitte Reiseweg und Zeiten prüfen – An- und Abreise sind meist länger als der Termin.
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
          begruendung: vorlage?.begruendung ?? termin?.betreff ?? "",
          reiseweg: vorlage?.reiseweg ?? vorschlag?.reiseweg ?? terminReiseweg,
          besuchteStellen: vorlage?.besuchte_stellen ?? termin?.ort ?? "",
          land: "DE",
          beginn: vorschlag?.beginn ?? terminZeiten?.beginn ?? "",
          ende: vorschlag?.ende ?? terminZeiten?.ende ?? "",
          mitUebernachtung: vorlage
            ? vorlage.mit_uebernachtung
            : eingang
              ? mitHotel
              : terminZeiten
                ? terminZeiten.beginn.slice(0, 10) !== terminZeiten.ende.slice(0, 10)
                : true,
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
