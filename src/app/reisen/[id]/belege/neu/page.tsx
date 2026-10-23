import { BelegFormular } from "../beleg-formular";
import { ladeFuerBeleg } from "../laden";
import { kiVerfuegbar } from "@/lib/ki/beleg-auslesen";

export default async function NeuerBelegPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, reise, kategorien } = await ladeFuerBeleg(id);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 font-sans">
      <h1 className="text-xl font-semibold">Beleg hinzufügen</h1>
      <BelegFormular
        reiseId={reise.id}
        userId={user.id}
        kategorien={kategorien.filter((k) => k.aktiv)}
        reiseVon={reise.beginn.slice(0, 10)}
        reiseBis={reise.ende.slice(0, 10)}
        kiAktiv={kiVerfuegbar()}
        werte={{
          kategorieId: "",
          datum: reise.beginn.slice(0, 10),
          beschreibung: "",
          betrag: "",
          mwstProzent: "",
          dateiPfad: "",
          bewirtungAnlass: "",
          bewirtungTeilnehmer: "",
        }}
      />
    </main>
  );
}
