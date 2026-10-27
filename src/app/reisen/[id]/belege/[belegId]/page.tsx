import { Bereich } from "@/app/bereich";
import { notFound } from "next/navigation";
import { centAlsEingabe } from "@/lib/geld";
import { BelegFormular } from "../beleg-formular";
import { BelegLoeschenButton } from "../beleg-loeschen-button";
import { ladeFuerBeleg } from "../laden";
import { kiVerfuegbar } from "@/lib/ki/beleg-auslesen";

export default async function BelegBearbeitenPage({ params }: { params: Promise<{ id: string; belegId: string }> }) {
  const { id, belegId } = await params;
  const { supabase, user, reise, kategorien } = await ladeFuerBeleg(id);

  const { data: beleg } = await supabase.from("beleg").select("*").eq("id", belegId).eq("reise_id", id).maybeSingle();
  if (!beleg) notFound();

  const { data: signiert } = beleg.datei_pfad
    ? await supabase.storage.from("belege").createSignedUrl(beleg.datei_pfad, 3600)
    : { data: null };

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 font-sans">
      {reise.art === "auslagen" && <Bereich reiter="/auslagen" />}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Beleg bearbeiten</h1>
        <BelegLoeschenButton id={beleg.id} reiseId={id} />
      </div>
      <BelegFormular
        auslagen={reise.art === "auslagen"}
        reiseId={reise.id}
        userId={user.id}
        // Deaktivierte Kategorie des bestehenden Belegs weiter anzeigen
        kategorien={kategorien.filter((k) => k.aktiv || k.id === beleg.kategorie_id)}
        reiseVon={reise.art === "auslagen" ? "" : reise.beginn.slice(0, 10)}
        reiseBis={reise.ende.slice(0, 10)}
        kiAktiv={kiVerfuegbar()}
        werte={{
          id: beleg.id,
          kategorieId: beleg.kategorie_id,
          datum: beleg.datum,
          beschreibung: beleg.beschreibung ?? "",
          betrag: centAlsEingabe(beleg.betrag_cent),
          mwstProzent: String(Number(beleg.mwst_prozent)),
          dateiPfad: beleg.datei_pfad ?? "",
          dateiUrl: signiert?.signedUrl,
          bewirtungAnlass: beleg.bewirtung_anlass ?? "",
          bewirtungTeilnehmer: beleg.bewirtung_teilnehmer ?? "",
          lieferant: beleg.lieferant ?? "",
          kostenstelle: beleg.kostenstelle ?? "",
          zahlungsart: beleg.zahlungsart ?? "",
        }}
      />
    </main>
  );
}
