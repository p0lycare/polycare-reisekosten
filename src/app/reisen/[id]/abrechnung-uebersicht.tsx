import { formatEuro } from "@/lib/format";
import type { Abrechnung } from "@/lib/reisekosten/abrechnung";
import { ABSCHNITT_TEXT } from "@/lib/reisekosten/kategorie";

function prozent(p: number): string {
  return `${String(p).replace(".", ",")} %`;
}

export function AbrechnungUebersicht({ abrechnung, zeigeKonten }: { abrechnung: Abrechnung; zeigeKonten: boolean }) {
  const { abschnitte, gesamt, vorschuss, auszuzahlen, steuerpflichtig } = abrechnung;

  return (
    <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="font-medium">Abrechnung</h2>

      {!abschnitte.length ? (
        <p className="mt-2 text-sm text-neutral-500">Noch keine Kosten.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="text-left text-xs text-neutral-500">
              <tr>
                <th className="py-1 pr-3 font-normal">Position</th>
                {zeigeKonten && <th className="py-1 pr-3 font-normal">Konto</th>}
                <th className="py-1 pr-3 text-right font-normal">Netto</th>
                <th className="py-1 pr-3 text-right font-normal">MwSt</th>
                <th className="py-1 text-right font-normal">Betrag</th>
              </tr>
            </thead>
            {abschnitte.map((a) => (
              <tbody key={a.abschnitt}>
                <tr className="border-t border-neutral-200 dark:border-neutral-800">
                  <th colSpan={zeigeKonten ? 5 : 4} className="pt-3 pb-1 text-left text-xs font-medium tracking-wide text-neutral-500 uppercase">
                    {a.abschnitt} – {ABSCHNITT_TEXT[a.abschnitt]}
                  </th>
                </tr>
                {a.positionen.map((p, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-3">{p.bezeichnung}</td>
                    {zeigeKonten && <td className="py-1 pr-3 text-neutral-500">{p.konto ?? "–"}</td>}
                    <td className="py-1 pr-3 text-right">{formatEuro(p.netto)}</td>
                    <td className="py-1 pr-3 text-right text-neutral-500">
                      {p.mwst ? `${formatEuro(p.mwst)} (${prozent(p.mwstProzent)})` : "–"}
                    </td>
                    <td className="py-1 text-right">{formatEuro(p.brutto)}</td>
                  </tr>
                ))}
                {a.positionen.length > 1 && (
                  <tr className="text-neutral-500">
                    <td className="py-1 pr-3" colSpan={zeigeKonten ? 2 : 1}>
                      Summe {a.abschnitt}
                    </td>
                    <td className="py-1 pr-3 text-right">{formatEuro(a.summe.netto)}</td>
                    <td className="py-1 pr-3 text-right">{formatEuro(a.summe.mwst)}</td>
                    <td className="py-1 text-right">{formatEuro(a.summe.brutto)}</td>
                  </tr>
                )}
              </tbody>
            ))}
            <tfoot>
              <tr className="border-t-2 border-neutral-300 font-medium dark:border-neutral-700">
                <td className="pt-2 pr-3" colSpan={zeigeKonten ? 2 : 1}>
                  Gesamt
                </td>
                <td className="pt-2 pr-3 text-right">{formatEuro(gesamt.netto)}</td>
                <td className="pt-2 pr-3 text-right">{formatEuro(gesamt.mwst)}</td>
                <td className="pt-2 text-right">{formatEuro(gesamt.brutto)}</td>
              </tr>
              {vorschuss > 0 && (
                <tr>
                  <td className="py-1 pr-3" colSpan={zeigeKonten ? 4 : 3}>
                    abzüglich Vorschuss
                  </td>
                  <td className="py-1 text-right">−{formatEuro(vorschuss)}</td>
                </tr>
              )}
              <tr className="text-base font-semibold">
                <td className="py-2 pr-3" colSpan={zeigeKonten ? 4 : 3}>
                  {auszuzahlen < 0 ? "Rückzahlung an Polycare" : "Auszuzahlender Betrag"}
                </td>
                <td className="py-2 text-right">{formatEuro(Math.abs(auszuzahlen))}</td>
              </tr>
            </tfoot>
          </table>
          {steuerpflichtig > 0 && (
            <p className="mt-1 text-xs text-neutral-500">
              Davon {formatEuro(steuerpflichtig)} steuerpflichtiger Arbeitslohn (Km-Geld über dem steuerfreien Satz).
            </p>
          )}
        </div>
      )}
    </section>
  );
}
