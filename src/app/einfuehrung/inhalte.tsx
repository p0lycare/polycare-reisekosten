import Link from "next/link";
import { formatEuro } from "@/lib/format";

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

export function FuerAlle({ kmSatzCent, kmSteuerfreiCent, monat }: { kmSatzCent: number; kmSteuerfreiCent: number; monat: string }) {
  return (
    <Abschnitt id="reisende" titel="Reisekosten abrechnen" untertitel="Für alle – so kommst du in wenigen Minuten pro Monat zu deinem Geld.">
      <Schritt nr={1} titel="Als App aufs Handy holen" >
        <p>
          <span className="font-medium">iPhone:</span> Seite in Safari öffnen → Teilen-Symbol → „Zum Home-Bildschirm“.{" "}
          <span className="font-medium">Android:</span> in Chrome Menü (⋮) → „App installieren“.
        </p>
        <p>Danach startet das Tool wie eine App – ideal, um Belege direkt nach dem Bezahlen zu fotografieren.</p>
      </Schritt>
      <Schritt nr={2} titel="Unterwegs: Belege sofort fotografieren" link={{ href: "/belege", text: "Belege" }}>
        <p>
          Direkt nach dem Bezahlen „Beleg fotografieren“ – Händler, Datum, Betrag und MwSt werden automatisch ausgelesen. PDFs (z. B.
          Bahn- oder Hotelrechnungen) kannst du ebenfalls hochladen.
        </p>
        <p>Die Belege warten im Eingang, bis du sie am Monatsende einer Reise zuordnest. Den Papierbeleg danach aufheben, bis die Reise ausgezahlt ist.</p>
        <p>Mit der Firmenkarte bezahlte Ausgaben gehören nicht hierher – die laufen über Agicap.</p>
      </Schritt>
      <Schritt nr={3} titel="Am Monatsende: Reisen anlegen" link={{ href: `/monat/${monat}`, text: "Monat abrechnen" }}>
        <p>Unter „Monat abrechnen“ siehst du alles für den Monat. Eine Reise legst du am schnellsten an …</p>
        <ul className="ml-4 list-disc">
          <li>aus einem Beleg im Eingang (Datum und Ort sind vorbelegt),</li>
          <li>aus einem Vorschlag aus deinem Outlook-Kalender (im Profil einschalten),</li>
          <li>als Kopie einer früheren Reise („Als Vorlage“), z. B. für regelmäßige Kundentermine.</li>
        </ul>
        <p>
          Beginn und Ende sind die Abfahrt und Rückkehr an Wohnung oder Büro. Daraus berechnet das Tool die Verpflegungspauschale. Hat
          dir jemand eine Mahlzeit bezahlt (z. B. Frühstück im Hotel), hake sie ab – dann wird die Pauschale gesetzlich gekürzt.
        </p>
        <p>Belege aus dem Eingang werden der Reise anhand des Datums zugeordnet.</p>
      </Schritt>
      <Schritt nr={4} titel="Fahrten mit dem eigenen Auto">
        <p>
          Bei „Eigener PKW“ je Fahrt die Strecke eintragen, z. B. „Köln – Essen – Köln“, und auf „km berechnen“ tippen. Du kannst die km
          anpassen; weicht deine Angabe deutlich von der Route ab, kurz im Zweck begründen (z. B. Umleitung).
        </p>
        <p>
          Erstattet werden {formatEuro(kmSatzCent)} je km. Davon sind {formatEuro(kmSteuerfreiCent)} steuerfrei, der Rest wird über die
          Lohnabrechnung versteuert. Tankbelege für den eigenen PKW nicht zusätzlich einreichen.
        </p>
      </Schritt>
      <Schritt nr={5} titel="Gesammelt einreichen">
        <p>
          Auf „Monat abrechnen“ alle fertigen Reisen auswählen und einreichen. Gelbe Hinweise zeigen typische Fehler (fehlende
          Hotelrechnung, Beleg außerhalb des Zeitraums …) – kurz prüfen, dann geht es ohne Rückfragen durch.
        </p>
        <p>
          Danach: Genehmigung durch deine Führungskraft → Belegprüfung durch die Buchhaltung → Übergabe an DATEV → Auszahlung auf dein
          Konto. Bei jedem Schritt bekommst du eine Mail.
        </p>
        <p>
          Solange noch nicht genehmigt ist, kannst du eine Reise zurückziehen und korrigieren. Wird sie abgelehnt, steht der Grund in
          der Reise – korrigieren und erneut einreichen.
        </p>
      </Schritt>
      <Schritt nr={6} titel="Erinnerung am Monatsende">
        <p>
          Am vorletzten Werktag des Monats bekommst du eine Mail, falls noch Entwürfe oder Belege im Eingang offen sind. Ist alles
          eingereicht, kommt nichts.
        </p>
      </Schritt>
    </Abschnitt>
  );
}

export function FuerFuehrungskraefte() {
  return (
    <Abschnitt id="fuehrungskraefte" titel="Reisen genehmigen" untertitel="Für Führungskräfte – meist ein Klick pro Person und Monat.">
      <Schritt nr={1} titel="Benachrichtigung und Freigaben" link={{ href: "/freigaben", text: "Freigaben" }}>
        <p>
          Reicht jemand aus deinem Team ein, bekommst du eine Mail. Unter „Freigaben“ sind die Reisen nach Person gruppiert und alle
          vorausgewählt; die Zahl am Reiter zeigt, wie viel wartet.
        </p>
      </Schritt>
      <Schritt nr={2} titel="Prüfen, worauf es ankommt">
        <p>
          Du bestätigst, dass die Reise dienstlich war und Zeitraum und Ziel stimmen. Die Belege prüft danach die Buchhaltung. Gelbe
          Hinweise (z. B. km deutlich über der Route) lohnen einen Blick; mit einem Klick auf die Reise siehst du alle Details und
          Belegfotos.
        </p>
      </Schritt>
      <Schritt nr={3} titel="Genehmigen oder ablehnen">
        <p>
          Gesammelt genehmigen, optional mit Kommentar für die Buchhaltung. Ablehnen geht in der einzelnen Reise mit kurzem Grund – sie
          geht dann zur Korrektur zurück.
        </p>
      </Schritt>
      <Schritt nr={4} titel="Team im Blick" link={{ href: "/uebersicht", text: "Team-Übersicht" }}>
        <p>Die Übersicht zeigt je Monat, was dein Team eingereicht hat und wo es gerade steht. Montags erinnert eine Mail, falls noch etwas wartet.</p>
        <p>Deine eigenen Reisen genehmigt deine Führungskraft – niemand genehmigt sich selbst.</p>
      </Schritt>
    </Abschnitt>
  );
}

export function FuerBuchhaltung() {
  return (
    <Abschnitt id="buchhaltung" titel="Prüfen, buchen, auszahlen" untertitel="Für die Buchhaltung – von der Belegprüfung bis zur Lohnliste.">
      <Schritt nr={1} titel="Belegprüfung" link={{ href: "/freigaben", text: "Freigaben" }}>
        <p>
          Genehmigte Reisen erscheinen unter „Zur Belegprüfung“. In der Reise Beträge mit den Belegfotos abgleichen, ggf. Kategorie oder
          MwSt korrigieren lassen (ablehnen mit Grund).
        </p>
        <p>Vier-Augen-Prinzip: Wer eine Reise genehmigt hat, kann sie nicht auch prüfen.</p>
      </Schritt>
      <Schritt nr={2} titel="Buchungsmonat und DATEV">
        <p>
          Beim Prüfen den Buchungsmonat wählen. Die Reise bekommt eine Beleg-Nr. (RK-Jahr-Nummer), und Abrechnung samt Belegen geht als
          PDF automatisch an die DATEV-Upload-Adresse. Ob die Übertragung geklappt hat, steht in der Übersicht und im Versandprotokoll.
        </p>
      </Schritt>
      <Schritt nr={3} titel="Auszahlung">
        <p>
          Unter „Zur Auszahlung“ stehen die Beträge je Person mit IBAN aus dem Profil. Überweisen, dann „als ausgezahlt markieren“ – die
          Person bekommt eine Mail.
        </p>
      </Schritt>
      <Schritt nr={4} titel="Lohnliste" link={{ href: "/lohnliste", text: "Lohnliste" }}>
        <p>
          Je Buchungsmonat und Person: steuerfreie Reisekosten, Auslagen und steuerpflichtiges Km-Geld (Anteil über dem steuerfreien
          Satz) für die Lohnabrechnung.
        </p>
      </Schritt>
      <Schritt nr={5} titel="Einstellungen" link={{ href: "/einstellungen", text: "Einstellungen" }}>
        <p>Kategorien mit Konto und MwSt-Satz, Km-Sätze, Büro-Orte für die Kalendervorschläge und die DATEV-Upload-Adresse pflegst du hier.</p>
      </Schritt>
    </Abschnitt>
  );
}

export function FuerAdmins() {
  return (
    <Abschnitt id="admins" titel="Verwalten" untertitel="Für Admins – neue Kolleg:innen einrichten und den Betrieb im Blick behalten.">
      <Schritt nr={1} titel="Neue Kolleg:innen" link={{ href: "/einstellungen/personen", text: "Personen und Rollen" }}>
        <p>
          Wer sich zum ersten Mal mit dem Microsoft-Konto anmeldet, erscheint unter „Personen und Rollen“. Dort Rolle und genehmigende
          Führungskraft eintragen – ohne Führungskraft kann jede Führungskraft oder ein Admin genehmigen.
        </p>
        <p>
          Rollen: <span className="font-medium">Mitarbeiter/in</span> rechnet eigene Reisen ab · <span className="font-medium">Führungskraft</span>{" "}
          genehmigt zusätzlich ihr Team · <span className="font-medium">Buchhaltung</span> prüft, übergibt an DATEV und zahlt aus ·{" "}
          <span className="font-medium">Admin</span> darf alles und verwaltet Personen.
        </p>
      </Schritt>
      <Schritt nr={2} titel="Diese Einführung weitergeben">
        <p>
          Schick neuen Kolleg:innen einfach den Link auf diese Seite: Jede Person sieht automatisch die Teile für ihre Rolle. Mit der
          Auswahl oben siehst du, was eine bestimmte Rolle sieht.
        </p>
      </Schritt>
      <Schritt nr={3} titel="Betrieb prüfen" link={{ href: "/einstellungen", text: "Einstellungen" }}>
        <p>
          Unter Einstellungen findest du Testmail, „Erinnerung an mich testen“ und das Versandprotokoll aller Mails (Benachrichtigungen,
          DATEV, Erinnerungen).
        </p>
      </Schritt>
    </Abschnitt>
  );
}
