import Link from "next/link";
import { Logo } from "./logo";
import { KopfzeileReiter, type Reiter } from "./kopfzeile-reiter";

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
export function Kopfzeile({ daten }: { daten: KopfzeileDaten }) {
  const reiter: Reiter[] = [
    { href: "/", text: "Meine Reisen", aktivBei: "/" },
    { href: `/monat/${aktuellerMonat()}`, text: "Monat abrechnen", aktivBei: "/monat" },
    { href: "/belege", text: "Belege", aktivBei: "/belege", zaehler: daten.eingang },
    ...(daten.zeigeFreigaben
      ? [
          { href: "/freigaben", text: "Freigaben", aktivBei: "/freigaben", zaehler: daten.offen },
          { href: "/uebersicht", text: daten.zeigeEinstellungen ? "Übersicht" : "Team", aktivBei: "/uebersicht" },
        ]
      : []),
    ...(daten.zeigeEinstellungen ? [{ href: "/einstellungen", text: "Einstellungen", aktivBei: "/einstellungen" }] : []),
  ];

  return (
    <header className="border-b border-neutral-200 font-sans dark:border-neutral-800">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 pt-4 pb-1">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Polycare Reisekosten, Startseite">
            <Logo className="h-5 text-marke-dunkel dark:text-white" />
            <span className="border-l border-neutral-300 pl-3 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">Reisekosten</span>
          </Link>
          <div className="flex min-w-0 items-center gap-4 text-sm">
            <Link href="/profil" className="flex min-w-0 items-center gap-2 text-neutral-700 hover:underline dark:text-neutral-300">
              <span className="hidden truncate sm:inline">{daten.name}</span>
              <span className="sm:hidden">Profil</span>
              {daten.rolle && daten.rolle !== "mitarbeiter" && (
                <span className="hidden rounded bg-flaeche px-2 py-0.5 text-xs text-neutral-600 sm:inline dark:text-neutral-400">{daten.rolle}</span>
              )}
            </Link>
            <form action="/auth/logout" method="post">
              <button type="submit" className="whitespace-nowrap text-neutral-500 hover:text-neutral-900 hover:underline dark:hover:text-neutral-100">
                Abmelden
              </button>
            </form>
          </div>
        </div>
        <KopfzeileReiter reiter={reiter} />
      </div>
    </header>
  );
}
