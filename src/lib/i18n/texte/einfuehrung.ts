import type { Uebersetzung } from "../typen";
import { en as rahmenEn } from "./rahmen";

/** Englische Reiternamen der Kopfzeile – die Einführung nennt sie exakt so */
const K = rahmenEn.kopfzeile;

/** Einführung (Hilfe-Seite) und interaktive Tour */
export const de = {
  seite: {
    willkommen: (vorname: string) => (vorname ? `Willkommen, ${vorname}` : "Willkommen"),
    intro: "Hier erfasst du Dienstreisen, fotografierst Belege und reichst einmal im Monat ein – ohne Excel und ohne Papierstapel.",
    introRolle: " Weiter unten steht, was für deine Rolle dazukommt.",
    tourStarten: "Tour starten (2 Minuten)",
    ansichtNavigation: "Ansicht für Rolle",
    ansichtFuer: "Ansicht für:",
    rollen: {
      mitarbeiter: "Mitarbeiter/in",
      freigeber: "Führungskraft",
      buchhaltung: "Buchhaltung",
      admin: "Admin",
    },
    erledigt: "erledigt",
    offen: "offen",
    optional: " (optional)",
    startklar: "Du bist startklar",
    startklarIn: "In 2 Minuten startklar",
    startklarText: "Einmal im Profil eintragen – danach füllt das Tool vieles selbst aus.",
    punkte: {
      wohnort: "Wohnort (für Reiseweg und Fahrten)",
      personalnummer: "Personalnummer",
      kfz: "Kfz-Kennzeichen, falls du mit dem eigenen Auto fährst",
      kalender: "Reisen aus dem Outlook-Kalender vorschlagen lassen",
    },
    keineFuehrungskraft:
      "Für dich ist noch keine genehmigende Führungskraft hinterlegt – das richtet ein Admin ein. Bis dahin kann jede Führungskraft genehmigen.",
    profilAnsehen: "Profil ansehen",
    profilAusfuellen: "Profil ausfüllen",
    fussnote:
      "Fragen, Fehler oder Wünsche? Oben auf „Feedback“ tippen – die Admins bekommen deine Meldung direkt. Diese Einführung findest du jederzeit unter „Hilfe“.",
  },

  alle: {
    titel: "Reisekosten abrechnen",
    untertitel: "Für alle – so kommst du in wenigen Minuten pro Monat zu deinem Geld.",
    app: {
      titel: "Als App aufs Handy holen",
      iphone: "iPhone:",
      iphoneText: "Seite in Safari öffnen → Teilen-Symbol → „Zum Home-Bildschirm“.",
      android: "Android:",
      androidText: "in Chrome Menü (⋮) → „App installieren“.",
      danach: "Danach startet das Tool wie eine App – ideal, um Belege direkt nach dem Bezahlen zu fotografieren.",
    },
    belege: {
      titel: "Unterwegs: Belege sofort fotografieren",
      link: "Belege",
      absaetze: [
        "Direkt nach dem Bezahlen „Beleg fotografieren“ – Händler, Datum, Betrag und MwSt werden automatisch ausgelesen. PDFs (z. B. Bahn- oder Hotelrechnungen) kannst du ebenfalls hochladen.",
        "Die Belege warten im Eingang, bis du sie am Monatsende einer Reise zuordnest. Den Papierbeleg danach aufheben, bis die Reise ausgezahlt ist.",
        "Mit der Firmenkarte bezahlte Ausgaben gehören nicht hierher – die laufen über Agicap.",
        "Damit jede Ausgabe für Dritte nachvollziehbar ist, fragt das Tool je Beleg nach: bei Hotels, wer übernachtet hat und warum; bei Bewirtungen Anlass und Gäste; beim Tanken das Kennzeichen (auch beim Mietwagen); beim Mietwagen den Anlass der Fahrt. Vieles ist aus der Reise vorbelegt.",
      ],
    },
    reisen: {
      titel: "Am Monatsende: Reisen anlegen",
      link: "Monat abrechnen",
      einleitung: "Unter „Monat abrechnen“ siehst du alles für den Monat. Eine Reise legst du am schnellsten an …",
      wege: [
        "aus einem Beleg im Eingang (Datum und Ort sind vorbelegt),",
        "aus einem Vorschlag aus deinem Outlook-Kalender (im Profil einschalten),",
        "als Kopie einer früheren Reise („Als Vorlage“), z. B. für regelmäßige Kundentermine.",
      ],
      absaetze: [
        "Beginn und Ende sind die Abfahrt und Rückkehr an Wohnung oder Büro. Daraus berechnet das Tool die Verpflegungspauschale. Hat dir jemand eine Mahlzeit bezahlt (z. B. Frühstück im Hotel), hake sie ab – dann wird die Pauschale gesetzlich gekürzt.",
        "Gehört die Reise zu einem Projekt oder Förderprojekt, wähle es aus. Bei Reisen ins Ausland das Land wählen – es gelten die Auslandspauschalen; bei mehreren Staaten je Tag das Land, das vor 24 Uhr erreicht wurde.",
        "Belege aus dem Eingang werden der Reise anhand des Datums zugeordnet.",
      ],
    },
    fahrten: {
      titel: "Fahrten mit dem eigenen Auto",
      strecke:
        "Bei „Eigener PKW“ je Fahrt die Strecke eintragen, z. B. „Köln – Essen – Köln“, und auf „km berechnen“ tippen. Du kannst die km anpassen; weicht deine Angabe deutlich von der Route ab, kurz im Zweck begründen (z. B. Umleitung).",
      erstattet: (satz: string) => `Erstattet werden ${satz} je km`,
      steueranteil: (steuerfrei: string) => ` – davon sind ${steuerfrei} steuerfrei, der Rest wird als Arbeitslohn versteuert. `,
      steuerfrei: ", steuerfrei. ",
      tankbelege: "Tankbelege für den eigenen PKW nicht zusätzlich einreichen.",
    },
    auslagen: {
      titel: "Auslagen ohne Reise",
      link: "Meine Auslagen",
      absaetze: [
        "Privat vorgestreckte Ausgaben ohne Reise (z. B. Baumarkt, Büromaterial, Porto oder ein Geschäftsessen am eigenen Standort) genauso fotografieren und im Eingang „Als Auslage erfassen“ wählen. Je Monat gibt es eine Auslagenabrechnung; zu jedem Beleg den Zweck angeben.",
        "Ab 250 € brutto muss die Rechnung auf Polycare Research Technology GmbH ausgestellt sein, sonst kann die Vorsteuer nicht gezogen werden. Eingereicht wird zusammen mit den Reisen unter „Monat abrechnen“ – der Ablauf danach ist derselbe.",
      ],
    },
    einreichen: {
      titel: "Gesammelt einreichen",
      absaetze: [
        "Auf „Monat abrechnen“ alle fertigen Reisen und Auslagen auswählen und einreichen. Gelbe Hinweise zeigen typische Fehler (fehlende Hotelrechnung, Beleg außerhalb des Zeitraums …) – kurz prüfen, dann geht es ohne Rückfragen durch.",
        "Danach: Genehmigung durch deine Führungskraft → Belegprüfung durch die Buchhaltung → Übergabe an DATEV → Überweisung auf dein Konto. Bei jedem Schritt bekommst du eine Mail.",
        "Solange noch nicht genehmigt ist, kannst du eine Reise zurückziehen und korrigieren. Wird sie abgelehnt, steht der Grund in der Reise – korrigieren und erneut einreichen.",
      ],
      /** Nur auf Englisch gefüllt: Abrechnungs-PDF und DATEV-Unterlagen bleiben deutsch */
      pdfHinweis: "",
    },
    vorschuss: {
      titel: "Vorschuss für größere Ausgaben",
      absaetze: [
        "Stehen hohe Kosten an (z. B. Hotel oder Flug), kannst du in der geplanten Reise einen Vorschuss beantragen. Deine Führungskraft genehmigt, die Buchhaltung zahlt aus – bei der Abrechnung wird er automatisch abgezogen.",
      ],
    },
    erinnerung: {
      titel: "Erinnerung am Monatsende",
      absaetze: [
        "Am vorletzten Werktag des Monats bekommst du eine Mail, falls noch Entwürfe oder Belege im Eingang offen sind. Ist alles eingereicht, kommt nichts.",
      ],
    },
  },

  fuehrung: {
    titel: "Reisen genehmigen",
    untertitel: "Für Führungskräfte – meist ein Klick pro Person und Monat.",
    benachrichtigung: {
      titel: "Benachrichtigung und Freigaben",
      link: "Freigaben",
      absaetze: [
        "Reicht jemand aus deinem Team ein, bekommst du eine Mail. Unter „Freigaben“ sind die Reisen nach Person gruppiert und alle vorausgewählt; die Zahl am Reiter zeigt, wie viel wartet.",
      ],
    },
    pruefen: {
      titel: "Prüfen, worauf es ankommt",
      absaetze: [
        "Du bestätigst, dass die Reise dienstlich war und Zeitraum und Ziel stimmen. Die Belege prüft danach die Buchhaltung. Gelbe Hinweise (z. B. km deutlich über der Route) lohnen einen Blick; mit einem Klick auf die Reise siehst du alle Details und Belegfotos.",
      ],
    },
    genehmigen: {
      titel: "Genehmigen oder ablehnen",
      absaetze: [
        "Gesammelt genehmigen, optional mit Kommentar für die Buchhaltung. Ablehnen geht in der einzelnen Reise mit kurzem Grund – sie geht dann zur Korrektur zurück.",
      ],
    },
    team: {
      titel: "Team im Blick",
      link: "Team-Übersicht",
      absaetze: [
        "Die Übersicht zeigt je Monat, was dein Team eingereicht hat und wo es gerade steht. Vorschussanträge erscheinen ebenfalls unter „Freigaben“. Montags erinnert eine Mail, falls noch etwas wartet.",
        "Deine eigenen Reisen genehmigt deine Führungskraft – niemand genehmigt sich selbst.",
      ],
    },
  },

  buchhaltung: {
    titel: "Prüfen, buchen, auszahlen",
    untertitel: "Für die Buchhaltung – von der Belegprüfung bis zur Auszahlung.",
    belegpruefung: {
      titel: "Belegprüfung",
      link: "Freigaben",
      absaetze: [
        "Genehmigte Reisen erscheinen unter „Zur Belegprüfung“. In der Reise Beträge mit den Belegfotos abgleichen, ggf. Kategorie oder MwSt korrigieren lassen (ablehnen mit Grund).",
        "Vier-Augen-Prinzip: Wer eine Reise genehmigt hat, kann sie nicht auch prüfen.",
      ],
    },
    datev: {
      titel: "Buchungsmonat und DATEV",
      absaetze: [
        "Beim Prüfen den Buchungsmonat wählen. Die Reise bekommt eine Beleg-Nr. (RK-Jahr-Nummer), und Abrechnung samt Belegen geht als PDF automatisch an die DATEV-Upload-Adresse. Ob die Übertragung geklappt hat, steht in der Übersicht und im Versandprotokoll.",
      ],
      /** Nur auf Englisch gefüllt */
      pdfHinweis: "",
    },
    auszahlung: {
      titel: "Auszahlung",
      absaetze: [
        "Ausgezahlt wird als eigene Überweisung über DATEV: Die geprüfte Reise liegt mit Beleg-Nr. als PDF in DATEV, dort buchen und die Zahlung anweisen – die Bankverbindungen sind hinterlegt. Danach im Tool unter „Zur Auszahlung“ als überwiesen markieren (auch gesammelt); die Person bekommt eine Mail. Genehmigte Vorschüsse stehen oben unter „Vorschüsse“ und laufen genauso.",
      ],
    },
    einstellungen: {
      titel: "Einstellungen",
      link: "Einstellungen",
      absaetze: [
        "Kategorien mit Konto und MwSt-Satz, Km-Sätze, Projekte und Förderprojekte, Standorte (erste Tätigkeitsstätten) und die DATEV-Upload-Adresse pflegst du hier. Unter „Freigaben → Projekte“ siehst du die Reisekosten je Projekt und Zeitraum.",
      ],
    },
  },

  admins: {
    titel: "Verwalten",
    untertitel: "Für Admins – neue Kolleg:innen einrichten und den Betrieb im Blick behalten.",
    neu: {
      titel: "Neue Kolleg:innen",
      link: "Personen und Rollen",
      absatz:
        "Wer sich zum ersten Mal mit dem Microsoft-Konto anmeldet, erscheint unter „Personen und Rollen“. Dort Rolle und genehmigende Führungskraft eintragen – ohne Führungskraft kann jede Führungskraft oder ein Admin genehmigen.",
      rollenVor: "Rollen:",
      rollen: {
        mitarbeiter: { name: "Mitarbeiter/in", text: "rechnet eigene Reisen ab" },
        freigeber: { name: "Führungskraft", text: "genehmigt zusätzlich ihr Team" },
        buchhaltung: { name: "Buchhaltung", text: "prüft, übergibt an DATEV und zahlt aus" },
        admin: { name: "Admin", text: "darf alles und verwaltet Personen." },
      },
    },
    weitergeben: {
      titel: "Diese Einführung weitergeben",
      absaetze: [
        "Schick neuen Kolleg:innen einfach den Link auf diese Seite: Jede Person sieht automatisch die Teile für ihre Rolle. Mit der Auswahl oben siehst du, was eine bestimmte Rolle sieht.",
      ],
    },
    betrieb: {
      titel: "Betrieb prüfen",
      link: "Einstellungen",
      absaetze: [
        "Unter Einstellungen findest du Testmail, „Erinnerung an mich testen“ und das Versandprotokoll aller Mails (Benachrichtigungen, DATEV, Erinnerungen).",
      ],
    },
  },

  tour: {
    ueberschrift: "Einführung als Tour",
    rollenbeschreibung: "Tour",
    schrittVon: (nr: number, gesamt: number) => `Schritt ${nr} von ${gesamt}`,
    beenden: "Tour beenden",
    navigation: "Schritte",
    punkt: (nr: number, titel: string) => `Schritt ${nr}: ${titel}`,
    losGehts: "Los geht's",
    ablauf: ["Belege", "Erfassen", "Einreichen", "Genehmigt", "Geprüft · DATEV", "Ausgezahlt"],
    anzahlBelege: (n: number) => (n === 1 ? "1 Beleg" : `${n} Belege`),
    anzahlHinweise: (n: number) => (n === 1 ? "1 Hinweis" : `${n} Hinweise`),
    willkommen: {
      titel: "Willkommen bei Polycare Reisekosten",
      absaetze: [
        "Hier rechnest du Dienstreisen und privat vorgestreckte Auslagen ab – ohne Excel, ohne Papierstapel, ohne Unterschriften.",
        "Der Ablauf ist immer gleich: Belege sammeln, am Monatsende einreichen, den Rest erledigen Führungskraft und Buchhaltung.",
      ],
    },
    profil: {
      titel: "Einmalig: Profil ausfüllen",
      absaetze: [
        "Trag Wohnort und Personalnummer ein. Fährst du mit dem eigenen Auto, auch das Kennzeichen.",
        "Mit dem Outlook-Kalender schlägt dir das Tool vergangene Termine außerhalb deines Standorts als Reise vor.",
      ],
      wohnort: "Wohnort",
      personalnummer: "Personalnummer",
      kfz: "Kfz-Kennzeichen",
      kalender: "Kalender-Vorschläge",
      kalenderWert: "✓ eingeschaltet",
      link: "Zum Profil",
    },
    belege: {
      titel: "Unterwegs: Beleg sofort fotografieren",
      absaetze: [
        "Direkt nach dem Bezahlen auf „Beleg fotografieren“. Händler, Datum, Betrag und MwSt werden automatisch ausgelesen.",
        "Der Beleg wartet im Eingang, bis du ihn einer Reise zuordnest oder als Auslage erfasst. Tipp: Tool aufs Handy als App holen (Teilen → „Zum Home-Bildschirm“).",
        "Je nach Beleg fragt das Tool nach, was die Buchhaltung braucht: beim Hotel, wer übernachtet hat und warum; bei Bewirtungen Anlass und Gäste; beim Tanken das Kennzeichen; beim Mietwagen den Anlass der Fahrt. Vieles ist aus der Reise vorbelegt.",
      ],
      foto: "Foto",
      haendler: "Hotel am Bahnhof · Berlin",
      positionen: "Übernachtung 107,00 € · Frühstück 15,00 €",
      zuordnen: "Zuordnen",
      neueReise: "Neue Reise daraus",
      alsAuslage: "Als Auslage erfassen",
      link: "Zu den Belegen",
    },
    reise: {
      titel: "Reise anlegen",
      absaetze: [
        "Am schnellsten aus einem Beleg oder einem Kalendervorschlag. Beginn und Ende sind Abfahrt und Rückkehr – daraus berechnet das Tool die Verpflegungspauschale.",
        "Bei „Eigener PKW“ die Strecke eintragen und „km berechnen“ tippen; die Route siehst du auf der Karte.",
      ],
      anlass: "Anlass",
      anlassWert: "Kundentermin Essen",
      reiseweg: "Reiseweg",
      beginn: "Beginn",
      ende: "Ende",
      link: "Neue Reise",
    },
    auslagen: {
      titel: "Auslagen ohne Reise",
      absaetze: [
        "Privat vorgestreckt, aber keine Reise – z. B. Baumarkt oder Porto? Beleg fotografieren und „Als Auslage erfassen“, dann den Zweck angeben.",
        "Ab 250 € brutto muss die Rechnung auf Polycare Research Technology GmbH ausgestellt sein, sonst geht die Vorsteuer verloren.",
      ],
      lieferant: "Lieferant",
      lieferantWert: "Baumarkt Beispiel",
      bezahltMit: "Bezahlt mit",
      bezahltMitWert: "EC-Karte",
      zweck: "Zweck",
      zweckWert: "Aufbau Messestand",
      betrag: "Betrag brutto",
      warnung: "Über 250 € brutto: Rechnung muss auf Polycare ausgestellt sein.",
      link: "Meine Auslagen",
    },
    monat: {
      titel: "Am Monatsende: gesammelt einreichen",
      absaetze: [
        "Unter „Monat abrechnen“ stehen alle Reisen und Auslagen des Monats. Gelbe Hinweise zeigen typische Fehler – kurz prüfen.",
        "Richtigkeit bestätigen und einreichen. Deine Führungskraft bekommt eine Mail und genehmigt alles in einem Schritt.",
      ],
      kundentermin: "☑ Kundentermin Essen",
      messe: "☑ Messe Berlin",
      auslagen: "☑ Auslagen Oktober 2026",
      ohneReise: "Auslagen ohne Reise",
      einreichen: (anzahl: number, betrag: string) => `${anzahl} Abrechnungen einreichen (${betrag})`,
      link: "Monat abrechnen",
    },
    danach: {
      titel: "Danach läuft alles automatisch",
      absaetze: [
        "Genehmigung → Belegprüfung durch die Buchhaltung → Übergabe an DATEV → Überweisung. Bei jedem Schritt bekommst du eine Mail.",
        "Wird etwas abgelehnt, steht der Grund in der Abrechnung – korrigieren und erneut einreichen. Den Papierbeleg aufheben, bis ausgezahlt ist.",
      ],
      stand: "Genehmigt – die Buchhaltung prüft die Belege und übergibt an DATEV.",
    },
    freigaben: {
      titel: "Für Führungskräfte: genehmigen",
      absaetze: [
        "Unter „Freigaben“ siehst du die eingereichten Abrechnungen deines Teams, mit Hinweisen und Belegen.",
        "Mehrere auswählen und gemeinsam genehmigen – oder mit kurzer Begründung ablehnen. Du bekommst montags eine Erinnerung, wenn etwas wartet.",
      ],
      kolleginA: "☑ Kollegin A · Messe Berlin",
      kollegeB: "☑ Kollege B · Auslagen Oktober",
      genehmigen: "Auswahl genehmigen",
      ablehnen: "Auswahl ablehnen …",
      link: "Zu den Freigaben",
    },
    pruefen: {
      titel: "Für die Buchhaltung: prüfen und an DATEV",
      absaetze: [
        "Genehmigte Abrechnungen erscheinen zur Belegprüfung. Buchungsmonat wählen und prüfen – das Tool vergibt die Beleg-Nr. (RK- bzw. AL-…).",
        "Abrechnung und Belege gehen als PDF automatisch an die passende DATEV-Upload-Adresse. Nach der Überweisung als ausgezahlt markieren.",
      ],
      /** Nur auf Englisch gefüllt */
      pdfHinweis: "",
      messe: "RK-2026-0012 · Messe Berlin",
      auslagen: "AL-2026-0003 · Auslagen Oktober",
      buchungsmonat: (monat: string) => `Buchungsmonat ${monat}`,
      belegePruefen: "Belege prüfen",
      ausgezahlt: "Ausgezahlt",
      link: "Zur Belegprüfung",
    },
    verwaltung: {
      titel: "Für Admins: Personen, Standorte, Kategorien",
      absaetze: [
        "Unter „Einstellungen“ legst du Rolle, genehmigende Person und erste Tätigkeitsstätte je Person fest – neue Kolleginnen und Kollegen erscheinen nach dem ersten Login.",
        "Dort pflegst du auch Standorte, Projekte, Buchungskonten und die DATEV-Adressen.",
      ],
      kollegin: "Neue Kollegin",
      kolleginDetails: "Rolle: Mitarbeiter/in · genehmigt durch: Team Lead",
      kollege: "Neuer Kollege",
      kollegeDetails: "Rolle: Führungskraft · genehmigt durch: CTO",
      standort: (ort: string) => `Standort ${ort}`,
      link: "Personen verwalten",
    },
    fertig: {
      titel: "Das war's – los geht's",
      absaetze: [
        "Am besten jetzt das Profil ausfüllen und den nächsten Beleg direkt fotografieren.",
        "Fragen oder Fehler? Oben auf „Feedback“ – die Admins bekommen deine Meldung direkt. Diese Tour findest du jederzeit unter „Hilfe“.",
      ],
      stand: "Ausgezahlt – erledigt.",
      link: "Profil ausfüllen",
    },
  },
};

export const en: Uebersetzung<typeof de> = {
  seite: {
    willkommen: (vorname) => (vorname ? `Welcome, ${vorname}` : "Welcome"),
    intro: "This is where you record business trips, photograph receipts and submit once a month – no Excel, no piles of paper.",
    introRolle: " Further down you'll find what's added for your role.",
    tourStarten: "Start tour (2 minutes)",
    ansichtNavigation: "View for role",
    ansichtFuer: "View for:",
    rollen: {
      mitarbeiter: "Employee",
      freigeber: "Manager",
      buchhaltung: "Accounting",
      admin: "Admin",
    },
    erledigt: "done",
    offen: "open",
    optional: " (optional)",
    startklar: "You're all set",
    startklarIn: "Ready to go in 2 minutes",
    startklarText: "Fill in your profile once – after that, the tool fills in a lot for you.",
    punkte: {
      wohnort: "Place of residence (for route and journeys)",
      personalnummer: "Personnel number",
      kfz: "Licence plate, if you drive your own car",
      kalender: "Have trips suggested from your Outlook calendar",
    },
    keineFuehrungskraft:
      "No approving manager has been set up for you yet – an admin will do that. Until then, any manager can approve.",
    profilAnsehen: "View profile",
    profilAusfuellen: "Complete profile",
    fussnote: `Questions, bugs or requests? Tap “${K.feedback}” at the top – the admins receive your message directly. You can find this introduction at any time under “${K.hilfe}”.`,
  },

  alle: {
    titel: "Submitting travel expenses",
    untertitel: "For everyone – how to get your money back in just a few minutes a month.",
    app: {
      titel: "Install it as an app on your phone",
      iphone: "iPhone:",
      iphoneText: "open the page in Safari → Share icon → “Add to Home Screen”.",
      android: "Android:",
      androidText: "in Chrome, menu (⋮) → “Install app”.",
      danach: "After that, the tool starts like an app – ideal for photographing receipts right after paying.",
    },
    belege: {
      titel: "On the road: photograph receipts straight away",
      link: K.belege,
      absaetze: [
        "Right after paying, tap “Photograph receipt” – merchant, date, amount and VAT are read automatically. You can also upload PDFs (e.g. train or hotel invoices).",
        "Receipts wait in the inbox until you assign them to a trip at the end of the month. Keep the paper receipt until the trip has been paid out.",
        "Expenses paid with the company card don't belong here – they go through Agicap.",
        "So that every expense is traceable for others, the tool asks for details for each receipt: for hotels, who stayed and why; for business entertainment, the reason and guests; for fuel, the licence plate (also for rental cars); for rental cars, the purpose of the journey. Much of it is pre-filled from the trip.",
      ],
    },
    reisen: {
      titel: "At the end of the month: create trips",
      link: K.monatAbrechnen,
      einleitung: `Under “${K.monatAbrechnen}” you see everything for the month. The quickest way to create a trip is …`,
      wege: [
        "from a receipt in the inbox (date and place are pre-filled),",
        "from a suggestion from your Outlook calendar (switch it on in your profile),",
        "as a copy of an earlier trip (“Use as template”), e.g. for regular customer meetings.",
      ],
      absaetze: [
        "Start and end are your departure from and return to your home or office. The tool uses them to calculate the meal allowance. If someone paid for a meal for you (e.g. breakfast at the hotel), tick it – the allowance is then reduced as required by law.",
        "If the trip belongs to a project or funded project, select it. For trips abroad, choose the country – foreign allowances apply; if you visit several countries on one day, choose the country you reached before midnight.",
        "Receipts from the inbox are assigned to the trip by date.",
      ],
    },
    fahrten: {
      titel: "Journeys in your own car",
      strecke:
        "For “Own car”, enter the route for each journey, e.g. “Köln – Essen – Köln”, and tap “Calculate km”. You can adjust the km; if your figure differs significantly from the route, give a short reason in the purpose (e.g. diversion).",
      erstattet: (satz) => `You are reimbursed ${satz} per km`,
      steueranteil: (steuerfrei) => ` – ${steuerfrei} of this is tax-free, the rest is taxed as employment income. `,
      steuerfrei: ", tax-free. ",
      tankbelege: "Don't also submit fuel receipts for your own car.",
    },
    auslagen: {
      titel: "Expenses without a trip",
      link: K.meineAuslagen,
      absaetze: [
        "Photograph expenses you paid out of your own pocket without a trip (e.g. DIY store, office supplies, postage or a business meal at your own site) in the same way and choose “Record as expense” in the inbox. There is one expense report per month; give the purpose for each receipt.",
        `From 250 € gross, the invoice must be made out to Polycare Research Technology GmbH, otherwise the input VAT cannot be deducted. Expenses are submitted together with your trips under “${K.monatAbrechnen}” – the process afterwards is the same.`,
      ],
    },
    einreichen: {
      titel: "Submit everything together",
      absaetze: [
        `On “${K.monatAbrechnen}”, select all completed trips and expenses and submit them. Yellow notes point out typical mistakes (missing hotel invoice, receipt outside the period …) – check them briefly and it will go through without any queries.`,
        "Then: approval by your manager → receipt check by Accounting → handover to DATEV → transfer to your account. You'll get an email at every step.",
        "As long as it hasn't been approved, you can withdraw a trip and correct it. If it's rejected, the reason is shown in the trip – correct it and submit it again.",
      ],
      pdfHinweis: "The expense report PDF and the DATEV documents are always in German.",
    },
    vorschuss: {
      titel: "Advance for larger expenses",
      absaetze: [
        "If high costs are coming up (e.g. hotel or flight), you can request an advance in the planned trip. Your manager approves it, Accounting pays it out – it is deducted automatically in the expense report.",
      ],
    },
    erinnerung: {
      titel: "Reminder at the end of the month",
      absaetze: [
        "On the second-to-last working day of the month, you'll get an email if there are still drafts or receipts open in the inbox. If everything has been submitted, you won't get one.",
      ],
    },
  },

  fuehrung: {
    titel: "Approving trips",
    untertitel: "For managers – usually one click per person and month.",
    benachrichtigung: {
      titel: "Notification and approvals",
      link: K.freigaben,
      absaetze: [
        `When someone in your team submits, you get an email. Under “${K.freigaben}” the trips are grouped by person and all pre-selected; the number on the tab shows how much is waiting.`,
      ],
    },
    pruefen: {
      titel: "Check what matters",
      absaetze: [
        "You confirm that the trip was for business and that the period and destination are correct. Accounting checks the receipts afterwards. Yellow notes (e.g. km well above the route) are worth a look; click a trip to see all details and receipt photos.",
      ],
    },
    genehmigen: {
      titel: "Approve or reject",
      absaetze: [
        "Approve in one go, optionally with a comment for Accounting. To reject, open the individual trip and give a short reason – it then goes back for correction.",
      ],
    },
    team: {
      titel: "Keep track of your team",
      link: "Team overview",
      absaetze: [
        `The ${K.uebersicht} shows, for each month, what your team has submitted and where it currently stands. Advance requests also appear under “${K.freigaben}”. On Mondays, an email reminds you if anything is still waiting.`,
        "Your own trips are approved by your manager – nobody approves their own.",
      ],
    },
  },

  buchhaltung: {
    titel: "Check, book, pay out",
    untertitel: "For Accounting – from receipt check to payout.",
    belegpruefung: {
      titel: "Receipt check",
      link: K.freigaben,
      absaetze: [
        "Approved trips appear under “For receipt check”. In the trip, compare the amounts with the receipt photos; if necessary, have the category or VAT corrected (reject with a reason).",
        "Four-eyes principle: whoever approved a trip cannot also check it.",
      ],
    },
    datev: {
      titel: "Booking month and DATEV",
      absaetze: [
        "When checking, choose the booking month. The trip gets a receipt no. (RK-year-number), and the expense report including receipts is sent automatically as a PDF to the DATEV upload address. Whether the transfer worked is shown in the overview and in the sending log.",
      ],
      pdfHinweis: "The PDF and all DATEV documents are always in German.",
    },
    auszahlung: {
      titel: "Payout",
      absaetze: [
        "Payouts are made as a separate transfer via DATEV: the checked trip is in DATEV as a PDF with its receipt no.; book it there and instruct the payment – the bank details are on file. Then mark it as transferred in the tool under “For payout” (also in bulk); the person receives an email. Approved advances are listed at the top under “Advances” and work the same way.",
      ],
    },
    einstellungen: {
      titel: K.einstellungen,
      link: K.einstellungen,
      absaetze: [
        `This is where you maintain categories with account and VAT rate, mileage rates, projects and funded projects, sites (first places of work) and the DATEV upload address. Under “${K.freigaben} → Projects” you can see travel expenses per project and period.`,
      ],
    },
  },

  admins: {
    titel: "Administration",
    untertitel: "For admins – set up new colleagues and keep an eye on operations.",
    neu: {
      titel: "New colleagues",
      link: "People and roles",
      absatz:
        "Anyone who signs in with their Microsoft account for the first time appears under “People and roles”. Enter their role and approving manager there – without a manager, any manager or an admin can approve.",
      rollenVor: "Roles:",
      rollen: {
        mitarbeiter: { name: "Employee", text: "submits their own trips" },
        freigeber: { name: "Manager", text: "also approves their team" },
        buchhaltung: { name: "Accounting", text: "checks, hands over to DATEV and pays out" },
        admin: { name: "Admin", text: "can do everything and manages people." },
      },
    },
    weitergeben: {
      titel: "Share this introduction",
      absaetze: [
        "Simply send new colleagues the link to this page: everyone automatically sees the parts for their role. Use the selection at the top to see what a particular role sees.",
      ],
    },
    betrieb: {
      titel: "Check operations",
      link: K.einstellungen,
      absaetze: [
        `Under ${K.einstellungen} you'll find the test email, “Test reminder to me” and the sending log of all emails (notifications, DATEV, reminders).`,
      ],
    },
  },

  tour: {
    ueberschrift: "Introduction as a tour",
    rollenbeschreibung: "Tour",
    schrittVon: (nr, gesamt) => `Step ${nr} of ${gesamt}`,
    beenden: "End tour",
    navigation: "Steps",
    punkt: (nr, titel) => `Step ${nr}: ${titel}`,
    losGehts: "Let's go",
    ablauf: ["Receipts", "Record", "Submit", "Approved", "Checked · DATEV", "Paid out"],
    anzahlBelege: (n) => (n === 1 ? "1 receipt" : `${n} receipts`),
    anzahlHinweise: (n) => (n === 1 ? "1 note" : `${n} notes`),
    willkommen: {
      titel: "Welcome to Polycare Travel Expenses",
      absaetze: [
        "This is where you claim business trips and expenses you've paid out of your own pocket – no Excel, no piles of paper, no signatures.",
        "The process is always the same: collect receipts, submit at the end of the month, and your manager and Accounting do the rest.",
      ],
    },
    profil: {
      titel: "One-off: complete your profile",
      absaetze: [
        "Enter your place of residence and personnel number. If you drive your own car, add your licence plate too.",
        "With your Outlook calendar, the tool suggests past appointments away from your site as trips.",
      ],
      wohnort: "Place of residence",
      personalnummer: "Personnel number",
      kfz: "Licence plate",
      kalender: "Calendar suggestions",
      kalenderWert: "✓ on",
      link: "Go to profile",
    },
    belege: {
      titel: "On the road: photograph receipts straight away",
      absaetze: [
        "Right after paying, tap “Photograph receipt”. Merchant, date, amount and VAT are read automatically.",
        "The receipt waits in the inbox until you assign it to a trip or record it as an expense. Tip: install the tool on your phone as an app (Share → “Add to Home Screen”).",
        "Depending on the receipt, the tool asks for what Accounting needs: for hotels, who stayed and why; for business entertainment, the reason and guests; for fuel, the licence plate; for rental cars, the purpose of the journey. Much of it is pre-filled from the trip.",
      ],
      foto: "Photo",
      haendler: "Hotel am Bahnhof · Berlin",
      positionen: "Accommodation 107,00 € · Breakfast 15,00 €",
      zuordnen: "Assign",
      neueReise: "New trip from this",
      alsAuslage: "Record as expense",
      link: `Go to ${K.belege}`,
    },
    reise: {
      titel: "Create a trip",
      absaetze: [
        "The quickest way is from a receipt or a calendar suggestion. Start and end are departure and return – the tool uses them to calculate the meal allowance.",
        "For “Own car”, enter the route and tap “Calculate km”; you'll see the route on the map.",
      ],
      anlass: "Purpose",
      anlassWert: "Customer meeting Essen",
      reiseweg: "Route",
      beginn: "Start",
      ende: "End",
      link: "New trip",
    },
    auslagen: {
      titel: "Expenses without a trip",
      absaetze: [
        "Paid out of your own pocket, but not a trip – e.g. DIY store or postage? Photograph the receipt, choose “Record as expense”, then give the purpose.",
        "From 250 € gross, the invoice must be made out to Polycare Research Technology GmbH, otherwise the input VAT is lost.",
      ],
      lieferant: "Supplier",
      lieferantWert: "Example DIY store",
      bezahltMit: "Paid with",
      bezahltMitWert: "Debit card",
      zweck: "Purpose",
      zweckWert: "Setting up trade fair stand",
      betrag: "Gross amount",
      warnung: "Over 250 € gross: the invoice must be made out to Polycare.",
      link: K.meineAuslagen,
    },
    monat: {
      titel: "At the end of the month: submit everything together",
      absaetze: [
        `Under “${K.monatAbrechnen}” you'll find all trips and expenses for the month. Yellow notes point out typical mistakes – check them briefly.`,
        "Confirm that everything is correct and submit. Your manager gets an email and approves everything in one step.",
      ],
      kundentermin: "☑ Customer meeting Essen",
      messe: "☑ Trade fair Berlin",
      auslagen: "☑ Expenses October 2026",
      ohneReise: "Expenses without a trip",
      einreichen: (anzahl, betrag) => `Submit ${anzahl} expense reports (${betrag})`,
      link: K.monatAbrechnen,
    },
    danach: {
      titel: "After that, everything runs automatically",
      absaetze: [
        "Approval → receipt check by Accounting → handover to DATEV → transfer. You'll get an email at every step.",
        "If something is rejected, the reason is shown in the expense report – correct it and submit it again. Keep the paper receipt until it has been paid out.",
      ],
      stand: "Approved – Accounting checks the receipts and hands over to DATEV.",
    },
    freigaben: {
      titel: "For managers: approve",
      absaetze: [
        `Under “${K.freigaben}” you see your team's submitted expense reports, with notes and receipts.`,
        "Select several and approve them together – or reject with a short reason. You'll get a reminder on Mondays if anything is waiting.",
      ],
      kolleginA: "☑ Colleague A · Trade fair Berlin",
      kollegeB: "☑ Colleague B · Expenses October",
      genehmigen: "Approve selection",
      ablehnen: "Reject selection …",
      link: `Go to ${K.freigaben}`,
    },
    pruefen: {
      titel: "For Accounting: check and send to DATEV",
      absaetze: [
        "Approved expense reports appear for the receipt check. Choose the booking month and check – the tool assigns the receipt no. (RK- or AL-…).",
        "The expense report and receipts are sent automatically as a PDF to the right DATEV upload address. After the transfer, mark it as paid out.",
      ],
      pdfHinweis: "The PDF and all DATEV documents are always in German.",
      messe: "RK-2026-0012 · Trade fair Berlin",
      auslagen: "AL-2026-0003 · Expenses October",
      buchungsmonat: (monat) => `Booking month ${monat}`,
      belegePruefen: "Check receipts",
      ausgezahlt: "Paid out",
      link: "Go to receipt check",
    },
    verwaltung: {
      titel: "For admins: people, sites, categories",
      absaetze: [
        `Under “${K.einstellungen}” you set the role, approver and first place of work for each person – new colleagues appear after their first sign-in.`,
        "There you also maintain sites, projects, booking accounts and the DATEV addresses.",
      ],
      kollegin: "New colleague",
      kolleginDetails: "Role: Employee · approved by: Team Lead",
      kollege: "Another new colleague",
      kollegeDetails: "Role: Manager · approved by: CTO",
      standort: (ort) => `Site ${ort}`,
      link: "Manage people",
    },
    fertig: {
      titel: "That's it – let's get started",
      absaetze: [
        "Best to complete your profile now and photograph your next receipt straight away.",
        `Questions or bugs? Tap “${K.feedback}” at the top – the admins receive your message directly. You can find this tour at any time under “${K.hilfe}”.`,
      ],
      stand: "Paid out – done.",
      link: "Complete profile",
    },
  },
};
