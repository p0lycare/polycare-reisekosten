import type { ReactNode } from "react";

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

function Ablauf({ aktiv }: { aktiv: number }) {
  const schritte = ["Belege", "Erfassen", "Einreichen", "Genehmigt", "Geprüft · DATEV", "Ausgezahlt"];
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

export const SCHRITTE: TourSchritt[] = [
  {
    id: "willkommen",
    titel: "Willkommen bei Polycare Reisekosten",
    text: (
      <>
        <p>Hier rechnest du Dienstreisen und privat vorgestreckte Auslagen ab – ohne Excel, ohne Papierstapel, ohne Unterschriften.</p>
        <p>Der Ablauf ist immer gleich: Belege sammeln, am Monatsende einreichen, den Rest erledigen Führungskraft und Buchhaltung.</p>
      </>
    ),
    bild: (
      <Rahmen>
        <Ablauf aktiv={0} />
      </Rahmen>
    ),
  },
  {
    id: "profil",
    titel: "Einmalig: Profil ausfüllen",
    text: (
      <>
        <p>Trag Wohnort und Personalnummer ein. Fährst du mit dem eigenen Auto, auch das Kennzeichen.</p>
        <p>Mit dem Outlook-Kalender schlägt dir das Tool vergangene Termine außerhalb deines Standorts als Reise vor.</p>
      </>
    ),
    bild: (
      <Rahmen>
        <div className="grid grid-cols-2 gap-2">
          <Feld label="Wohnort" wert="Musterstraße 1, Köln" />
          <Feld label="Personalnummer" wert="0815" />
          <Feld label="Kfz-Kennzeichen" wert="K-AB 123" />
          <Feld label="Kalender-Vorschläge" wert="✓ eingeschaltet" />
        </div>
      </Rahmen>
    ),
    link: { href: "/profil", text: "Zum Profil" },
  },
  {
    id: "belege",
    titel: "Unterwegs: Beleg sofort fotografieren",
    text: (
      <>
        <p>Direkt nach dem Bezahlen auf „Beleg fotografieren“. Händler, Datum, Betrag und MwSt werden automatisch ausgelesen.</p>
        <p>Der Beleg wartet im Eingang, bis du ihn einer Reise zuordnest oder als Auslage erfasst. Tipp: Tool aufs Handy als App holen (Teilen → „Zum Home-Bildschirm“).</p>
        <p>
          Je nach Beleg fragt das Tool nach, was die Buchhaltung braucht: beim Hotel, wer übernachtet hat und warum; bei Bewirtungen Anlass
          und Gäste; beim Tanken das Kennzeichen; beim Mietwagen den Anlass der Fahrt. Vieles ist aus der Reise vorbelegt.
        </p>
      </>
    ),
    bild: (
      <Rahmen>
        <div className="flex gap-3">
          <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded bg-neutral-100 text-[10px] text-neutral-500 dark:bg-neutral-800">Foto</div>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-xs font-medium">Hotel am Bahnhof · Berlin</p>
            <p className="text-[11px] text-neutral-500">22.10.2026 · 122,00 €</p>
            <p className="text-[11px] text-neutral-500">Übernachtung 107,00 € · Frühstück 15,00 €</p>
            <div className="flex flex-wrap gap-1.5">
              <Knopf>Zuordnen</Knopf>
              <Knopf sekundaer>Neue Reise daraus</Knopf>
              <Knopf sekundaer>Als Auslage erfassen</Knopf>
            </div>
          </div>
        </div>
      </Rahmen>
    ),
    link: { href: "/belege", text: "Zu den Belegen" },
  },
  {
    id: "reise",
    titel: "Reise anlegen",
    text: (
      <>
        <p>
          Am schnellsten aus einem Beleg oder einem Kalendervorschlag. Beginn und Ende sind Abfahrt und Rückkehr – daraus berechnet das
          Tool die Verpflegungspauschale.
        </p>
        <p>Bei „Eigener PKW“ die Strecke eintragen und „km berechnen“ tippen; die Route siehst du auf der Karte.</p>
      </>
    ),
    bild: (
      <Rahmen>
        <div className="grid grid-cols-2 gap-2">
          <Feld label="Anlass" wert="Kundentermin Essen" />
          <Feld label="Reiseweg" wert="Köln – Essen – Köln" />
          <Feld label="Beginn" wert="21.10.2026, 07:30" />
          <Feld label="Ende" wert="21.10.2026, 18:15" />
        </div>
        <div className="flex items-center justify-between rounded bg-flaeche px-2 py-1.5 text-xs">
          <span>Eigener PKW · 146 km</span>
          <span className="font-medium tabular-nums">43,80 €</span>
        </div>
      </Rahmen>
    ),
    link: { href: "/reisen/neu", text: "Neue Reise" },
  },
  {
    id: "auslagen",
    titel: "Auslagen ohne Reise",
    text: (
      <>
        <p>Privat vorgestreckt, aber keine Reise – z. B. Baumarkt oder Porto? Beleg fotografieren und „Als Auslage erfassen“, dann den Zweck angeben.</p>
        <p>Ab 250 € brutto muss die Rechnung auf Polycare Research Technology GmbH ausgestellt sein, sonst geht die Vorsteuer verloren.</p>
      </>
    ),
    bild: (
      <Rahmen>
        <div className="grid grid-cols-2 gap-2">
          <Feld label="Lieferant" wert="Baumarkt Beispiel" />
          <Feld label="Bezahlt mit" wert="EC-Karte" />
          <Feld label="Zweck" wert="Aufbau Messestand" />
          <Feld label="Betrag brutto" wert="300,81 €" />
        </div>
        <p className="rounded bg-amber-50 p-2 text-[11px] text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Über 250 € brutto: Rechnung muss auf Polycare ausgestellt sein.
        </p>
      </Rahmen>
    ),
    link: { href: "/auslagen", text: "Meine Auslagen" },
  },
  {
    id: "monat",
    titel: "Am Monatsende: gesammelt einreichen",
    text: (
      <>
        <p>Unter „Monat abrechnen“ stehen alle Reisen und Auslagen des Monats. Gelbe Hinweise zeigen typische Fehler – kurz prüfen.</p>
        <p>Richtigkeit bestätigen und einreichen. Deine Führungskraft bekommt eine Mail und genehmigt alles in einem Schritt.</p>
      </>
    ),
    bild: (
      <Rahmen>
        <Zeile links="☑ Kundentermin Essen" unter="21.10.2026 · 2 Belege" rechts={<span className="text-xs tabular-nums">57,80 €</span>} />
        <Zeile links="☑ Messe Berlin" unter="19.–23.10.2026 · 5 Belege" rechts={<span className="text-xs tabular-nums">612,40 €</span>} />
        <Zeile links="☑ Auslagen Oktober 2026" unter="Auslagen ohne Reise · 1 Beleg" rechts={<span className="text-xs tabular-nums">300,81 €</span>} />
        <div className="pt-1">
          <Knopf>3 Abrechnungen einreichen (971,01 €)</Knopf>
        </div>
      </Rahmen>
    ),
    link: { href: "/monat", text: "Monat abrechnen" },
  },
  {
    id: "danach",
    titel: "Danach läuft alles automatisch",
    text: (
      <>
        <p>Genehmigung → Belegprüfung durch die Buchhaltung → Übergabe an DATEV → Überweisung. Bei jedem Schritt bekommst du eine Mail.</p>
        <p>Wird etwas abgelehnt, steht der Grund in der Abrechnung – korrigieren und erneut einreichen. Den Papierbeleg aufheben, bis ausgezahlt ist.</p>
      </>
    ),
    bild: (
      <Rahmen>
        <Ablauf aktiv={3} />
        <p className="text-xs text-neutral-600 dark:text-neutral-400">Genehmigt – die Buchhaltung prüft die Belege und übergibt an DATEV.</p>
      </Rahmen>
    ),
  },
  {
    id: "freigaben",
    titel: "Für Führungskräfte: genehmigen",
    fuer: ["freigeber", "buchhaltung", "admin"],
    text: (
      <>
        <p>Unter „Freigaben“ siehst du die eingereichten Abrechnungen deines Teams, mit Hinweisen und Belegen.</p>
        <p>Mehrere auswählen und gemeinsam genehmigen – oder mit kurzer Begründung ablehnen. Du bekommst montags eine Erinnerung, wenn etwas wartet.</p>
      </>
    ),
    bild: (
      <Rahmen>
        <Zeile links="☑ Kollegin A · Messe Berlin" unter="19.–23.10.2026" rechts={<Status text="Eingereicht" farbe="blau" />} />
        <Zeile links="☑ Kollege B · Auslagen Oktober" unter="1 Beleg · 1 Hinweis" rechts={<Status text="Eingereicht" farbe="blau" />} />
        <div className="flex gap-1.5 pt-1">
          <Knopf>Auswahl genehmigen</Knopf>
          <Knopf sekundaer>Auswahl ablehnen …</Knopf>
        </div>
      </Rahmen>
    ),
    link: { href: "/freigaben", text: "Zu den Freigaben" },
  },
  {
    id: "pruefen",
    titel: "Für die Buchhaltung: prüfen und an DATEV",
    fuer: ["buchhaltung", "admin"],
    text: (
      <>
        <p>Genehmigte Abrechnungen erscheinen zur Belegprüfung. Buchungsmonat wählen und prüfen – das Tool vergibt die Beleg-Nr. (RK- bzw. AL-…).</p>
        <p>Abrechnung und Belege gehen als PDF automatisch an die passende DATEV-Upload-Adresse. Nach der Überweisung als ausgezahlt markieren.</p>
      </>
    ),
    bild: (
      <Rahmen>
        <Zeile links="RK-2026-0012 · Messe Berlin" unter="Buchungsmonat 10/2026" rechts={<Status text="Geprüft · DATEV ✓" farbe="gruen" />} />
        <Zeile links="AL-2026-0003 · Auslagen Oktober" unter="Buchungsmonat 10/2026" rechts={<Status text="Genehmigt" farbe="gelb" />} />
        <div className="flex gap-1.5 pt-1">
          <Knopf>Belege prüfen</Knopf>
          <Knopf sekundaer>Ausgezahlt</Knopf>
        </div>
      </Rahmen>
    ),
    link: { href: "/freigaben", text: "Zur Belegprüfung" },
  },
  {
    id: "verwaltung",
    titel: "Für Admins: Personen, Standorte, Kategorien",
    fuer: ["admin"],
    text: (
      <>
        <p>Unter „Einstellungen“ legst du Rolle, genehmigende Person und erste Tätigkeitsstätte je Person fest – neue Kolleginnen und Kollegen erscheinen nach dem ersten Login.</p>
        <p>Dort pflegst du auch Standorte, Projekte, Buchungskonten und die DATEV-Adressen.</p>
      </>
    ),
    bild: (
      <Rahmen>
        <Zeile links="Neue Kollegin" unter="Rolle: Mitarbeiter/in · genehmigt durch: Team Lead" rechts={<Status text="Standort Köln" farbe="grau" />} />
        <Zeile links="Neuer Kollege" unter="Rolle: Führungskraft · genehmigt durch: CTO" rechts={<Status text="Standort Gehlberg" farbe="grau" />} />
      </Rahmen>
    ),
    link: { href: "/einstellungen/personen", text: "Personen verwalten" },
  },
  {
    id: "fertig",
    titel: "Das war's – los geht's",
    text: (
      <>
        <p>Am besten jetzt das Profil ausfüllen und den nächsten Beleg direkt fotografieren.</p>
        <p>Fragen oder Fehler? Oben auf „Feedback“ – die Admins bekommen deine Meldung direkt. Diese Tour findest du jederzeit unter „Hilfe“.</p>
      </>
    ),
    bild: (
      <Rahmen>
        <Ablauf aktiv={6} />
        <p className="text-xs text-neutral-600 dark:text-neutral-400">Ausgezahlt – erledigt.</p>
      </Rahmen>
    ),
    link: { href: "/profil", text: "Profil ausfüllen" },
  },
];

/** Schritte, die für eine Rolle gelten – in der festgelegten Reihenfolge */
export function schritteFuer(rolle: TourRolle): TourSchritt[] {
  return SCHRITTE.filter((s) => !s.fuer || s.fuer.includes(rolle));
}
