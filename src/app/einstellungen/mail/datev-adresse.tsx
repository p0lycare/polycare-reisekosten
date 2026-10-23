"use client";

import { useActionState } from "react";
import { ohneZuruecksetzen } from "@/lib/formular";
import { datevAdresseSpeichern, type DatevAdresseStatus } from "./actions";

export function DatevAdresse({ adresse }: { adresse: string }) {
  const [status, absenden, laeuft] = useActionState<DatevAdresseStatus, FormData>(datevAdresseSpeichern, {});
  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-64 flex-1 flex-col gap-1">
        <span className="text-sm font-medium">DATEV-Upload-Mail-Adresse</span>
        <input
          name="datev_upload_mail"
          type="email"
          defaultValue={adresse}
          placeholder="aus DATEV Unternehmen online"
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>
      <button type="submit" disabled={laeuft} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
        {laeuft ? "…" : "Speichern"}
      </button>
      {status.gespeichert && <span role="status" className="text-sm text-green-700 dark:text-green-400">Gespeichert</span>}
      {status.fehler && <span role="alert" className="text-sm text-red-700 dark:text-red-400">{status.fehler}</span>}
    </form>
  );
}
