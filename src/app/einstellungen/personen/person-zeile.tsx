"use client";

import { useActionState } from "react";
import { ohneZuruecksetzen } from "@/lib/formular";
import { personSpeichern, type PersonStatus } from "./actions";

const ROLLE_TEXT = {
  mitarbeiter: "Mitarbeiter/in",
  freigeber: "Führungskraft (genehmigt)",
  buchhaltung: "Buchhaltung (prüft, zahlt aus)",
  admin: "Admin",
} as const;

const feld =
  "w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export type Person = {
  id: string;
  name: string;
  email: string;
  rolle: keyof typeof ROLLE_TEXT;
  vorgesetzter_id: string | null;
};

export function PersonZeile({ person, fuehrungskraefte }: { person: Person; fuehrungskraefte: Person[] }) {
  const [status, absenden, laeuft] = useActionState<PersonStatus, FormData>(personSpeichern, {});

  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="grid gap-2 py-3 sm:grid-cols-[1fr_12rem_12rem_auto] sm:items-end">
      <input type="hidden" name="id" value={person.id} />
      <div className="min-w-0">
        <p className="truncate font-medium">{person.name}</p>
        <p className="truncate text-xs text-neutral-500">{person.email}</p>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">Rolle</span>
        <select name="rolle" defaultValue={person.rolle} className={feld}>
          {Object.entries(ROLLE_TEXT).map(([wert, text]) => (
            <option key={wert} value={wert}>
              {text}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">Genehmigt durch</span>
        <select name="vorgesetzter_id" defaultValue={person.vorgesetzter_id ?? ""} className={feld}>
          <option value="">jede Führungskraft</option>
          {fuehrungskraefte
            .filter((f) => f.id !== person.id)
            .map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
        </select>
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={laeuft} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
          {laeuft ? "…" : "Speichern"}
        </button>
        {status.gespeichert && !status.fehler && <span role="status" className="text-sm text-green-700 dark:text-green-400">Gespeichert</span>}
      </div>
      {status.fehler && <p role="alert" className="text-sm text-red-700 sm:col-span-4 dark:text-red-400">{status.fehler}</p>}
    </form>
  );
}
