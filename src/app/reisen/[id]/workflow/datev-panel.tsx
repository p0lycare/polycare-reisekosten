"use client";

import { useActionState } from "react";
import { ohneZuruecksetzen } from "@/lib/formular";
import { erneutAnDatev } from "./actions";

export type DatevEintrag = { zeit: string; status: string; fehler: string | null } | null;

export function DatevPanel({ id, letzter }: { id: string; letzter: DatevEintrag }) {
  const [status, absenden, laeuft] = useActionState(erneutAnDatev, {});

  return (
    <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="font-medium">DATEV</h2>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        {!letzter
          ? "Noch nicht an DATEV übertragen."
          : letzter.status === "gesendet"
            ? `An DATEV übertragen am ${letzter.zeit}.`
            : `Übertragung am ${letzter.zeit} fehlgeschlagen${letzter.fehler ? `: ${letzter.fehler}` : "."}`}
      </p>
      <form
        onSubmit={(e) => {
          // Jeder Versand legt in DATEV einen neuen Beleg an – auch wenn vorher nur ein Teil angekommen ist
          const teilweise = letzter?.status === "fehler" && !!letzter.fehler?.includes("bereits zugestellt");
          if (
            (letzter?.status === "gesendet" || teilweise) &&
            !confirm(
              teilweise
                ? "Ein Teil der Abrechnung ist bereits bei DATEV. Nochmals senden schickt alle Teile – die doppelten danach in DATEV löschen. Trotzdem senden?"
                : "Die Abrechnung wurde bereits übertragen. Nochmals senden erzeugt in DATEV einen zweiten Beleg. Trotzdem senden?",
            )
          ) {
            e.preventDefault();
            return;
          }
          ohneZuruecksetzen(absenden)(e);
        }}
        className="mt-3 flex flex-wrap items-center gap-3"
      >
        <input type="hidden" name="id" value={id} />
        <button type="submit" disabled={laeuft} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
          {laeuft ? "Sendet …" : letzter?.status === "gesendet" ? "Erneut an DATEV senden" : "An DATEV senden"}
        </button>
        {"gesendet" in status && status.gesendet && <span role="status" className="text-sm text-green-700 dark:text-green-400">Gesendet</span>}
        {status.fehler && <span role="alert" className="text-sm text-red-700 dark:text-red-400">{status.fehler}</span>}
      </form>
    </section>
  );
}
