"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { verkleinereBild } from "@/lib/bild";
import { eingangAnlegen } from "./actions";

const MAX_DATEI_BYTES = 2_800_000;

type Fortschritt = { fertig: number; gesamt: number; fehler: string[] };

/** Ein oder mehrere Belege hochladen; jeder landet im Eingang und wird automatisch ausgelesen. */
export function Hochladen({ userId, kiAktiv }: { userId: string; kiAktiv: boolean }) {
  const router = useRouter();
  const [fortschritt, setFortschritt] = useState<Fortschritt | null>(null);

  async function verarbeiten(dateien: FileList | null) {
    if (!dateien?.length) return;
    const liste = [...dateien];
    const stand: Fortschritt = { fertig: 0, gesamt: liste.length, fehler: [] };
    setFortschritt({ ...stand });
    const supabase = createClient();

    for (const datei of liste) {
      try {
        const verkleinert = await verkleinereBild(datei);
        if (verkleinert.size > MAX_DATEI_BYTES) throw new Error(`${datei.name}: größer als 2,8 MB`);
        const endung = verkleinert.name.split(".").pop()?.toLowerCase() || "jpg";
        const pfad = `${userId}/eingang/${crypto.randomUUID()}.${endung}`;
        const { error } = await supabase.storage.from("belege").upload(pfad, verkleinert, { contentType: verkleinert.type });
        if (error) throw new Error(`${datei.name}: Hochladen fehlgeschlagen`);
        const ergebnis = await eingangAnlegen(pfad);
        if (ergebnis.fehler) throw new Error(`${datei.name}: ${ergebnis.fehler}`);
      } catch (e) {
        stand.fehler.push(e instanceof Error ? e.message : String(e));
      }
      stand.fertig += 1;
      setFortschritt({ ...stand });
      router.refresh();
    }
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
      </p>
      {fortschritt && (
        <div role="status" className="rounded-md bg-neutral-100 p-3 text-sm dark:bg-neutral-800">
          {laeuft
            ? `Verarbeite Beleg ${fortschritt.fertig + 1} von ${fortschritt.gesamt} …`
            : `${fortschritt.gesamt - fortschritt.fehler.length} von ${fortschritt.gesamt} Belegen im Eingang.`}
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
