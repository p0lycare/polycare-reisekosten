"use client";

import { aktuellerMonatBerlin } from "@/lib/reisekosten/monat";
import Link from "next/link";
import { useActionState, useState } from "react";
import { ohneZuruecksetzen } from "@/lib/formular";
import { ablehnen, auszahlen, einreichen, genehmigen, pruefen, zurueckziehen, type WorkflowStatus } from "./actions";

export type WorkflowRechte = {
  einreichen: boolean;
  zurueckziehen: boolean;
  genehmigen: boolean;
  pruefen: boolean;
  auszahlen: boolean;
};

const knopf =
  "rounded-md bg-primaer hover:bg-primaer-hover px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:text-neutral-950";
const knopfSekundaer =
  "rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800";
const feld =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

function Fehler({ status }: { status: WorkflowStatus }) {
  return status.fehler ? (
    <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
      {status.fehler}
    </p>
  ) : null;
}

const MONATSNAME = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * Empfohlen: alle Reisen eines Monats gesammelt einreichen (eine Mail an die Führungskraft, ein Durchgang).
 * Einzeln einreichen bleibt möglich, z. B. wenn eine Reise schnell erstattet werden soll.
 */
function Einreichen({ id, betrag, monat }: { id: string; betrag: string; monat: string }) {
  const [status, absenden, laeuft] = useActionState(einreichen, {});
  const name = MONATSNAME.format(new Date(`${monat}-01T00:00:00Z`));
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-700 dark:text-neutral-300">
        <span className="font-medium">Empfohlen:</span> Sammle alle Reisen und Auslagen eines Monats und reiche sie am Monatsende gemeinsam
        ein – deine Führungskraft genehmigt dann alles in einem Schritt.
      </p>
      <div>
        <Link href={`/monat/${monat}`} className={`${knopf} inline-block`}>
          {name} abrechnen und gesammelt einreichen
        </Link>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-neutral-600 underline dark:text-neutral-400">Jetzt einzeln einreichen</summary>
        <form onSubmit={ohneZuruecksetzen(absenden)} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="id" value={id} />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="richtigkeit" required className="mt-0.5 size-4" />
            <span>
              Für die Richtigkeit: Ich bestätige, dass die Angaben vollständig und richtig sind und die Kosten
              dienstlich veranlasst waren.
            </span>
          </label>
          <Fehler status={status} />
          <div>
            <button type="submit" disabled={laeuft} className={knopfSekundaer}>
              {laeuft ? "Reicht ein …" : `Einzeln zur Genehmigung einreichen (${betrag})`}
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}

function Ablehnen({ id, onAbbrechen }: { id: string; onAbbrechen: () => void }) {
  const [status, absenden, laeuft] = useActionState(ablehnen, {});
  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Grund der Ablehnung</span>
        <textarea name="grund" required rows={2} className={feld} placeholder="z. B. Hotelrechnung fehlt" />
      </label>
      <Fehler status={status} />
      <div className="flex gap-3">
        <button type="submit" disabled={laeuft} className={knopf}>
          {laeuft ? "…" : "Ablehnen"}
        </button>
        <button type="button" onClick={onAbbrechen} className={knopfSekundaer}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}

function Genehmigen({ id }: { id: string }) {
  const [status, absenden, laeuft] = useActionState(genehmigen, {});
  const [ablehnung, setAblehnung] = useState(false);
  if (ablehnung) return <Ablehnen id={id} onAbbrechen={() => setAblehnung(false)} />;
  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Kommentar (optional)</span>
        <textarea name="kommentar" rows={2} maxLength={500} className={feld} placeholder="z. B. Hinweis für die Buchhaltung" />
      </label>
      <Fehler status={status} />
      <div className="flex gap-3">
        <button type="submit" disabled={laeuft} className={knopf}>
          {laeuft ? "…" : "Genehmigen"}
        </button>
        <button type="button" onClick={() => setAblehnung(true)} className={knopfSekundaer}>
          Ablehnen …
        </button>
      </div>
    </form>
  );
}

function Pruefen({ id }: { id: string }) {
  const [status, absenden, laeuft] = useActionState(pruefen, {});
  const [ablehnung, setAblehnung] = useState(false);
  if (ablehnung) return <Ablehnen id={id} onAbbrechen={() => setAblehnung(false)} />;
  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Die Beleg-Nr. wird beim Prüfen fortlaufend vergeben. Danach gehen Abrechnung und Belege automatisch an DATEV.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Buchungsmonat</span>
          <input type="month" name="buchungsmonat" required defaultValue={aktuellerMonatBerlin()} className={feld} />
        </label>
      </div>
      <Fehler status={status} />
      <div className="flex gap-3">
        <button type="submit" disabled={laeuft} className={knopf}>
          {laeuft ? "…" : "Belege geprüft"}
        </button>
        <button type="button" onClick={() => setAblehnung(true)} className={knopfSekundaer}>
          Ablehnen …
        </button>
      </div>
    </form>
  );
}

function Zurueckziehen({ id }: { id: string }) {
  const [status, absenden, laeuft] = useActionState(zurueckziehen, {});
  return (
    <form
      onSubmit={(e) => {
        if (!confirm("Einreichung zurückziehen? Die Abrechnung wird wieder zum Entwurf und kann bearbeitet werden.")) {
          e.preventDefault();
          return;
        }
        ohneZuruecksetzen(absenden)(e);
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-neutral-600 dark:text-neutral-400">Zurückziehen macht die Abrechnung wieder zum Entwurf, den du korrigieren kannst.</p>
      <Fehler status={status} />
      <div>
        <button type="submit" disabled={laeuft} className={knopfSekundaer}>
          {laeuft ? "…" : "Einreichung zurückziehen"}
        </button>
      </div>
    </form>
  );
}

function Auszahlen({ id, betrag }: { id: string; betrag: string }) {
  const [status, absenden, laeuft] = useActionState(auszahlen, {});
  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <Fehler status={status} />
      <div>
        <button type="submit" disabled={laeuft} className={knopf}>
          {laeuft ? "…" : `In DATEV überwiesen – als ausgezahlt markieren (${betrag})`}
        </button>
      </div>
    </form>
  );
}

export function WorkflowPanel({
  id,
  rechte,
  betrag,
  hinweise,
  monat,
}: {
  id: string;
  rechte: WorkflowRechte;
  betrag: string;
  hinweise: string[];
  /** Monat der Reise ("YYYY-MM") für das gesammelte Einreichen */
  monat: string;
}) {
  if (!rechte.einreichen && !rechte.zurueckziehen && !rechte.genehmigen && !rechte.pruefen && !rechte.auszahlen) return null;

  return (
    <section className="rounded-lg border-2 border-neutral-900 p-4 dark:border-neutral-100">
      <h2 className="mb-3 font-medium">
        {rechte.einreichen && "Einreichen"}
        {rechte.zurueckziehen && "Eingereicht"}
        {rechte.genehmigen && "Genehmigung"}
        {rechte.pruefen && "Belegprüfung"}
        {rechte.auszahlen && "Auszahlung"}
      </h2>
      {hinweise.length > 0 && !rechte.auszahlen && (
        <div className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <p className="font-medium">{rechte.einreichen ? "Bitte vor dem Einreichen prüfen:" : "Hinweise zur Prüfung:"}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {hinweise.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>
      )}
      {rechte.einreichen && <Einreichen id={id} betrag={betrag} monat={monat} />}
      {rechte.zurueckziehen && <Zurueckziehen id={id} />}
      {rechte.genehmigen && <Genehmigen id={id} />}
      {rechte.pruefen && <Pruefen id={id} />}
      {rechte.auszahlen && <Auszahlen id={id} betrag={betrag} />}
    </section>
  );
}
