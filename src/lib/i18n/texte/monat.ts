import type { Uebersetzung } from "../typen";

/** Monat abrechnen: Monatsseite, Sammel-Einreichen, Kalendervorschläge */
export const de = {
  seite: {
    vormonat: "Vormonat",
    folgemonat: "Folgemonat",
    anzahlReisen: (n: number) => `${n} ${n === 1 ? "Reise" : "Reisen"}`,
    plusAuslagen: " + Auslagen",
    anleitungTitel: "So rechnest du den Monat ab – am besten einmal am Monatsende",
    anleitung: [
      "Belege aus dem Eingang den Reisen zuordnen – Einkäufe ohne Reise als Auslage erfassen.",
      "Fehlende Reisen anlegen – gern direkt aus den Vorschlägen aus deinem Kalender unten.",
      "Alle fertigen Reisen und Auslagen auswählen und gesammelt einreichen. Deine Führungskraft bekommt eine Mail und genehmigt alles in einem Schritt.",
    ],
    einzeln: "Einzelne Reisen kannst du auch sofort in der Reise einreichen.",
    eingangAnzahl: (n: number) => `${n} ${n === 1 ? "Beleg" : "Belege"}`,
    eingangRest: (n: number) => `aus diesem Monat ${n === 1 ? "liegt" : "liegen"} noch im Eingang – erst zuordnen, dann einreichen.`,
    belegFotografieren: "Beleg fotografieren",
    reiseHinzufuegen: "Reise hinzufügen",
    auslageErfassen: "Auslage erfassen",
    leer: "In diesem Monat sind noch keine Reisen oder Auslagen erfasst.",
    kalenderLaedt: "Kalender wird gelesen …",
  },
  liste: {
    /** "2 Reisen", "1 Abrechnung" – sobald Auslagen dabei sind, neutral als Abrechnungen */
    anzahl: (n: number, mitAuslagen: boolean) =>
      mitAuslagen ? `${n} ${n === 1 ? "Abrechnung" : "Abrechnungen"}` : `${n} ${n === 1 ? "Reise" : "Reisen"}`,
    auswahlLabel: (begruendung: string) => `${begruendung} einreichen`,
    auslagenOhneReise: "Auslagen ohne Reise",
    belege: (n: number) => `${n} ${n === 1 ? "Beleg" : "Belege"}`,
    leereAuslage: "Noch keine Belege – erst Auslagen erfassen, dann einreichen.",
    alsVorlage: "Als Vorlage für neue Reise",
    einreichenTitel: "Monat einreichen",
    richtigkeit: (mitAuslagen: boolean) =>
      `Für die Richtigkeit: Ich bestätige, dass die Angaben der ausgewählten ${mitAuslagen ? "Abrechnungen" : "Reisen"} vollständig und richtig sind und die Kosten dienstlich veranlasst waren.`,
    reichtEin: "Reicht ein …",
    einreichenKnopf: (anzahl: string, summe: string) => `${anzahl} einreichen (${summe})`,
    eingereicht: (anzahl: string, benachrichtigt: boolean) =>
      `${anzahl} eingereicht${benachrichtigt ? " – die genehmigende Person wurde per Mail benachrichtigt." : "."}`,
  },
  fehler: {
    richtigkeit: "Bitte bestätige die Richtigkeit deiner Angaben.",
    auswahl: "Bitte mindestens eine Abrechnung auswählen.",
    einreichen: "Das Einreichen hat nicht geklappt. Bitte Seite neu laden.",
  },
  kalender: {
    erstAb: "Vorschläge aus dem Kalender gibt es für Termine ab dem 01.10.2026.",
    tippVor: "Tipp: Reisen aus deinem Outlook-Kalender vorschlagen lassen –",
    tippLink: "im Profil einschalten",
    tippNach: ".",
    nichtGelesen: "Kalender konnte nicht gelesen werden",
    keinZugriff: " – die Exchange-Berechtigung für Kalender fehlt noch.",
    ausgeblendet: (n: number) => `${n} ausgeblendet – wieder anzeigen`,
    diesemMonat: "diesem Monat",
    keineTermineVor: (zeitraum: string) =>
      `Aus deinem Kalender: In ${zeitraum} gibt es keine weiteren Termine mit Ort. Online-Termine, Termine am Wohnort bzw. im Büro`,
    einstellungen: "Einstellungen",
    keineTermineNach: "und bereits erfasste Reisen werden ausgeblendet.",
    titel: "Aus deinem Kalender",
    nochNichtErfasst: "– noch nicht erfasst",
    alsReiseAnlegen: "Als Reise anlegen",
    ausblendenLabel: (betreff: string) => `Vorschlag „${betreff}“ ausblenden`,
    ausblendenTitel: "Keine Dienstreise – ausblenden",
  },
};

export const en: Uebersetzung<typeof de> = {
  seite: {
    vormonat: "Previous month",
    folgemonat: "Next month",
    anzahlReisen: (n) => `${n} ${n === 1 ? "trip" : "trips"}`,
    plusAuslagen: " + expenses",
    anleitungTitel: "How to submit your month – ideally once at the end of the month",
    anleitung: [
      "Assign receipts from the inbox to your trips – record purchases without a trip as expenses.",
      "Add missing trips – ideally straight from the suggestions from your calendar below.",
      "Select all finished trips and expenses and submit them together. Your manager gets an email and approves everything in one step.",
    ],
    einzeln: "You can also submit individual trips straight away from the trip itself.",
    eingangAnzahl: (n) => `${n} ${n === 1 ? "receipt" : "receipts"}`,
    eingangRest: (n) => `from this month ${n === 1 ? "is" : "are"} still in the inbox – assign first, then submit.`,
    belegFotografieren: "Photograph receipt",
    reiseHinzufuegen: "Add trip",
    auslageErfassen: "Record expense",
    leer: "No trips or expenses recorded for this month yet.",
    kalenderLaedt: "Reading calendar …",
  },
  liste: {
    anzahl: (n, mitAuslagen) =>
      mitAuslagen ? `${n} ${n === 1 ? "expense report" : "expense reports"}` : `${n} ${n === 1 ? "trip" : "trips"}`,
    auswahlLabel: (begruendung) => `Submit ${begruendung}`,
    auslagenOhneReise: "Expenses without a trip",
    belege: (n) => `${n} ${n === 1 ? "receipt" : "receipts"}`,
    leereAuslage: "No receipts yet – record expenses first, then submit.",
    alsVorlage: "Use as template for a new trip",
    einreichenTitel: "Submit month",
    richtigkeit: (mitAuslagen) =>
      `Declaration: I confirm that the details of the selected ${mitAuslagen ? "expense reports" : "trips"} are complete and correct and that the costs were incurred for business purposes.`,
    reichtEin: "Submitting …",
    einreichenKnopf: (anzahl, summe) => `Submit ${anzahl} (${summe})`,
    eingereicht: (anzahl, benachrichtigt) =>
      `${anzahl} submitted${benachrichtigt ? " – the approver has been notified by email." : "."}`,
  },
  fehler: {
    richtigkeit: "Please confirm that your details are correct.",
    auswahl: "Please select at least one expense report.",
    einreichen: "Submitting didn't work. Please reload the page.",
  },
  kalender: {
    erstAb: "Calendar suggestions are available for appointments from 01.10.2026.",
    tippVor: "Tip: have trips suggested from your Outlook calendar –",
    tippLink: "turn it on in your profile",
    tippNach: ".",
    nichtGelesen: "The calendar could not be read",
    keinZugriff: " – the Exchange permission for calendars is still missing.",
    ausgeblendet: (n) => `${n} hidden – show again`,
    diesemMonat: "this month",
    keineTermineVor: (zeitraum) =>
      `From your calendar: there are no further appointments with a location ${zeitraum}. Online meetings, appointments at your place of residence or in the office`,
    einstellungen: "Settings",
    keineTermineNach: "and trips already recorded are hidden.",
    titel: "From your calendar",
    nochNichtErfasst: "– not yet recorded",
    alsReiseAnlegen: "Create as trip",
    ausblendenLabel: (betreff) => `Hide suggestion “${betreff}”`,
    ausblendenTitel: "Not a business trip – hide",
  },
};
