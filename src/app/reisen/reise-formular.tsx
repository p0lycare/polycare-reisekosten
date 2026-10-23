"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { LAENDER } from "@/lib/reisekosten/laender";
import { berechneVerpflegung, type Mahlzeiten } from "@/lib/reisekosten/verpflegung";
import { formatDatum, formatEuro, wochentag } from "@/lib/format";
import { VERKEHRSMITTEL, VERKEHRSMITTEL_TEXT, type Verkehrsmittel } from "@/lib/reisekosten/reise";
import { ohneZuruecksetzen } from "@/lib/formular";
import { reiseSpeichern, type FormularStatus } from "./actions";

export type ReiseWerte = {
  id?: string;
  begruendung: string;
  reiseweg: string;
  besuchteStellen: string;
  land: string;
  beginn: string;
  ende: string;
  mitUebernachtung: boolean;
  mahlzeiten: Record<string, Mahlzeiten>;
  verkehrsmittel: Verkehrsmittel[];
  kfzKennzeichen: string;
  mitfahrtBei: string;
  kostenstelle: string;
  verpflegungBemerkung: string;
  vorschuss: string;
};

const LAND_NAMEN: Record<string, string> = { DE: "Deutschland" };

const MAHLZEITEN: { key: keyof Mahlzeiten; label: string }[] = [
  { key: "fruehstueck", label: "Frühstück" },
  { key: "mittag", label: "Mittag" },
  { key: "abend", label: "Abend" },
];

const feld =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900";

export function ReiseFormular({ werte }: { werte: ReiseWerte }) {
  const [status, absenden, laeuft] = useActionState<FormularStatus, FormData>(reiseSpeichern, {});
  const [land, setLand] = useState(werte.land);
  const [beginn, setBeginn] = useState(werte.beginn);
  const [ende, setEnde] = useState(werte.ende);
  const [mitUebernachtung, setMitUebernachtung] = useState(werte.mitUebernachtung);
  const [mahlzeiten, setMahlzeiten] = useState(werte.mahlzeiten);
  const [verkehrsmittel, setVerkehrsmittel] = useState(werte.verkehrsmittel);

  function verkehrsmittelUmschalten(v: Verkehrsmittel) {
    setVerkehrsmittel((alt) => (alt.includes(v) ? alt.filter((x) => x !== v) : [...alt, v]));
  }

  const berechnung = useMemo(() => {
    if (!beginn || !ende) return null;
    try {
      return { ergebnis: berechneVerpflegung({ beginn, ende, land, mitUebernachtung, mahlzeiten }) };
    } catch (e) {
      return { fehler: e instanceof Error ? e.message : "Ungültige Angaben" };
    }
  }, [beginn, ende, land, mitUebernachtung, mahlzeiten]);

  function mahlzeitUmschalten(datum: string, key: keyof Mahlzeiten) {
    setMahlzeiten((alt) => ({ ...alt, [datum]: { ...alt[datum], [key]: !alt[datum]?.[key] } }));
  }

  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-col gap-5">
      {werte.id && <input type="hidden" name="id" value={werte.id} />}
      <input type="hidden" name="mahlzeiten" value={JSON.stringify(mahlzeiten)} />

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Begründung</span>
        <input name="begruendung" required defaultValue={werte.begruendung} placeholder="z. B. Projektbesprechung, Messe" className={feld} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Besuchte Stellen</span>
        <input name="besuchte_stellen" defaultValue={werte.besuchteStellen} placeholder="Firma, Institution" className={feld} />
      </label>

      <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Reiseweg</span>
          <input name="reiseweg" required defaultValue={werte.reiseweg} placeholder="z. B. Köln – Essen – Köln" className={feld} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Land</span>
          <select name="land" value={land} onChange={(e) => setLand(e.target.value)} className={feld}>
            {Object.keys(LAENDER).map((code) => (
              <option key={code} value={code}>
                {LAND_NAMEN[code] ?? code}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Beginn</span>
          <input type="datetime-local" name="beginn" required value={beginn} onChange={(e) => setBeginn(e.target.value)} className={feld} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Ende</span>
          <input type="datetime-local" name="ende" required value={ende} min={beginn} onChange={(e) => setEnde(e.target.value)} className={feld} />
        </label>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Benutzte Verkehrsmittel</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {VERKEHRSMITTEL.map((v) => (
            <label key={v} className="flex items-center gap-2">
              <input type="checkbox" name="verkehrsmittel" value={v} checked={verkehrsmittel.includes(v)} onChange={() => verkehrsmittelUmschalten(v)} className="size-4" />
              <span>{VERKEHRSMITTEL_TEXT[v]}</span>
            </label>
          ))}
        </div>
        {verkehrsmittel.includes("eigener_pkw") && (
          <label className="flex flex-col gap-1 sm:w-64">
            <span className="text-sm font-medium">Kennzeichen eigener PKW</span>
            <input name="kfz_kennzeichen" required defaultValue={werte.kfzKennzeichen} placeholder="z. B. K-AB 123" className={`${feld} uppercase`} />
          </label>
        )}
        {verkehrsmittel.includes("mitfahrt") && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Mitfahrt von/bei</span>
            <input name="mitfahrt_bei" defaultValue={werte.mitfahrtBei} className={feld} />
          </label>
        )}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Kostenstelle</span>
          <input name="kostenstelle" defaultValue={werte.kostenstelle} className={feld} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Erhaltener Vorschuss (€)</span>
          <input name="vorschuss" inputMode="decimal" defaultValue={werte.vorschuss} placeholder="0,00" className={`${feld} tabular-nums`} />
        </label>
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="mit_uebernachtung" checked={mitUebernachtung} onChange={(e) => setMitUebernachtung(e.target.checked)} className="size-4" />
        <span>Mit auswärtiger Übernachtung</span>
      </label>

      <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-medium">Verpflegungspauschale</h2>
        {!berechnung && <p className="mt-2 text-sm text-neutral-500">Beginn und Ende eingeben.</p>}
        {berechnung?.fehler && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{berechnung.fehler}</p>}
        {berechnung?.ergebnis && (
          <>
            <p className="mt-1 text-sm text-neutral-500">Gestellte Mahlzeiten (z. B. Hotelfrühstück) ankreuzen – sie werden abgezogen.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-neutral-500">
                  <tr>
                    <th className="py-1 pr-3 font-normal">Tag</th>
                    {MAHLZEITEN.map((m) => (
                      <th key={m.key} className="px-2 py-1 text-center font-normal">{m.label}</th>
                    ))}
                    <th className="py-1 pl-3 text-right font-normal">Betrag</th>
                  </tr>
                </thead>
                <tbody>
                  {berechnung.ergebnis.tage.map((t) => (
                    <tr key={t.datum} className="border-t border-neutral-100 dark:border-neutral-800">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {wochentag(t.datum)} {formatDatum(t.datum)}
                      </td>
                      {MAHLZEITEN.map((m) => (
                        <td key={m.key} className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            aria-label={`${m.label} am ${formatDatum(t.datum)} gestellt`}
                            disabled={t.pauschale === 0}
                            checked={!!mahlzeiten[t.datum]?.[m.key]}
                            onChange={() => mahlzeitUmschalten(t.datum, m.key)}
                            className="size-4"
                          />
                        </td>
                      ))}
                      <td className="py-2 pl-3 text-right tabular-nums whitespace-nowrap">
                        {formatEuro(t.betrag)}
                        {t.kuerzung > 0 && <span className="block text-xs text-neutral-500">{formatEuro(t.pauschale)} − {formatEuro(t.kuerzung)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-neutral-300 font-medium dark:border-neutral-700">
                    <td className="py-2" colSpan={4}>Summe</td>
                    <td className="py-2 pl-3 text-right tabular-nums">{formatEuro(berechnung.ergebnis.summe)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
        <label className="mt-4 flex flex-col gap-1">
          <span className="text-sm font-medium">Bemerkung / Hinweis</span>
          <input name="verpflegung_bemerkung" defaultValue={werte.verpflegungBemerkung} className={feld} />
        </label>
      </section>

      {status.fehler && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{status.fehler}</p>
      )}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={laeuft || !!berechnung?.fehler} className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900">
          {laeuft ? "Speichert …" : "Speichern"}
        </button>
        <Link href={werte.id ? `/reisen/${werte.id}` : "/"} className="text-sm text-neutral-600 underline dark:text-neutral-400">
          Abbrechen
        </Link>
      </div>
    </form>
  );
}
