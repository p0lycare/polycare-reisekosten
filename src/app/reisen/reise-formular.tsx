"use client";

import { uebersetzeMeldung } from "@/lib/i18n/meldungen";
import Link from "next/link";
import { useActionState, useMemo, useState, useTransition } from "react";
import { istAusland, laenderAuswahl } from "@/lib/reisekosten/laender";
import { berechneVerpflegung, type Mahlzeiten } from "@/lib/reisekosten/verpflegung";
import { formatDatum, formatEuro } from "@/lib/format";
import { VERKEHRSMITTEL, type Verkehrsmittel } from "@/lib/reisekosten/reise";
import { ohneZuruecksetzen } from "@/lib/formular";
import { useSprache, useTexte } from "@/lib/i18n/client";
import { landNameIn } from "@/lib/i18n/land";
import { wochentagName } from "@/lib/i18n/woerterbuch";
import type { Sprache } from "@/lib/i18n/sprache";
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

/** Länderliste in der Sprache der Oberfläche: Deutschland zuerst, dann nach angezeigtem Namen sortiert */
function auswahlIn(sprache: Sprache): { code: string; name: string }[] {
  if (sprache === "de") return AUSWAHL;
  const [deutschland, ...ausland] = AUSWAHL.map((l) => ({ code: l.code, name: landNameIn(l.code, sprache) }));
  return [deutschland, ...ausland.sort((a, b) => a.name.localeCompare(b.name, sprache))];
}

const MAHLZEITEN = ["fruehstueck", "mittag", "abend"] as const;

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
  const sprache = useSprache();
  const alle = useTexte();
  const t = alle.reisen.formular;
  const knopf = alle.allgemein.knopf;
  const auswahl = useMemo(() => auswahlIn(sprache), [sprache]);
  const [land, setLand] = useState(werte.land);
  const [beginn, setBeginn] = useState(werte.beginn);
  const [ende, setEnde] = useState(werte.ende);
  // Bei neuen Reisen (auch aus Kalender, Beleg oder Vorlage) folgt "Übernachtung" den Daten (mehrtägig = ja),
  // bis man es selbst anklickt – so stimmt es auch, wenn man die vorgeschlagenen Zeiten noch ändert.
  // Fest vorbelegt nur bei bestehenden Reisen und wenn eine Hotelrechnung die Übernachtung belegt.
  const [uebernachtungGewaehlt, setUebernachtungGewaehlt] = useState<boolean | null>(
    werte.id ? werte.mitUebernachtung : werte.mitUebernachtung || null,
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
      return { fehler: e instanceof Error ? uebersetzeMeldung(e.message, sprache) : t.ungueltig };
    }
  }, [beginn, ende, land, mitUebernachtung, mahlzeiten, t, sprache]);

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
        <span className="text-sm font-medium">{t.begruendung}</span>
        <input name="begruendung" required defaultValue={werte.begruendung} placeholder={t.begruendungPlatzhalter} className={feld} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t.besuchteStellen}</span>
        <input name="besuchte_stellen" defaultValue={werte.besuchteStellen} placeholder={t.besuchteStellenPlatzhalter} className={feld} />
      </label>

      <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t.reiseweg}</span>
          <input name="reiseweg" required value={reiseweg} onChange={(e) => setReiseweg(e.target.value)} placeholder={t.reisewegPlatzhalter} className={feld} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t.land}</span>
          <select name="land" value={land} onChange={(e) => setLand(e.target.value)} className={feld}>
            {auswahl.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t.beginn}</span>
          <input type="datetime-local" name="beginn" required value={beginn} onChange={(e) => setBeginn(e.target.value)} className={feld} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t.ende}</span>
          <input type="datetime-local" name="ende" required value={ende} min={beginn} onChange={(e) => setEnde(e.target.value)} className={feld} />
        </label>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">{t.verkehrsmittel}</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {VERKEHRSMITTEL.map((v) => (
            <label key={v} className="flex items-center gap-2">
              <input type="checkbox" name="verkehrsmittel" value={v} checked={verkehrsmittel.includes(v)} onChange={() => verkehrsmittelUmschalten(v)} className="size-4" />
              <span>{alle.allgemein.verkehrsmittel[v]}</span>
            </label>
          ))}
        </div>
        {verkehrsmittel.includes("eigener_pkw") && (
          <label className="flex flex-col gap-1 sm:w-64">
            <span className="text-sm font-medium">{t.kennzeichen}</span>
            <input name="kfz_kennzeichen" required defaultValue={werte.kfzKennzeichen} placeholder={t.kennzeichenPlatzhalter} className={`${feld} uppercase`} />
          </label>
        )}
        {verkehrsmittel.includes("eigener_pkw") && !werte.id && <PkwKm reiseweg={reiseweg} />}
        {verkehrsmittel.includes("mitfahrt") && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t.mitfahrtBei}</span>
            <input name="mitfahrt_bei" defaultValue={werte.mitfahrtBei} className={feld} />
          </label>
        )}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t.kostenstelle}</span>
          <input name="kostenstelle" defaultValue={werte.kostenstelle} className={feld} />
        </label>
        {/* Vorschüsse laufen über den Antrag in der Reise und werden automatisch abgezogen */}
        {werte.vorschuss && (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t.vorschuss}</span>
            <span className="py-2 text-sm text-neutral-600 dark:text-neutral-400">{t.vorschussText(werte.vorschuss)}</span>
          </div>
        )}
        {!!projekte.length && (
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-sm font-medium">{t.projekt}</span>
            <select name="projekt_id" defaultValue={werte.projektId} className={feld}>
              <option value="">{t.keinProjekt}</option>
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
        <span>{t.mitUebernachtung}</span>
      </label>

      <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-medium">{t.verpflegung}</h2>
        {!berechnung && <p className="mt-2 text-sm text-neutral-500">{t.beginnEndeEingeben}</p>}
        {berechnung?.fehler && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{berechnung.fehler}</p>}
        {berechnung?.ergebnis && (
          <>
            <p className="mt-1 text-sm text-neutral-500">{t.mahlzeitenHinweis}</p>
            {tageslaender && (
              <p className="mt-1 text-sm text-neutral-500">
                {t.mehrereStaaten}
              </p>
            )}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-neutral-500">
                  <tr>
                    <th className="py-1 pr-3 font-normal">{t.tag}</th>
                    {tageslaender && <th className="py-1 pr-3 font-normal">{t.landVor24}</th>}
                    {MAHLZEITEN.map((m) => (
                      <th key={m} className="px-2 py-1 text-center font-normal">{t.mahlzeit[m]}</th>
                    ))}
                    <th className="py-1 pl-3 text-right font-normal">{t.betrag}</th>
                  </tr>
                </thead>
                <tbody>
                  {berechnung.ergebnis.tage.map((tag) => (
                    <tr key={tag.datum} className="border-t border-neutral-100 dark:border-neutral-800">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {wochentagName(tag.datum, sprache)} {formatDatum(tag.datum)}
                      </td>
                      {tageslaender && (
                        <td className="py-2 pr-3">
                          <select
                            aria-label={t.landAm(formatDatum(tag.datum))}
                            value={mahlzeiten[tag.datum]?.land ?? land}
                            onChange={(e) => tagLandSetzen(tag.datum, e.target.value)}
                            className="max-w-44 rounded-md border border-neutral-300 bg-white px-1.5 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                          >
                            {auswahl.map((l) => (
                              <option key={l.code} value={l.code}>
                                {l.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                      {MAHLZEITEN.map((m) => (
                        <td key={m} className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            aria-label={t.mahlzeitGestellt(t.mahlzeit[m], formatDatum(tag.datum))}
                            disabled={tag.pauschale === 0}
                            checked={!!mahlzeiten[tag.datum]?.[m]}
                            onChange={() => mahlzeitUmschalten(tag.datum, m)}
                            className="size-4"
                          />
                        </td>
                      ))}
                      <td className="py-2 pl-3 text-right tabular-nums whitespace-nowrap">
                        {formatEuro(tag.betrag)}
                        {tag.kuerzung > 0 && <span className="block text-xs text-neutral-500">{formatEuro(tag.pauschale)} − {formatEuro(tag.kuerzung)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-neutral-300 font-medium dark:border-neutral-700">
                    <td className="py-2" colSpan={tageslaender ? 5 : 4}>{t.summe}</td>
                    <td className="py-2 pl-3 text-right tabular-nums">{formatEuro(berechnung.ergebnis.summe)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
        <label className="mt-4 flex flex-col gap-1">
          <span className="text-sm font-medium">{t.bemerkung}</span>
          <input name="verpflegung_bemerkung" defaultValue={werte.verpflegungBemerkung} className={feld} />
        </label>
      </section>

      {status.fehler && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{status.fehler}</p>
      )}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={laeuft || !!berechnung?.fehler} className="rounded-md bg-primaer hover:bg-primaer-hover px-4 py-2 font-medium text-white disabled:opacity-50 dark:text-neutral-950">
          {laeuft ? knopf.speichert : knopf.speichern}
        </button>
        <Link href={werte.id ? `/reisen/${werte.id}` : "/"} className="text-sm text-neutral-600 underline dark:text-neutral-400">
          {knopf.abbrechen}
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
  const t = useTexte().reisen.formular.pkw;

  function berechnen() {
    setInfo(null);
    rechnen(async () => {
      const ergebnis = await kmBerechnen(reiseweg);
      if ("fehler" in ergebnis) return setInfo(ergebnis.fehler);
      setKm(ergebnis.km.toLocaleString("de-DE", { maximumFractionDigits: 1 }));
      setInfo(t.route(ergebnis.orte.join(" → ")));
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{t.gefahreneKm}</span>
      <div className="flex flex-wrap gap-2">
        <input
          name="pkw_km"
          inputMode="decimal"
          value={km}
          onChange={(e) => setKm(e.target.value)}
          placeholder={t.kmPlatzhalter}
          className={`${feld} max-w-40 text-right tabular-nums`}
        />
        <button
          type="button"
          onClick={berechnen}
          disabled={rechnet || !reiseweg.trim()}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {rechnet ? "…" : t.berechnen}
        </button>
      </div>
      <span className="text-xs text-neutral-500">
        {info ?? t.hinweis}
      </span>
      {reiseweg.trim() && <KarteKnopf key={reiseweg} strecke={reiseweg} />}
    </div>
  );
}
