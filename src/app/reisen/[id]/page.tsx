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
import { Verlauf } from "./workflow/verlauf";

export default async function ReisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: reise } = await supabase.from("reise").select("*").eq("id", id).maybeSingle();
  if (!reise) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const eigene = reise.mitarbeiter_id === user?.id;
  const verpflegung = verpflegungFuer(reise);
  const [abrechnung, { data: profil }] = await Promise.all([
    ladeAbrechnung(supabase, reise),
    supabase.from("profile").select("rolle").eq("id", user!.id).single(),
  ]);
  const istBuchhaltung = profil?.rolle === "buchhaltung" || profil?.rolle === "admin";
  const zeigeKonten = istBuchhaltung;

  const [{ data: darfGenehmigen }, { data: reisender }] = await Promise.all([
    reise.status === "eingereicht" && !eigene
      ? supabase.rpc("darf_genehmigen", { p_mitarbeiter: reise.mitarbeiter_id })
      : Promise.resolve({ data: false }),
    eigene ? Promise.resolve({ data: null }) : supabase.from("profile").select("name").eq("id", reise.mitarbeiter_id).single(),
  ]);
  const rechte = {
    einreichen: eigene && istBearbeitbar(reise.status),
    genehmigen: !!darfGenehmigen,
    pruefen: !eigene && istBuchhaltung && reise.status === "freigegeben",
    auszahlen: !eigene && istBuchhaltung && reise.status === "geprueft",
  };
  const { data: belegNrVorschlag } = rechte.pruefen ? await supabase.rpc("naechste_beleg_nr") : { data: "" };

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 font-sans">
      <Link href={eigene ? "/" : "/freigaben"} className="text-sm text-neutral-600 underline dark:text-neutral-400">
        {eigene ? "← Meine Reisen" : "← Freigaben"}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{reise.begruendung}</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            {reise.reiseweg} ({reise.land})
          </p>
          {reisender && <p className="mt-1 text-sm font-medium">{reisender.name}</p>}
        </div>
        <StatusBadge status={reise.status} />
      </div>

      {reise.status === "abgelehnt" && reise.ablehnungsgrund && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          Abgelehnt: {reise.ablehnungsgrund}
        </p>
      )}

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
        <dt className="text-neutral-500">Beginn</dt>
        <dd>{formatDatumZeit(reise.beginn)}</dd>
        <dt className="text-neutral-500">Ende</dt>
        <dd>{formatDatumZeit(reise.ende)}</dd>
        <dt className="text-neutral-500">Übernachtung</dt>
        <dd>{reise.mit_uebernachtung ? "Ja" : "Nein"}</dd>
        {reise.besuchte_stellen && (
          <>
            <dt className="text-neutral-500">Besuchte Stellen</dt>
            <dd>{reise.besuchte_stellen}</dd>
          </>
        )}
        <dt className="text-neutral-500">Verkehrsmittel</dt>
        <dd>
          {reise.verkehrsmittel
            .map((v) =>
              v === "eigener_pkw" && reise.kfz_kennzeichen
                ? `${VERKEHRSMITTEL_TEXT[v]} (${reise.kfz_kennzeichen})`
                : v === "mitfahrt" && reise.mitfahrt_bei
                  ? `${VERKEHRSMITTEL_TEXT[v]} bei ${reise.mitfahrt_bei}`
                  : VERKEHRSMITTEL_TEXT[v],
            )
            .join(", ") || "–"}
        </dd>
        {reise.kostenstelle && (
          <>
            <dt className="text-neutral-500">Kostenstelle</dt>
            <dd>{reise.kostenstelle}</dd>
          </>
        )}
        {reise.beleg_nr && (
          <>
            <dt className="text-neutral-500">Beleg-Nr.</dt>
            <dd>
              {reise.beleg_nr}
              {reise.buchungsmonat && ` · Buchungsmonat ${reise.buchungsmonat.slice(5, 7)}/${reise.buchungsmonat.slice(0, 4)}`}
            </dd>
          </>
        )}
      </dl>

      <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-medium">Verpflegungspauschale</h2>
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
              <tr className="border-t border-neutral-300 font-medium dark:border-neutral-700">
                <td className="py-2" colSpan={2}>Summe</td>
                <td className="py-2 text-right tabular-nums">{formatEuro(verpflegung.summe)}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">Für dieses Land ist noch keine Pauschale hinterlegt.</p>
        )}
        {reise.verpflegung_bemerkung && (
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">Bemerkung: {reise.verpflegung_bemerkung}</p>
        )}
      </section>

      <FahrtenListe reise={reise} bearbeitbar={eigene && istBearbeitbar(reise.status)} />

      <BelegListe reiseId={reise.id} bearbeitbar={eigene && istBearbeitbar(reise.status)} />

      <AbrechnungUebersicht abrechnung={abrechnung} zeigeKonten={zeigeKonten} />

      <WorkflowPanel
        id={reise.id}
        rechte={rechte}
        betrag={formatEuro(abrechnung.auszuzahlen)}
        belegNrVorschlag={belegNrVorschlag ?? ""}
      />

      <Verlauf reiseId={reise.id} />

      {eigene && istBearbeitbar(reise.status) && (
        <div className="flex items-center gap-4">
          <Link href={`/reisen/${reise.id}/bearbeiten`} className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
            Bearbeiten
          </Link>
          {reise.status === "entwurf" && <LoeschenButton id={reise.id} />}
        </div>
      )}
    </main>
  );
}
