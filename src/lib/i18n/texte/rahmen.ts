import type { Uebersetzung } from "../typen";

/** Kopfzeile, Login, Profil, Sprachumschalter */
export const de = {
  kopfzeile: {
    startseite: "Polycare Reisekosten, Startseite",
    bereiche: "Bereiche",
    belege: "Belege",
    meineReisen: "Meine Reisen",
    meineAuslagen: "Meine Auslagen",
    monatAbrechnen: "Monat abrechnen",
    freigaben: "Freigaben",
    uebersicht: "Übersicht",
    team: "Team",
    einstellungen: "Einstellungen",
    hilfe: "Hilfe",
    feedback: "Feedback",
    profil: "Profil",
  },
  sprache: {
    bezeichnung: "Sprache",
    de: "Deutsch",
    en: "English",
    wechselnZu: "Switch to English",
    hinweis: "Abrechnungs-PDF und DATEV-Unterlagen bleiben immer auf Deutsch.",
  },
  seitenHilfe: {
    mehr: "Mehr in der Hilfe",
  },
  login: {
    titel: "Reisekosten",
    text: "Melde dich mit deinem Polycare-Microsoft-Konto an.",
    fehler: "Die Anmeldung hat nicht geklappt. Bitte versuche es erneut.",
    knopf: "Mit Microsoft anmelden",
  },
  profil: {
    titel: "Mein Profil",
    herkunft: "Name und E-Mail kommen aus Microsoft 365.",
    vertraulich: "Vertraulich – nur für dich und die Buchhaltung (ausgezahlt wird über DATEV)",
    personalnummer: "Personalnummer",
    wohnort: "Wohnort",
    kostenstelle: "Kostenstelle",
    kostenstelleHinweis: "Wird bei neuen Reisen vorbelegt",
    kfz: "Kfz-Kennzeichen (eigener PKW)",
    kfzHinweis: "Wird bei Fahrten mit eigenem PKW vorbelegt",
    kalender: "Reisen aus meinem Outlook-Kalender vorschlagen",
    kalenderText:
      "Beim Abrechnen eines Monats liest das Tool Termine mit Ort aus deinem Kalender (Betreff, Ort, Zeiten) und schlägt sie als Reise vor. Termine werden nicht gespeichert und sind für niemanden sonst sichtbar.",
  },
};

export const en: Uebersetzung<typeof de> = {
  kopfzeile: {
    startseite: "Polycare Travel Expenses, home",
    bereiche: "Sections",
    belege: "Receipts",
    meineReisen: "My trips",
    meineAuslagen: "My expenses",
    monatAbrechnen: "Submit month",
    freigaben: "Approvals",
    uebersicht: "Overview",
    team: "Team",
    einstellungen: "Settings",
    hilfe: "Help",
    feedback: "Feedback",
    profil: "Profile",
  },
  sprache: {
    bezeichnung: "Language",
    de: "Deutsch",
    en: "English",
    wechselnZu: "Auf Deutsch umstellen",
    hinweis: "Expense report PDFs and DATEV documents are always in German.",
  },
  seitenHilfe: {
    mehr: "More in Help",
  },
  login: {
    titel: "Travel expenses",
    text: "Sign in with your Polycare Microsoft account.",
    fehler: "Sign-in didn't work. Please try again.",
    knopf: "Sign in with Microsoft",
  },
  profil: {
    titel: "My profile",
    herkunft: "Name and email come from Microsoft 365.",
    vertraulich: "Confidential – only for you and Accounting (payouts are made via DATEV)",
    personalnummer: "Personnel number",
    wohnort: "Place of residence",
    kostenstelle: "Cost centre",
    kostenstelleHinweis: "Pre-filled for new trips",
    kfz: "Licence plate (own car)",
    kfzHinweis: "Pre-filled for journeys with your own car",
    kalender: "Suggest trips from my Outlook calendar",
    kalenderText:
      "When you submit a month, the tool reads appointments with a location from your calendar (subject, location, times) and suggests them as trips. Appointments are not stored and are not visible to anyone else.",
  },
};
