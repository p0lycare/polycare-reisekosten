import Link from "next/link";
import { Logo } from "./logo";

export type KopfzeileDaten = {
  name: string;
  rolle: string | null;
  offen: number;
  eingang: number;
  zeigeFreigaben: boolean;
  zeigeEinstellungen: boolean;
};

const link = "text-neutral-600 hover:underline dark:text-neutral-400";

/** "2026-10" in deutscher Zeit */
function aktuellerMonat(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit" }).format(new Date());
}

function Zaehler({ anzahl }: { anzahl: number }) {
  return anzahl > 0 ? (
    <span className="ml-1 rounded-full bg-marke px-1.5 py-0.5 text-xs font-medium text-white">{anzahl}</span>
  ) : null;
}

/** Kopfzeile: am Desktop alle Links nebeneinander, am Handy ein aufklappbares Menü */
export function Kopfzeile({ daten }: { daten: KopfzeileDaten }) {
  const links = (
    <>
      <Link href="/" className={link}>
        Meine Reisen
      </Link>
      <Link href={`/monat/${aktuellerMonat()}`} className={link}>
        Monat abrechnen
      </Link>
      <Link href="/belege" className={link}>
        Belege
        <Zaehler anzahl={daten.eingang} />
      </Link>
      {daten.zeigeFreigaben && (
        <Link href="/freigaben" className={link}>
          Freigaben
          <Zaehler anzahl={daten.offen} />
        </Link>
      )}
      {daten.zeigeFreigaben && (
        <Link href="/uebersicht" className={link}>
          {daten.zeigeEinstellungen ? "Übersicht" : "Team"}
        </Link>
      )}
      {daten.zeigeEinstellungen && (
        <Link href="/einstellungen" className={link}>
          Einstellungen
        </Link>
      )}
      <Link href="/profil" className={link}>
        {daten.name}
        {daten.rolle && daten.rolle !== "mitarbeiter" && (
          <span className="ml-2 rounded bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">{daten.rolle}</span>
        )}
      </Link>
      <form action="/auth/logout" method="post">
        <button type="submit" className="text-neutral-600 underline dark:text-neutral-400">
          Abmelden
        </button>
      </form>
    </>
  );

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 font-sans sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Polycare Reisekosten, Startseite">
          <Logo className="h-5 text-marke-dunkel dark:text-white" />
          <span className="border-l border-neutral-300 pl-3 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">Reisekosten</span>
        </Link>
        <nav className="hidden items-center gap-4 text-sm lg:flex">{links}</nav>
        <details className="relative lg:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700">
            Menü
            <Zaehler anzahl={daten.offen + daten.eingang} />
          </summary>
          <nav className="absolute right-0 z-10 mt-2 flex w-56 flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 text-sm shadow-lg dark:border-neutral-800 dark:bg-neutral-950">
            {links}
          </nav>
        </details>
      </div>
    </header>
  );
}
