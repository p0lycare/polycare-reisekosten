"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { meldungAbsenden, meldungBearbeiten, type MeldungStatus } from "./actions";

const ARTEN = [
  { wert: "fehler", text: "Fehler", hinweis: "Etwas funktioniert nicht oder rechnet falsch" },
  { wert: "wunsch", text: "Wunsch", hinweis: "Idee, was besser oder einfacher sein könnte" },
  { wert: "frage", text: "Frage", hinweis: "Unklar, wie etwas geht" },
];

const feld = "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900";

export function MeldeFormular({ seite }: { seite: string }) {
  const [status, absenden, laeuft] = useActionState<MeldungStatus, FormData>(meldungAbsenden, {});
  const [browser, setBrowser] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => setBrowser(navigator.userAgent), []);
  useEffect(() => {
    if (status.gesendet) formRef.current?.reset();
  }, [status]);

  return (
    <form ref={formRef} action={absenden} className="flex flex-col gap-5">
      <input type="hidden" name="seite" value={seite} />
      <input type="hidden" name="browser" value={browser} />
      <fieldset className="grid gap-2 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-medium">Worum geht es?</legend>
        {ARTEN.map((a, i) => (
          <label
            key={a.wert}
            className="flex cursor-pointer flex-col gap-0.5 rounded-md border border-neutral-300 p-3 has-[:checked]:border-marke has-[:checked]:bg-marke-hell dark:border-neutral-700"
          >
            <span className="flex items-center gap-2 font-medium">
              <input type="radio" name="art" value={a.wert} defaultChecked={i === 0} className="size-4" />
              {a.text}
            </span>
            <span className="text-xs text-neutral-500">{a.hinweis}</span>
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Beschreibung</span>
        <textarea
          name="text"
          required
          minLength={3}
          maxLength={4000}
          rows={6}
          placeholder="Was hast du gemacht, was ist passiert, was hättest du erwartet?"
          className={feld}
        />
        {seite && <span className="text-xs text-neutral-500">Gemeldet von der Seite {seite} – die Seite und dein Browser werden mitgeschickt.</span>}
      </label>
      {status.fehler && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{status.fehler}</p>}
      {status.gesendet && (
        <p role="status" className="rounded-md bg-marke-hell p-3 text-sm text-marke-dunkel">
          Danke! Deine Meldung ist angekommen – du siehst ihren Stand unten.
        </p>
      )}
      <div>
        <button type="submit" disabled={laeuft} className="rounded-md bg-primaer px-4 py-2 font-medium text-white hover:bg-primaer-hover disabled:opacity-50 dark:text-neutral-950">
          {laeuft ? "Sendet …" : "Absenden"}
        </button>
      </div>
    </form>
  );
}

/** Admins: Status und Notiz einer Meldung ändern */
export function MeldungBearbeiten({ id, status: aktuell, notiz }: { id: string; status: string; notiz: string | null }) {
  const [status, absenden, laeuft] = useActionState<MeldungStatus, FormData>(meldungBearbeiten, {});
  return (
    <form action={absenden} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <select name="status" defaultValue={aktuell} className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900">
        <option value="offen">offen</option>
        <option value="in_arbeit">in Arbeit</option>
        <option value="erledigt">erledigt</option>
      </select>
      <input
        name="notiz"
        defaultValue={notiz ?? ""}
        maxLength={2000}
        placeholder="Notiz (sieht auch die meldende Person)"
        className="min-w-48 flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />
      <button type="submit" disabled={laeuft} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
        {laeuft ? "…" : "Speichern"}
      </button>
      {status.gesendet && <span className="text-sm text-green-700 dark:text-green-400">Gespeichert</span>}
      {status.fehler && <span className="text-sm text-red-700 dark:text-red-400">{status.fehler}</span>}
    </form>
  );
}
