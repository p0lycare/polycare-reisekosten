import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDatum, wochentag } from "@/lib/format";
import { ladeTermine } from "@/lib/kalender/graph";
import { reiseVorschlaege } from "@/lib/kalender/vorschlaege";

function zeitraum(beginn: string, ende: string): string {
  const tag = (w: string) => `${wochentag(w.slice(0, 10))} ${formatDatum(w)}`;
  return beginn.slice(0, 10) === ende.slice(0, 10)
    ? `${tag(beginn)}, ${beginn.slice(11, 16)}–${ende.slice(11, 16)}`
    : `${tag(beginn)} – ${tag(ende)}`;
}

/** Termine mit Ort aus dem eigenen Outlook-Kalender als Reise vorschlagen (nur mit Zustimmung im Profil) */
export async function KalenderVorschlaege({ von, bis }: { von: string; bis: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profil }, { data: einstellungen }, { data: reisen }] = await Promise.all([
    supabase.from("profile").select("email, rolle, kalender_vorschlaege").eq("id", user!.id).single(),
    supabase.from("einstellungen").select("buero_orte").single(),
    supabase.from("reise").select("beginn, ende").eq("mitarbeiter_id", user!.id).lt("beginn", bis).gte("ende", von),
  ]);

  if (!profil?.kalender_vorschlaege) {
    return (
      <p className="text-sm text-neutral-500">
        Tipp: Reisen aus deinem Outlook-Kalender vorschlagen lassen –{" "}
        <Link href="/profil#kalender" className="underline">
          im Profil einschalten
        </Link>
        .
      </p>
    );
  }

  const antwort = await ladeTermine(profil.email, von, bis);
  if ("fehler" in antwort) {
    // Technische Hinweise nur für Admins; alle anderen sehen einfach keine Vorschläge
    return profil.rolle === "admin" ? (
      <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
        Kalender konnte nicht gelesen werden
        {antwort.fehler === "kein_zugriff" ? " – die Exchange-Berechtigung für Kalender fehlt noch." : "."}
      </p>
    ) : null;
  }

  const vorschlaege = reiseVorschlaege(antwort.termine, { bueroOrte: einstellungen?.buero_orte ?? [], reisen: reisen ?? [] });
  if (!vorschlaege.length) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium">
        Aus deinem Kalender <span className="font-normal text-neutral-500">– noch nicht erfasst</span>
      </h2>
      <ul className="divide-y divide-neutral-200 border border-neutral-200 bg-flaeche dark:divide-neutral-800 dark:border-neutral-800">
        {vorschlaege.map((v) => (
          <li key={v.terminId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0">
              <span className="block truncate">{v.betreff}</span>
              <span className="block truncate text-xs text-neutral-500">
                {zeitraum(v.beginn, v.ende)} · {v.ort}
              </span>
            </span>
            <Link
              href={`/reisen/neu?termin=${encodeURIComponent(v.terminId)}`}
              className="shrink-0 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium hover:border-marke dark:border-neutral-700 dark:bg-neutral-900"
            >
              Als Reise anlegen
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
