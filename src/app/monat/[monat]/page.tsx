import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatEuro } from "@/lib/format";
import { ladeAbrechnung } from "@/lib/reisekosten/abrechnung-laden";
import { monatsgrenzen, monatsname } from "@/lib/reisekosten/monat";
import { pruefePlausibilitaet } from "@/lib/reisekosten/plausibilitaet";
import type { Mahlzeiten } from "@/lib/reisekosten/verpflegung";
import type { AusgelesenerBeleg } from "@/lib/ki/beleg-auslesen";
import { Suspense } from "react";
import { MonatsListe } from "./einreichen-formular";
import { KalenderVorschlaege } from "./kalender-vorschlaege";


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
      ? supabase.from("beleg").select("reise_id, kategorie_id, datum, betrag_cent, datei_pfad, beschreibung, kategorie(bezeichnung)").in("reise_id", ids)
      : Promise.resolve({ data: [] as never[] }),
    ids.length ? supabase.from("fahrt").select("reise_id, datum, km, km_route").in("reise_id", ids) : Promise.resolve({ data: [] as never[] }),
  ]);

  const liste = (reisen ?? []).map((r, i) => {
    const eigeneBelege = (belege ?? []).filter((b) => b.reise_id === r.id);
    return {
      id: r.id,
      art: r.art,
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
          land: r.land,
          art: r.art,
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
          beschreibung: b.beschreibung,
        })),
        (fahrten ?? []).filter((f) => f.reise_id === r.id),
      ),
    };
  });

  const gesamt = liste.reduce((s, r) => s + r.betrag, 0);
  const anzahlReisen = liste.filter((r) => r.art === "reise").length;
  const hatAuslagen = liste.some((r) => r.art === "auslagen");
  const eingangImMonat = (eingang ?? []).filter((e) => {
    const datum = (e.ki_ergebnis as AusgelesenerBeleg | null)?.datum;
    return !datum || (datum >= grenzen.von && datum < grenzen.bis);
  }).length;
  const titel = monatsname(monat);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4 font-sans sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/monat/${verschiebe(monat, -1)}`} aria-label="Vormonat" className="rounded-md border border-neutral-300 px-3 py-1.5 dark:border-neutral-700">
          ‹
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-semibold">{titel}</h1>
          <p className="text-sm text-neutral-500 tabular-nums">
            {anzahlReisen} {anzahlReisen === 1 ? "Reise" : "Reisen"}
            {hatAuslagen && " + Auslagen"} · {formatEuro(gesamt)}
          </p>
        </div>
        <Link href={`/monat/${verschiebe(monat, 1)}`} aria-label="Folgemonat" className="rounded-md border border-neutral-300 px-3 py-1.5 dark:border-neutral-700">
          ›
        </Link>
      </div>

      <section className="flex flex-col gap-2 bg-flaeche p-4 text-sm">
        <p className="font-medium">So rechnest du den Monat ab – am besten einmal am Monatsende:</p>
        <ol className="list-decimal space-y-1 pl-5 text-neutral-700 dark:text-neutral-300">
          <li>Belege aus dem Eingang den Reisen zuordnen – Einkäufe ohne Reise als Auslage erfassen.</li>
          <li>Fehlende Reisen anlegen – gern direkt aus den Vorschlägen aus deinem Kalender unten.</li>
          <li>Alle fertigen Reisen und Auslagen auswählen und gesammelt einreichen. Deine Führungskraft bekommt eine Mail und genehmigt alles in einem Schritt.</li>
        </ol>
        <p className="text-neutral-500">
          Einzelne Reisen kannst du auch sofort in der Reise einreichen.{" "}
          <Link href="/einfuehrung#reisende" className="underline">
            Mehr in der Hilfe
          </Link>
        </p>
      </section>

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
        <Link href="/belege" className="rounded-md bg-primaer hover:bg-primaer-hover px-4 py-2 text-sm font-medium text-white dark:text-neutral-950">
          Beleg fotografieren
        </Link>
        <Link href="/reisen/neu" className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700">
          Reise hinzufügen
        </Link>
        <Link href="/auslagen" className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700">
          Auslage erfassen
        </Link>
      </div>

      {!liste.length ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
          In diesem Monat sind noch keine Reisen oder Auslagen erfasst.
        </p>
      ) : (
        <MonatsListe monat={monat} reisen={liste} />
      )}

      <Suspense fallback={<p className="text-sm text-neutral-500">Kalender wird gelesen …</p>}>
        <KalenderVorschlaege von={grenzen.von} bis={grenzen.bis} />
      </Suspense>
    </main>
  );
}
