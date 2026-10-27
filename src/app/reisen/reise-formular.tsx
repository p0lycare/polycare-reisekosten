"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, useTransition } from "react";
import { istAusland, laenderAuswahl } from "@/lib/reisekosten/laender";
import { berechneVerpflegung, type Mahlzeiten } from "@/lib/reisekosten/verpflegung";
import { formatDatum, formatEuro, wochentag } from "@/lib/format";
import { VERKEHRSMITTEL, VERKEHRSMITTEL_TEXT, type Verkehrsmittel } from "@/lib/reisekosten/reise";
import { ohneZuruecksetzen } from "@/lib/formular";
import { reiseSpeichern, type FormularStatus } from "./actions";
import { kmBerechnen } from "./[id]/fahrten/actions";
import { KarteKnopf } from "./[id]/fahrten/route-karte";

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
  projektId: string;
  verpflegungBemerkung: string;
  /** Bereits ausgezahlter Vorschuss, nur zur Anzeige (z. B. "250,00"), sonst leer */
  vorschuss: string;
};

const AUSWAHL = laenderAuswahl();

const MAHLZEITEN: { key: "fruehstueck" | "mittag" | "abend"; label: string }[] = [
  { key: "fruehstueck", label: "Frühstück" },
  { key: "mittag", label: "Mittag" },
  { key: "abend", label: "Abend" },
];

const feld =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900";

export function ReiseFormular({
  werte,
  eingangId,
  projekte = [],
}: {
  werte: ReiseWerte;
  eingangId?: string;
  /** Auswählbare Projekte (aktive und ggf. das bereits zugeordnete) */
  projekte?: { id: string; name: string }[];
}) {
  const [status, absenden, laeuft] = useActionState<FormularStatus, FormData>(reiseSpeichern, {});
  const [land, setLand] = useState(werte.land);
  const [beginn, setBeginn] = useState(werte.beginn);
  const [ende, setEnde] = useState(werte.ende);
  // Bei neuen Reisen ohne Vorbelegung folgt "Übernachtung" den Daten (mehrtägig = ja), bis man es selbst anklickt
  const [uebernachtungGewaehlt, setUebernachtungGewaehlt] = useState<boolean | null>(
    werte.id || werte.beginn ? werte.mitUebernachtung : null,
  );
  const mitUebernachtung = uebernachtungGewaehlt ?? (!!beginn && !!ende && beginn.slice(0, 10) !== ende.slice(0, 10));
  const [mahlzeiten, setMahlzeiten] = useState(werte.mahlzeiten);
  const [verkehrsmittel, setVerkehrsmittel] = useState(werte.verkehrsmittel);
  const [reiseweg, setReiseweg] = useState(werte.reiseweg);

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

  function mahlzeitUmschalten(datum: string, key: "fruehstueck" | "mittag" | "abend") {
    setMahlzeiten((alt) => ({ ...alt, [datum]: { ...alt[datum], [key]: !alt[datum]?.[key] } }));
  }

  // Reisen durch mehrere Staaten: je Tag abweichendes Land (leer = Reiseland)
  function tagLandSetzen(datum: string, code: string) {
    setMahlzeiten((alt) => {
      const tagDaten = { ...alt[datum] };
      if (code && code !== land) tagDaten.land = code;
      else delete tagDaten.land;
      return { ...alt, [datum]: tagDaten };
    });
  }
  const tageslaender = istAusland(land) || Object.values(mahlzeiten).some((m) => m.land);

  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-col gap-5">
      {werte.id && <input type="hidden" name="id" value={werte.id} />}
      {eingangId && <input type="hidden" name="eingang_id" value={eingangId} />}
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
          <input name="reiseweg" required value={reiseweg} onChange={(e) => setReiseweg(e.target.value)} placeholder="z. B. Köln – Essen – Köln" className={feld} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Land</span>
          <select name="land" value={land} onChange={(e) => setLand(e.target.value)} className={feld}>
            {AUSWAHL.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
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
        {verkehrsmittel.includes("eigener_pkw") && !werte.id && <PkwKm reiseweg={reiseweg} />}
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
        {/* Vorschüsse laufen über den Antrag in der Reise und werden automatisch abgezogen */}
        {werte.vorschuss && (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Vorschuss</span>
            <span className="py-2 text-sm text-neutral-600 dark:text-neutral-400">{werte.vorschuss} € – wird bei der Abrechnung abgezogen</span>
          </div>
        )}
        {!!projekte.length && (
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-sm font-medium">Projekt / Förderprojekt (optional)</span>
            <select name="projekt_id" defaultValue={werte.projektId} className={feld}>
              <option value="">– kein Projekt –</option>
              {projekte.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="mit_uebernachtung" checked={mitUebernachtung} onChange={(e) => setUebernachtungGewaehlt(e.target.checked)} className="size-4" />
        <span>Mit auswärtiger Übernachtung</span>
      </label>

      <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-medium">Verpflegungspauschale</h2>
        {!berechnung && <p className="mt-2 text-sm text-neutral-500">Beginn und Ende eingeben.</p>}
        {berechnung?.fehler && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{berechnung.fehler}</p>}
        {berechnung?.ergebnis && (
          <>
            <p className="mt-1 text-sm text-neutral-500">Gestellte Mahlzeiten (z. B. Hotelfrühstück) ankreuzen – sie werden abgezogen.</p>
            {tageslaender && (
              <p className="mt-1 text-sm text-neutral-500">
                Mehrere Staaten? Je Tag das Land wählen, das vor 24 Uhr Ortszeit erreicht wurde; am Rückreisetag gilt der letzte
                Tätigkeitsort im Ausland.
              </p>
            )}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-neutral-500">
                  <tr>
                    <th className="py-1 pr-3 font-normal">Tag</th>
                    {tageslaender && <th className="py-1 pr-3 font-normal">Land vor 24 Uhr</th>}
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
                      {tageslaender && (
                        <td className="py-2 pr-3">
                          <select
                            aria-label={`Land am ${formatDatum(t.datum)}`}
                            value={mahlzeiten[t.datum]?.land ?? land}
                            onChange={(e) => tagLandSetzen(t.datum, e.target.value)}
                            className="max-w-44 rounded-md border border-neutral-300 bg-white px-1.5 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                          >
                            {AUSWAHL.map((l) => (
                              <option key={l.code} value={l.code}>
                                {l.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
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
                    <td className="py-2" colSpan={tageslaender ? 5 : 4}>Summe</td>
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
        <button type="submit" disabled={laeuft || !!berechnung?.fehler} className="rounded-md bg-primaer hover:bg-primaer-hover px-4 py-2 font-medium text-white disabled:opacity-50 dark:text-neutral-950">
          {laeuft ? "Speichert …" : "Speichern"}
        </button>
        <Link href={werte.id ? `/reisen/${werte.id}` : "/"} className="text-sm text-neutral-600 underline dark:text-neutral-400">
          Abbrechen
        </Link>
      </div>
    </form>
  );
}

/** Gefahrene km gleich beim Anlegen: aus dem Reiseweg berechnen lassen oder selbst eintragen */
function PkwKm({ reiseweg }: { reiseweg: string }) {
  const [km, setKm] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [rechnet, rechnen] = useTransition();

  function berechnen() {
    setInfo(null);
    rechnen(async () => {
      const ergebnis = await kmBerechnen(reiseweg);
      if ("fehler" in ergebnis) return setInfo(ergebnis.fehler);
      setKm(ergebnis.km.toLocaleString("de-DE", { maximumFractionDigits: 1 }));
      setInfo(`Route über ${ergebnis.orte.join(" → ")}`);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">Gefahrene km (Hin- und Rückweg)</span>
      <div className="flex flex-wrap gap-2">
        <input
          name="pkw_km"
          inputMode="decimal"
          value={km}
          onChange={(e) => setKm(e.target.value)}
          placeholder="z. B. 494,2"
          className={`${feld} max-w-40 text-right tabular-nums`}
        />
        <button
          type="button"
          onClick={berechnen}
          disabled={rechnet || !reiseweg.trim()}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {rechnet ? "…" : "km aus Reiseweg berechnen"}
        </button>
      </div>
      <span className="text-xs text-neutral-500">
        {info ?? "Tatsächlich gefahrene km zählen. Die Fahrt wird beim Speichern angelegt; weitere Fahrten fügst du in der Reise hinzu."}
      </span>
      {reiseweg.trim() && <KarteKnopf key={reiseweg} strecke={reiseweg} />}
    </div>
  );
}
