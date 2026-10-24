import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDatum, formatEuro } from "@/lib/format";
import { ladeAbrechnung } from "@/lib/reisekosten/abrechnung-laden";
import { projektName } from "@/lib/reisekosten/projekte";
import { StatusBadge } from "@/app/reisen/status-badge";

const MONAT = /^\d{4}-(0[1-9]|1[0-2])$/;

function folgemonat(monat: string): string {
  const [j, m] = monat.split("-").map(Number);
  return new Date(Date.UTC(j, m, 1)).toISOString().slice(0, 7);
}

const feld = "rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900";

/**
 * Reisekosten je Projekt und Zeitraum (nach Reisebeginn) für Förder- und Projektabrechnungen.
 * Gezählt werden eingereichte und weiter bearbeitete Reisen; Beträge vor Abzug eines Vorschusses.
 */
export default async function ProjektePage({ searchParams }: { searchParams: Promise<{ von?: string; bis?: string }> }) {
  const parameter = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profile").select("rolle").eq("id", user!.id).single();
  if (profil?.rolle !== "buchhaltung" && profil?.rolle !== "admin") redirect("/");

  const jetzt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit" }).format(new Date());
  const von = parameter.von && MONAT.test(parameter.von) ? parameter.von : `${jetzt.slice(0, 4)}-01`;
  const bis = parameter.bis && MONAT.test(parameter.bis) && parameter.bis >= von ? parameter.bis : jetzt < von ? von : jetzt;

  const [{ data: projekte }, { data: reisen }] = await Promise.all([
    supabase.from("projekt").select("*").order("bezeichnung"),
    supabase
      .from("reise")
      .select("*, mitarbeiter:profile!reise_mitarbeiter_id_fkey(name)")
      .not("projekt_id", "is", null)
      .in("status", ["eingereicht", "freigegeben", "geprueft", "ausgezahlt"])
      .gte("beginn", `${von}-01`)
      .lt("beginn", `${folgemonat(bis)}-01`)
      .order("beginn"),
  ]);
  const abrechnungen = await Promise.all((reisen ?? []).map((r) => ladeAbrechnung(supabase, r)));

  const gruppen = (projekte ?? [])
    .map((p) => {
      const zeilen = (reisen ?? []).flatMap((r, i) => (r.projekt_id === p.id ? [{ reise: r, betrag: abrechnungen[i].gesamt }] : []));
      return {
        projekt: p,
        zeilen,
        brutto: zeilen.reduce((s, z) => s + z.betrag.brutto, 0),
        netto: zeilen.reduce((s, z) => s + z.betrag.netto, 0),
      };
    })
    .filter((g) => g.zeilen.length);
  const gesamt = gruppen.reduce((s, g) => s + g.brutto, 0);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-4 font-sans sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Reisekosten je Projekt</h1>
          <p className="text-sm text-neutral-500">
            Eingereichte Reisen nach Reisebeginn; Beträge vor Abzug eines Vorschusses, netto ohne erstattungsfähige Vorsteuer.{" "}
            <Link href="/einstellungen" className="underline">
              Projekte pflegen
            </Link>
          </p>
        </div>
        <form className="flex flex-wrap items-end gap-2 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500">von</span>
            <input type="month" name="von" defaultValue={von} className={feld} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500">bis</span>
            <input type="month" name="bis" defaultValue={bis} className={feld} />
          </label>
          <button type="submit" className="rounded-md border border-neutral-300 px-3 py-1.5 font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
            Anzeigen
          </button>
        </form>
      </div>

      {!gruppen.length ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
          {projekte?.length ? "Im gewählten Zeitraum sind keine Reisen einem Projekt zugeordnet." : "Noch keine Projekte angelegt – das geht unter Einstellungen."}
        </p>
      ) : (
        <>
          <p className="text-sm tabular-nums">
            {gruppen.length} {gruppen.length === 1 ? "Projekt" : "Projekte"} · zusammen <span className="font-semibold">{formatEuro(gesamt)}</span>
          </p>
          {gruppen.map(({ projekt, zeilen, brutto, netto }) => (
            <section key={projekt.id} className="rounded-lg border border-neutral-200 dark:border-neutral-800">
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-neutral-200 bg-flaeche p-4 dark:border-neutral-800">
                <div>
                  <h2 className="font-medium">{projektName(projekt)}</h2>
                  {(projekt.foerdergeber || projekt.foerderkennzeichen) && (
                    <p className="text-xs text-neutral-500">
                      {[projekt.foerdergeber, projekt.foerderkennzeichen && `FKZ ${projekt.foerderkennzeichen}`].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <p className="tabular-nums">
                  {zeilen.length} {zeilen.length === 1 ? "Reise" : "Reisen"} · netto {formatEuro(netto)} ·{" "}
                  <span className="font-semibold">brutto {formatEuro(brutto)}</span>
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-neutral-500">
                    <tr>
                      <th className="px-4 py-2 font-normal">Datum</th>
                      <th className="px-2 py-2 font-normal">Person</th>
                      <th className="px-2 py-2 font-normal">Anlass</th>
                      <th className="px-2 py-2 font-normal">Beleg-Nr.</th>
                      <th className="px-2 py-2 font-normal">Status</th>
                      <th className="px-2 py-2 text-right font-normal">netto</th>
                      <th className="px-4 py-2 text-right font-normal">brutto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zeilen.map(({ reise: r, betrag }) => (
                      <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
                        <td className="px-4 py-2 whitespace-nowrap">
                          {formatDatum(r.beginn)}
                          {r.beginn.slice(0, 10) !== r.ende.slice(0, 10) && ` – ${formatDatum(r.ende)}`}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">{r.mitarbeiter?.name}</td>
                        <td className="px-2 py-2">
                          <Link href={`/reisen/${r.id}`} className="hover:underline">
                            {r.begruendung}
                          </Link>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-neutral-500">{r.beleg_nr ?? "–"}</td>
                        <td className="px-2 py-2">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-2 py-2 text-right text-neutral-500 tabular-nums whitespace-nowrap">{formatEuro(betrag.netto)}</td>
                        <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap">{formatEuro(betrag.brutto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </>
      )}
    </main>
  );
}
