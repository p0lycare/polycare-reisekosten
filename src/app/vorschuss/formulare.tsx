"use client";

import { useActionState, useState } from "react";
import { ohneZuruecksetzen } from "@/lib/formular";
import { formatDatum, formatEuro } from "@/lib/format";
import { vorschussBeantragen, vorschussEntscheiden, vorschussZurueckziehen, type VorschussStatus } from "./actions";

const feld = "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";
const knopf =
  "rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800";
const hauptknopf = "rounded-md bg-primaer px-3 py-1.5 text-sm font-medium text-white hover:bg-primaer-hover disabled:opacity-50 dark:text-neutral-950";

function Meldung({ status }: { status: VorschussStatus }) {
  if (status.fehler) return <p role="alert" className="text-sm text-red-700 dark:text-red-400">{status.fehler}</p>;
  if (status.erledigt) return <p role="status" className="text-sm text-green-700 dark:text-green-400">{status.erledigt}</p>;
  return null;
}

/** Antrag in der eigenen Reise (nur im Entwurf) */
export function VorschussBeantragen({ reiseId }: { reiseId: string }) {
  const [offen, setOffen] = useState(false);
  const [status, absenden, laeuft] = useActionState(vorschussBeantragen, {});

  if (!offen) {
    return (
      <button type="button" onClick={() => setOffen(true)} className={knopf}>
        Vorschuss beantragen …
      </button>
    );
  }
  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-col gap-3">
      <input type="hidden" name="reise_id" value={reiseId} />
      <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">Betrag (€)</span>
          <input name="betrag" required inputMode="decimal" placeholder="300,00" className={`${feld} tabular-nums`} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">Wofür? (optional)</span>
          <input name="grund" maxLength={300} placeholder="z. B. Hotel und Verpflegung Messe" className={feld} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={laeuft} className={hauptknopf}>
          {laeuft ? "…" : "Beantragen"}
        </button>
        <button type="button" onClick={() => setOffen(false)} className="text-sm underline">
          Abbrechen
        </button>
        <Meldung status={status} />
      </div>
    </form>
  );
}

export function VorschussZurueckziehen({ id, reiseId }: { id: string; reiseId: string }) {
  const [status, absenden, laeuft] = useActionState(vorschussZurueckziehen, {});
  return (
    <form action={absenden} className="flex items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="reise_id" value={reiseId} />
      <button type="submit" disabled={laeuft} className="text-sm underline">
        Antrag zurückziehen
      </button>
      <Meldung status={status} />
    </form>
  );
}

export type OffenerVorschuss = {
  id: string;
  reiseId: string;
  name: string;
  reise: string;
  beginn: string;
  betrag: number;
  grund: string | null;
};

/** Ein offener Vorschuss in den Freigaben: genehmigen bzw. auszahlen, oder mit Grund ablehnen */
export function VorschussEntscheiden({ v, art }: { v: OffenerVorschuss; art: "genehmigen" | "auszahlen" }) {
  const [status, absenden, laeuft] = useActionState(vorschussEntscheiden, {});
  const [ablehnen, setAblehnen] = useState(false);

  if (status.erledigt) {
    return (
      <li className="px-4 py-3 text-sm text-green-700 dark:text-green-400">
        {v.name}, {formatEuro(v.betrag)}: {status.erledigt}
      </li>
    );
  }
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="min-w-0">
          <span className="font-medium">{v.name}</span>{" "}
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {v.reise} · ab {formatDatum(v.beginn)}
          </span>
          {v.grund && <span className="block text-sm text-neutral-500">{v.grund}</span>}
        </span>
        <span className="font-semibold tabular-nums">{formatEuro(v.betrag)}</span>
      </div>
      <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={v.id} />
        <input type="hidden" name="reise_id" value={v.reiseId} />
        {ablehnen ? (
          <>
            <input type="hidden" name="aktion" value="ablehnen" />
            <input name="grund" required maxLength={300} placeholder="Grund der Ablehnung" className={`${feld} min-w-48 flex-1`} />
            <button type="submit" disabled={laeuft} className={knopf}>
              {laeuft ? "…" : "Ablehnen"}
            </button>
            <button type="button" onClick={() => setAblehnen(false)} className="text-sm underline">
              Abbrechen
            </button>
          </>
        ) : (
          <>
            <input type="hidden" name="aktion" value={art} />
            <button type="submit" disabled={laeuft} className={hauptknopf}>
              {laeuft ? "…" : art === "genehmigen" ? "Genehmigen" : "In DATEV überwiesen – als ausgezahlt markieren"}
            </button>
            <button type="button" onClick={() => setAblehnen(true)} className="text-sm underline">
              Ablehnen …
            </button>
          </>
        )}
        <Meldung status={status} />
      </form>
    </li>
  );
}
