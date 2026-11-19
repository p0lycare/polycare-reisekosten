import type { Uebersetzung } from "../typen";

/** Freigaben-Seite: Genehmigen, Belegprüfung, Auszahlung im Sammelverfahren */
export const de = {
  seite: {
    titel: "Freigaben",
    uebersicht: "Übersicht",
    projekte: "Projekte",
    hilfeBuchhaltung:
      "Hier wartet, was du tun musst: Reisen und Auslagen deines Teams genehmigen, Belege prüfen (damit gehen sie an DATEV) und nach der Überweisung in DATEV als ausgezahlt markieren. Alles ist je Person gebündelt.",
    hilfeFreigeber:
      "Hier genehmigst du die eingereichten Reisen und Auslagen deines Teams – je Person gebündelt, meist in einem Schritt pro Monat. Danach prüft die Buchhaltung die Belege.",
    vorschuesse: "Vorschüsse",
    zurGenehmigung: "Zur Genehmigung",
    zurPruefung: "Zur Belegprüfung",
    zurAuszahlung: "Zur Auszahlung",
    leerGenehmigen: "Nichts zu genehmigen.",
    leerPruefen: "Nichts zu prüfen.",
    leerAuszahlen: "Nichts auszuzahlen.",
  },
  /** "1 Abrechnung" / "3 Abrechnungen" */
  abrechnungen: (n: number) => `${n} ${n === 1 ? "Abrechnung" : "Abrechnungen"}`,
  /** Hinweis an Reisen und Vorschüssen, die man nur als Vertretung genehmigen darf */
  inVertretungFuer: (name: string) => `in Vertretung für ${name}`,
  vertretungHinweis: (namen: string) =>
    `Du vertrittst gerade ${namen}: Deren Freigaben stehen hier mit dem Hinweis „in Vertretung für …“. Deine eigenen Abrechnungen genehmigst du nicht.`,
  liste: {
    abgelehnt: (name: string, n: number) =>
      `${name}: ${n} ${n === 1 ? "Abrechnung" : "Abrechnungen"} abgelehnt – die Person wurde per Mail informiert.`,
    erledigt: (name: string, n: number) => `${name}: ${n} ${n === 1 ? "Abrechnung" : "Abrechnungen"} erledigt.`,
    ohneReise: "Auslagen ohne Reise",
    hinweise: (n: number) => ` · ${n} Hinweis${n > 1 ? "e" : ""}`,
    kommentarPlatzhalter: "Kommentar für die Buchhaltung (optional)",
    buchungsmonat: "Buchungsmonat",
    knopf: {
      genehmigen: (n: number) => `${n} ${n === 1 ? "Abrechnung" : "Abrechnungen"} genehmigen`,
      pruefen: (n: number) => `${n} ${n === 1 ? "Abrechnung" : "Abrechnungen"} prüfen und an DATEV`,
      auszahlen: (n: number) => `${n} ${n === 1 ? "Abrechnung" : "Abrechnungen"} als in DATEV überwiesen markieren`,
    },
    grundPlatzhalter: "Grund der Ablehnung, z. B. Hotelrechnung fehlt",
    ablehnenKnopf: (n: number) => `${n} ${n === 1 ? "Abrechnung" : "Abrechnungen"} ablehnen`,
    auswahlAblehnen: "Auswahl ablehnen …",
  },
  meldung: {
    allgemein: "Das hat nicht geklappt. Bitte Seite neu laden.",
    auswahl: "Bitte mindestens eine Reise auswählen.",
    buchungsmonat: "Bitte den Buchungsmonat angeben.",
    grund: "Bitte einen Grund angeben – er geht an die reisende Person.",
    datevFehlgeschlagen: (n: number, fehler: string) => `${n} Übertragung(en) an DATEV fehlgeschlagen: ${fehler}`,
    abgelehnt: "Abgelehnt – die reisende Person wurde per Mail informiert.",
  },
};

export const en: Uebersetzung<typeof de> = {
  seite: {
    titel: "Approvals",
    uebersicht: "Overview",
    projekte: "Projects",
    hilfeBuchhaltung:
      "This is what's waiting for you: approve your team's trips and expenses, check receipts (this sends them to DATEV) and mark them as paid out once transferred in DATEV. Everything is grouped by person.",
    hilfeFreigeber:
      "Here you approve your team's submitted trips and expenses – grouped by person, usually in one step per month. Accounting then checks the receipts.",
    vorschuesse: "Advances",
    zurGenehmigung: "For approval",
    zurPruefung: "For receipt check",
    zurAuszahlung: "For payout",
    leerGenehmigen: "Nothing to approve.",
    leerPruefen: "Nothing to check.",
    leerAuszahlen: "Nothing to pay out.",
  },
  abrechnungen: (n) => `${n} ${n === 1 ? "expense report" : "expense reports"}`,
  inVertretungFuer: (name) => `on behalf of ${name}`,
  vertretungHinweis: (namen) =>
    `You are currently standing in for ${namen}: their approvals are listed here marked “on behalf of …”. You don't approve your own expense reports.`,
  liste: {
    abgelehnt: (name, n) =>
      `${name}: ${n} ${n === 1 ? "expense report" : "expense reports"} rejected – the person has been informed by email.`,
    erledigt: (name, n) => `${name}: ${n} ${n === 1 ? "expense report" : "expense reports"} done.`,
    ohneReise: "Expenses without a trip",
    hinweise: (n) => ` · ${n} ${n > 1 ? "notes" : "note"}`,
    kommentarPlatzhalter: "Comment for Accounting (optional)",
    buchungsmonat: "Posting month",
    knopf: {
      genehmigen: (n) => `Approve ${n} ${n === 1 ? "expense report" : "expense reports"}`,
      pruefen: (n) => `Check ${n} ${n === 1 ? "expense report" : "expense reports"} and send to DATEV`,
      auszahlen: (n) => `Mark ${n} ${n === 1 ? "expense report" : "expense reports"} as transferred in DATEV`,
    },
    grundPlatzhalter: "Reason for rejection, e.g. hotel bill missing",
    ablehnenKnopf: (n) => `Reject ${n} ${n === 1 ? "expense report" : "expense reports"}`,
    auswahlAblehnen: "Reject selection …",
  },
  meldung: {
    allgemein: "That didn't work. Please reload the page.",
    auswahl: "Please select at least one trip.",
    buchungsmonat: "Please enter the posting month.",
    grund: "Please give a reason – it will be sent to the traveller.",
    datevFehlgeschlagen: (n, fehler) => `${n} transfer(s) to DATEV failed: ${fehler}`,
    abgelehnt: "Rejected – the traveller has been informed by email.",
  },
};
