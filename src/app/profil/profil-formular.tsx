"use client";

import { useActionState } from "react";
import { ohneZuruecksetzen } from "@/lib/formular";
import { useTexte } from "@/lib/i18n/client";
import { profilSpeichern, type ProfilStatus } from "./actions";

export type ProfilWerte = {
  personalnummer: string;
  wohnort: string;
  kostenstelle: string;
  kfzKennzeichen: string;
  kalenderVorschlaege: boolean;
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
  const alle = useTexte();
  const t = alle.rahmen.profil;
  const knopf = alle.allgemein.knopf;

  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <legend className="px-1 text-sm font-medium">{t.vertraulich}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Feld label={t.personalnummer} name="personalnummer" defaultValue={werte.personalnummer} />
          <Feld label={t.wohnort} name="wohnort" defaultValue={werte.wohnort} autoComplete="address-level2" />
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Feld label={t.kostenstelle} name="kostenstelle" defaultValue={werte.kostenstelle} hinweis={t.kostenstelleHinweis} />
        <Feld label={t.kfz} name="kfz_kennzeichen" defaultValue={werte.kfzKennzeichen} hinweis={t.kfzHinweis} />
      </div>

      <label id="kalender" className="flex items-start gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <input type="checkbox" name="kalender_vorschlaege" defaultChecked={werte.kalenderVorschlaege} className="mt-1 size-4" />
        <span>
          <span className="block text-sm font-medium">{t.kalender}</span>
          <span className="block text-sm text-neutral-500">
            {t.kalenderText}
          </span>
        </span>
      </label>

      {status.fehler && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{status.fehler}</p>
      )}
      {status.gespeichert && !status.fehler && (
        <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">{knopf.gespeichert}</p>
      )}

      <div>
        <button type="submit" disabled={laeuft} className="rounded-md bg-primaer hover:bg-primaer-hover px-4 py-2 font-medium text-white disabled:opacity-50 dark:text-neutral-950">
          {laeuft ? knopf.speichert : knopf.speichern}
        </button>
      </div>
    </form>
  );
}
