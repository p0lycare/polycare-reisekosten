import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { aktuellerMonatBerlin, monatsname } from "@/lib/reisekosten/monat";
import { istBearbeitbar } from "@/lib/reisekosten/reise";
import { formatEuro } from "@/lib/format";
import { SeitenHilfe } from "../seiten-hilfe";
import { StatusBadge } from "../reisen/status-badge";
import { AuslageErfassen } from "./auslage-erfassen";

/** "2026-10" → "2026-09" */
function vormonat(monat: string): string {
  const [jahr, mon] = monat.split("-").map(Number);
  return new Date(Date.UTC(jahr, mon - 2, 1)).toISOString().slice(0, 7);
}

export default async function AuslagenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: abrechnungen } = await supabase
    .from("reise")
    .select("id, beginn, status, beleg_nr")
    .eq("mitarbeiter_id", user!.id)
    .eq("art", "auslagen")
    .order("beginn", { ascending: false });
  const ids = (abrechnungen ?? []).map((a) => a.id);
  const { data: belege } = ids.length
    ? await supabase.from("beleg").select("reise_id, betrag_cent").in("reise_id", ids)
    : { data: [] as { reise_id: string; betrag_cent: number }[] };
  // Auslagen bestehen nur aus Belegen (kein Km-Geld, keine Pauschalen, kein Vorschuss) – die Summe ist die Auszahlung
  const eigene = (id: string) => (belege ?? []).filter((b) => b.reise_id === id);

  // Erfassen geht für den laufenden Monat und den Vormonat, solange dessen Abrechnung nicht eingereicht ist
  const aktuell = aktuellerMonatBerlin();
  const offeneMonate = [aktuell, vormonat(aktuell)].filter((m) => {
    const a = abrechnungen?.find((x) => x.beginn.slice(0, 7) === m);
    return !a || istBearbeitbar(a.status);
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Meine Auslagen</h1>
        <Link href="/belege" className="rounded-md bg-primaer hover:bg-primaer-hover px-4 py-2 text-sm font-medium text-white dark:text-neutral-950">
          Beleg fotografieren
        </Link>
      </div>

      <SeitenHilfe anker="reisende">
        Für privat vorgestreckte Einkäufe ohne Reise, z. B. im Baumarkt. Beleg fotografieren und im Eingang „Als Auslage erfassen“ –
        je Monat entsteht eine Auslagenabrechnung, die du unter „Monat abrechnen“ zusammen mit deinen Reisen einreichst.
      </SeitenHilfe>

      {!!offeneMonate.length && (
        <section className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="font-medium">Auslage ohne Foto im Eingang erfassen</h2>
          <AuslageErfassen monate={offeneMonate.map((m) => ({ wert: m, text: monatsname(m) }))} />
          <p className="text-xs text-neutral-500">
            Ab 250 € brutto muss die Rechnung auf Polycare Research Technology GmbH ausgestellt sein (Vorsteuerabzug).
          </p>
        </section>
      )}

      {!abrechnungen?.length ? (
        <p className="text-sm text-neutral-500">Noch keine Auslagen.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {abrechnungen.map((a) => {
            const n = eigene(a.id).length;
            const monat = a.beginn.slice(0, 7);
            return (
              <li key={a.id} className="flex items-center justify-between gap-4 p-4">
                <Link href={`/reisen/${a.id}`} className="min-w-0 flex-1 hover:underline">
                  <p className="font-medium">{monatsname(monat)}</p>
                  <p className="text-sm text-neutral-500">
                    {n === 1 ? "1 Beleg" : `${n} Belege`}
                    {a.beleg_nr && ` · ${a.beleg_nr}`}
                  </p>
                </Link>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="tabular-nums">{formatEuro(eigene(a.id).reduce((s, b) => s + b.betrag_cent, 0))}</span>
                  <StatusBadge status={a.status} />
                  {istBearbeitbar(a.status) && n > 0 && (
                    <Link href={`/monat/${monat}`} className="text-xs underline">
                      Einreichen →
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
