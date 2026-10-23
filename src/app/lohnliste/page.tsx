import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatEuro } from "@/lib/format";
import { ladeAbrechnung } from "@/lib/reisekosten/abrechnung-laden";
import { erstelleLohnliste, monatsgrenzen } from "@/lib/reisekosten/lohnliste";

function vormonat(): string {
  const jetzt = new Date();
  const d = new Date(Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth() - 1, 1));
  return d.toISOString().slice(0, 7);
}

const MONATSNAME = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function LohnlistePage({ searchParams }: { searchParams: Promise<{ monat?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: ich } = await supabase.from("profile").select("rolle").eq("id", user!.id).single();
  if (ich?.rolle !== "buchhaltung" && ich?.rolle !== "admin") redirect("/");

  const { monat: monatParam } = await searchParams;
  const monat = monatParam && monatsgrenzen(monatParam) ? monatParam : vormonat();
  const { von, bis } = monatsgrenzen(monat)!;

  // Maßgeblich ist der bei der Belegprüfung vergebene Buchungsmonat
  const { data: reisen } = await supabase
    .from("reise")
    .select("*, mitarbeiter:profile!reise_mitarbeiter_id_fkey(name)")
    .in("status", ["geprueft", "ausgezahlt"])
    .gte("buchungsmonat", von)
    .lt("buchungsmonat", bis);

  const ids = [...new Set((reisen ?? []).map((r) => r.mitarbeiter_id))];
  const [abrechnungen, { data: privat }] = await Promise.all([
    Promise.all((reisen ?? []).map((r) => ladeAbrechnung(supabase, r))),
    ids.length ? supabase.from("profil_privat").select("id, personalnummer").in("id", ids) : Promise.resolve({ data: [] }),
  ]);
  const personalnummern = new Map((privat ?? []).map((p) => [p.id, p.personalnummer]));

  const { zeilen, summe } = erstelleLohnliste(
    (reisen ?? []).map((r, i) => ({
      mitarbeiterId: r.mitarbeiter_id,
      name: r.mitarbeiter?.name ?? "",
      personalnummer: personalnummern.get(r.mitarbeiter_id) ?? null,
      belegNr: r.beleg_nr,
      abrechnung: abrechnungen[i],
    })),
  );

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6 font-sans">
      <div>
        <h1 className="text-xl font-semibold">Lohnliste Reisekosten</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Geprüfte Abrechnungen nach Buchungsmonat. Der steuerpflichtige Anteil (Km-Geld über dem steuerfreien Satz) gehört in die
          Lohnabrechnung.
        </p>
      </div>

      <form className="flex items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Buchungsmonat</span>
          <input
            type="month"
            name="monat"
            defaultValue={monat}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <button type="submit" className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
          Anzeigen
        </button>
      </form>

      <h2 className="font-medium">{MONATSNAME.format(new Date(`${monat}-01T00:00:00Z`))}</h2>

      {!zeilen.length ? (
        <p className="text-sm text-neutral-500">Keine geprüften Abrechnungen in diesem Monat.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="text-left text-xs text-neutral-500">
              <tr>
                <th className="py-2 pr-3 font-normal">Person</th>
                <th className="py-2 pr-3 font-normal">Pers.-Nr.</th>
                <th className="py-2 pr-3 font-normal">Beleg-Nr.</th>
                <th className="py-2 pr-3 text-right font-normal">Erstattung</th>
                <th className="py-2 pr-3 text-right font-normal">steuerfrei § 3 Nr. 16</th>
                <th className="py-2 pr-3 text-right font-normal">Auslagen (E, F)</th>
                <th className="py-2 pr-3 text-right font-normal">steuerpflichtig</th>
                <th className="py-2 pr-3 text-right font-normal">Vorschuss</th>
                <th className="py-2 text-right font-normal">Auszahlung</th>
              </tr>
            </thead>
            <tbody>
              {zeilen.map((z) => (
                <tr key={z.mitarbeiterId} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="py-2 pr-3">{z.name}</td>
                  <td className="py-2 pr-3 text-neutral-500">{z.personalnummer ?? "–"}</td>
                  <td className="py-2 pr-3 text-neutral-500">{z.belegNummern.join(", ") || "–"}</td>
                  <td className="py-2 pr-3 text-right">{formatEuro(z.erstattung)}</td>
                  <td className="py-2 pr-3 text-right">{formatEuro(z.steuerfrei)}</td>
                  <td className="py-2 pr-3 text-right">{formatEuro(z.auslagen)}</td>
                  <td className={`py-2 pr-3 text-right ${z.steuerpflichtig ? "font-medium" : "text-neutral-500"}`}>
                    {formatEuro(z.steuerpflichtig)}
                  </td>
                  <td className="py-2 pr-3 text-right text-neutral-500">{z.vorschuss ? `−${formatEuro(z.vorschuss)}` : "–"}</td>
                  <td className="py-2 text-right">{formatEuro(z.auszuzahlen)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-neutral-300 font-medium dark:border-neutral-700">
                <td className="py-2 pr-3" colSpan={3}>
                  Summe
                </td>
                <td className="py-2 pr-3 text-right">{formatEuro(summe.erstattung)}</td>
                <td className="py-2 pr-3 text-right">{formatEuro(summe.steuerfrei)}</td>
                <td className="py-2 pr-3 text-right">{formatEuro(summe.auslagen)}</td>
                <td className="py-2 pr-3 text-right">{formatEuro(summe.steuerpflichtig)}</td>
                <td className="py-2 pr-3 text-right">{summe.vorschuss ? `−${formatEuro(summe.vorschuss)}` : "–"}</td>
                <td className="py-2 text-right">{formatEuro(summe.auszuzahlen)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <Link href="/freigaben" className="text-sm text-neutral-600 underline dark:text-neutral-400">
        ← Freigaben
      </Link>
    </main>
  );
}
