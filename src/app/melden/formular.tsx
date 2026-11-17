"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTexte } from "@/lib/i18n/client";
import { meldungAbsenden, meldungBearbeiten, type MeldungStatus } from "./actions";

const ARTEN = ["fehler", "wunsch", "frage"] as const;

const feld = "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900";

export function MeldeFormular({ seite }: { seite: string }) {
  const [status, absenden, laeuft] = useActionState<MeldungStatus, FormData>(meldungAbsenden, {});
  const [browser, setBrowser] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const t = useTexte().melden;

  useEffect(() => setBrowser(navigator.userAgent), []);
  useEffect(() => {
    if (status.gesendet) formRef.current?.reset();
  }, [status]);

  return (
    <form ref={formRef} action={absenden} className="flex flex-col gap-5">
      <input type="hidden" name="seite" value={seite} />
      <input type="hidden" name="browser" value={browser} />
      <fieldset className="grid gap-2 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-medium">{t.formular.worum}</legend>
        {ARTEN.map((a, i) => (
          <label
            key={a}
            className="flex cursor-pointer flex-col gap-0.5 rounded-md border border-neutral-300 p-3 has-[:checked]:border-marke has-[:checked]:bg-marke-hell dark:border-neutral-700"
          >
            <span className="flex items-center gap-2 font-medium">
              <input type="radio" name="art" value={a} defaultChecked={i === 0} className="size-4" />
              {t.art[a]}
            </span>
            <span className="text-xs text-neutral-500">{t.artHinweis[a]}</span>
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t.formular.beschreibung}</span>
        <textarea
          name="text"
          required
          minLength={3}
          maxLength={4000}
          rows={6}
          placeholder={t.formular.platzhalter}
          className={feld}
        />
        {seite && <span className="text-xs text-neutral-500">{t.formular.gemeldetVon(seite)}</span>}
      </label>
      {status.fehler && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{status.fehler}</p>}
      {status.gesendet && (
        <p role="status" className="rounded-md bg-marke-hell p-3 text-sm text-marke-dunkel">
          {t.formular.danke}
        </p>
      )}
      <div>
        <button type="submit" disabled={laeuft} className="rounded-md bg-primaer px-4 py-2 font-medium text-white hover:bg-primaer-hover disabled:opacity-50 dark:text-neutral-950">
          {laeuft ? t.formular.sendet : t.formular.absenden}
        </button>
      </div>
    </form>
  );
}

/** Admins: Status und Notiz einer Meldung ändern */
export function MeldungBearbeiten({ id, status: aktuell, notiz }: { id: string; status: string; notiz: string | null }) {
  const [status, absenden, laeuft] = useActionState<MeldungStatus, FormData>(meldungBearbeiten, {});
  const alle = useTexte();
  const t = alle.melden;
  return (
    <form action={absenden} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <select name="status" defaultValue={aktuell} className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900">
        <option value="offen">{t.status.offen}</option>
        <option value="in_arbeit">{t.status.in_arbeit}</option>
        <option value="erledigt">{t.status.erledigt}</option>
      </select>
      <input
        name="notiz"
        defaultValue={notiz ?? ""}
        maxLength={2000}
        placeholder={t.bearbeiten.notizPlatzhalter}
        className="min-w-48 flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />
      <button type="submit" disabled={laeuft} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
        {laeuft ? "…" : alle.allgemein.knopf.speichern}
      </button>
      {status.gesendet && <span className="text-sm text-green-700 dark:text-green-400">{t.bearbeiten.gespeichert}</span>}
      {status.fehler && <span className="text-sm text-red-700 dark:text-red-400">{status.fehler}</span>}
    </form>
  );
}
