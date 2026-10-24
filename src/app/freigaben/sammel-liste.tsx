"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ohneZuruecksetzen } from "@/lib/formular";
import { formatDatum, formatEuro } from "@/lib/format";
import { sammelAuszahlen, sammelGenehmigen, sammelPruefen, type SammelStatus } from "./actions";

export type SammelReise = {
  id: string;
  begruendung: string;
  reiseweg: string;
  beginn: string;
  ende: string;
  betrag: number;
  belegNr: string | null;
  hinweise: number;
};

export type PersonGruppe = {
  personId: string;
  name: string;
  iban: string | null;
  reisen: SammelReise[];
};

type Art = "genehmigen" | "pruefen" | "auszahlen";

const AKTION = { genehmigen: sammelGenehmigen, pruefen: sammelPruefen, auszahlen: sammelAuszahlen };
const KNOPF: Record<Art, string> = { genehmigen: "genehmigen", pruefen: "prüfen und an DATEV", auszahlen: "als ausgezahlt markieren" };

function zeitraum(r: SammelReise): string {
  const von = formatDatum(r.beginn);
  const bis = formatDatum(r.ende);
  return von === bis ? von : `${von} – ${bis}`;
}

/** Eine Person mit ihren Reisen; alle vorausgewählt, gemeinsam bearbeitbar. Einzelne Reisen per Link öffnen. */
function Gruppe({ gruppe, art }: { gruppe: PersonGruppe; art: Art }) {
  const [status, absenden, laeuft] = useActionState<SammelStatus, FormData>(AKTION[art], {});
  const [auswahl, setAuswahl] = useState<Set<string>>(() => new Set(gruppe.reisen.map((r) => r.id)));
  const summe = gruppe.reisen.filter((r) => auswahl.has(r.id)).reduce((s, r) => s + r.betrag, 0);

  if (status.erledigt) {
    return (
      <li className="rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
        <p role="status" className="text-green-700 dark:text-green-400">
          {gruppe.name}: {status.erledigt} {status.erledigt === 1 ? "Reise" : "Reisen"} erledigt.
        </p>
        {status.hinweis && <p className="mt-1 text-amber-700 dark:text-amber-400">{status.hinweis}</p>}
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-neutral-200 dark:border-neutral-800">
      <form onSubmit={ohneZuruecksetzen(absenden)}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-200 p-4 dark:border-neutral-800">
          <div>
            <p className="font-medium">{gruppe.name}</p>
            {art === "auszahlen" && (
              <p className="font-mono text-sm text-neutral-600 dark:text-neutral-400">{gruppe.iban ?? "IBAN fehlt im Profil"}</p>
            )}
          </div>
          <p className="tabular-nums">{formatEuro(summe)}</p>
        </div>
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {gruppe.reisen.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                name="ids"
                value={r.id}
                checked={auswahl.has(r.id)}
                onChange={() =>
                  setAuswahl((alt) => {
                    const neu = new Set(alt);
                    if (neu.has(r.id)) neu.delete(r.id);
                    else neu.add(r.id);
                    return neu;
                  })
                }
                aria-label={r.begruendung}
                className="size-4"
              />
              <Link href={`/reisen/${r.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-3 hover:underline">
                <span className="min-w-0">
                  <span className="block truncate">{r.begruendung}</span>
                  <span className="block truncate text-xs text-neutral-500">
                    {zeitraum(r)} · {r.reiseweg}
                    {r.belegNr && ` · ${r.belegNr}`}
                    {r.hinweise > 0 && <span className="text-amber-700 dark:text-amber-400"> · {r.hinweise} Hinweis{r.hinweise > 1 ? "e" : ""}</span>}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">{formatEuro(r.betrag)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-3 border-t border-neutral-200 p-4 dark:border-neutral-800">
          {art === "genehmigen" && (
            <input
              name="kommentar"
              maxLength={500}
              placeholder="Kommentar für die Buchhaltung (optional)"
              className="min-w-48 flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          )}
          {art === "pruefen" && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-neutral-500">Buchungsmonat</span>
              <input
                type="month"
                name="buchungsmonat"
                required
                defaultValue={new Date().toISOString().slice(0, 7)}
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
          )}
          <button
            type="submit"
            disabled={laeuft || !auswahl.size}
            className="rounded-md bg-primaer hover:bg-primaer-hover px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:text-neutral-950"
          >
            {laeuft ? "…" : `${auswahl.size} ${auswahl.size === 1 ? "Reise" : "Reisen"} ${KNOPF[art]}`}
          </button>
        </div>
        {status.fehler && (
          <p role="alert" className="px-4 pb-4 text-sm text-red-700 dark:text-red-400">
            {status.fehler}
          </p>
        )}
      </form>
    </li>
  );
}

export function SammelListe({ gruppen, art, leer }: { gruppen: PersonGruppe[]; art: Art; leer: string }) {
  if (!gruppen.length) return <p className="text-sm text-neutral-500">{leer}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {gruppen.map((g) => (
        <Gruppe key={g.personId} gruppe={g} art={art} />
      ))}
    </ul>
  );
}
