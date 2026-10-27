import { Bereich } from "@/app/bereich";
import { BelegFormular } from "../beleg-formular";
import { ladeFuerBeleg } from "../laden";
import { kiVerfuegbar, type AusgelesenerBeleg } from "@/lib/ki/beleg-auslesen";
import { centAlsEingabe } from "@/lib/geld";
import { auslagenVorschlag } from "@/lib/reisekosten/eingang";
import { passendeKategorie } from "@/lib/reisekosten/kategorie";

export default async function NeuerBelegPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ eingang?: string }>;
}) {
  const { id } = await params;
  const { eingang: eingangId } = await searchParams;
  const { supabase, user, reise, kategorien, vorbelegt } = await ladeFuerBeleg(id);

  // Beleg aus dem Eingang von Hand erfassen: Foto und KI-Vorschlag übernehmen
  const { data: eingang } = eingangId
    ? await supabase.from("beleg_eingang").select("id, datei_pfad, ki_ergebnis").eq("id", eingangId).maybeSingle()
    : { data: null };
  const ergebnis = (eingang?.ki_ergebnis ?? null) as AusgelesenerBeleg | null;
  // Auslagen: ein Beleg mit Gesamtbetrag und einer Auslagen-Kategorie, sofern die KI eine erkannt hat
  const auslagen = reise.art === "auslagen";
  const gesamt = auslagen && ergebnis ? auslagenVorschlag(ergebnis) : null;
  const erste = ergebnis?.positionen[0];
  const kategorieId = erste ? passendeKategorie(erste, reise.art, kategorien) : null;
  const betragCent = gesamt?.betragCent ?? erste?.betragCent;
  const mwstProzent = gesamt?.mwstProzent ?? erste?.mwstProzent;
  const { data: signiert } = eingang ? await supabase.storage.from("belege").createSignedUrl(eingang.datei_pfad, 3600) : { data: null };
  // Auslagen dürfen auch nachgereichte Belege aus früheren Monaten enthalten (die Prüfung weist darauf hin)
  const reiseVon = reise.art === "auslagen" ? "" : reise.beginn.slice(0, 10);
  const reiseBis = reise.ende.slice(0, 10);
  const datum = ergebnis?.datum && ergebnis.datum >= reiseVon && ergebnis.datum <= reiseBis ? ergebnis.datum : reise.beginn.slice(0, 10);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 font-sans">
      {reise.art === "auslagen" && <Bereich reiter="/auslagen" />}
      <h1 className="text-xl font-semibold">{reise.art === "auslagen" ? "Auslage hinzufügen" : "Beleg hinzufügen"}</h1>
      <BelegFormular
        auslagen={auslagen}
        reiseId={reise.id}
        userId={user.id}
        kategorien={kategorien.filter((k) => k.aktiv)}
        reiseVon={reiseVon}
        reiseBis={reiseBis}
        kiAktiv={kiVerfuegbar()}
        eingangId={eingang?.id}
        kiStart={ergebnis ?? undefined}
        werte={{
          kategorieId: kategorieId ?? "",
          datum,
          beschreibung: auslagen ? "" : erste?.beschreibung || ergebnis?.haendler || "",
          betrag: betragCent != null ? centAlsEingabe(betragCent) : "",
          mwstProzent: mwstProzent != null ? String(mwstProzent) : "",
          dateiPfad: eingang?.datei_pfad ?? "",
          dateiUrl: signiert?.signedUrl,
          bewirtungAnlass: "",
          bewirtungTeilnehmer: "",
          lieferant: ergebnis?.haendler ?? "",
          kostenstelle: "",
          zahlungsart: "",
          anlass: vorbelegt.anlass ?? "",
          person: vorbelegt.person ?? "",
          kfzKennzeichen: vorbelegt.kfzKennzeichen ?? "",
        }}
      />
    </main>
  );
}
