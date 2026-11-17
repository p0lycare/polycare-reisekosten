"use client";

import { useActionState } from "react";
import { ohneZuruecksetzen } from "@/lib/formular";
import { useTexte } from "@/lib/i18n/client";
import { personSpeichern, type PersonStatus } from "./actions";

/** Reihenfolge in der Auswahl */
const ROLLEN = ["mitarbeiter", "freigeber", "buchhaltung", "admin"] as const;

const feld =
  "w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export type Person = {
  id: string;
  name: string;
  email: string;
  rolle: (typeof ROLLEN)[number];
  vorgesetzter_id: string | null;
  erste_taetigkeitsstaette_id: string | null;
};

export function PersonZeile({
  person,
  fuehrungskraefte,
  standorte,
}: {
  person: Person;
  fuehrungskraefte: Person[];
  standorte: { id: string; name: string }[];
}) {
  const [status, absenden, laeuft] = useActionState<PersonStatus, FormData>(personSpeichern, {});
  const t = useTexte().einstellungen;

  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="grid gap-2 py-3 sm:grid-cols-[1fr_12rem_12rem_auto] sm:items-end">
      <input type="hidden" name="id" value={person.id} />
      <div className="min-w-0">
        <p className="truncate font-medium">{person.name}</p>
        <p className="truncate text-xs text-neutral-500">{person.email}</p>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">{t.personen.rolle}</span>
        <select name="rolle" defaultValue={person.rolle} className={feld}>
          {ROLLEN.map((wert) => (
            <option key={wert} value={wert}>
              {t.personen.rollen[wert]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">{t.personen.genehmigtDurch}</span>
        <select name="vorgesetzter_id" defaultValue={person.vorgesetzter_id ?? ""} className={feld}>
          <option value="">{t.personen.jedeFuehrungskraft}</option>
          {fuehrungskraefte
            .filter((f) => f.id !== person.id)
            .map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 sm:col-span-2 sm:col-start-2">
        <span className="text-xs text-neutral-500">{t.personen.ersteTaetigkeitsstaette}</span>
        <select name="erste_taetigkeitsstaette_id" defaultValue={person.erste_taetigkeitsstaette_id ?? ""} className={feld}>
          <option value="">{t.personen.keineTaetigkeitsstaette}</option>
          {standorte.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={laeuft} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
          {laeuft ? "…" : t.formular.speichern}
        </button>
        {status.gespeichert && !status.fehler && <span role="status" className="text-sm text-green-700 dark:text-green-400">{t.formular.gespeichert}</span>}
      </div>
      {status.fehler && <p role="alert" className="text-sm text-red-700 sm:col-span-4 dark:text-red-400">{status.fehler}</p>}
    </form>
  );
}
