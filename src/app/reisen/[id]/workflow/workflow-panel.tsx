"use client";

import { aktuellerMonatBerlin } from "@/lib/reisekosten/monat";
import Link from "next/link";
import { useActionState, useState } from "react";
import { ohneZuruecksetzen } from "@/lib/formular";
import { useSprache, useTexte } from "@/lib/i18n/client";
import { monatsnameIn } from "@/lib/i18n/woerterbuch";
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


/**
 * Empfohlen: alle Reisen eines Monats gesammelt einreichen (eine Mail an die Führungskraft, ein Durchgang).
 * Einzeln einreichen bleibt möglich, z. B. wenn eine Reise schnell erstattet werden soll.
 */
function Einreichen({ id, betrag, monat }: { id: string; betrag: string; monat: string }) {
  const [status, absenden, laeuft] = useActionState(einreichen, {});
  const t = useTexte().workflow.panel.einreichen;
  const name = monatsnameIn(monat, useSprache());
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-700 dark:text-neutral-300">
        <span className="font-medium">{t.empfohlen}</span> {t.empfohlenText}
      </p>
      <div>
        <Link href={`/monat/${monat}`} className={`${knopf} inline-block`}>
          {t.gesammelt(name)}
        </Link>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-neutral-600 underline dark:text-neutral-400">{t.einzeln}</summary>
        <form onSubmit={ohneZuruecksetzen(absenden)} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="id" value={id} />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="richtigkeit" required className="mt-0.5 size-4" />
            <span>{t.richtigkeit}</span>
          </label>
          <Fehler status={status} />
          <div>
            <button type="submit" disabled={laeuft} className={knopfSekundaer}>
              {laeuft ? t.reichtEin : t.knopf(betrag)}
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}

function Ablehnen({ id, onAbbrechen }: { id: string; onAbbrechen: () => void }) {
  const [status, absenden, laeuft] = useActionState(ablehnen, {});
  const alle = useTexte();
  const t = alle.workflow.panel.ablehnen;
  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t.grund}</span>
        <textarea name="grund" required rows={2} className={feld} placeholder={t.grundPlatzhalter} />
      </label>
      <Fehler status={status} />
      <div className="flex gap-3">
        <button type="submit" disabled={laeuft} className={knopf}>
          {laeuft ? "…" : t.knopf}
        </button>
        <button type="button" onClick={onAbbrechen} className={knopfSekundaer}>
          {alle.allgemein.knopf.abbrechen}
        </button>
      </div>
    </form>
  );
}

function Genehmigen({ id }: { id: string }) {
  const [status, absenden, laeuft] = useActionState(genehmigen, {});
  const [ablehnung, setAblehnung] = useState(false);
  const p = useTexte().workflow.panel;
  const t = p.genehmigen;
  if (ablehnung) return <Ablehnen id={id} onAbbrechen={() => setAblehnung(false)} />;
  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t.kommentar}</span>
        <textarea name="kommentar" rows={2} maxLength={500} className={feld} placeholder={t.kommentarPlatzhalter} />
      </label>
      <Fehler status={status} />
      <div className="flex gap-3">
        <button type="submit" disabled={laeuft} className={knopf}>
          {laeuft ? "…" : t.knopf}
        </button>
        <button type="button" onClick={() => setAblehnung(true)} className={knopfSekundaer}>
          {p.ablehnen.oeffnen}
        </button>
      </div>
    </form>
  );
}

function Pruefen({ id }: { id: string }) {
  const [status, absenden, laeuft] = useActionState(pruefen, {});
  const [ablehnung, setAblehnung] = useState(false);
  const p = useTexte().workflow.panel;
  const t = p.pruefen;
  if (ablehnung) return <Ablehnen id={id} onAbbrechen={() => setAblehnung(false)} />;
  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {t.text}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t.buchungsmonat}</span>
          <input type="month" name="buchungsmonat" required defaultValue={aktuellerMonatBerlin()} className={feld} />
        </label>
      </div>
      <Fehler status={status} />
      <div className="flex gap-3">
        <button type="submit" disabled={laeuft} className={knopf}>
          {laeuft ? "…" : t.knopf}
        </button>
        <button type="button" onClick={() => setAblehnung(true)} className={knopfSekundaer}>
          {p.ablehnen.oeffnen}
        </button>
      </div>
    </form>
  );
}

function Zurueckziehen({ id }: { id: string }) {
  const [status, absenden, laeuft] = useActionState(zurueckziehen, {});
  const t = useTexte().workflow.panel.zurueckziehen;
  return (
    <form
      onSubmit={(e) => {
        if (!confirm(t.bestaetigen)) {
          e.preventDefault();
          return;
        }
        ohneZuruecksetzen(absenden)(e);
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t.text}</p>
      <Fehler status={status} />
      <div>
        <button type="submit" disabled={laeuft} className={knopfSekundaer}>
          {laeuft ? "…" : t.knopf}
        </button>
      </div>
    </form>
  );
}

function Auszahlen({ id, betrag }: { id: string; betrag: string }) {
  const [status, absenden, laeuft] = useActionState(auszahlen, {});
  const t = useTexte().workflow.panel.auszahlen;
  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <Fehler status={status} />
      <div>
        <button type="submit" disabled={laeuft} className={knopf}>
          {laeuft ? "…" : t.knopf(betrag)}
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
  const t = useTexte().workflow.panel;
  if (!rechte.einreichen && !rechte.zurueckziehen && !rechte.genehmigen && !rechte.pruefen && !rechte.auszahlen) return null;

  return (
    <section className="rounded-lg border-2 border-neutral-900 p-4 dark:border-neutral-100">
      <h2 className="mb-3 font-medium">
        {rechte.einreichen && t.titel.einreichen}
        {rechte.zurueckziehen && t.titel.zurueckziehen}
        {rechte.genehmigen && t.titel.genehmigen}
        {rechte.pruefen && t.titel.pruefen}
        {rechte.auszahlen && t.titel.auszahlen}
      </h2>
      {hinweise.length > 0 && !rechte.auszahlen && (
        <div className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <p className="font-medium">{rechte.einreichen ? t.hinweiseEinreichen : t.hinweisePruefung}</p>
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
