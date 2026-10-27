"use client";

import { useActionState } from "react";
import { auslageErfassen, type AuslagenStatus } from "./actions";

/** Monat wählen und direkt eine Auslage erfassen (ohne Umweg über den Belegeingang) */
export function AuslageErfassen({ monate }: { monate: { wert: string; text: string }[] }) {
  const [status, absenden, laeuft] = useActionState<AuslagenStatus, FormData>(auslageErfassen, {});

  return (
    <form action={absenden} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          name="monat"
          aria-label="Monat"
          defaultValue={monate[0]?.wert}
          className="rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          {monate.map((m) => (
            <option key={m.wert} value={m.wert}>
              {m.text}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={laeuft}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
        >
          {laeuft ? "…" : "Auslage erfassen"}
        </button>
      </div>
      {status.fehler && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {status.fehler}
        </p>
      )}
    </form>
  );
}
