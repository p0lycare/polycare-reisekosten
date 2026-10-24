import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDatum, formatEuro } from "@/lib/format";
import { nettoAusBrutto } from "@/lib/reisekosten/mwst";
import { ABSCHNITT_TEXT, type Abschnitt } from "@/lib/reisekosten/kategorie";

export async function BelegListe({ reiseId, bearbeitbar }: { reiseId: string; bearbeitbar: boolean }) {
  const supabase = await createClient();
  const { data: belege } = await supabase
    .from("beleg")
    .select("*, kategorie(bezeichnung, abschnitt, sortierung)")
    .eq("reise_id", reiseId)
    .order("datum");

  const pfade = (belege ?? []).flatMap((b) => (b.datei_pfad ? [b.datei_pfad] : []));
  const { data: signiert } = pfade.length
    ? await supabase.storage.from("belege").createSignedUrls(pfade, 3600)
    : { data: [] };
  const urls = new Map((signiert ?? []).map((s) => [s.path, s.signedUrl]));

  const abschnitte = [...new Set((belege ?? []).map((b) => b.kategorie!.abschnitt as Abschnitt))].sort();
  const summe = (belege ?? []).reduce((s, b) => s + b.betrag_cent, 0);

  return (
    <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-medium">Belege</h2>
        {bearbeitbar && (
          <Link href={`/reisen/${reiseId}/belege/neu`} className="rounded-md bg-primaer hover:bg-primaer-hover px-3 py-1.5 text-sm font-medium text-white dark:text-neutral-950">
            Beleg hinzufügen
          </Link>
        )}
      </div>

      {!belege?.length ? (
        <p className="mt-2 text-sm text-neutral-500">Noch keine Belege.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          {abschnitte.map((a) => (
            <div key={a}>
              <h3 className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
                {a} – {ABSCHNITT_TEXT[a]}
              </h3>
              <ul className="mt-1 divide-y divide-neutral-100 dark:divide-neutral-800">
                {belege
                  .filter((b) => b.kategorie!.abschnitt === a)
                  .map((b) => {
                    const { netto, mwst } = nettoAusBrutto(b.betrag_cent, Number(b.mwst_prozent));
                    const url = b.datei_pfad ? urls.get(b.datei_pfad) : undefined;
                    const inhalt = (
                      <>
                        <div className="min-w-0">
                          <p className="truncate">
                            {b.kategorie!.bezeichnung}
                            {b.beschreibung && <span className="text-neutral-500"> · {b.beschreibung}</span>}
                          </p>
                          <p className="text-xs text-neutral-500 tabular-nums">
                            {formatDatum(b.datum)} · netto {formatEuro(netto)} + {String(Number(b.mwst_prozent)).replace(".", ",")} % {formatEuro(mwst)}
                            {!b.datei_pfad && " · ohne Beleg"}
                          </p>
                        </div>
                        <span className="shrink-0 tabular-nums">{formatEuro(b.betrag_cent)}</span>
                      </>
                    );
                    return (
                      <li key={b.id} className="flex items-center gap-3 py-2">
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-neutral-600 underline dark:text-neutral-400">
                            Beleg
                          </a>
                        ) : (
                          <span className="w-[2.1rem] shrink-0" />
                        )}
                        {bearbeitbar ? (
                          <Link href={`/reisen/${reiseId}/belege/${b.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-4 hover:underline">
                            {inhalt}
                          </Link>
                        ) : (
                          <div className="flex min-w-0 flex-1 items-center justify-between gap-4">{inhalt}</div>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
          <div className="flex justify-between border-t border-neutral-300 pt-2 font-medium dark:border-neutral-700">
            <span>Summe Belege</span>
            <span className="tabular-nums">{formatEuro(summe)}</span>
          </div>
        </div>
      )}
    </section>
  );
}
