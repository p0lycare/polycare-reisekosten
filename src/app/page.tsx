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

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 font-sans">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Meine Reisen</h1>
        <Link href="/reisen/neu" className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
          Neue Reise
        </Link>
      </div>

      {!reisen?.length ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500 dark:border-neutral-700">
          Noch keine Reisen erfasst.
        </p>
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
