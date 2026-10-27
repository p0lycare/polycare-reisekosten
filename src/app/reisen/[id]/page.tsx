import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { istBearbeitbar, verpflegungFuer, VERKEHRSMITTEL_TEXT } from "@/lib/reisekosten/reise";
import { formatDatum, formatDatumZeit, formatEuro, wochentag } from "@/lib/format";
import { StatusBadge } from "../status-badge";
import { BelegListe } from "./beleg-liste";
import { FahrtenListe } from "./fahrten/fahrten-liste";
import { LoeschenButton } from "./loeschen-button";
import { AbrechnungUebersicht } from "./abrechnung-uebersicht";
import { ladeAbrechnung } from "@/lib/reisekosten/abrechnung-laden";
import { WorkflowPanel } from "./workflow/workflow-panel";
import { WorkflowTracker } from "../workflow-tracker";
import { VorschussBeantragen, VorschussZurueckziehen } from "@/app/vorschuss/formulare";
import { Verlauf } from "./workflow/verlauf";
import { DatevPanel } from "./workflow/datev-panel";
import { pruefePlausibilitaet } from "@/lib/reisekosten/plausibilitaet";
import type { Mahlzeiten } from "@/lib/reisekosten/verpflegung";
import { istAusland, landName } from "@/lib/reisekosten/laender";
import { projektName } from "@/lib/reisekosten/projekte";
import { monatsname } from "@/lib/reisekosten/monat";
import { Bereich } from "@/app/bereich";
import { fehlendeAngabenText } from "@/lib/reisekosten/pflichtangaben";

// Belegprüfung und erneuter DATEV-Versand laufen von hier: PDF bauen und große Mails hochladen braucht Zeit
export const maxDuration = 300;

export default async function ReisePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ gespeichert?: string }>;
}) {
  const { id } = await params;
  const { gespeichert } = await searchParams;
  const supabase = await createClient();
  const { data: reise } = await supabase.from("reise").select("*").eq("id", id).maybeSingle();
  if (!reise) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const eigene = reise.mitarbeiter_id === user?.id;
  // Auslagenabrechnung (FB 21): nur Belege – ohne Reiseweg, Fahrten, Verpflegung und Vorschuss
  const istAuslagen = reise.art === "auslagen";
  const verpflegung = verpflegungFuer(reise);
  const [abrechnung, { data: profil }] = await Promise.all([
    ladeAbrechnung(supabase, reise),
    supabase.from("profile").select("rolle").eq("id", user!.id).single(),
  ]);
  const istBuchhaltung = profil?.rolle === "buchhaltung" || profil?.rolle === "admin";
  const zeigeKonten = istBuchhaltung;

  const { data: projekt } = reise.projekt_id
    ? await supabase.from("projekt").select("id, bezeichnung, nummer").eq("id", reise.projekt_id).maybeSingle()
    : { data: null };
  const { data: vorschuss } = await supabase
    .from("vorschuss")
    .select("id, betrag_cent, status, ablehnungsgrund, ausgezahlt_am")
    .eq("reise_id", reise.id)
    .order("beantragt_am", { ascending: false })
    .limit(1)
    .maybeSingle();
  const [{ data: darfGenehmigen }, { data: reisender }] = await Promise.all([
    reise.status === "eingereicht" && !eigene
      ? supabase.rpc("darf_genehmigen", { p_mitarbeiter: reise.mitarbeiter_id })
      : Promise.resolve({ data: false }),
    eigene ? Promise.resolve({ data: null }) : supabase.from("profile").select("name, rolle").eq("id", reise.mitarbeiter_id).single(),
  ]);
  const rechte = {
    einreichen: eigene && istBearbeitbar(reise.status),
    zurueckziehen: eigene && reise.status === "eingereicht",
    genehmigen: !!darfGenehmigen,
    // Vier-Augen-Prinzip: wer genehmigt hat, prüft nicht – außer bei Reisen der Geschäftsführung
    pruefen:
      !eigene &&
      istBuchhaltung &&
      reise.status === "freigegeben" &&
      (reise.freigeber_id !== user?.id || reisender?.rolle === "admin" || reisender?.rolle === "buchhaltung"),
    auszahlen: !eigene && istBuchhaltung && reise.status === "geprueft",
  };

  const zeigeDatev = istBuchhaltung && (reise.status === "geprueft" || reise.status === "ausgezahlt");
  const { data: datevLetzter } = zeigeDatev
    ? await supabase
        .from("mail_protokoll")
        .select("zeit, status, fehler")
        .eq("reise_id", reise.id)
        .eq("art", "datev")
        .order("zeit", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const zeigeHinweise = rechte.einreichen || rechte.genehmigen || rechte.pruefen;
  const [{ data: plausiBelege }, { data: plausiFahrten }] = zeigeHinweise
    ? await Promise.all([
        supabase.from("beleg").select("kategorie_id, datum, betrag_cent, datei_pfad, beschreibung, anlass, person, kfz_kennzeichen, kategorie(bezeichnung, abschnitt, pflichtangaben)").eq("reise_id", reise.id),
        supabase.from("fahrt").select("datum, km, km_route").eq("reise_id", reise.id),
      ])
    : [{ data: null }, { data: null }];
  const hinweise = zeigeHinweise
    ? pruefePlausibilitaet(
        {
          beginn: reise.beginn,
          land: reise.land,
          art: reise.art,
          ende: reise.ende,
          mitUebernachtung: reise.mit_uebernachtung,
          verkehrsmittel: reise.verkehrsmittel,
          mahlzeiten: (reise.mahlzeiten ?? {}) as Record<string, Mahlzeiten>,
        },
        (plausiBelege ?? []).map((b) => ({
          kategorieId: b.kategorie_id,
          bezeichnung: b.kategorie?.bezeichnung ?? b.kategorie_id,
          datum: b.datum,
          betragCent: b.betrag_cent,
          hatDatei: !!b.datei_pfad,
          beschreibung: b.beschreibung,
          fehlendeAngaben: fehlendeAngabenText(b),
        })),
        plausiFahrten ?? [],
      )
    : [];

  const zeitraum =
    formatDatum(reise.beginn) === formatDatum(reise.ende)
      ? `${formatDatumZeit(reise.beginn)} – ${reise.ende.slice(11, 16)}`
      : `${formatDatumZeit(reise.beginn)} – ${formatDatumZeit(reise.ende)}`;
  const verkehrsmittelText =
    reise.verkehrsmittel
      .map((v) =>
        v === "eigener_pkw" && reise.kfz_kennzeichen
          ? `${VERKEHRSMITTEL_TEXT[v]} (${reise.kfz_kennzeichen})`
          : v === "mitfahrt" && reise.mitfahrt_bei
            ? `${VERKEHRSMITTEL_TEXT[v]} bei ${reise.mitfahrt_bei}`
            : VERKEHRSMITTEL_TEXT[v],
      )
      .join(", ") || "–";
  const bearbeitbar = eigene && istBearbeitbar(reise.status);
  const knopfSekundaer =
    "rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800";
  const GESPEICHERT: Record<string, string> = {
    reise: "Reise gespeichert.",
    beleg: "Beleg gespeichert.",
    belege: "Belege angelegt.",
  };

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-5 p-4 font-sans sm:p-6">
      {istAuslagen && eigene && <Bereich reiter="/auslagen" />}
      <Link
        href={eigene ? (istAuslagen ? "/auslagen" : `/monat/${reise.beginn.slice(0, 7)}`) : "/freigaben"}
        className="text-sm text-neutral-600 underline dark:text-neutral-400"
      >
        {eigene ? (istAuslagen ? "← Meine Auslagen" : "← Monatsübersicht") : "← Freigaben"}
      </Link>

      {gespeichert && GESPEICHERT[gespeichert] && (
        <p role="status" className="rounded-md bg-marke-hell p-3 text-sm text-marke-dunkel">
          ✓ {GESPEICHERT[gespeichert]}
        </p>
      )}

      {/* Kopfbereich: worum geht es, was kostet es, was ist als Nächstes zu tun */}
      <section className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={reise.status} />
              {reise.beleg_nr && <span className="text-xs text-neutral-500">{reise.beleg_nr}</span>}
            </div>
            <h1 className="mt-2 text-2xl font-semibold">{reise.begruendung}</h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              {istAuslagen ? "Auslagenabrechnung" : reise.reiseweg}
              {istAusland(reise.land) && ` · ${landName(reise.land, Number(reise.beginn.slice(0, 4)))}`}
              {reise.besuchte_stellen && ` · ${reise.besuchte_stellen}`}
            </p>
            {projekt && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Projekt: {projektName(projekt)}</p>}
            {reisender && <p className="mt-1 text-sm font-medium">{reisender.name}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-500">{abrechnung.auszuzahlen < 0 ? "Rückzahlung" : "Auszuzahlen"}</p>
            <p className="text-3xl font-semibold tabular-nums">{formatEuro(Math.abs(abrechnung.auszuzahlen))}</p>
          </div>
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
          {istAuslagen ? (
            <>
              <dt className="text-neutral-500">Monat</dt>
              <dd>{monatsname(reise.beginn.slice(0, 7))}</dd>
            </>
          ) : (
            <>
              <dt className="text-neutral-500">Zeitraum</dt>
              <dd>
                {zeitraum}
                {reise.mit_uebernachtung ? " · mit Übernachtung" : ""}
              </dd>
              <dt className="text-neutral-500">Verkehrsmittel</dt>
              <dd>{verkehrsmittelText}</dd>
            </>
          )}
          {reise.kostenstelle && (
            <>
              <dt className="text-neutral-500">Kostenstelle</dt>
              <dd>{reise.kostenstelle}</dd>
            </>
          )}
          {reise.buchungsmonat && (
            <>
              <dt className="text-neutral-500">Buchungsmonat</dt>
              <dd>
                {reise.buchungsmonat.slice(5, 7)}/{reise.buchungsmonat.slice(0, 4)}
              </dd>
            </>
          )}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {bearbeitbar && (
            <>
              <Link href={`/reisen/${reise.id}/belege/neu`} className="rounded-md bg-primaer hover:bg-primaer-hover px-3 py-1.5 text-sm font-medium text-white dark:text-neutral-950">
                {istAuslagen ? "Auslage hinzufügen" : "Beleg hinzufügen"}
              </Link>
              {!istAuslagen && (
                <Link href={`/reisen/${reise.id}/bearbeiten`} className={knopfSekundaer}>
                  Bearbeiten
                </Link>
              )}
            </>
          )}
          <a href={`/reisen/${reise.id}/pdf`} target="_blank" rel="noreferrer" className={knopfSekundaer}>
            PDF
          </a>
          {eigene && !istAuslagen && (
            <Link href={`/reisen/neu?vorlage=${reise.id}`} className={knopfSekundaer}>
              Als Vorlage
            </Link>
          )}
          {eigene && reise.status === "entwurf" && !(vorschuss && ["genehmigt", "ausgezahlt"].includes(vorschuss.status)) && <LoeschenButton id={reise.id} />}
        </div>
      </section>

      <WorkflowTracker status={reise.status} auslagen={istAuslagen} />

      {reise.status === "abgelehnt" && reise.ablehnungsgrund && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          Abgelehnt: {reise.ablehnungsgrund}
        </p>
      )}

      <WorkflowPanel id={reise.id} rechte={rechte} betrag={formatEuro(abrechnung.auszuzahlen)} hinweise={hinweise} monat={reise.beginn.slice(0, 7)} />

      {!istAuslagen && (vorschuss || (eigene && reise.status === "entwurf")) && (
        <section className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
          <h2 className="font-medium">Vorschuss</h2>
          {vorschuss?.status === "beantragt" && (
            <>
              <p>{formatEuro(vorschuss.betrag_cent)} beantragt – wartet auf die Genehmigung.</p>
              {eigene && <VorschussZurueckziehen id={vorschuss.id} reiseId={reise.id} />}
            </>
          )}
          {vorschuss?.status === "genehmigt" && <p>{formatEuro(vorschuss.betrag_cent)} genehmigt – die Buchhaltung zahlt ihn aus.</p>}
          {vorschuss?.status === "ausgezahlt" && (
            <p>
              {formatEuro(vorschuss.betrag_cent)} ausgezahlt
              {vorschuss.ausgezahlt_am && ` am ${new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin" }).format(new Date(vorschuss.ausgezahlt_am))}`} – wird
              bei der Abrechnung abgezogen.
            </p>
          )}
          {vorschuss?.status === "abgelehnt" && (
            <p className="text-red-700 dark:text-red-400">
              Antrag über {formatEuro(vorschuss.betrag_cent)} abgelehnt{vorschuss.ablehnungsgrund && `: ${vorschuss.ablehnungsgrund}`}
            </p>
          )}
          {eigene && reise.status === "entwurf" && (!vorschuss || vorschuss.status === "abgelehnt") && (
            <>
              {!vorschuss && <p className="text-neutral-500">Für größere Ausgaben vorab, z. B. Hotel oder Flug. Wird bei der Abrechnung abgezogen.</p>}
              <VorschussBeantragen reiseId={reise.id} />
            </>
          )}
        </section>
      )}

      {zeigeDatev && (
        <DatevPanel
          id={reise.id}
          letzter={
            datevLetzter
              ? {
                  zeit: new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(datevLetzter.zeit)),
                  status: datevLetzter.status,
                  fehler: datevLetzter.fehler,
                }
              : null
          }
        />
      )}

      <BelegListe reiseId={reise.id} bearbeitbar={bearbeitbar} />

      {!istAuslagen && <FahrtenListe reise={reise} bearbeitbar={bearbeitbar} />}

      {!istAuslagen && (
        <details className="group rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
            <span>Verpflegungspauschale</span>
            <span className="tabular-nums">
              {verpflegung ? formatEuro(verpflegung.summe) : "–"} <span className="text-neutral-400 group-open:rotate-90">›</span>
            </span>
          </summary>
          {verpflegung ? (
            <table className="mt-3 w-full text-sm">
              <tbody>
                {verpflegung.tage.map((t) => (
                  <tr key={t.datum} className="border-t border-neutral-100 first:border-0 dark:border-neutral-800">
                    <td className="py-2">
                      {wochentag(t.datum)} {formatDatum(t.datum)}
                    </td>
                    <td className="py-2 text-neutral-500">
                      {t.art === "voll" ? "24 h" : t.art === "klein" ? "An-/Abreise bzw. > 8 h" : "unter 8 h"}
                      {t.kuerzung > 0 && ` · Mahlzeiten −${formatEuro(t.kuerzung)}`}
                    </td>
                    <td className="py-2 text-right tabular-nums">{formatEuro(t.betrag)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">Für dieses Land ist noch keine Pauschale hinterlegt.</p>
          )}
          {reise.verpflegung_bemerkung && (
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">Bemerkung: {reise.verpflegung_bemerkung}</p>
          )}
        </details>
      )}

      <AbrechnungUebersicht abrechnung={abrechnung} zeigeKonten={zeigeKonten} />

      <Verlauf reiseId={reise.id} />
    </main>
  );
}
