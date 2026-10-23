import { BelegFormular } from "../beleg-formular";
import { ladeFuerBeleg } from "../laden";
import { kiVerfuegbar, type AusgelesenerBeleg } from "@/lib/ki/beleg-auslesen";
import { centAlsEingabe } from "@/lib/geld";

export default async function NeuerBelegPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ eingang?: string }>;
}) {
  const { id } = await params;
  const { eingang: eingangId } = await searchParams;
  const { supabase, user, reise, kategorien } = await ladeFuerBeleg(id);

  // Beleg aus dem Eingang von Hand erfassen: Foto und KI-Vorschlag übernehmen
  const { data: eingang } = eingangId
    ? await supabase.from("beleg_eingang").select("id, datei_pfad, ki_ergebnis").eq("id", eingangId).maybeSingle()
    : { data: null };
  const ergebnis = (eingang?.ki_ergebnis ?? null) as AusgelesenerBeleg | null;
  const erste = ergebnis?.positionen[0];
  const { data: signiert } = eingang ? await supabase.storage.from("belege").createSignedUrl(eingang.datei_pfad, 3600) : { data: null };
  const reiseVon = reise.beginn.slice(0, 10);
  const reiseBis = reise.ende.slice(0, 10);
  const datum = ergebnis?.datum && ergebnis.datum >= reiseVon && ergebnis.datum <= reiseBis ? ergebnis.datum : reiseVon;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 font-sans">
      <h1 className="text-xl font-semibold">Beleg hinzufügen</h1>
      <BelegFormular
        reiseId={reise.id}
        userId={user.id}
        kategorien={kategorien.filter((k) => k.aktiv)}
        reiseVon={reiseVon}
        reiseBis={reiseBis}
        kiAktiv={kiVerfuegbar()}
        eingangId={eingang?.id}
        kiStart={ergebnis ?? undefined}
        werte={{
          kategorieId: erste?.kategorieId ?? "",
          datum,
          beschreibung: erste?.beschreibung || ergebnis?.haendler || "",
          betrag: erste ? centAlsEingabe(erste.betragCent) : "",
          mwstProzent: erste ? String(erste.mwstProzent) : "",
          dateiPfad: eingang?.datei_pfad ?? "",
          dateiUrl: signiert?.signedUrl,
          bewirtungAnlass: "",
          bewirtungTeilnehmer: "",
        }}
      />
    </main>
  );
}
