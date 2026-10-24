"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ohneZuruecksetzen } from "@/lib/formular";
import { formatDatum, formatEuro } from "@/lib/format";
import { StatusBadge } from "@/app/reisen/status-badge";
import type { ReiseStatus } from "@/lib/reisekosten/reise";
import { monatEinreichen, type MonatStatus } from "../actions";

export type MonatsReise = {
  id: string;
  begruendung: string;
  reiseweg: string;
  beginn: string;
  ende: string;
  status: ReiseStatus;
  betrag: number;
  anzahlBelege: number;
  hinweise: string[];
};

function zeitraum(r: MonatsReise): string {
  const von = formatDatum(r.beginn);
  const bis = formatDatum(r.ende);
  return von === bis ? von : `${von} – ${bis}`;
}

/** Liste der Reisen eines Monats; Entwürfe sind auswählbar und werden gemeinsam eingereicht. */
export function MonatsListe({ monat, reisen }: { monat: string; reisen: MonatsReise[] }) {
  const [status, absenden, laeuft] = useActionState<MonatStatus, FormData>(monatEinreichen, {});
  const offen = reisen.filter((r) => r.status === "entwurf" || r.status === "abgelehnt");
  const [auswahl, setAuswahl] = useState<Set<string>>(() => new Set(offen.map((r) => r.id)));
  const summe = offen.filter((r) => auswahl.has(r.id)).reduce((s, r) => s + r.betrag, 0);

  function umschalten(id: string) {
    setAuswahl((alt) => {
      const neu = new Set(alt);
      if (neu.has(id)) neu.delete(id);
      else neu.add(id);
      return neu;
    });
  }

  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-col gap-4">
      <input type="hidden" name="monat" value={monat} />
      <ul className="flex flex-col gap-3">
        {reisen.map((r) => {
          const auswaehlbar = r.status === "entwurf" || r.status === "abgelehnt";
          return (
            <li key={r.id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="flex items-start gap-3">
                {auswaehlbar ? (
                  <input
                    type="checkbox"
                    name="ids"
                    value={r.id}
                    checked={auswahl.has(r.id)}
                    onChange={() => umschalten(r.id)}
                    aria-label={`${r.begruendung} einreichen`}
                    className="mt-1 size-4"
                  />
                ) : (
                  <span className="w-4" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/reisen/${r.id}`} className="min-w-0 hover:underline">
                      <p className="truncate font-medium">{r.begruendung}</p>
                      <p className="truncate text-sm text-neutral-500">
                        {zeitraum(r)} · {r.reiseweg} · {r.anzahlBelege} {r.anzahlBelege === 1 ? "Beleg" : "Belege"}
                      </p>
                    </Link>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="tabular-nums">{formatEuro(r.betrag)}</span>
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                  {auswaehlbar && r.hinweise.length > 0 && (
                    <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-amber-800 dark:text-amber-300">
                      {r.hinweise.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-2 flex gap-4 text-xs">
                    <Link href={`/reisen/neu?vorlage=${r.id}`} className="text-neutral-600 underline dark:text-neutral-400">
                      Als Vorlage für neue Reise
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {offen.length > 0 && (
        <section className="flex flex-col gap-3 rounded-lg border-2 border-neutral-900 p-4 dark:border-neutral-100">
          <h2 className="font-medium">Monat einreichen</h2>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="richtigkeit" required className="mt-0.5 size-4" />
            <span>
              Für die Richtigkeit: Ich bestätige, dass die Angaben der ausgewählten Reisen vollständig und richtig sind und die
              Kosten dienstlich veranlasst waren.
            </span>
          </label>
          {status.fehler && (
            <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
              {status.fehler}
            </p>
          )}
          <div>
            <button
              type="submit"
              disabled={laeuft || auswahl.size === 0}
              className="rounded-md bg-primaer hover:bg-primaer-hover px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:text-neutral-950"
            >
              {laeuft
                ? "Reicht ein …"
                : `${auswahl.size} ${auswahl.size === 1 ? "Reise" : "Reisen"} einreichen (${formatEuro(summe)})`}
            </button>
          </div>
        </section>
      )}
      {status.eingereicht && (
        <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          {status.eingereicht} {status.eingereicht === 1 ? "Reise" : "Reisen"} eingereicht
          {status.benachrichtigt ? " – die genehmigende Person wurde per Mail benachrichtigt." : "."}
        </p>
      )}
    </form>
  );
}
