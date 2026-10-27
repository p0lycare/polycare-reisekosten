"use client";

import { useActionState, useEffect, useRef } from "react";
import { ohneZuruecksetzen } from "@/lib/formular";
import type { Abschnitt, Kategorie } from "@/lib/reisekosten/kategorie";
import { erinnerungTesten, kategorieSpeichern, projektSpeichern, saetzeSpeichern, standortSpeichern, type AktionStatus } from "./actions";

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

export type StandortWerte = { id: string; name: string; orte: string[]; aktiv: boolean };

/** Ein Standort (erste Tätigkeitsstätte) bearbeiten bzw. ohne Werte neu anlegen */
export function StandortZeile({ standort }: { standort?: StandortWerte }) {
  const [status, absenden, laeuft] = useActionState(standortSpeichern, {});
  const neu = !standort;
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (neu && status.gespeichert) formRef.current?.reset();
  }, [neu, status]);

  return (
    <form ref={formRef} onSubmit={ohneZuruecksetzen(absenden)} className="grid grid-cols-1 items-end gap-2 py-3 sm:grid-cols-[12rem_1fr_auto_auto]">
      {standort && <input type="hidden" name="id" value={standort.id} />}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">Name</span>
        <input name="name" defaultValue={standort?.name} required placeholder={neu ? "Neuer Standort" : undefined} className={feld} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">Adresse bzw. Suchbegriffe, eine je Zeile</span>
        <textarea name="orte" rows={2} defaultValue={standort?.orte.join("\n")} placeholder={"Musterstraße 1\n12345 Musterstadt"} className={feld} />
      </label>
      {standort ? (
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="aktiv" defaultChecked={standort.aktiv} className="size-4" />
          aktiv
        </label>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-3">
        <Knopf laeuft={laeuft}>{neu ? "Anlegen" : "Speichern"}</Knopf>
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

export type ProjektWerte = {
  id: string;
  bezeichnung: string;
  nummer: string | null;
  foerdergeber: string | null;
  foerderkennzeichen: string | null;
  aktiv: boolean;
};

/** Ein Projekt bearbeiten bzw. (ohne Werte) neu anlegen */
export function ProjektZeile({ projekt }: { projekt?: ProjektWerte }) {
  const [status, absenden, laeuft] = useActionState(projektSpeichern, {});
  const neu = !projekt;
  const formRef = useRef<HTMLFormElement>(null);

  // Nach dem Anlegen leeren, damit nicht versehentlich ein zweites Projekt entsteht
  useEffect(() => {
    if (neu && status.gespeichert) formRef.current?.reset();
  }, [neu, status]);

  return (
    <form
      ref={formRef}
      onSubmit={ohneZuruecksetzen(absenden)}
      className="grid grid-cols-2 items-end gap-2 py-3 sm:grid-cols-[1fr_6rem_9rem_8rem_auto_auto]"
    >
      {projekt && <input type="hidden" name="id" value={projekt.id} />}
      <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
        <span className="text-xs text-neutral-500">Bezeichnung</span>
        <input name="bezeichnung" defaultValue={projekt?.bezeichnung} required placeholder={neu ? "Neues Projekt" : undefined} className={feld} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">Nummer</span>
        <input name="nummer" defaultValue={projekt?.nummer ?? ""} className={feld} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">Fördergeber</span>
        <input name="foerdergeber" defaultValue={projekt?.foerdergeber ?? ""} placeholder="z. B. BMBF" className={feld} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">Förderkennz.</span>
        <input name="foerderkennzeichen" defaultValue={projekt?.foerderkennzeichen ?? ""} className={feld} />
      </label>
      {projekt ? (
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="aktiv" defaultChecked={projekt.aktiv} className="size-4" />
          aktiv
        </label>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-3">
        <Knopf laeuft={laeuft}>{neu ? "Anlegen" : "Speichern"}</Knopf>
        <Meldung status={status} />
      </div>
    </form>
  );
}
