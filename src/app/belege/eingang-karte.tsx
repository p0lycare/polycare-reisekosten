"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { formatDatum, formatEuro } from "@/lib/format";
import type { AusgelesenerBeleg } from "@/lib/ki/beleg-auslesen";
import { belegDatumFuerZuordnung, passendeReise, summeAusErgebnis, type ReiseKurz } from "@/lib/reisekosten/eingang";
import { eingangLoeschen, eingangNeuAuslesen, eingangZuordnen, type EingangStatus } from "./actions";

export type EingangEintrag = {
  id: string;
  bildUrl: string | null;
  istPdf: boolean;
  ergebnis: AusgelesenerBeleg | null;
  kiFehler: string | null;
};

const knopf = "rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50";

export function EingangKarte({
  eintrag,
  reisen,
  kategorieName,
}: {
  eintrag: EingangEintrag;
  reisen: ReiseKurz[];
  kategorieName: Record<string, string>;
}) {
  const e = eintrag.ergebnis;
  const vorschlag = passendeReise(belegDatumFuerZuordnung(e), reisen) ?? passendeReise(e?.datum, reisen);
  const [reiseId, setReiseId] = useState(vorschlag?.id ?? "");
  const [status, setStatus] = useState<EingangStatus>({});
  const [laeuft, starten] = useTransition();
  const summe = summeAusErgebnis(e);
  const mitBewirtung = e?.positionen.some((p) => p.kategorieId.startsWith("bewirtung"));

  function ausfuehren(aktion: () => Promise<EingangStatus>) {
    starten(async () => setStatus(await aktion()));
  }

  return (
    <li className="flex gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <a
        href={eintrag.bildUrl ?? undefined}
        target="_blank"
        rel="noreferrer"
        className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded bg-neutral-100 text-xs text-neutral-500 dark:bg-neutral-800"
      >
        {eintrag.bildUrl && !eintrag.istPdf ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={eintrag.bildUrl} alt="Beleg" className="h-full w-full object-cover" />
        ) : (
          "PDF"
        )}
      </a>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {e?.istBeleg ? (
          <div>
            <p className="font-medium">
              {e.haendler ?? "Beleg"}
              {e.ort && <span className="font-normal text-neutral-500"> · {e.ort}</span>}
            </p>
            <p className="text-sm text-neutral-600 tabular-nums dark:text-neutral-400">
              {e.datum ? formatDatum(e.datum) : "Datum unklar"}
              {summe != null && ` · ${formatEuro(summe)}`}
              {e.waehrung !== "EUR" && ` (${e.waehrung})`}
            </p>
            <p className="text-xs text-neutral-500">
              {e.positionen.map((p) => `${kategorieName[p.kategorieId] ?? p.kategorieId} ${formatEuro(p.betragCent)}`).join(" · ")}
            </p>
            {e.hinweis && <p className="text-xs text-amber-700 dark:text-amber-400">{e.hinweis}</p>}
          </div>
        ) : (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {eintrag.kiFehler ?? (e && !e.istBeleg ? "Das sieht nicht nach einem Beleg aus." : "Noch nicht ausgelesen.")}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={reiseId}
            onChange={(ev) => setReiseId(ev.target.value)}
            aria-label="Reise"
            className="max-w-full min-w-0 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Reise wählen …</option>
            {reisen.map((r) => (
              <option key={r.id} value={r.id}>
                {formatDatum(r.beginn)} {r.begruendung}
                {r.id === vorschlag?.id ? " (passt zum Datum)" : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!reiseId || laeuft || !e?.istBeleg || mitBewirtung}
            onClick={() => ausfuehren(() => eingangZuordnen(eintrag.id, reiseId))}
            className={`${knopf} bg-primaer hover:bg-primaer-hover text-white dark:text-neutral-950`}
          >
            {laeuft ? "…" : "Zuordnen"}
          </button>
          {reiseId && (
            <Link href={`/reisen/${reiseId}/belege/neu?eingang=${eintrag.id}`} className={`${knopf} border border-neutral-300 dark:border-neutral-700`}>
              Von Hand erfassen
            </Link>
          )}
          <Link href={`/reisen/neu?eingang=${eintrag.id}`} className={`${knopf} border border-neutral-300 dark:border-neutral-700`}>
            Neue Reise daraus
          </Link>
        </div>

        <div className="flex gap-4 text-xs">
          {(eintrag.kiFehler || !e) && (
            <button type="button" disabled={laeuft} onClick={() => ausfuehren(() => eingangNeuAuslesen(eintrag.id))} className="underline">
              Erneut auslesen
            </button>
          )}
          <button
            type="button"
            disabled={laeuft}
            onClick={() => {
              if (confirm("Diesen Beleg aus dem Eingang löschen?")) ausfuehren(() => eingangLoeschen(eintrag.id));
            }}
            className="text-red-700 underline dark:text-red-400"
          >
            Löschen
          </button>
        </div>
        {mitBewirtung && <p className="text-xs text-neutral-500">Bewirtung: bitte von Hand mit Anlass und Teilnehmenden erfassen.</p>}
        {status.fehler && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{status.fehler}</p>}
      </div>
    </li>
  );
}
