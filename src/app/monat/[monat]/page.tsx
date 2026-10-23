import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatEuro } from "@/lib/format";
import { ladeAbrechnung } from "@/lib/reisekosten/abrechnung-laden";
import { monatsgrenzen } from "@/lib/reisekosten/lohnliste";
import { pruefePlausibilitaet } from "@/lib/reisekosten/plausibilitaet";
import type { Mahlzeiten } from "@/lib/reisekosten/verpflegung";
import type { AusgelesenerBeleg } from "@/lib/ki/beleg-auslesen";
import { MonatsListe } from "./einreichen-formular";

const MONATSNAME = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });

function verschiebe(monat: string, delta: number): string {
  const [j, m] = monat.split("-").map(Number);
  const d = new Date(Date.UTC(j, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export default async function MonatPage({ params }: { params: Promise<{ monat: string }> }) {
  const { monat } = await params;
  const grenzen = monatsgrenzen(monat);
  if (!grenzen) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: reisen }, { data: eingang }] = await Promise.all([
    supabase
      .from("reise")
      .select("*")
      .eq("mitarbeiter_id", user!.id)
      .gte("beginn", grenzen.von)
      .lt("beginn", grenzen.bis)
      .order("beginn"),
    supabase.from("beleg_eingang").select("ki_ergebnis").eq("mitarbeiter_id", user!.id),
  ]);

  const ids = (reisen ?? []).map((r) => r.id);
  const [abrechnungen, { data: belege }, { data: fahrten }] = await Promise.all([
    Promise.all((reisen ?? []).map((r) => ladeAbrechnung(supabase, r))),
    ids.length
      ? supabase.from("beleg").select("reise_id, kategorie_id, datum, betrag_cent, datei_pfad, kategorie(bezeichnung)").in("reise_id", ids)
      : Promise.resolve({ data: [] as never[] }),
    ids.length ? supabase.from("fahrt").select("reise_id, datum").in("reise_id", ids) : Promise.resolve({ data: [] as never[] }),
  ]);

  const liste = (reisen ?? []).map((r, i) => {
    const eigeneBelege = (belege ?? []).filter((b) => b.reise_id === r.id);
    return {
      id: r.id,
      begruendung: r.begruendung,
      reiseweg: r.reiseweg,
      beginn: r.beginn,
      ende: r.ende,
      status: r.status,
      betrag: abrechnungen[i].auszuzahlen,
      anzahlBelege: eigeneBelege.length,
      hinweise: pruefePlausibilitaet(
        {
          beginn: r.beginn,
          ende: r.ende,
          mitUebernachtung: r.mit_uebernachtung,
          verkehrsmittel: r.verkehrsmittel,
          mahlzeiten: (r.mahlzeiten ?? {}) as Record<string, Mahlzeiten>,
        },
        eigeneBelege.map((b) => ({
          kategorieId: b.kategorie_id,
          bezeichnung: b.kategorie?.bezeichnung ?? b.kategorie_id,
          datum: b.datum,
          betragCent: b.betrag_cent,
          hatDatei: !!b.datei_pfad,
        })),
        (fahrten ?? []).filter((f) => f.reise_id === r.id),
      ),
    };
  });

  const gesamt = liste.reduce((s, r) => s + r.betrag, 0);
  const eingangImMonat = (eingang ?? []).filter((e) => {
    const datum = (e.ki_ergebnis as AusgelesenerBeleg | null)?.datum;
    return !datum || (datum >= grenzen.von && datum < grenzen.bis);
  }).length;
  const titel = MONATSNAME.format(new Date(`${monat}-01T00:00:00Z`));

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4 font-sans sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/monat/${verschiebe(monat, -1)}`} aria-label="Vormonat" className="rounded-md border border-neutral-300 px-3 py-1.5 dark:border-neutral-700">
          ‹
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-semibold">{titel}</h1>
          <p className="text-sm text-neutral-500 tabular-nums">
            {liste.length} {liste.length === 1 ? "Reise" : "Reisen"} · {formatEuro(gesamt)}
          </p>
        </div>
        <Link href={`/monat/${verschiebe(monat, 1)}`} aria-label="Folgemonat" className="rounded-md border border-neutral-300 px-3 py-1.5 dark:border-neutral-700">
          ›
        </Link>
      </div>

      {eingangImMonat > 0 && (
        <Link
          href="/belege"
          className="flex items-center justify-between rounded-lg bg-blue-50 p-4 text-sm text-blue-950 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-50 dark:hover:bg-blue-900"
        >
          <span>
            <span className="font-medium">
              {eingangImMonat} {eingangImMonat === 1 ? "Beleg" : "Belege"}
            </span>{" "}
            aus diesem Monat {eingangImMonat === 1 ? "liegt" : "liegen"} noch im Eingang – erst zuordnen, dann einreichen.
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href="/belege" className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
          Beleg fotografieren
        </Link>
        <Link href="/reisen/neu" className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700">
          Reise hinzufügen
        </Link>
      </div>

      {!liste.length ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
          In diesem Monat sind noch keine Reisen erfasst.
        </p>
      ) : (
        <MonatsListe monat={monat} reisen={liste} />
      )}
    </main>
  );
}
