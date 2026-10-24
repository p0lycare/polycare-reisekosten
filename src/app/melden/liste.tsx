const ART_TEXT: Record<string, string> = { fehler: "Fehler", wunsch: "Wunsch", frage: "Frage" };
const STATUS: Record<string, { text: string; klasse: string }> = {
  offen: { text: "offen", klasse: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" },
  in_arbeit: { text: "in Arbeit", klasse: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100" },
  erledigt: { text: "erledigt", klasse: "bg-marke-hell text-marke-dunkel" },
};

const zeit = new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });

export type MeldungZeile = {
  id: string;
  art: string;
  text: string;
  seite: string | null;
  browser?: string | null;
  status: string;
  notiz: string | null;
  erstellt_am: string;
  name?: string;
};

/** Meldungen als Liste; mit `bearbeiten` bekommt jede Zeile die Admin-Steuerung */
export function MeldungsListe({ meldungen, bearbeiten }: { meldungen: MeldungZeile[]; bearbeiten?: (m: MeldungZeile) => React.ReactNode }) {
  return (
    <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {meldungen.map((m) => (
        <li key={m.id} className="flex flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`rounded px-2 py-0.5 text-xs ${STATUS[m.status]?.klasse ?? ""}`}>{STATUS[m.status]?.text ?? m.status}</span>
            <span className="font-medium">{ART_TEXT[m.art] ?? m.art}</span>
            {m.name && <span>· {m.name}</span>}
            <span className="text-neutral-500">· {zeit.format(new Date(m.erstellt_am))}</span>
            {m.seite && <span className="text-neutral-500">· {m.seite}</span>}
          </div>
          <p className="text-sm whitespace-pre-wrap">{m.text}</p>
          {m.notiz && !bearbeiten && <p className="text-sm text-neutral-600 dark:text-neutral-400">Antwort: {m.notiz}</p>}
          {m.browser && <p className="truncate text-xs text-neutral-400">{m.browser}</p>}
          {bearbeiten?.(m)}
        </li>
      ))}
    </ul>
  );
}
