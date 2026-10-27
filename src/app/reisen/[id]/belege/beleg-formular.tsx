"use client";

import Link from "next/link";
import { startTransition, useActionState, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFehler, verkleinereBild } from "@/lib/bild";
import { formatEuro } from "@/lib/format";
import { parseEuro } from "@/lib/geld";
import { nettoAusBrutto } from "@/lib/reisekosten/mwst";
import { ABSCHNITT_TEXT, passendeKategorie, type Abschnitt, type Kategorie } from "@/lib/reisekosten/kategorie";
import { belegPerKiAuslesen, belegPositionenAnlegen, belegSpeichern, type BelegStatus } from "./actions";
import type { AusgelesenerBeleg } from "@/lib/ki/beleg-auslesen";
import { centAlsEingabe } from "@/lib/geld";
import { auslagenVorschlag } from "@/lib/reisekosten/eingang";
import { ZAHLUNGSARTEN } from "@/lib/reisekosten/zahlungsart";
import { angabeHinweis, angabeLabel, istPflichtangabe, type Pflichtangabe } from "@/lib/reisekosten/pflichtangaben";

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
  lieferant: string;
  kostenstelle: string;
  zahlungsart: string;
  /** Pflichtangaben je Kategorie, vorbelegt aus der Reise */
  anlass: string;
  person: string;
  kfzKennzeichen: string;
};

const feld =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900";

const STANDARD_SAETZE = [19, 7, 0];
/** Entspricht dem Limit des Speichers – jede Datei passt so in eine Mail an DATEV */
const MAX_DATEI_BYTES = 2_800_000;
/** Ab hier muss die Rechnung auf Polycare ausgestellt sein, sonst ist die Vorsteuer nicht abziehbar */
const KLEINBETRAG_CENT = 25_000;

export function BelegFormular({
  auslagen = false,
  werte,
  reiseId,
  userId,
  kategorien,
  reiseVon,
  reiseBis,
  kiAktiv,
  eingangId,
  kiStart,
}: {
  auslagen?: boolean;
  werte: BelegWerte;
  reiseId: string;
  userId: string;
  kategorien: Kategorie[];
  reiseVon: string;
  reiseBis: string;
  kiAktiv: boolean;
  eingangId?: string;
  kiStart?: AusgelesenerBeleg;
}) {
  const [status, absenden, laeuft] = useActionState<BelegStatus, FormData>(belegSpeichern, {});
  const [kategorieId, setKategorieId] = useState(werte.kategorieId);
  const [mwst, setMwst] = useState(werte.mwstProzent);
  const [betrag, setBetrag] = useState(werte.betrag);
  const [datum, setDatum] = useState(werte.datum);
  const [beschreibung, setBeschreibung] = useState(werte.beschreibung);
  const [lieferant, setLieferant] = useState(werte.lieferant);
  const [angaben, setAngaben] = useState<Record<Pflichtangabe, string>>({ anlass: werte.anlass, person: werte.person, kfz: werte.kfzKennzeichen });
  const [ki, setKi] = useState<{ laeuft: boolean; ergebnis?: AusgelesenerBeleg; fehler?: string }>({ laeuft: false, ergebnis: kiStart });
  const [positionenStatus, positionenAnlegen, legtAn] = useActionState<BelegStatus, FormData>(belegPositionenAnlegen, {});
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

  /** Lädt die Datei hoch (einmalig je Datei) und gibt den Speicherpfad zurück; null bei Fehler. */
  async function hochladen(f: File): Promise<string | null> {
    if (hochgeladen?.datei === f) return hochgeladen.pfad;
    setLaedtHoch(true);
    try {
      const verkleinert = await verkleinereBild(f);
      const format = formatFehler(verkleinert);
      if (format) {
        setUploadFehler(format);
        return null;
      }
      if (verkleinert.size > MAX_DATEI_BYTES) {
        setUploadFehler(
          verkleinert.type === "application/pdf"
            ? "Das PDF ist größer als 2,8 MB. Bitte die Seite fotografieren oder das PDF verkleinern."
            : "Das Bild ist zu groß. Bitte als Foto (JPEG) aufnehmen.",
        );
        return null;
      }
      const endung = verkleinert.name.split(".").pop()?.toLowerCase() || "jpg";
      const pfad = `${userId}/${reiseId}/${crypto.randomUUID()}.${endung}`;
      const { error } = await createClient().storage.from("belege").upload(pfad, verkleinert, {
        contentType: verkleinert.type,
      });
      if (error) throw error;
      setHochgeladen({ datei: f, pfad });
      return pfad;
    } catch {
      setUploadFehler("Das Foto konnte nicht hochgeladen werden (Bild oder PDF bis 2,8 MB).");
      return null;
    } finally {
      setLaedtHoch(false);
    }
  }

  /** Füllt das Formular mit dem KI-Vorschlag (erste Position); weitere Positionen werden angeboten. */
  function vorschlagUebernehmen(e: AusgelesenerBeleg) {
    if (e.haendler) setLieferant(e.haendler);
    if (e.datum && e.datum >= reiseVon && e.datum <= reiseBis) setDatum(e.datum);
    const erste = e.positionen[0];
    if (!erste) return;
    // Betrag und MwSt immer übernehmen; die Kategorie nur, wenn sie (oder ihr Gegenstück) zur Abrechnung passt
    const k = passendeKategorie(erste, auslagen ? "auslagen" : "reise", kategorien);
    if (k) setKategorieId(k);
    const v = auslagen ? auslagenVorschlag(e) : erste;
    if (v) {
      setMwst(String(v.mwstProzent));
      setBetrag(centAlsEingabe(v.betragCent));
    }
    if (!auslagen) setBeschreibung(erste.beschreibung || e.haendler || "");
  }

  async function dateiWaehlen(f: File | null) {
    setDatei(f);
    setUploadFehler(null);
    setKi({ laeuft: false });
    if (vorschau) URL.revokeObjectURL(vorschau);
    setVorschau(f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
    if (!f || !kiAktiv) return;

    const pfad = await hochladen(f);
    if (!pfad) return;
    setKi({ laeuft: true });
    try {
      const antwort = await belegPerKiAuslesen(reiseId, pfad);
      if (antwort.ergebnis) vorschlagUebernehmen(antwort.ergebnis);
      setKi({ laeuft: false, ergebnis: antwort.ergebnis, fehler: antwort.fehler });
    } catch {
      setKi({ laeuft: false, fehler: "Der Beleg konnte gerade nicht ausgelesen werden." });
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.delete("datei");
    if (datei) {
      const pfad = await hochladen(datei);
      if (!pfad) return;
      formData.set("datei_pfad", pfad);
    }
    startTransition(() => absenden(formData));
  }

  function alleAnlegen() {
    const e = ki.ergebnis;
    const pfad = hochgeladen?.pfad ?? (werte.dateiPfad || null);
    if (!e || !pfad) return;
    const formData = new FormData();
    formData.set("reise_id", reiseId);
    formData.set("datum", datum);
    formData.set("datei_pfad", pfad);
    if (eingangId) formData.set("eingang_id", eingangId);
    formData.set("positionen", JSON.stringify(e.positionen));
    formData.set("waehrung", e.waehrung);
    formData.set("anlass", angaben.anlass);
    formData.set("person", angaben.person);
    formData.set("kfz_kennzeichen", angaben.kfz);
    startTransition(() => positionenAnlegen(formData));
  }

  const beschaeftigt = laeuft || laedtHoch || ki.laeuft || legtAn;
  // Auslagen werden als ein Beleg mit Gesamtbetrag erfasst
  const mehrerePositionen = !auslagen && !werte.id && (ki.ergebnis?.positionen.length ?? 0) > 1;
  const ueberKleinbetrag = auslagen && (parseEuro(betrag) ?? 0) > KLEINBETRAG_CENT;
  const katName = (id: string) => kategorien.find((k) => k.id === id)?.bezeichnung ?? id;
  // Pflichtangaben der gewählten Kategorie – beim Anlegen mehrerer Positionen die aller erkannten Kategorien
  const pflichtKategorien = mehrerePositionen
    ? kategorien.filter((k) => ki.ergebnis!.positionen.some((p) => p.kategorieId === k.id))
    : kategorie
      ? [kategorie]
      : [];
  const pflicht = [...new Set(pflichtKategorien.flatMap((k) => k.pflichtangaben).filter(istPflichtangabe))];
  const pflichtAbschnitt = pflichtKategorien[0]?.abschnitt ?? "";
  const ANGABE_FELD: Record<Pflichtangabe, string> = { anlass: "anlass", person: "person", kfz: "kfz_kennzeichen" };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {werte.id && <input type="hidden" name="id" value={werte.id} />}
      <input type="hidden" name="reise_id" value={reiseId} />
      <input type="hidden" name="datei_pfad" value={werte.dateiPfad} />
      <input type="hidden" name="datei_alt" value={werte.dateiPfad} />
      {eingangId && <input type="hidden" name="eingang_id" value={eingangId} />}

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
          <input type="date" name="datum" required value={datum} onChange={(e) => setDatum(e.target.value)} min={reiseVon} max={reiseBis} className={feld} />
          {auslagen && <span className="text-xs text-neutral-500">nachgereichte Belege aus Vormonaten sind möglich</span>}
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

      {ueberKleinbetrag && (
        <p className="-mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Über 250 € brutto: Die Rechnung muss auf Polycare Research Technology GmbH ausgestellt sein (mit Anschrift), sonst
          kann die Vorsteuer nicht gezogen werden. Ein Kassenbon reicht dann nicht.
        </p>
      )}

      {auslagen ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Lieferant</span>
              <input name="lieferant" value={lieferant} onChange={(e) => setLieferant(e.target.value)} maxLength={120} placeholder="z. B. Bauhaus Köln" className={feld} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Bezahlt mit</span>
              <select name="zahlungsart" defaultValue={werte.zahlungsart} className={feld}>
                <option value="">Bitte wählen</option>
                {ZAHLUNGSARTEN.map((z) => (
                  <option key={z.wert} value={z.wert}>
                    {z.text}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Zweck</span>
            <input name="beschreibung" required value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} placeholder="Wofür? z. B. Aufbau Mockup Köln" className={feld} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Kostenstelle / Projekt</span>
            <input name="kostenstelle" defaultValue={werte.kostenstelle} maxLength={40} placeholder="optional" className={feld} />
          </label>
        </>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Beschreibung</span>
          <input name="beschreibung" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} placeholder="optional, z. B. Hotel Name, Strecke" className={feld} />
        </label>
      )}

      {pflicht.length > 0 && (
        <div className="grid gap-5 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="-mb-2 text-xs text-neutral-500">Pflicht für die Buchhaltung, damit die Ausgabe nachvollziehbar ist – aus der Reise vorbelegt.</p>
          {pflicht.map((a) => (
            <label key={a} className="flex flex-col gap-1">
              <span className="text-sm font-medium">{angabeLabel(a, pflichtAbschnitt)}</span>
              <input
                name={ANGABE_FELD[a]}
                required
                maxLength={a === "kfz" ? 20 : a === "person" ? 200 : 300}
                value={angaben[a]}
                onChange={(e) => setAngaben((alt) => ({ ...alt, [a]: e.target.value }))}
                placeholder={angabeHinweis(a, pflichtAbschnitt)}
                className={feld}
              />
            </label>
          ))}
        </div>
      )}

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
              <span className="text-xs text-neutral-500">
                Foto oder PDF bis 2,8 MB{kiAktiv && " – Betrag, Datum und MwSt werden automatisch ausgelesen"}
              </span>
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

      {ki.laeuft && (
        <p role="status" className="rounded-md bg-neutral-100 p-3 text-sm dark:bg-neutral-800">Beleg wird ausgelesen …</p>
      )}
      {ki.fehler && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">{ki.fehler} Bitte die Angaben von Hand eintragen.</p>}
      {ki.ergebnis && (
        <div className="flex flex-col gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-950 dark:bg-blue-950 dark:text-blue-50">
          {!ki.ergebnis.istBeleg ? (
            <p>Das sieht nicht nach einem Beleg aus. Bitte prüfen.</p>
          ) : (
            <p>
              Vorschlag aus dem Beleg{ki.ergebnis.haendler ? ` (${ki.ergebnis.haendler})` : ""} übernommen – bitte prüfen.
              {ki.ergebnis.waehrung !== "EUR" && ` Achtung: Betrag in ${ki.ergebnis.waehrung}, bitte in Euro umrechnen.`}
            </p>
          )}
          {ki.ergebnis.hinweis && <p>Hinweis: {ki.ergebnis.hinweis}</p>}
          {!auslagen && ki.ergebnis.fruehstueckEnthalten && (
            <p>Die Rechnung enthält Frühstück. Markiere es bei der Reise als gestellt – das kürzt die Verpflegungspauschale.</p>
          )}
          {mehrerePositionen && (
            <>
              <p className="font-medium">Der Beleg enthält {ki.ergebnis.positionen.length} Positionen:</p>
              <ul className="list-disc pl-5">
                {ki.ergebnis.positionen.map((p, i) => (
                  <li key={i} className="tabular-nums">
                    {katName(p.kategorieId)}: {formatEuro(p.betragCent)} ({String(p.mwstProzent).replace(".", ",")} %)
                  </li>
                ))}
              </ul>
              <div>
                <button type="button" onClick={alleAnlegen} disabled={beschaeftigt} className="rounded-md bg-blue-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-blue-100 dark:text-blue-950">
                  {legtAn ? "Legt an …" : `Alle ${ki.ergebnis.positionen.length} Positionen als Belege anlegen`}
                </button>
              </div>
              {positionenStatus.fehler && <p role="alert">{positionenStatus.fehler}</p>}
            </>
          )}
        </div>
      )}

      {(uploadFehler || status.fehler) && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {uploadFehler ?? status.fehler}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={beschaeftigt} className="rounded-md bg-primaer hover:bg-primaer-hover px-4 py-2 font-medium text-white disabled:opacity-50 dark:text-neutral-950">
          {laedtHoch ? "Lädt hoch …" : laeuft ? "Speichert …" : "Speichern"}
        </button>
        <Link href={`/reisen/${reiseId}`} className="text-sm text-neutral-600 underline dark:text-neutral-400">
          Abbrechen
        </Link>
      </div>
    </form>
  );
}
