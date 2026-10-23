import { ReiseFormular } from "../reise-formular";

export default function NeueReisePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 font-sans">
      <h1 className="text-xl font-semibold">Neue Reise</h1>
      <ReiseFormular
        werte={{ anlass: "", ziel: "", land: "DE", beginn: "", ende: "", mitUebernachtung: true, mahlzeiten: {} }}
      />
    </main>
  );
}
