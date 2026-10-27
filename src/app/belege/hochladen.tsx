"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFehler, verkleinereBild } from "@/lib/bild";
import { ablegen, entfernen, istNetzfehler, wartende } from "@/lib/offline/warteschlange";
import { eingangAnlegen } from "./actions";

const MAX_DATEI_BYTES = 2_800_000;

type Fortschritt = { fertig: number; gesamt: number; offline: number; fehler: string[] };

class Offline extends Error {
  constructor(readonly pfad?: string) {
    super("offline");
  }
}

/** Lädt eine Datei hoch und legt sie im Eingang an; wirft Offline, wenn das Netz fehlt */
async function hochladen(userId: string, datei: Blob, name: string, pfad?: string): Promise<void> {
  if (!navigator.onLine) throw new Offline(pfad);
  const supabase = createClient();
  if (!pfad) {
    const endung = name.split(".").pop()?.toLowerCase() || "jpg";
    const ziel = `${userId}/eingang/${crypto.randomUUID()}.${endung}`;
    try {
      const { error } = await supabase.storage.from("belege").upload(ziel, datei, { contentType: datei.type });
      if (error) throw istNetzfehler(error) || istNetzfehler((error as { originalError?: unknown }).originalError) ? new Offline() : new Error(`${name}: Hochladen fehlgeschlagen`);
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
          await hochladen(userId, e.datei, e.name, e.pfad);
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
  }, [userId, zaehlen, router]);

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
        const format = formatFehler(verkleinert);
        if (format) throw new Error(`${datei.name}: ${format}`);
        if (verkleinert.size > MAX_DATEI_BYTES) throw new Error(`${datei.name}: größer als 2,8 MB`);
        await hochladen(userId, verkleinert, verkleinert.name);
      } catch (e) {
        if (e instanceof Offline && verkleinert) {
          try {
            await ablegen(userId, verkleinert, verkleinert.name, e.pfad);
            stand.offline += 1;
          } catch {
            stand.fehler.push(`${datei.name}: Ohne Verbindung konnte der Beleg nicht zwischengespeichert werden.`);
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
          Beleg fotografieren
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
          Mehrere Fotos oder PDFs wählen
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
        Fotos oder PDFs bis 2,8 MB.{kiAktiv && " Betrag, Datum, MwSt und Ort werden automatisch ausgelesen."} Zuordnen kannst du später.
        Ohne Netz werden Fotos auf dem Handy gespeichert und später hochgeladen.
      </p>
      {warten > 0 && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <span>
            {warten} {warten === 1 ? "Beleg wartet" : "Belege warten"} auf dem Gerät auf eine Verbindung.
          </span>
          <button type="button" onClick={warteschlangeAbarbeiten} disabled={nachladen} className="font-medium underline disabled:opacity-50">
            {nachladen ? "Lädt hoch …" : "Jetzt hochladen"}
          </button>
        </div>
      )}
      {fortschritt && (
        <div role="status" className="rounded-md bg-neutral-100 p-3 text-sm dark:bg-neutral-800">
          {laeuft
            ? `Verarbeite Beleg ${fortschritt.fertig + 1} von ${fortschritt.gesamt} …`
            : fortschritt.gesamt > 0 &&
              `${fortschritt.gesamt - fortschritt.fehler.length - fortschritt.offline} von ${fortschritt.gesamt} Belegen im Eingang${
                fortschritt.offline ? `, ${fortschritt.offline} offline gespeichert` : ""
              }.`}
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
