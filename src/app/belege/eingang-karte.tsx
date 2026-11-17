"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { formatDatum, formatEuro } from "@/lib/format";
import { useTexte } from "@/lib/i18n/client";
import type { AusgelesenerBeleg } from "@/lib/ki/beleg-auslesen";
import { belegDatumFuerZuordnung, passendeReise, summeAusErgebnis, type ReiseKurz } from "@/lib/reisekosten/eingang";
import { eingangAlsAuslage, eingangLoeschen, eingangNeuAuslesen, eingangZuordnen, type EingangStatus } from "./actions";

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
  auslagenKategorien,
}: {
  eintrag: EingangEintrag;
  reisen: ReiseKurz[];
  kategorieName: Record<string, string>;
  /** Kategorien aus Abschnitt G – erkennt die KI nur solche, ist „Als Auslage erfassen“ der naheliegende Weg */
  auslagenKategorien: string[];
}) {
  const alle = useTexte();
  const t = alle.belege.karte;
  const e = eintrag.ergebnis;
  const istAuslage = !!e?.positionen.length && e.positionen.every((p) => auslagenKategorien.includes(p.kategorieId));
  const vorschlag = istAuslage ? null : (passendeReise(belegDatumFuerZuordnung(e), reisen) ?? passendeReise(e?.datum, reisen));
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
          <img src={eintrag.bildUrl} alt={t.bildAlt} className="h-full w-full object-cover" />
        ) : (
          t.pdf
        )}
      </a>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {e?.istBeleg ? (
          <div>
            <p className="font-medium">
              {e.haendler ?? t.beleg}
              {e.ort && <span className="font-normal text-neutral-500"> · {e.ort}</span>}
            </p>
            <p className="text-sm text-neutral-600 tabular-nums dark:text-neutral-400">
              {e.datum ? formatDatum(e.datum) : t.datumUnklar}
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
            {eintrag.kiFehler ?? (e && !e.istBeleg ? t.keinBeleg : t.nichtAusgelesen)}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={reiseId}
            onChange={(ev) => setReiseId(ev.target.value)}
            aria-label={t.reise}
            className="max-w-full min-w-0 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">{t.reiseWaehlen}</option>
            {reisen.map((r) => (
              <option key={r.id} value={r.id}>
                {formatDatum(r.beginn)} {r.begruendung}
                {r.id === vorschlag?.id ? t.passtZumDatum : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!reiseId || laeuft || !e?.istBeleg || mitBewirtung}
            onClick={() => ausfuehren(() => eingangZuordnen(eintrag.id, reiseId))}
            className={`${knopf} bg-primaer hover:bg-primaer-hover text-white dark:text-neutral-950`}
          >
            {laeuft ? "…" : t.zuordnen}
          </button>
          {reiseId && (
            <Link href={`/reisen/${reiseId}/belege/neu?eingang=${eintrag.id}`} className={`${knopf} border border-neutral-300 dark:border-neutral-700`}>
              {t.vonHand}
            </Link>
          )}
          <Link href={`/reisen/neu?eingang=${eintrag.id}`} className={`${knopf} border border-neutral-300 dark:border-neutral-700`}>
            {t.neueReise}
          </Link>
          <button
            type="button"
            disabled={laeuft}
            onClick={() => ausfuehren(() => eingangAlsAuslage(eintrag.id))}
            className={`${knopf} ${istAuslage ? "bg-primaer hover:bg-primaer-hover text-white dark:text-neutral-950" : "border border-neutral-300 dark:border-neutral-700"}`}
          >
            {t.alsAuslage}
          </button>
        </div>

        <div className="flex gap-4 text-xs">
          {(eintrag.kiFehler || !e) && (
            <button type="button" disabled={laeuft} onClick={() => ausfuehren(() => eingangNeuAuslesen(eintrag.id))} className="underline">
              {t.erneutAuslesen}
            </button>
          )}
          <button
            type="button"
            disabled={laeuft}
            onClick={() => {
              if (confirm(t.loeschenFrage)) ausfuehren(() => eingangLoeschen(eintrag.id));
            }}
            className="text-red-700 underline dark:text-red-400"
          >
            {alle.allgemein.knopf.loeschen}
          </button>
        </div>
        {mitBewirtung && <p className="text-xs text-neutral-500">{t.bewirtung}</p>}
        {status.fehler && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{status.fehler}</p>}
      </div>
    </li>
  );
}
