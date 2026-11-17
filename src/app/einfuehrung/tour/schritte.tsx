import type { ReactNode } from "react";
import type { Texte } from "@/lib/i18n/woerterbuch";

export type TourRolle = "mitarbeiter" | "freigeber" | "buchhaltung" | "admin";

export type TourSchritt = {
  id: string;
  titel: string;
  text: ReactNode;
  bild: ReactNode;
  link?: { href: string; text: string };
  /** Für wen der Schritt gedacht ist; ohne Angabe für alle */
  fuer?: TourRolle[];
};

/* Kleine, nachgebaute Bildschirmausschnitte – zeigen, wie es im Tool aussieht, ohne echte Daten */

function Rahmen({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-4 text-sm shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      {children}
    </div>
  );
}

function Knopf({ children, sekundaer }: { children: ReactNode; sekundaer?: boolean }) {
  return (
    <span
      className={`inline-block rounded-md px-3 py-1.5 text-xs font-medium ${
        sekundaer ? "border border-neutral-300 dark:border-neutral-600" : "bg-primaer text-white dark:text-neutral-950"
      }`}
    >
      {children}
    </span>
  );
}

function Feld({ label, wert }: { label: string; wert: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-neutral-500">{label}</span>
      <span className="rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-600">{wert}</span>
    </div>
  );
}

function Status({ text, farbe }: { text: string; farbe: "grau" | "gelb" | "gruen" | "blau" }) {
  const klassen = {
    grau: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    gelb: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    gruen: "bg-marke-hell text-marke-dunkel",
    blau: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  }[farbe];
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${klassen}`}>{text}</span>;
}

function Zeile({ links, rechts, unter }: { links: string; rechts: ReactNode; unter?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-neutral-100 pt-2 first:border-0 first:pt-0 dark:border-neutral-800">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">{links}</p>
        {unter && <p className="truncate text-[11px] text-neutral-500">{unter}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{rechts}</div>
    </div>
  );
}

function Ablauf({ aktiv, schritte }: { aktiv: number; schritte: string[] }) {
  return (
    <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {schritte.map((s, i) => (
        <li key={s} className="flex flex-col items-center gap-1 text-center">
          <span
            className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
              i < aktiv ? "bg-marke text-white" : i === aktiv ? "border-2 border-marke text-marke-dunkel dark:text-marke" : "border border-neutral-300 text-neutral-400"
            }`}
          >
            {i < aktiv ? "✓" : i + 1}
          </span>
          <span className="text-[11px] leading-tight">{s}</span>
        </li>
      ))}
    </ol>
  );
}

/** Absätze aus dem Wörterbuch; ein leerer Zusatz (z. B. PDF-Hinweis auf Deutsch) wird nicht gerendert */
function absaetze(texte: string[], zusatz?: string): ReactNode {
  return (
    <>
      {texte.map((text, i) => (
        <p key={i}>{text}</p>
      ))}
      {zusatz && <p>{zusatz}</p>}
    </>
  );
}

/** Alle Schritte in der Sprache des Wörterbuchs; Datums- und Euro-Format bleiben deutsch */
function alleSchritte(texte: Texte): TourSchritt[] {
  const t = texte.einfuehrung.tour;
  const status = texte.allgemein.status;
  const ablauf = t.ablauf;
  return [
    {
      id: "willkommen",
      titel: t.willkommen.titel,
      text: absaetze(t.willkommen.absaetze),
      bild: (
        <Rahmen>
          <Ablauf aktiv={0} schritte={ablauf} />
        </Rahmen>
      ),
    },
    {
      id: "profil",
      titel: t.profil.titel,
      text: absaetze(t.profil.absaetze),
      bild: (
        <Rahmen>
          <div className="grid grid-cols-2 gap-2">
            <Feld label={t.profil.wohnort} wert="Musterstraße 1, Köln" />
            <Feld label={t.profil.personalnummer} wert="0815" />
            <Feld label={t.profil.kfz} wert="K-AB 123" />
            <Feld label={t.profil.kalender} wert={t.profil.kalenderWert} />
          </div>
        </Rahmen>
      ),
      link: { href: "/profil", text: t.profil.link },
    },
    {
      id: "belege",
      titel: t.belege.titel,
      text: absaetze(t.belege.absaetze),
      bild: (
        <Rahmen>
          <div className="flex gap-3">
            <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded bg-neutral-100 text-[10px] text-neutral-500 dark:bg-neutral-800">
              {t.belege.foto}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-xs font-medium">{t.belege.haendler}</p>
              <p className="text-[11px] text-neutral-500">22.10.2026 · 122,00 €</p>
              <p className="text-[11px] text-neutral-500">{t.belege.positionen}</p>
              <div className="flex flex-wrap gap-1.5">
                <Knopf>{t.belege.zuordnen}</Knopf>
                <Knopf sekundaer>{t.belege.neueReise}</Knopf>
                <Knopf sekundaer>{t.belege.alsAuslage}</Knopf>
              </div>
            </div>
          </div>
        </Rahmen>
      ),
      link: { href: "/belege", text: t.belege.link },
    },
    {
      id: "reise",
      titel: t.reise.titel,
      text: absaetze(t.reise.absaetze),
      bild: (
        <Rahmen>
          <div className="grid grid-cols-2 gap-2">
            <Feld label={t.reise.anlass} wert={t.reise.anlassWert} />
            <Feld label={t.reise.reiseweg} wert="Köln – Essen – Köln" />
            <Feld label={t.reise.beginn} wert="21.10.2026, 07:30" />
            <Feld label={t.reise.ende} wert="21.10.2026, 18:15" />
          </div>
          <div className="flex items-center justify-between rounded bg-flaeche px-2 py-1.5 text-xs">
            <span>{texte.allgemein.verkehrsmittel.eigener_pkw} · 146 km</span>
            <span className="font-medium tabular-nums">43,80 €</span>
          </div>
        </Rahmen>
      ),
      link: { href: "/reisen/neu", text: t.reise.link },
    },
    {
      id: "auslagen",
      titel: t.auslagen.titel,
      text: absaetze(t.auslagen.absaetze),
      bild: (
        <Rahmen>
          <div className="grid grid-cols-2 gap-2">
            <Feld label={t.auslagen.lieferant} wert={t.auslagen.lieferantWert} />
            <Feld label={t.auslagen.bezahltMit} wert={t.auslagen.bezahltMitWert} />
            <Feld label={t.auslagen.zweck} wert={t.auslagen.zweckWert} />
            <Feld label={t.auslagen.betrag} wert="300,81 €" />
          </div>
          <p className="rounded bg-amber-50 p-2 text-[11px] text-amber-900 dark:bg-amber-950 dark:text-amber-100">{t.auslagen.warnung}</p>
        </Rahmen>
      ),
      link: { href: "/auslagen", text: t.auslagen.link },
    },
    {
      id: "monat",
      titel: t.monat.titel,
      text: absaetze(t.monat.absaetze),
      bild: (
        <Rahmen>
          <Zeile links={t.monat.kundentermin} unter={`21.10.2026 · ${t.anzahlBelege(2)}`} rechts={<span className="text-xs tabular-nums">57,80 €</span>} />
          <Zeile links={t.monat.messe} unter={`19.–23.10.2026 · ${t.anzahlBelege(5)}`} rechts={<span className="text-xs tabular-nums">612,40 €</span>} />
          <Zeile links={t.monat.auslagen} unter={`${t.monat.ohneReise} · ${t.anzahlBelege(1)}`} rechts={<span className="text-xs tabular-nums">300,81 €</span>} />
          <div className="pt-1">
            <Knopf>{t.monat.einreichen(3, "971,01 €")}</Knopf>
          </div>
        </Rahmen>
      ),
      link: { href: "/monat", text: t.monat.link },
    },
    {
      id: "danach",
      titel: t.danach.titel,
      text: absaetze(t.danach.absaetze),
      bild: (
        <Rahmen>
          <Ablauf aktiv={3} schritte={ablauf} />
          <p className="text-xs text-neutral-600 dark:text-neutral-400">{t.danach.stand}</p>
        </Rahmen>
      ),
    },
    {
      id: "freigaben",
      titel: t.freigaben.titel,
      fuer: ["freigeber", "buchhaltung", "admin"],
      text: absaetze(t.freigaben.absaetze),
      bild: (
        <Rahmen>
          <Zeile links={t.freigaben.kolleginA} unter="19.–23.10.2026" rechts={<Status text={status.eingereicht} farbe="blau" />} />
          <Zeile
            links={t.freigaben.kollegeB}
            unter={`${t.anzahlBelege(1)} · ${t.anzahlHinweise(1)}`}
            rechts={<Status text={status.eingereicht} farbe="blau" />}
          />
          <div className="flex gap-1.5 pt-1">
            <Knopf>{t.freigaben.genehmigen}</Knopf>
            <Knopf sekundaer>{t.freigaben.ablehnen}</Knopf>
          </div>
        </Rahmen>
      ),
      link: { href: "/freigaben", text: t.freigaben.link },
    },
    {
      id: "pruefen",
      titel: t.pruefen.titel,
      fuer: ["buchhaltung", "admin"],
      text: absaetze(t.pruefen.absaetze, t.pruefen.pdfHinweis),
      bild: (
        <Rahmen>
          <Zeile links={t.pruefen.messe} unter={t.pruefen.buchungsmonat("10/2026")} rechts={<Status text={`${status.geprueft} · DATEV ✓`} farbe="gruen" />} />
          <Zeile links={t.pruefen.auslagen} unter={t.pruefen.buchungsmonat("10/2026")} rechts={<Status text={status.freigegeben} farbe="gelb" />} />
          <div className="flex gap-1.5 pt-1">
            <Knopf>{t.pruefen.belegePruefen}</Knopf>
            <Knopf sekundaer>{t.pruefen.ausgezahlt}</Knopf>
          </div>
        </Rahmen>
      ),
      link: { href: "/freigaben", text: t.pruefen.link },
    },
    {
      id: "verwaltung",
      titel: t.verwaltung.titel,
      fuer: ["admin"],
      text: absaetze(t.verwaltung.absaetze),
      bild: (
        <Rahmen>
          <Zeile links={t.verwaltung.kollegin} unter={t.verwaltung.kolleginDetails} rechts={<Status text={t.verwaltung.standort("Köln")} farbe="grau" />} />
          <Zeile links={t.verwaltung.kollege} unter={t.verwaltung.kollegeDetails} rechts={<Status text={t.verwaltung.standort("Gehlberg")} farbe="grau" />} />
        </Rahmen>
      ),
      link: { href: "/einstellungen/personen", text: t.verwaltung.link },
    },
    {
      id: "fertig",
      titel: t.fertig.titel,
      text: absaetze(t.fertig.absaetze),
      bild: (
        <Rahmen>
          <Ablauf aktiv={6} schritte={ablauf} />
          <p className="text-xs text-neutral-600 dark:text-neutral-400">{t.fertig.stand}</p>
        </Rahmen>
      ),
      link: { href: "/profil", text: t.fertig.link },
    },
  ];
}

/** Schritte, die für eine Rolle gelten – in der festgelegten Reihenfolge */
export function schritteFuer(rolle: TourRolle, texte: Texte): TourSchritt[] {
  return alleSchritte(texte).filter((s) => !s.fuer || s.fuer.includes(rolle));
}
