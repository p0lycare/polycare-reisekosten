"use client";

import { useActionState } from "react";
import { ohneZuruecksetzen } from "@/lib/formular";
import { profilSpeichern, type ProfilStatus } from "./actions";

export type ProfilWerte = {
  personalnummer: string;
  wohnort: string;
  iban: string;
  kostenstelle: string;
  kfzKennzeichen: string;
};

const feld =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900";

function Feld({ label, hinweis, ...props }: { label: string; hinweis?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <input className={feld} {...props} />
      {hinweis && <span className="text-xs text-neutral-500">{hinweis}</span>}
    </label>
  );
}

export function ProfilFormular({ werte }: { werte: ProfilWerte }) {
  const [status, absenden, laeuft] = useActionState<ProfilStatus, FormData>(profilSpeichern, {});

  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <legend className="px-1 text-sm font-medium">Vertraulich – nur für dich und die Buchhaltung</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Feld label="Personalnummer" name="personalnummer" defaultValue={werte.personalnummer} />
          <Feld label="Wohnort" name="wohnort" defaultValue={werte.wohnort} autoComplete="address-level2" />
        </div>
        <Feld
          label="IBAN für die Erstattung"
          name="iban"
          defaultValue={werte.iban}
          placeholder="DE00 0000 0000 0000 0000 00"
          autoComplete="off"
          spellCheck={false}
        />
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Feld label="Kostenstelle" name="kostenstelle" defaultValue={werte.kostenstelle} hinweis="Wird bei neuen Reisen vorbelegt" />
        <Feld label="Kfz-Kennzeichen (eigener PKW)" name="kfz_kennzeichen" defaultValue={werte.kfzKennzeichen} hinweis="Wird bei Fahrten mit eigenem PKW vorbelegt" />
      </div>

      {status.fehler && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{status.fehler}</p>
      )}
      {status.gespeichert && !status.fehler && (
        <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">Gespeichert.</p>
      )}

      <div>
        <button type="submit" disabled={laeuft} className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900">
          {laeuft ? "Speichert …" : "Speichern"}
        </button>
      </div>
    </form>
  );
}
