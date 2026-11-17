import { Fragment } from "react";
import Link from "next/link";
import { formatEuro } from "@/lib/format";
import type { Texte } from "@/lib/i18n/woerterbuch";

type T = Texte["einfuehrung"];

/** Ein Schritt der Einführung: Überschrift, kurzer Text, optional ein Link zur passenden Seite */
function Schritt({ nr, titel, link, children }: { nr: number; titel: string; link?: { href: string; text: string }; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[2rem_1fr] gap-x-3">
      <span className="flex size-7 items-center justify-center rounded-full bg-marke-hell text-sm font-semibold text-marke-dunkel">{nr}</span>
      <div className="flex flex-col gap-1.5">
        <h3 className="font-medium">{titel}</h3>
        <div className="flex flex-col gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">{children}</div>
        {link && (
          <Link href={link.href} className="text-sm font-medium text-marke-dunkel underline dark:text-marke">
            {link.text} →
          </Link>
        )}
      </div>
    </li>
  );
}

function Abschnitt({ id, titel, untertitel, children }: { id: string; titel: string; untertitel: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-28 flex-col gap-5 border-t border-neutral-200 pt-8 dark:border-neutral-800">
      <div>
        <h2 className="text-lg font-semibold">{titel}</h2>
        <p className="text-sm text-neutral-500">{untertitel}</p>
      </div>
      <ol className="flex flex-col gap-6">{children}</ol>
    </section>
  );
}

/** Absätze aus dem Wörterbuch; ein leerer Zusatz (z. B. PDF-Hinweis auf Deutsch) wird nicht gerendert */
function Absaetze({ texte, zusatz }: { texte: string[]; zusatz?: string }) {
  return (
    <>
      {texte.map((text, i) => (
        <p key={i}>{text}</p>
      ))}
      {zusatz && <p>{zusatz}</p>}
    </>
  );
}

export function FuerAlle({ t, kmSatzCent, kmSteuerfreiCent, monat }: { t: T; kmSatzCent: number; kmSteuerfreiCent: number; monat: string }) {
  const a = t.alle;
  return (
    <Abschnitt id="reisende" titel={a.titel} untertitel={a.untertitel}>
      <Schritt nr={1} titel={a.app.titel}>
        <p>
          <span className="font-medium">{a.app.iphone}</span> {a.app.iphoneText}{" "}
          <span className="font-medium">{a.app.android}</span> {a.app.androidText}
        </p>
        <p>{a.app.danach}</p>
      </Schritt>
      <Schritt nr={2} titel={a.belege.titel} link={{ href: "/belege", text: a.belege.link }}>
        <Absaetze texte={a.belege.absaetze} />
      </Schritt>
      <Schritt nr={3} titel={a.reisen.titel} link={{ href: `/monat/${monat}`, text: a.reisen.link }}>
        <p>{a.reisen.einleitung}</p>
        <ul className="ml-4 list-disc">
          {a.reisen.wege.map((weg, i) => (
            <li key={i}>{weg}</li>
          ))}
        </ul>
        <Absaetze texte={a.reisen.absaetze} />
      </Schritt>
      <Schritt nr={4} titel={a.fahrten.titel}>
        <p>{a.fahrten.strecke}</p>
        <p>
          {a.fahrten.erstattet(formatEuro(kmSatzCent))}
          {kmSatzCent > kmSteuerfreiCent ? a.fahrten.steueranteil(formatEuro(kmSteuerfreiCent)) : a.fahrten.steuerfrei}
          {a.fahrten.tankbelege}
        </p>
      </Schritt>
      <Schritt nr={5} titel={a.auslagen.titel} link={{ href: "/auslagen", text: a.auslagen.link }}>
        <Absaetze texte={a.auslagen.absaetze} />
      </Schritt>
      <Schritt nr={6} titel={a.einreichen.titel}>
        <Absaetze texte={a.einreichen.absaetze} zusatz={a.einreichen.pdfHinweis} />
      </Schritt>
      <Schritt nr={7} titel={a.vorschuss.titel}>
        <Absaetze texte={a.vorschuss.absaetze} />
      </Schritt>
      <Schritt nr={8} titel={a.erinnerung.titel}>
        <Absaetze texte={a.erinnerung.absaetze} />
      </Schritt>
    </Abschnitt>
  );
}

export function FuerFuehrungskraefte({ t }: { t: T }) {
  const f = t.fuehrung;
  return (
    <Abschnitt id="fuehrungskraefte" titel={f.titel} untertitel={f.untertitel}>
      <Schritt nr={1} titel={f.benachrichtigung.titel} link={{ href: "/freigaben", text: f.benachrichtigung.link }}>
        <Absaetze texte={f.benachrichtigung.absaetze} />
      </Schritt>
      <Schritt nr={2} titel={f.pruefen.titel}>
        <Absaetze texte={f.pruefen.absaetze} />
      </Schritt>
      <Schritt nr={3} titel={f.genehmigen.titel}>
        <Absaetze texte={f.genehmigen.absaetze} />
      </Schritt>
      <Schritt nr={4} titel={f.team.titel} link={{ href: "/uebersicht", text: f.team.link }}>
        <Absaetze texte={f.team.absaetze} />
      </Schritt>
    </Abschnitt>
  );
}

export function FuerBuchhaltung({ t }: { t: T }) {
  const b = t.buchhaltung;
  return (
    <Abschnitt id="buchhaltung" titel={b.titel} untertitel={b.untertitel}>
      <Schritt nr={1} titel={b.belegpruefung.titel} link={{ href: "/freigaben", text: b.belegpruefung.link }}>
        <Absaetze texte={b.belegpruefung.absaetze} />
      </Schritt>
      <Schritt nr={2} titel={b.datev.titel}>
        <Absaetze texte={b.datev.absaetze} zusatz={b.datev.pdfHinweis} />
      </Schritt>
      <Schritt nr={3} titel={b.auszahlung.titel}>
        <Absaetze texte={b.auszahlung.absaetze} />
      </Schritt>
      <Schritt nr={4} titel={b.einstellungen.titel} link={{ href: "/einstellungen", text: b.einstellungen.link }}>
        <Absaetze texte={b.einstellungen.absaetze} />
      </Schritt>
    </Abschnitt>
  );
}

const ROLLEN_REIHENFOLGE = ["mitarbeiter", "freigeber", "buchhaltung", "admin"] as const;

export function FuerAdmins({ t }: { t: T }) {
  const a = t.admins;
  return (
    <Abschnitt id="admins" titel={a.titel} untertitel={a.untertitel}>
      <Schritt nr={1} titel={a.neu.titel} link={{ href: "/einstellungen/personen", text: a.neu.link }}>
        <p>{a.neu.absatz}</p>
        <p>
          {a.neu.rollenVor}{" "}
          {ROLLEN_REIHENFOLGE.map((rolle, i) => (
            <Fragment key={rolle}>
              {i > 0 && " · "}
              <span className="font-medium">{a.neu.rollen[rolle].name}</span> {a.neu.rollen[rolle].text}
            </Fragment>
          ))}
        </p>
      </Schritt>
      <Schritt nr={2} titel={a.weitergeben.titel}>
        <Absaetze texte={a.weitergeben.absaetze} />
      </Schritt>
      <Schritt nr={3} titel={a.betrieb.titel} link={{ href: "/einstellungen", text: a.betrieb.link }}>
        <Absaetze texte={a.betrieb.absaetze} />
      </Schritt>
    </Abschnitt>
  );
}
