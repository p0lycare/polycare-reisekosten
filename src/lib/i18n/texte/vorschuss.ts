import type { Uebersetzung } from "../typen";

/** Reisekostenvorschuss: Antrag in der Reise, Entscheidung in den Freigaben (Mailtexte stehen in vorschuss/actions.ts) */
export const de = {
  fehler: {
    allgemein: "Das hat nicht geklappt. Bitte Seite neu laden.",
    betrag: "Bitte den Betrag angeben, z. B. 300,00.",
  },
  erledigt: {
    beantragt: "Beantragt – deine Führungskraft bekommt eine Mail.",
    zurueckgezogen: "Antrag zurückgezogen.",
    genehmigt: "Genehmigt",
    ausgezahlt: "Als ausgezahlt markiert",
    abgelehnt: "Abgelehnt",
  },
  beantragenOeffnen: "Vorschuss beantragen …",
  betrag: "Betrag (€)",
  betragPlatzhalter: "300,00",
  wofuer: "Wofür? (optional)",
  wofuerPlatzhalter: "z. B. Hotel und Verpflegung Messe",
  beantragen: "Beantragen",
  zurueckziehen: "Antrag zurückziehen",
  ab: (datum: string) => `ab ${datum}`,
  grundPlatzhalter: "Grund der Ablehnung",
  ablehnen: "Ablehnen",
  ablehnenOeffnen: "Ablehnen …",
  genehmigen: "Genehmigen",
  auszahlen: "In DATEV überwiesen – als ausgezahlt markieren",
};

export const en: Uebersetzung<typeof de> = {
  fehler: {
    allgemein: "That didn't work. Please reload the page.",
    betrag: "Please enter the amount, e.g. 300,00.",
  },
  erledigt: {
    beantragt: "Requested – your manager will get an email.",
    zurueckgezogen: "Request withdrawn.",
    genehmigt: "Approved",
    ausgezahlt: "Marked as paid out",
    abgelehnt: "Rejected",
  },
  beantragenOeffnen: "Request advance …",
  betrag: "Amount (€)",
  betragPlatzhalter: "300,00",
  wofuer: "What for? (optional)",
  wofuerPlatzhalter: "e.g. hotel and meals at the trade fair",
  beantragen: "Request",
  zurueckziehen: "Withdraw request",
  ab: (datum) => `from ${datum}`,
  grundPlatzhalter: "Reason for rejection",
  ablehnen: "Reject",
  ablehnenOeffnen: "Reject …",
  genehmigen: "Approve",
  auszahlen: "Transferred in DATEV – mark as paid out",
};
