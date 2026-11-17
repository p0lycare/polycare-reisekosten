import Link from "next/link";
import { Logo } from "./logo";
import { KopfzeileReiter, type Reiter } from "./kopfzeile-reiter";
import { FeedbackLink } from "./feedback-link";
import { SprachUmschalter } from "./sprache/sprach-umschalter";
import { texte } from "@/lib/i18n/woerterbuch";
import type { Sprache } from "@/lib/i18n/sprache";

export type KopfzeileDaten = {
  name: string;
  rolle: string | null;
  offen: number;
  eingang: number;
  zeigeFreigaben: boolean;
  zeigeEinstellungen: boolean;
};

/** "2026-10" in deutscher Zeit */
function aktuellerMonat(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit" }).format(new Date());
}

/** Kopfzeile in zwei Ebenen: oben Logo und Konto, darunter die Bereiche als Reiter */
export function Kopfzeile({ daten, sprache }: { daten: KopfzeileDaten; sprache: Sprache }) {
  const t = texte(sprache);
  const k = t.rahmen.kopfzeile;
  const reiter: Reiter[] = [
    // Reihenfolge wie der Ablauf: Belege sammeln → Reisen und Auslagen erfassen → Monat gesammelt einreichen
    { href: "/belege", text: k.belege, aktivBei: "/belege", zaehler: daten.eingang },
    { href: "/", text: k.meineReisen, aktivBei: "/" },
    { href: "/auslagen", text: k.meineAuslagen, aktivBei: "/auslagen" },
    { href: `/monat/${aktuellerMonat()}`, text: k.monatAbrechnen, aktivBei: "/monat" },
    ...(daten.zeigeFreigaben
      ? [
          { href: "/freigaben", text: k.freigaben, aktivBei: "/freigaben", zaehler: daten.offen },
          { href: "/uebersicht", text: daten.zeigeEinstellungen ? k.uebersicht : k.team, aktivBei: "/uebersicht" },
        ]
      : []),
    ...(daten.zeigeEinstellungen ? [{ href: "/einstellungen", text: k.einstellungen, aktivBei: "/einstellungen" }] : []),
  ];

  return (
    <header className="border-b border-neutral-200 font-sans dark:border-neutral-800">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 pt-4 pb-1">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label={k.startseite}>
            <Logo className="h-5 text-marke-dunkel dark:text-white" />
            <span className="hidden border-l border-neutral-300 pl-3 text-sm sm:inline text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">{t.allgemein.app.kurz}</span>
          </Link>
          <div className="flex min-w-0 items-center gap-3 text-sm sm:gap-4">
            <Link href="/einfuehrung" className="text-neutral-500 hover:text-neutral-900 hover:underline dark:hover:text-neutral-100">
              {k.hilfe}
            </Link>
            <FeedbackLink />
            <SprachUmschalter />
            <Link href="/profil" className="flex min-w-0 items-center gap-2 text-neutral-700 hover:underline dark:text-neutral-300">
              <span className="hidden truncate sm:inline">{daten.name}</span>
              <span className="sm:hidden">{k.profil}</span>
              {daten.rolle && daten.rolle !== "mitarbeiter" && (
                <span className="hidden rounded bg-flaeche px-2 py-0.5 text-xs text-neutral-600 sm:inline dark:text-neutral-400">{t.allgemein.rolle[daten.rolle as keyof typeof t.allgemein.rolle] ?? daten.rolle}</span>
              )}
            </Link>
            {/* Am Handy ist dafür kein Platz – Abmelden steht dann im Profil */}
            <form action="/auth/logout" method="post" className="hidden sm:block">
              <button type="submit" className="whitespace-nowrap text-neutral-500 hover:text-neutral-900 hover:underline dark:hover:text-neutral-100">
                {t.allgemein.knopf.abmelden}
              </button>
            </form>
          </div>
        </div>
        <KopfzeileReiter reiter={reiter} bezeichnung={k.bereiche} />
      </div>
    </header>
  );
}
