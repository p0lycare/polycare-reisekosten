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
  const zeigeKonten = profil?.rolle === "buchhaltung" || profil?.rolle === "admin";

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 font-sans">
      <Link href="/" className="text-sm text-neutral-600 underline dark:text-neutral-400">
        ← Meine Reisen
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{reise.begruendung}</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            {reise.reiseweg} ({reise.land})
          </p>
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

      {eigene && istBearbeitbar(reise.status) && (
        <div className="flex items-center gap-4">
          <Link href={`/reisen/${reise.id}/bearbeiten`} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
            Bearbeiten
          </Link>
          {reise.status === "entwurf" && <LoeschenButton id={reise.id} />}
        </div>
      )}
    </main>
  );
}
