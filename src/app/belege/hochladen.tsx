"use client";

import { uebersetzeMeldung } from "@/lib/i18n/meldungen";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFehler, verkleinereBild } from "@/lib/bild";
import { ablegen, entfernen, istNetzfehler, wartende } from "@/lib/offline/warteschlange";
import { useSprache, useTexte } from "@/lib/i18n/client";
import type { Texte } from "@/lib/i18n/woerterbuch";
import { eingangAnlegen } from "./actions";

const MAX_DATEI_BYTES = 2_800_000;

type Fortschritt = { fertig: number; gesamt: number; offline: number; fehler: string[] };

class Offline extends Error {
  constructor(readonly pfad?: string) {
    super("offline");
  }
}

/** Lädt eine Datei hoch und legt sie im Eingang an; wirft Offline, wenn das Netz fehlt */
async function hochladen(t: Texte["belege"]["hochladen"], userId: string, datei: Blob, name: string, pfad?: string): Promise<void> {
  if (!navigator.onLine) throw new Offline(pfad);
  const supabase = createClient();
  if (!pfad) {
    const endung = name.split(".").pop()?.toLowerCase() || "jpg";
    const ziel = `${userId}/eingang/${crypto.randomUUID()}.${endung}`;
    try {
      const { error } = await supabase.storage.from("belege").upload(ziel, datei, { contentType: datei.type });
      if (error) throw istNetzfehler(error) || istNetzfehler((error as { originalError?: unknown }).originalError) ? new Offline() : new Error(t.fehlgeschlagen(name));
    } catch (e) {
      if (e instanceof Offline || istNetzfehler(e)) throw new Offline();
      throw e;
    }
    pfad = ziel;
  }
  let ergebnis;
  try {
    ergebnis = await eingangAnlegen(pfad);
  } catch (e) {
    // Datei ist schon oben, nur der Eingang fehlt – beim nächsten Versuch nicht erneut hochladen
    if (istNetzfehler(e)) throw new Offline(pfad);
    throw e;
  }
  if (ergebnis.fehler) throw new Error(`${name}: ${ergebnis.fehler}`);
}

/**
 * Ein oder mehrere Belege hochladen; jeder landet im Eingang und wird automatisch ausgelesen.
 * Ohne Netz bleiben Fotos auf dem Gerät und werden nachgeladen, sobald wieder Verbindung besteht.
 */
export function Hochladen({ userId, kiAktiv }: { userId: string; kiAktiv: boolean }) {
  const router = useRouter();
  const alle = useTexte();
  const sprache = useSprache();
  const t = alle.belege.hochladen;
  const [fortschritt, setFortschritt] = useState<Fortschritt | null>(null);
  const [warten, setWarten] = useState(0);
  const [nachladen, setNachladen] = useState(false);
  const nachladenLaeuft = useRef(false);

  const zaehlen = useCallback(async () => {
    try {
      setWarten((await wartende(userId)).length);
    } catch {
      setWarten(0);
    }
  }, [userId]);

  const warteschlangeAbarbeiten = useCallback(async () => {
    if (nachladenLaeuft.current || !navigator.onLine) return;
    nachladenLaeuft.current = true;
    setNachladen(true);
    try {
      for (const e of await wartende(userId)) {
        try {
          await hochladen(t, userId, e.datei, e.name, e.pfad);
          await entfernen(e.id);
        } catch (fehler) {
          if (fehler instanceof Offline) {
            if (fehler.pfad && !e.pfad) {
              await entfernen(e.id);
              await ablegen(userId, e.datei, e.name, fehler.pfad);
            }
            break;
          }
          // Vom Server abgelehnt (z. B. Kontingent): nicht endlos wiederholen
          await entfernen(e.id);
          setFortschritt((alt) => ({ fertig: 0, gesamt: 0, offline: 0, ...alt, fehler: [...(alt?.fehler ?? []), String(fehler instanceof Error ? fehler.message : fehler)] }));
        }
      }
    } finally {
      nachladenLaeuft.current = false;
      setNachladen(false);
      await zaehlen();
      router.refresh();
    }
  }, [userId, zaehlen, router, t]);

  useEffect(() => {
    zaehlen().then(warteschlangeAbarbeiten);
    window.addEventListener("online", warteschlangeAbarbeiten);
    return () => window.removeEventListener("online", warteschlangeAbarbeiten);
  }, [zaehlen, warteschlangeAbarbeiten]);

  async function verarbeiten(dateien: FileList | null) {
    if (!dateien?.length) return;
    const liste = [...dateien];
    const stand: Fortschritt = { fertig: 0, gesamt: liste.length, offline: 0, fehler: [] };
    setFortschritt({ ...stand });

    for (const datei of liste) {
      let verkleinert: File | null = null;
      try {
        verkleinert = await verkleinereBild(datei);
        const format = formatFehler(verkleinert) && uebersetzeMeldung(formatFehler(verkleinert)!, sprache);
        if (format) throw new Error(`${datei.name}: ${format}`);
        if (verkleinert.size > MAX_DATEI_BYTES) throw new Error(t.zuGross(datei.name));
        await hochladen(t, userId, verkleinert, verkleinert.name);
      } catch (e) {
        if (e instanceof Offline && verkleinert) {
          try {
            await ablegen(userId, verkleinert, verkleinert.name, e.pfad);
            stand.offline += 1;
          } catch {
            stand.fehler.push(t.offlineFehler(datei.name));
          }
        } else {
          stand.fehler.push(e instanceof Error ? e.message : String(e));
        }
      }
      stand.fertig += 1;
      setFortschritt({ ...stand });
      router.refresh();
    }
    await zaehlen();
  }

  const laeuft = fortschritt !== null && fortschritt.fertig < fortschritt.gesamt;
  const knopf =
    "flex flex-1 cursor-pointer items-center justify-center rounded-lg px-4 py-4 text-center font-medium has-[:disabled]:opacity-50";

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className={`${knopf} bg-primaer hover:bg-primaer-hover text-white dark:text-neutral-950`}>
          {t.fotografieren}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={laeuft}
            onChange={(e) => {
              verarbeiten(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <label className={`${knopf} border border-neutral-300 dark:border-neutral-700`}>
          {t.mehrere}
          <input
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="sr-only"
            disabled={laeuft}
            onChange={(e) => {
              verarbeiten(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <p className="text-xs text-neutral-500">
        {t.hinweisVor}
        {kiAktiv && t.hinweisKi}
        {t.hinweisNach}
      </p>
      {warten > 0 && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <span>{t.warten(warten)}</span>
          <button type="button" onClick={warteschlangeAbarbeiten} disabled={nachladen} className="font-medium underline disabled:opacity-50">
            {nachladen ? alle.belege.laedtHoch : t.jetztHochladen}
          </button>
        </div>
      )}
      {fortschritt && (
        <div role="status" className="rounded-md bg-neutral-100 p-3 text-sm dark:bg-neutral-800">
          {laeuft
            ? t.verarbeite(fortschritt.fertig + 1, fortschritt.gesamt)
            : fortschritt.gesamt > 0 &&
              t.ergebnis(fortschritt.gesamt - fortschritt.fehler.length - fortschritt.offline, fortschritt.gesamt, fortschritt.offline)}
          {fortschritt.fehler.map((f) => (
            <p key={f} className="mt-1 text-red-700 dark:text-red-400">
              {f}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
