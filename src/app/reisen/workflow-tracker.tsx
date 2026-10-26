import type { ReiseStatus } from "@/lib/reisekosten/reise";

const SCHRITTE = ["Erfasst", "Eingereicht", "Genehmigt", "Geprüft · DATEV", "Ausgezahlt"];

const STUFE: Record<ReiseStatus, number> = {
  entwurf: 0,
  abgelehnt: 0,
  eingereicht: 1,
  freigegeben: 2,
  geprueft: 3,
  ausgezahlt: 4,
};

/** Was als Nächstes passiert – aus Sicht der reisenden Person */
const NAECHSTES: Record<ReiseStatus, string> = {
  entwurf: "Belege ergänzen und am Monatsende mit den anderen Reisen des Monats gesammelt einreichen.",
  abgelehnt: "Abgelehnt – bitte nach dem Hinweis korrigieren und erneut einreichen.",
  eingereicht: "Wartet auf die Genehmigung durch die Führungskraft. Bis dahin kannst du die Reise noch zurückziehen.",
  freigegeben: "Genehmigt – die Buchhaltung prüft die Belege und übergibt die Abrechnung an DATEV.",
  geprueft: "Geprüft und an DATEV übergeben – die Überweisung folgt über DATEV.",
  ausgezahlt: "Ausgezahlt – erledigt.",
};

/** Schrittleiste: wo die Reise im Ablauf steht und was als Nächstes passiert */
export function WorkflowTracker({ status }: { status: ReiseStatus }) {
  const stufe = STUFE[status];
  const abgelehnt = status === "abgelehnt";

  return (
    <section aria-label="Ablauf der Reise" className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <ol className="grid grid-cols-5 gap-1">
        {SCHRITTE.map((name, i) => {
          const erledigt = i < stufe || status === "ausgezahlt";
          const aktuell = i === stufe && status !== "ausgezahlt";
          return (
            <li key={name} className="flex flex-col items-center gap-1.5 text-center" aria-current={aktuell ? "step" : undefined}>
              <div className="flex w-full items-center">
                <span className={`h-0.5 flex-1 ${i === 0 ? "invisible" : erledigt || aktuell ? "bg-marke" : "bg-neutral-200 dark:bg-neutral-700"}`} />
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    erledigt
                      ? "bg-marke text-white"
                      : aktuell
                        ? abgelehnt
                          ? "border-2 border-red-600 text-red-700 dark:text-red-400"
                          : "border-2 border-marke text-marke-dunkel"
                        : "border border-neutral-300 text-neutral-400 dark:border-neutral-600"
                  }`}
                >
                  {erledigt ? "✓" : i + 1}
                </span>
                <span className={`h-0.5 flex-1 ${i === SCHRITTE.length - 1 ? "invisible" : erledigt ? "bg-marke" : "bg-neutral-200 dark:bg-neutral-700"}`} />
              </div>
              <span className={`text-[11px] leading-tight sm:text-xs ${aktuell || erledigt ? "text-neutral-800 dark:text-neutral-200" : "text-neutral-400"}`}>
                {name}
              </span>
            </li>
          );
        })}
      </ol>
      <p className={`text-sm ${abgelehnt ? "text-red-700 dark:text-red-400" : "text-neutral-600 dark:text-neutral-400"}`}>{NAECHSTES[status]}</p>
    </section>
  );
}
