import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ladeAbrechnung } from "@/lib/reisekosten/abrechnung-laden";
import { formatDatum, formatEuro } from "@/lib/format";
import { StatusBadge } from "./reisen/status-badge";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Auch Freigebende sehen hier nur ihre eigenen Reisen; die Freigabeansicht kommt separat
  const { data: reisen } = await supabase
    .from("reise")
    .select("*")
    .eq("mitarbeiter_id", user!.id)
    .order("beginn", { ascending: false });
  const abrechnungen = await Promise.all((reisen ?? []).map((r) => ladeAbrechnung(supabase, r)));
  const { count: imEingang } = await supabase
    .from("beleg_eingang")
    .select("id", { count: "exact", head: true })
    .eq("mitarbeiter_id", user!.id);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 font-sans">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Meine Reisen</h1>
        <div className="flex gap-2">
          <Link href="/belege" className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
            Beleg fotografieren
          </Link>
          <Link href="/reisen/neu" className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700">
            Neue Reise
          </Link>
        </div>
      </div>

      {!!imEingang && (
        <Link
          href="/belege"
          className="flex items-center justify-between rounded-lg bg-blue-50 p-4 text-sm text-blue-950 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-50 dark:hover:bg-blue-900"
        >
          <span>
            <span className="font-medium">{imEingang} {imEingang === 1 ? "Beleg wartet" : "Belege warten"}</span> im Eingang auf die Zuordnung zu einer Reise.
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}

      {!reisen?.length ? (
        <section className="rounded-lg border border-dashed border-neutral-300 p-6 dark:border-neutral-700">
          <h2 className="font-medium">So funktioniert&apos;s</h2>
          <ol className="mt-3 flex flex-col gap-3 text-sm text-neutral-700 dark:text-neutral-300">
            <li>
              <span className="font-medium">1. Belege fotografieren</span> – direkt nach dem Bezahlen. Betrag, Datum und MwSt
              werden ausgelesen, der Beleg wartet im Eingang.
            </li>
            <li>
              <span className="font-medium">2. Reisen anlegen</span> – am Monatsende, gern direkt aus einem Beleg. Die
              Verpflegungspauschale wird berechnet, Belege werden per Datum zugeordnet. Bei eigenem PKW die Kilometer eintragen.
            </li>
            <li>
              <span className="font-medium">3. Einreichen</span> – Genehmigung, Belegprüfung und Übergabe an DATEV laufen
              automatisch, du bekommst bei jedem Schritt eine Mail.
            </li>
          </ol>
          <Link href="/reisen/neu" className="mt-5 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
            Erste Reise anlegen
          </Link>
        </section>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {reisen.map((r, i) => {
            const abrechnung = abrechnungen[i];
            return (
              <li key={r.id}>
                <Link href={`/reisen/${r.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.begruendung}</p>
                    <p className="text-sm text-neutral-500">
                      {r.reiseweg} · {formatDatum(r.beginn)}
                      {r.beginn.slice(0, 10) !== r.ende.slice(0, 10) && ` – ${formatDatum(r.ende)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="tabular-nums">{formatEuro(abrechnung.auszuzahlen)}</span>
                    <StatusBadge status={r.status} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
