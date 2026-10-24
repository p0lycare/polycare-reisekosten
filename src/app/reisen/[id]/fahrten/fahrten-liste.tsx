import { createClient } from "@/lib/supabase/server";
import { formatDatum, formatEuro } from "@/lib/format";
import { berechneKmGeld } from "@/lib/reisekosten/fahrtkosten";
import type { Reise } from "@/lib/reisekosten/reise";
import { weichtAb } from "@/lib/routing/strecke";
import { FahrtZeile } from "./fahrt-zeile";

function kmText(km: number): string {
  return km.toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

export async function FahrtenListe({ reise, bearbeitbar }: { reise: Reise; bearbeitbar: boolean }) {
  const supabase = await createClient();
  const [{ data: fahrten }, { data: einstellungen }] = await Promise.all([
    supabase.from("fahrt").select("*").eq("reise_id", reise.id).order("datum").order("created_at"),
    supabase.from("einstellungen").select("km_satz_cent, km_steuerfrei_cent").single(),
  ]);

  if (!fahrten?.length && !reise.verkehrsmittel.includes("eigener_pkw")) return null;

  // Beim Einreichen festgeschriebene Sätze haben Vorrang
  const satz = reise.km_satz_cent ?? einstellungen?.km_satz_cent ?? 0;
  const steuerfreiSatz = reise.km_steuerfrei_cent ?? einstellungen?.km_steuerfrei_cent ?? 0;
  const kmGesamt = (fahrten ?? []).reduce((s, f) => s + Number(f.km), 0);
  const kmGeld = berechneKmGeld(kmGesamt, satz, steuerfreiSatz);
  const reiseVon = reise.beginn.slice(0, 10);
  const reiseBis = reise.ende.slice(0, 10);

  return (
    <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="font-medium">Fahrten mit eigenem PKW{reise.kfz_kennzeichen && ` (${reise.kfz_kennzeichen})`}</h2>

      {bearbeitbar ? (
        <div className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800">
          {(fahrten ?? []).map((f) => (
            <FahrtZeile
              key={f.id}
              reiseId={reise.id}
              reiseVon={reiseVon}
              reiseBis={reiseBis}
              werte={{ id: f.id, datum: f.datum, strecke: f.strecke, zweck: f.zweck ?? "", km: kmText(Number(f.km)), kmRoute: f.km_route === null ? null : Number(f.km_route) }}
            />
          ))}
          <FahrtZeile
            reiseId={reise.id}
            reiseVon={reiseVon}
            reiseBis={reiseBis}
            werte={{ datum: reiseVon, strecke: reise.reiseweg, zweck: reise.begruendung, km: "" }}
          />
        </div>
      ) : (
        <table className="mt-2 w-full text-sm">
          <tbody>
            {(fahrten ?? []).map((f) => (
              <tr key={f.id} className="border-t border-neutral-100 first:border-0 dark:border-neutral-800">
                <td className="py-2 pr-3 whitespace-nowrap">{formatDatum(f.datum)}</td>
                <td className="py-2 pr-3">
                  {f.strecke}
                  {f.zweck && <span className="text-neutral-500"> · {f.zweck}</span>}
                </td>
                <td className="py-2 text-right tabular-nums whitespace-nowrap">
                  {kmText(Number(f.km))} km
                  {f.km_route !== null && weichtAb(Number(f.km), Number(f.km_route)) && (
                    <span className="block text-xs text-amber-700 dark:text-amber-400">Route {kmText(Number(f.km_route))} km</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {kmGesamt > 0 && (
        <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t border-neutral-300 pt-2 text-sm dark:border-neutral-700">
          <dt className="font-medium">
            Km-Geld: {kmText(kmGesamt)} km × {formatEuro(satz)}
          </dt>
          <dd className="text-right font-medium tabular-nums">{formatEuro(kmGeld.betrag)}</dd>
          <dt className="text-neutral-500">davon steuerfrei ({formatEuro(steuerfreiSatz)}/km)</dt>
          <dd className="text-right text-neutral-500 tabular-nums">{formatEuro(kmGeld.steuerfrei)}</dd>
          {kmGeld.steuerpflichtig > 0 && (
            <>
              <dt className="text-neutral-500">davon steuerpflichtig (Lohnabrechnung)</dt>
              <dd className="text-right text-neutral-500 tabular-nums">{formatEuro(kmGeld.steuerpflichtig)}</dd>
            </>
          )}
        </dl>
      )}
    </section>
  );
}
