"use client";

import { useActionState } from "react";
import { ohneZuruecksetzen } from "@/lib/formular";
import { useTexte } from "@/lib/i18n/client";
import { datevAdresseSpeichern, type DatevAdresseStatus } from "./actions";

const feld = "w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900";

/** Je eine DATEV-Upload-Mail-Adresse für Reisekosten und für Auslagen (in DATEV eigene Belegtypen) */
export function DatevAdresse({ reisekosten, auslagen }: { reisekosten: string; auslagen: string }) {
  const [status, absenden, laeuft] = useActionState<DatevAdresseStatus, FormData>(datevAdresseSpeichern, {});
  const t = useTexte().einstellungen;
  return (
    <form onSubmit={ohneZuruecksetzen(absenden)} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t.mail.datevReisekosten}</span>
          <input name="datev_upload_mail" type="email" defaultValue={reisekosten} placeholder={t.mail.datevReisekostenPlatzhalter} className={feld} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t.mail.datevAuslagen}</span>
          <input name="datev_upload_mail_auslagen" type="email" defaultValue={auslagen} placeholder={t.mail.datevAuslagenPlatzhalter} className={feld} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={laeuft} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
          {laeuft ? "…" : t.formular.speichern}
        </button>
        {status.gespeichert && <span role="status" className="text-sm text-green-700 dark:text-green-400">{t.formular.gespeichert}</span>}
        {status.fehler && <span role="alert" className="text-sm text-red-700 dark:text-red-400">{status.fehler}</span>}
      </div>
    </form>
  );
}
