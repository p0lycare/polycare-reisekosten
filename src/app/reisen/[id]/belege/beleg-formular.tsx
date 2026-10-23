"use client";

import Link from "next/link";
import { startTransition, useActionState, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { verkleinereBild } from "@/lib/bild";
import { formatEuro } from "@/lib/format";
import { parseEuro } from "@/lib/geld";
import { nettoAusBrutto } from "@/lib/reisekosten/mwst";
import { ABSCHNITT_TEXT, type Abschnitt, type Kategorie } from "@/lib/reisekosten/kategorie";
import { belegSpeichern, type BelegStatus } from "./actions";

export type BelegWerte = {
  id?: string;
  kategorieId: string;
  datum: string;
  beschreibung: string;
  betrag: string;
  mwstProzent: string;
  dateiPfad: string;
  dateiUrl?: string;
  bewirtungAnlass: string;
  bewirtungTeilnehmer: string;
};

const feld =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900";

const STANDARD_SAETZE = [19, 7, 0];

export function BelegFormular({
  werte,
  reiseId,
  userId,
  kategorien,
  reiseVon,
  reiseBis,
}: {
  werte: BelegWerte;
  reiseId: string;
  userId: string;
  kategorien: Kategorie[];
  reiseVon: string;
  reiseBis: string;
}) {
  const [status, absenden, laeuft] = useActionState<BelegStatus, FormData>(belegSpeichern, {});
  const [kategorieId, setKategorieId] = useState(werte.kategorieId);
  const [mwst, setMwst] = useState(werte.mwstProzent);
  const [betrag, setBetrag] = useState(werte.betrag);
  const [datei, setDatei] = useState<File | null>(null);
  const [vorschau, setVorschau] = useState<string | null>(null);
  const [uploadFehler, setUploadFehler] = useState<string | null>(null);
  const [laedtHoch, setLaedtHoch] = useState(false);
  // Bereits hochgeladene Datei merken, damit ein erneuter Versuch nach einer Fehlermeldung nicht doppelt hochlädt
  const [hochgeladen, setHochgeladen] = useState<{ datei: File; pfad: string } | null>(null);

  const kategorie = kategorien.find((k) => k.id === kategorieId);
  const abschnitte = [...new Set(kategorien.map((k) => k.abschnitt as Abschnitt))];
  const saetze = [...new Set([...STANDARD_SAETZE, ...(kategorie?.mwst_prozent != null ? [Number(kategorie.mwst_prozent)] : [])])];

  const aufteilung = useMemo(() => {
    const cent = parseEuro(betrag);
    return cent && mwst !== "" ? nettoAusBrutto(cent, Number(mwst)) : null;
  }, [betrag, mwst]);

  function kategorieWaehlen(id: string) {
    setKategorieId(id);
    const k = kategorien.find((x) => x.id === id);
    setMwst(k?.mwst_prozent != null ? String(Number(k.mwst_prozent)) : "");
  }

  function dateiWaehlen(f: File | null) {
    setDatei(f);
    setUploadFehler(null);
    if (vorschau) URL.revokeObjectURL(vorschau);
    setVorschau(f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.delete("datei");

    if (datei && hochgeladen?.datei === datei) {
      formData.set("datei_pfad", hochgeladen.pfad);
    } else if (datei) {
      setLaedtHoch(true);
      try {
        const verkleinert = await verkleinereBild(datei);
        const endung = verkleinert.name.split(".").pop()?.toLowerCase() || "jpg";
        const pfad = `${userId}/${reiseId}/${crypto.randomUUID()}.${endung}`;
        const { error } = await createClient().storage.from("belege").upload(pfad, verkleinert, {
          contentType: verkleinert.type,
        });
        if (error) throw error;
        formData.set("datei_pfad", pfad);
        setHochgeladen({ datei, pfad });
      } catch {
        setUploadFehler("Das Foto konnte nicht hochgeladen werden (max. 10 MB, Bild oder PDF).");
        setLaedtHoch(false);
        return;
      }
      setLaedtHoch(false);
    }

    startTransition(() => absenden(formData));
  }

  const beschaeftigt = laeuft || laedtHoch;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {werte.id && <input type="hidden" name="id" value={werte.id} />}
      <input type="hidden" name="reise_id" value={reiseId} />
      <input type="hidden" name="datei_pfad" value={werte.dateiPfad} />
      <input type="hidden" name="datei_alt" value={werte.dateiPfad} />

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Kategorie</span>
        <select name="kategorie_id" required value={kategorieId} onChange={(e) => kategorieWaehlen(e.target.value)} className={feld}>
          <option value="" disabled>
            Bitte wählen
          </option>
          {abschnitte.map((a) => (
            <optgroup key={a} label={`${a} – ${ABSCHNITT_TEXT[a]}`}>
              {kategorien
                .filter((k) => k.abschnitt === a)
                .map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.bezeichnung}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Belegdatum</span>
          <input type="date" name="datum" required defaultValue={werte.datum} min={reiseVon} max={reiseBis} className={feld} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Betrag brutto (€)</span>
          <input name="betrag" required inputMode="decimal" placeholder="0,00" value={betrag} onChange={(e) => setBetrag(e.target.value)} className={`${feld} tabular-nums`} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">MwSt</span>
          <select name="mwst_prozent" required value={mwst} onChange={(e) => setMwst(e.target.value)} className={feld}>
            <option value="" disabled>
              Satz wählen
            </option>
            {saetze.map((s) => (
              <option key={s} value={String(s)}>
                {String(s).replace(".", ",")} %
              </option>
            ))}
          </select>
        </label>
      </div>
      {aufteilung && (
        <p className="-mt-3 text-sm text-neutral-500 tabular-nums">
          Netto {formatEuro(aufteilung.netto)} + MwSt {formatEuro(aufteilung.mwst)}
        </p>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Beschreibung</span>
        <input name="beschreibung" defaultValue={werte.beschreibung} placeholder="optional, z. B. Hotel Name, Strecke" className={feld} />
      </label>

      {kategorie?.abschnitt === "E" && (
        <div className="grid gap-5 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Anlass der Bewirtung</span>
            <input name="bewirtung_anlass" required defaultValue={werte.bewirtungAnlass} className={feld} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Bewirtete Personen</span>
            <input name="bewirtung_teilnehmer" required defaultValue={werte.bewirtungTeilnehmer} placeholder="Namen und Firma" className={feld} />
          </label>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Beleg</span>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 p-6 text-center hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900">
          {vorschau ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vorschau} alt="Vorschau des Belegs" className="max-h-64 rounded" />
          ) : datei ? (
            <span className="text-sm">{datei.name}</span>
          ) : werte.dateiUrl ? (
            <span className="text-sm">Beleg vorhanden – tippen zum Ersetzen</span>
          ) : (
            <>
              <span className="font-medium">Foto aufnehmen oder Datei wählen</span>
              <span className="text-xs text-neutral-500">Bild oder PDF, max. 10 MB</span>
            </>
          )}
          <input
            type="file"
            name="datei"
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={(e) => dateiWaehlen(e.target.files?.[0] ?? null)}
          />
        </label>
        {werte.dateiUrl && !datei && (
          <a href={werte.dateiUrl} target="_blank" rel="noreferrer" className="text-sm text-neutral-600 underline dark:text-neutral-400">
            Vorhandenen Beleg ansehen
          </a>
        )}
        {!datei && !werte.dateiPfad && (
          <p className="text-xs text-neutral-500">Ohne Beleg nur, wenn es keinen gibt (z. B. Trinkgeld).</p>
        )}
      </div>

      {(uploadFehler || status.fehler) && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {uploadFehler ?? status.fehler}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={beschaeftigt} className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900">
          {laedtHoch ? "Lädt hoch …" : laeuft ? "Speichert …" : "Speichern"}
        </button>
        <Link href={`/reisen/${reiseId}`} className="text-sm text-neutral-600 underline dark:text-neutral-400">
          Abbrechen
        </Link>
      </div>
    </form>
  );
}
