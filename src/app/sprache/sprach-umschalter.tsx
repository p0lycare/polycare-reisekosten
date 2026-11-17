"use client";

import { useTransition } from "react";
import { useSprache, useTexte } from "@/lib/i18n/client";
import { spracheWechseln } from "./actions";

/** Knopf DE/EN in der Kopfzeile: zeigt die andere Sprache, ein Klick stellt um */
export function SprachUmschalter({ className = "" }: { className?: string }) {
  const sprache = useSprache();
  const t = useTexte().rahmen.sprache;
  const [laeuft, starte] = useTransition();
  const ziel = sprache === "de" ? "en" : "de";

  return (
    <button
      type="button"
      disabled={laeuft}
      onClick={() => starte(() => spracheWechseln(ziel))}
      title={t.wechselnZu}
      aria-label={t.wechselnZu}
      lang={ziel}
      className={`rounded border border-neutral-300 px-1.5 py-0.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-100 ${className}`}
    >
      {ziel.toUpperCase()}
    </button>
  );
}

/** Auswahl im Profil, mit Hinweis, dass offizielle Unterlagen deutsch bleiben */
export function SprachAuswahl() {
  const sprache = useSprache();
  const t = useTexte().rahmen.sprache;
  const [laeuft, starte] = useTransition();

  return (
    <fieldset className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <legend className="px-1 text-sm font-medium">{t.bezeichnung}</legend>
      <div className="flex gap-4">
        {(["de", "en"] as const).map((s) => (
          <label key={s} className="flex items-center gap-2 text-sm" lang={s}>
            <input
              type="radio"
              name="sprache"
              value={s}
              checked={sprache === s}
              disabled={laeuft}
              onChange={() => starte(() => spracheWechseln(s))}
              className="size-4"
            />
            {t[s]}
          </label>
        ))}
      </div>
      <p className="text-sm text-neutral-500">{t.hinweis}</p>
    </fieldset>
  );
}
