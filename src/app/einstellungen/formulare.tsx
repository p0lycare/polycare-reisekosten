"use client";

import { useActionState } from "react";
import { ohneZuruecksetzen } from "@/lib/formular";
import type { Abschnitt, Kategorie } from "@/lib/reisekosten/kategorie";
import { bueroOrteSpeichern, erinnerungTesten, kategorieSpeichern, saetzeSpeichern, type AktionStatus } from "./actions";

const feld =
  "w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900";

function Meldung({ status }: { status: AktionStatus }) {
  if (status.fehler) return <p role="alert" className="text-sm text-red-700 dark:text-red-400">{status.fehler}</p>;
  if (status.gespeichert) return <p role="status" className="text-sm text-green-700 dark:text-green-400">Gespeichert</p>;
  return null;
}

function Knopf({ laeuft, children }: { laeuft: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={laeuft} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
      {laeuft ? "…" : children}
    </button>
  );
}

export function KategorieZeile({ kategorie }: { kategorie: Kategorie }) {
  const [status, absenden, laeuft] = useActionState(kategorieSpeichern, {});

  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="grid grid-cols-2 items-end gap-2 py-3 sm:grid-cols-[1fr_6rem_7rem_auto_auto]">
      <input type="hidden" name="id" value={kategorie.id} />
      <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
        <span className="text-xs text-neutral-500">Bezeichnung</span>
        <input name="bezeichnung" defaultValue={kategorie.bezeichnung} required className={feld} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">MwSt %</span>
        {kategorie.beleg_erfassbar ? (
          <input name="mwst_prozent" inputMode="decimal" defaultValue={kategorie.mwst_prozent ?? ""} placeholder="wählbar" className={feld} />
        ) : (
          <>
            <input type="hidden" name="mwst_prozent" value="" />
            <span className="py-1.5 text-sm text-neutral-500">–</span>
          </>
        )}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">Konto</span>
        <input name="konto" inputMode="numeric" defaultValue={kategorie.konto ?? ""} className={feld} />
      </label>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" name="aktiv" defaultChecked={kategorie.aktiv} className="size-4" />
        aktiv
      </label>
      <div className="flex items-center gap-3">
        <Knopf laeuft={laeuft}>Speichern</Knopf>
        <Meldung status={status} />
      </div>
    </form>
  );
}

export function NeueKategorie({ abschnitt }: { abschnitt: Abschnitt }) {
  const [status, absenden, laeuft] = useActionState(kategorieSpeichern, {});

  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="grid grid-cols-2 items-end gap-2 pt-3 sm:grid-cols-[1fr_6rem_7rem_auto]">
      <input type="hidden" name="abschnitt" value={abschnitt} />
      <input type="hidden" name="aktiv" value="on" />
      <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
        <span className="text-xs text-neutral-500">Neue Kategorie</span>
        <input name="bezeichnung" required className={feld} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">MwSt %</span>
        <input name="mwst_prozent" inputMode="decimal" placeholder="wählbar" className={feld} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">Konto</span>
        <input name="konto" inputMode="numeric" className={feld} />
      </label>
      <div className="flex items-center gap-3">
        <Knopf laeuft={laeuft}>Anlegen</Knopf>
        <Meldung status={status} />
      </div>
    </form>
  );
}

function euro(cent: number): string {
  return (cent / 100).toFixed(2).replace(".", ",");
}

export function SaetzeFormular({ kmSatzCent, kmSteuerfreiCent }: { kmSatzCent: number; kmSteuerfreiCent: number }) {
  const [status, absenden, laeuft] = useActionState(saetzeSpeichern, {});

  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[10rem_10rem_auto]">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Km-Geld €/km</span>
        <input name="km_satz" inputMode="decimal" defaultValue={euro(kmSatzCent)} className={feld} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">davon steuerfrei €/km</span>
        <input name="km_steuerfrei" inputMode="decimal" defaultValue={euro(kmSteuerfreiCent)} className={feld} />
      </label>
      <div className="col-span-2 flex items-center gap-3 sm:col-span-1">
        <Knopf laeuft={laeuft}>Speichern</Knopf>
        <Meldung status={status} />
      </div>
    </form>
  );
}

export function BueroOrteFormular({ orte }: { orte: string[] }) {
  const [status, absenden, laeuft] = useActionState(bueroOrteSpeichern, {});

  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Orte der ersten Tätigkeitsstätte</span>
        <textarea name="buero_orte" rows={3} defaultValue={orte.join("\n")} placeholder={"Straße des Büros\nOrt"} className={feld} />
      </label>
      <div className="flex items-center gap-3">
        <Knopf laeuft={laeuft}>Speichern</Knopf>
        <Meldung status={status} />
      </div>
    </form>
  );
}

export function ErinnerungTesten() {
  const [status, absenden, laeuft] = useActionState(erinnerungTesten, {});
  return (
    <form action={absenden} className="flex flex-wrap items-center gap-3">
      <Knopf laeuft={laeuft}>Erinnerung an mich testen</Knopf>
      {status.gespeichert ? <p role="status" className="text-sm text-green-700 dark:text-green-400">Gesendet – bitte Postfach prüfen</p> : <Meldung status={status} />}
    </form>
  );
}
