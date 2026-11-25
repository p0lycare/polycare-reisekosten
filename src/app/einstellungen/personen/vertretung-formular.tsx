"use client";

import { useActionState, useState } from "react";
import { ohneZuruecksetzen } from "@/lib/formular";
import { formatDatum } from "@/lib/format";
import { useTexte } from "@/lib/i18n/client";
import { istAktiv, type Vertretung } from "@/lib/reisekosten/vertretung";
import { vertretungSpeichern, type VertretungStatus } from "./vertretung-actions";

const feld =
  "w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900";

type Zustand = "aktiv" | "geplant" | "abgelaufen";

function zustandVon(v: Pick<Vertretung, "von" | "bis" | "bis_auf_weiteres">, heute: string): Zustand {
  return istAktiv(v, heute) ? "aktiv" : v.von > heute ? "geplant" : "abgelaufen";
}

/**
 * Vertretung einer genehmigenden Person festlegen (Personen und Rollen) bzw. die eigene (Profil).
 * `heute` kommt vom Server, damit Server und Browser denselben Tag anzeigen.
 */
export function VertretungFormular({
  vertreteneId,
  vertretung,
  kandidaten,
  heute,
  aufgeklappt = false,
}: {
  vertreteneId: string;
  vertretung: Vertretung | null;
  kandidaten: { id: string; name: string }[];
  heute: string;
  aufgeklappt?: boolean;
}) {
  const [status, absenden, laeuft] = useActionState<VertretungStatus, FormData>(vertretungSpeichern, {});
  const [bisAufWeiteres, setBisAufWeiteres] = useState(vertretung?.bis_auf_weiteres ?? false);
  const alle = useTexte();
  const t = alle.einstellungen.vertretung;

  const name = vertretung ? (kandidaten.find((k) => k.id === vertretung.vertreter_id)?.name ?? "") : "";
  const zusammenfassung = vertretung
    ? t.zusammenfassung(
        name,
        t.zeitraum(formatDatum(vertretung.von), vertretung.bis ? formatDatum(vertretung.bis) : null),
        t.zustand[zustandVon(vertretung, heute)],
      )
    : t.zusammenfassungOhne;

  return (
    <details open={aufgeklappt} className="group pb-3 text-sm">
      <summary className="cursor-pointer text-neutral-600 marker:text-neutral-400 dark:text-neutral-400">{zusammenfassung}</summary>
      {/* key: nach dem Beenden oder Ändern zeigt das Formular den neuen Stand statt der alten Eingaben */}
      <form
        key={vertretung ? `${vertretung.vertreter_id}|${vertretung.von}|${vertretung.bis ?? ""}|${vertretung.bis_auf_weiteres}` : "ohne"}
        onSubmit={ohneZuruecksetzen(absenden)}
        className="mt-2 grid gap-2 sm:grid-cols-[1fr_9rem_9rem] sm:items-end">
        <input type="hidden" name="vertretene_id" value={vertreteneId} />
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">{t.vertretung}</span>
          <select name="vertreter_id" defaultValue={vertretung?.vertreter_id ?? ""} className={feld}>
            <option value="">{t.ohne}</option>
            {kandidaten
              .filter((k) => k.id !== vertreteneId)
              .map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">{t.von}</span>
          <input type="date" name="von" defaultValue={vertretung?.von ?? heute} className={feld} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">{t.bis}</span>
          <input type="date" name="bis" defaultValue={vertretung?.bis ?? ""} disabled={bisAufWeiteres} className={feld} />
        </label>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            name="bis_auf_weiteres"
            checked={bisAufWeiteres}
            onChange={(e) => setBisAufWeiteres(e.target.checked)}
            className="size-4"
          />
          <span>{t.bisAufWeiteres}</span>
        </label>
        <div className="flex items-center gap-3 sm:justify-end">
          <button
            type="submit"
            disabled={laeuft}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {laeuft ? "…" : alle.einstellungen.formular.speichern}
          </button>
          {vertretung && (
            <button
              type="submit"
              name="aktion"
              value="beenden"
              disabled={laeuft}
              onClick={(e) => {
                if (!window.confirm(t.beendenFrage(name))) e.preventDefault();
              }}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              {t.beenden}
            </button>
          )}
          {status.gespeichert && !status.fehler && (
            <span role="status" className="text-sm text-green-700 dark:text-green-400">
              {status.beendet ? t.beendet : alle.einstellungen.formular.gespeichert}
            </span>
          )}
        </div>
        {status.fehler && (
          <p role="alert" className="text-sm text-red-700 sm:col-span-3 dark:text-red-400">
            {status.fehler}
          </p>
        )}
      </form>
    </details>
  );
}
