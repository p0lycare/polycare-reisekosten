import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDatum } from "@/lib/format";
import { ladeSprache } from "@/lib/i18n/server";
import { texte, wochentagName } from "@/lib/i18n/woerterbuch";
import type { Sprache } from "@/lib/i18n/sprache";
import { ladeTermine } from "@/lib/kalender/graph";
import { KALENDER_AB, kalenderPostfach, reiseVorschlaege } from "@/lib/kalender/vorschlaege";
import { ladeOrteOhneReise } from "@/lib/kalender/orte";
import { vorschlaegeEinblenden, vorschlagAusblenden } from "./kalender-actions";

function zeitraum(beginn: string, ende: string, sprache: Sprache): string {
  const tag = (w: string) => `${wochentagName(w.slice(0, 10), sprache)} ${formatDatum(w)}`;
  return beginn.slice(0, 10) === ende.slice(0, 10)
    ? `${tag(beginn)}, ${beginn.slice(11, 16)}–${ende.slice(11, 16)}`
    : `${tag(beginn)} – ${tag(ende)}`;
}

/** Termine mit Ort aus dem eigenen Outlook-Kalender als Reise vorschlagen (nur mit Zustimmung im Profil) */
export async function KalenderVorschlaege({
  von,
  bis,
  zeitraumText,
  stillWennLeer = false,
}: {
  von: string;
  bis: string;
  /** Für den Hinweis, wenn nichts passt: "In <zeitraumText> gibt es keine weiteren Termine mit Ort" (Standard: "diesem Monat" aus dem Wörterbuch) */
  zeitraumText?: string;
  /** Auf der Startseite: nichts anzeigen, wenn nichts passt oder der Kalender aus ist */
  stillWennLeer?: boolean;
}) {
  const sprache = await ladeSprache();
  const t = texte(sprache).monat.kalender;
  // Kalender erst ab Start des Tools lesen
  if (von < KALENDER_AB) von = KALENDER_AB;
  if (von >= bis) {
    return stillWennLeer ? null : (
      <p className="text-sm text-neutral-500">{t.erstAb}</p>
    );
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profil }, ohneReise, { data: reisen }, { data: ausgeblendet }] = await Promise.all([
    supabase.from("profile").select("email, rolle, kalender_vorschlaege").eq("id", user!.id).single(),
    ladeOrteOhneReise(supabase, user!.id),
    supabase.from("reise").select("beginn, ende").eq("mitarbeiter_id", user!.id).eq("art", "reise").lt("beginn", bis).gte("ende", von),
    supabase.from("kalender_ausgeblendet").select("termin_id"),
  ]);

  if (!profil?.kalender_vorschlaege) {
    if (stillWennLeer) return null;
    return (
      <p className="text-sm text-neutral-500">
        {t.tippVor}{" "}
        <Link href="/profil#kalender" className="underline">
          {t.tippLink}
        </Link>
        {t.tippNach}
      </p>
    );
  }

  const postfach = kalenderPostfach(user?.email, profil.email);
  if (!postfach) return null;
  const antwort = await ladeTermine(postfach, von, bis);
  if ("fehler" in antwort) {
    if (stillWennLeer) return null;
    // Technische Hinweise nur für Admins; alle anderen sehen einfach keine Vorschläge
    return profil.rolle === "admin" ? (
      <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
        {t.nichtGelesen}
        {antwort.fehler === "kein_zugriff" ? t.keinZugriff : "."}
      </p>
    ) : null;
  }

  const alle = reiseVorschlaege(antwort.termine, { bueroOrte: ohneReise, reisen: reisen ?? [] });
  const weg = new Set((ausgeblendet ?? []).map((a) => a.termin_id));
  const vorschlaege = alle.filter((v) => !weg.has(v.terminId));
  const versteckt = alle.length - vorschlaege.length;
  const einblenden = versteckt > 0 && (
    <form action={vorschlaegeEinblenden} className="inline">
      <button type="submit" className="text-sm text-neutral-500 underline">
        {t.ausgeblendet(versteckt)}
      </button>
    </form>
  );
  if (!vorschlaege.length) {
    if (stillWennLeer) return null;
    return (
      <p className="text-sm text-neutral-500">
        {t.keineTermineVor(zeitraumText ?? t.diesemMonat)}
        {profil.rolle === "admin" || profil.rolle === "buchhaltung" ? (
          <>
            {" "}(
            <Link href="/einstellungen" className="underline">
              {t.einstellungen}
            </Link>
            )
          </>
        ) : null}{" "}
        {t.keineTermineNach} {einblenden}
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-medium">
          {t.titel} <span className="font-normal text-neutral-500">{t.nochNichtErfasst}</span>
        </h2>
        {einblenden}
      </div>
      <ul className="divide-y divide-neutral-200 border border-neutral-200 bg-flaeche dark:divide-neutral-800 dark:border-neutral-800">
        {vorschlaege.map((v) => (
          <li key={v.terminId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0">
              <span className="block truncate">{v.betreff}</span>
              <span className="block truncate text-xs text-neutral-500">
                {zeitraum(v.beginn, v.ende, sprache)} · {v.ort}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <Link
                href={`/reisen/neu?termin=${encodeURIComponent(v.terminId)}`}
                className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium hover:border-marke dark:border-neutral-700 dark:bg-neutral-900"
              >
                {t.alsReiseAnlegen}
              </Link>
              <form action={vorschlagAusblenden}>
                <input type="hidden" name="termin_id" value={v.terminId} />
                <button
                  type="submit"
                  aria-label={t.ausblendenLabel(v.betreff)}
                  title={t.ausblendenTitel}
                  className="flex size-8 items-center justify-center rounded-md text-lg leading-none text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                >
                  ×
                </button>
              </form>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
