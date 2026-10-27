import Link from "next/link";
import { SeitenHilfe } from "@/app/seiten-hilfe";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDatum, formatEuro } from "@/lib/format";
import { ladeAbrechnung } from "@/lib/reisekosten/abrechnung-laden";
import { istFreigebend } from "@/lib/reisekosten/freigaben";
import { monatsgrenzen, monatsname } from "@/lib/reisekosten/monat";
import { STATUS_TEXT, type ReiseStatus } from "@/lib/reisekosten/reise";
import { StatusBadge } from "@/app/reisen/status-badge";

const REIHENFOLGE: ReiseStatus[] = ["eingereicht", "abgelehnt", "freigegeben", "geprueft", "ausgezahlt"];

function verschiebe(monat: string, delta: number): string {
  const [j, m] = monat.split("-").map(Number);
  return new Date(Date.UTC(j, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

/**
 * Monatsübersicht für Führungskräfte (eigenes Team, über die Leseregeln) und Buchhaltung (alle):
 * Stand je Person und Status, für die Buchhaltung mit DATEV-Status.
 */
export default async function UebersichtPage({ params }: { params: Promise<{ monat: string }> }) {
  const { monat } = await params;
  const grenzen = monatsgrenzen(monat);
  if (!grenzen) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profile").select("rolle").eq("id", user!.id).single();
  if (!istFreigebend(profil?.rolle)) redirect("/");
  const buchhaltung = profil?.rolle === "buchhaltung" || profil?.rolle === "admin";

  // Entwürfe gehören den Reisenden; eigene Reisen stehen unter "Meine Reisen"
  const { data: reisen } = await supabase
    .from("reise")
    .select("*, mitarbeiter:profile!reise_mitarbeiter_id_fkey(name)")
    .neq("status", "entwurf")
    .neq("mitarbeiter_id", user!.id)
    .gte("beginn", grenzen.von)
    .lt("beginn", grenzen.bis)
    .order("beginn");

  const ids = (reisen ?? []).map((r) => r.id);
  const [abrechnungen, { data: datev }] = await Promise.all([
    Promise.all((reisen ?? []).map((r) => ladeAbrechnung(supabase, r))),
    buchhaltung && ids.length
      ? supabase.from("mail_protokoll").select("reise_id, status, zeit").eq("art", "datev").in("reise_id", ids).order("zeit", { ascending: false })
      : Promise.resolve({ data: [] as { reise_id: string | null; status: string; zeit: string }[] }),
  ]);
  const datevStatus = new Map<string, string>();
  for (const d of datev ?? []) if (d.reise_id && !datevStatus.has(d.reise_id)) datevStatus.set(d.reise_id, d.status);

  const zeilen = (reisen ?? []).map((r, i) => ({ reise: r, betrag: abrechnungen[i].auszuzahlen }));
  const proStatus = REIHENFOLGE.map((s) => {
    const z = zeilen.filter((x) => x.reise.status === s);
    return { status: s, anzahl: z.length, summe: z.reduce((t, x) => t + x.betrag, 0) };
  });
  const personen = new Map<string, { name: string; zeilen: typeof zeilen }>();
  for (const z of zeilen) {
    const p = personen.get(z.reise.mitarbeiter_id) ?? { name: z.reise.mitarbeiter?.name ?? "", zeilen: [] };
    p.zeilen.push(z);
    personen.set(z.reise.mitarbeiter_id, p);
  }
  const sortiert = [...personen.values()].sort((a, b) => a.name.localeCompare(b.name, "de"));
  const gesamt = zeilen.reduce((s, z) => s + z.betrag, 0);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-4 font-sans sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/uebersicht/${verschiebe(monat, -1)}`} aria-label="Vormonat" className="rounded-md border border-neutral-300 px-3 py-1.5 dark:border-neutral-700">
          ‹
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-semibold">
            {buchhaltung ? "Übersicht" : "Team"} {monatsname(monat)}
          </h1>
          <p className="text-sm text-neutral-500 tabular-nums">
            {zeilen.length} {zeilen.length === 1 ? "Reise" : "Reisen"} · {formatEuro(gesamt)}
          </p>
        </div>
        <Link href={`/uebersicht/${verschiebe(monat, 1)}`} aria-label="Folgemonat" className="rounded-md border border-neutral-300 px-3 py-1.5 dark:border-neutral-700">
          ›
        </Link>
      </div>

      <SeitenHilfe anker={buchhaltung ? "buchhaltung" : "fuehrungskraefte"}>
        Stand aller eingereichten Reisen {buchhaltung ? "" : "deines Teams "}im Monat (nach Reisebeginn) – wer wo im Ablauf steht
        {buchhaltung ? " und ob die Übertragung an DATEV geklappt hat" : ""}.
      </SeitenHilfe>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {proStatus.map((s) => (
          <div key={s.status} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
            <p className="text-xs text-neutral-500">{STATUS_TEXT[s.status]}</p>
            <p className="text-lg font-semibold tabular-nums">{s.anzahl}</p>
            <p className="text-xs text-neutral-500 tabular-nums">{formatEuro(s.summe)}</p>
          </div>
        ))}
      </div>

      {!sortiert.length ? (
        <p className="text-sm text-neutral-500">Keine eingereichten Reisen in diesem Monat.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {sortiert.map((p) => (
            <section key={p.name} className="rounded-lg border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-baseline justify-between gap-3 border-b border-neutral-200 p-4 dark:border-neutral-800">
                <h2 className="font-medium">{p.name}</h2>
                <span className="tabular-nums">{formatEuro(p.zeilen.reduce((s, z) => s + z.betrag, 0))}</span>
              </div>
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {p.zeilen.map(({ reise: r, betrag }) => (
                  <li key={r.id}>
                    <Link href={`/reisen/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                      <span className="min-w-0">
                        <span className="block truncate">{r.begruendung}</span>
                        <span className="block truncate text-xs text-neutral-500">
                          {r.reiseweg ? `${formatDatum(r.beginn)} · ${r.reiseweg}` : "Auslagen ohne Reise"}
                          {r.beleg_nr && ` · ${r.beleg_nr}`}
                          {buchhaltung && (r.status === "geprueft" || r.status === "ausgezahlt") && (
                            <span className={datevStatus.get(r.id) === "gesendet" ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}>
                              {" "}
                              · DATEV {datevStatus.get(r.id) === "gesendet" ? "übertragen" : "offen"}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="tabular-nums">{formatEuro(betrag)}</span>
                        <StatusBadge status={r.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
