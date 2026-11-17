import type { Uebersetzung } from "../typen";

type Reise = { reisende: string; handelnde: string; reise: string; grund: string; belegNr: string; begruendung: string };
type Sammel = { reisende: string; handelnde: string; n: number; gesamt: string; was: string; zeitraum: string };
type Vorschuss = { name: string; betrag: string; reise: string };

/**
 * Benachrichtigungen an Personen (Workflow, Vorschuss, Erinnerungen) – in der Sprache der empfangenden Person.
 * Der DATEV-Versand nutzt diese Texte nicht und bleibt deutsch.
 */
export const de = {
  fuss: "Polycare Reisekosten",
  erinnerungFuss: "Diese Erinnerung kommt automatisch.",
  kommentar: (k: string) => `Kommentar: ${k}`,
  /** „Messe“ (21.10.2026, 248,60 €) */
  reise: (begruendung: string, zeitraum: string, betrag: string) => `„${begruendung}“ (${zeitraum}, ${betrag})`,
  workflow: {
    eingereicht: {
      betreff: (d: Reise) => `Abrechnung zur Genehmigung: ${d.reisende} – ${d.begruendung}`,
      zeilen: (d: Reise) => [`${d.reisende} hat die Abrechnung ${d.reise} zur Genehmigung eingereicht.`],
      knopf: "Abrechnung prüfen",
    },
    genehmigt: {
      betreff: (d: Reise) => `Abrechnung zur Belegprüfung: ${d.reisende} – ${d.begruendung}`,
      zeilen: (d: Reise) => [
        `${d.handelnde} hat die Abrechnung ${d.reise} von ${d.reisende} genehmigt. Bitte Belege prüfen.`,
        ...(d.grund ? [`Kommentar: ${d.grund}`] : []),
      ],
      knopf: "Belege prüfen",
    },
    abgelehnt: {
      betreff: (d: Reise) => `Abrechnung abgelehnt: ${d.begruendung}`,
      zeilen: (d: Reise) => [
        `${d.handelnde} hat deine Abrechnung ${d.reise} abgelehnt.`,
        `Grund: ${d.grund}`,
        "Du kannst die Abrechnung korrigieren und erneut einreichen.",
      ],
      knopf: "Abrechnung öffnen",
    },
    geprueft: {
      betreff: (d: Reise) => `Abrechnung geprüft: ${d.begruendung}`,
      zeilen: (d: Reise) => [`Deine Abrechnung ${d.reise} ist geprüft (Beleg-Nr. ${d.belegNr}) und wird ausgezahlt.`],
      knopf: "Abrechnung öffnen",
    },
    ausgezahlt: {
      betreff: (d: Reise) => `Abrechnung ausgezahlt: ${d.begruendung}`,
      zeilen: (d: Reise) => [`Deine Abrechnung ${d.reise} wurde ausgezahlt.`],
      knopf: "Abrechnung öffnen",
    },
  },
  sammel: {
    was: (n: number, zeitraum: string) => `${n} Abrechnungen${zeitraum ? ` für ${zeitraum}` : ""}`,
    eingereicht: {
      betreff: (d: Sammel) => `Abrechnung zur Genehmigung: ${d.reisende} – ${d.zeitraum} (${d.n} Abrechnungen, ${d.gesamt})`,
      kopf: (d: Sammel) => `${d.reisende} hat ${d.was} zur Genehmigung eingereicht, zusammen ${d.gesamt}:`,
      knopf: "Freigaben öffnen",
    },
    genehmigt: {
      betreff: (d: Sammel) => `Abrechnung zur Belegprüfung: ${d.reisende} (${d.n} Abrechnungen, ${d.gesamt})`,
      kopf: (d: Sammel) => `${d.handelnde} hat ${d.n} Abrechnungen von ${d.reisende} genehmigt, zusammen ${d.gesamt}. Bitte Belege prüfen:`,
      knopf: "Freigaben öffnen",
    },
    geprueft: {
      betreff: (d: Sammel) => `Abrechnung geprüft: ${d.n} Abrechnungen, ${d.gesamt}`,
      kopf: (d: Sammel) => `Deine ${d.n} Abrechnungen sind geprüft und werden ausgezahlt, zusammen ${d.gesamt}:`,
      knopf: "Meine Reisen öffnen",
    },
    ausgezahlt: {
      betreff: (d: Sammel) => `Abrechnung ausgezahlt: ${d.n} Abrechnungen, ${d.gesamt}`,
      kopf: (d: Sammel) => `Deine ${d.n} Abrechnungen wurden ausgezahlt, zusammen ${d.gesamt}:`,
      knopf: "Meine Reisen öffnen",
    },
  },
  vorschuss: {
    beantragt: {
      betreff: (d: Vorschuss) => `Vorschuss zur Genehmigung: ${d.name} – ${d.betrag}`,
      zeile: (d: Vorschuss) => `${d.name} beantragt einen Reisekostenvorschuss von ${d.betrag} für „${d.reise}“.`,
      begruendung: (b: string) => `Begründung: ${b}`,
      knopf: "Freigaben öffnen",
    },
    genehmigt: {
      betreff: (d: Vorschuss) => `Vorschuss zur Auszahlung: ${d.name} – ${d.betrag}`,
      zeile: (d: Vorschuss) => `Der Vorschuss von ${d.betrag} für ${d.name} („${d.reise}“) ist genehmigt und kann ausgezahlt werden.`,
      knopf: "Freigaben öffnen",
    },
    abgelehnt: {
      betreff: (d: Vorschuss) => `Vorschuss abgelehnt: ${d.betrag}`,
      zeile: (d: Vorschuss) => `Dein Vorschuss von ${d.betrag} für „${d.reise}“ wurde abgelehnt.`,
      grund: (g: string) => `Grund: ${g}`,
      knopf: "Reise öffnen",
    },
    ausgezahlt: {
      betreff: (d: Vorschuss) => `Vorschuss ausgezahlt: ${d.betrag}`,
      zeile: (d: Vorschuss) =>
        `Dein Vorschuss von ${d.betrag} für „${d.reise}“ wurde ausgezahlt. Er wird bei der Abrechnung der Reise automatisch abgezogen.`,
      knopf: "Reise öffnen",
    },
  },
  erinnerung: {
    entwuerfe: (n: number) => `${n} ${n === 1 ? "Reise ist noch nicht eingereicht" : "Reisen sind noch nicht eingereicht"}`,
    abgelehnt: (n: number) => `${n} ${n === 1 ? "abgelehnte Reise wartet" : "abgelehnte Reisen warten"} auf Korrektur`,
    eingang: (n: number) => `${n} ${n === 1 ? "Beleg liegt" : "Belege liegen"} noch im Eingang`,
    monatBetreff: (monat: string) => `Erinnerung: Reisekosten für ${monat} einreichen`,
    monatKopf: (monat: string) => `Der Monat ${monat} geht zu Ende. Bei dir ist noch offen:`,
    monatFuss: "Bitte Belege zuordnen und die Reisen gesammelt einreichen – das dauert meist nur ein paar Minuten.",
    monatKnopf: "Monat abrechnen",
    genehmigen: (n: number) => `${n} zu genehmigen`,
    pruefen: (n: number) => `${n} zur Belegprüfung`,
    auszahlen: (n: number) => `${n} zur Auszahlung`,
    freigabeBetreff: (n: number) => `Erinnerung: ${n} ${n === 1 ? "Abrechnung wartet" : "Abrechnungen warten"} auf dich`,
    freigabeZeile: (teile: string) => `Diese Abrechnungen warten auf dich: ${teile}.`,
    freigabeKnopf: "Freigaben öffnen",
  },
};

export const en: Uebersetzung<typeof de> = {
  fuss: "Polycare Travel Expenses",
  erinnerungFuss: "This reminder is sent automatically.",
  kommentar: (k) => `Comment: ${k}`,
  reise: (begruendung, zeitraum, betrag) => `“${begruendung}” (${zeitraum}, ${betrag})`,
  workflow: {
    eingereicht: {
      betreff: (d) => `Expense report for approval: ${d.reisende} – ${d.begruendung}`,
      zeilen: (d) => [`${d.reisende} has submitted the expense report ${d.reise} for approval.`],
      knopf: "Review expense report",
    },
    genehmigt: {
      betreff: (d) => `Expense report for receipt check: ${d.reisende} – ${d.begruendung}`,
      zeilen: (d) => [
        `${d.handelnde} has approved the expense report ${d.reise} from ${d.reisende}. Please check the receipts.`,
        ...(d.grund ? [`Comment: ${d.grund}`] : []),
      ],
      knopf: "Check receipts",
    },
    abgelehnt: {
      betreff: (d) => `Expense report rejected: ${d.begruendung}`,
      zeilen: (d) => [
        `${d.handelnde} has rejected your expense report ${d.reise}.`,
        `Reason: ${d.grund}`,
        "You can correct the expense report and submit it again.",
      ],
      knopf: "Open expense report",
    },
    geprueft: {
      betreff: (d) => `Expense report checked: ${d.begruendung}`,
      zeilen: (d) => [`Your expense report ${d.reise} has been checked (receipt no. ${d.belegNr}) and will be paid out.`],
      knopf: "Open expense report",
    },
    ausgezahlt: {
      betreff: (d) => `Expense report paid out: ${d.begruendung}`,
      zeilen: (d) => [`Your expense report ${d.reise} has been paid out.`],
      knopf: "Open expense report",
    },
  },
  sammel: {
    was: (n, zeitraum) => `${n} expense reports${zeitraum ? ` for ${zeitraum}` : ""}`,
    eingereicht: {
      betreff: (d) => `Expense reports for approval: ${d.reisende} – ${d.zeitraum} (${d.n} expense reports, ${d.gesamt})`,
      kopf: (d) => `${d.reisende} has submitted ${d.was} for approval, ${d.gesamt} in total:`,
      knopf: "Open approvals",
    },
    genehmigt: {
      betreff: (d) => `Expense reports for receipt check: ${d.reisende} (${d.n} expense reports, ${d.gesamt})`,
      kopf: (d) => `${d.handelnde} has approved ${d.n} expense reports from ${d.reisende}, ${d.gesamt} in total. Please check the receipts:`,
      knopf: "Open approvals",
    },
    geprueft: {
      betreff: (d) => `Expense reports checked: ${d.n} expense reports, ${d.gesamt}`,
      kopf: (d) => `Your ${d.n} expense reports have been checked and will be paid out, ${d.gesamt} in total:`,
      knopf: "Open my trips",
    },
    ausgezahlt: {
      betreff: (d) => `Expense reports paid out: ${d.n} expense reports, ${d.gesamt}`,
      kopf: (d) => `Your ${d.n} expense reports have been paid out, ${d.gesamt} in total:`,
      knopf: "Open my trips",
    },
  },
  vorschuss: {
    beantragt: {
      betreff: (d) => `Advance for approval: ${d.name} – ${d.betrag}`,
      zeile: (d) => `${d.name} is requesting a travel advance of ${d.betrag} for “${d.reise}”.`,
      begruendung: (b) => `Reason: ${b}`,
      knopf: "Open approvals",
    },
    genehmigt: {
      betreff: (d) => `Advance ready for payout: ${d.name} – ${d.betrag}`,
      zeile: (d) => `The advance of ${d.betrag} for ${d.name} (“${d.reise}”) has been approved and can be paid out.`,
      knopf: "Open approvals",
    },
    abgelehnt: {
      betreff: (d) => `Advance rejected: ${d.betrag}`,
      zeile: (d) => `Your advance of ${d.betrag} for “${d.reise}” has been rejected.`,
      grund: (g) => `Reason: ${g}`,
      knopf: "Open trip",
    },
    ausgezahlt: {
      betreff: (d) => `Advance paid out: ${d.betrag}`,
      zeile: (d) => `Your advance of ${d.betrag} for “${d.reise}” has been paid out. It will be deducted automatically when the trip is settled.`,
      knopf: "Open trip",
    },
  },
  erinnerung: {
    entwuerfe: (n) => `${n} ${n === 1 ? "trip has" : "trips have"} not been submitted yet`,
    abgelehnt: (n) => `${n} rejected ${n === 1 ? "trip is" : "trips are"} waiting to be corrected`,
    eingang: (n) => `${n} ${n === 1 ? "receipt is" : "receipts are"} still in your inbox`,
    monatBetreff: (monat) => `Reminder: submit your travel expenses for ${monat}`,
    monatKopf: (monat) => `${monat} is coming to an end. You still have open items:`,
    monatFuss: "Please assign your receipts and submit your trips together – it usually only takes a few minutes.",
    monatKnopf: "Submit month",
    genehmigen: (n) => `${n} to approve`,
    pruefen: (n) => `${n} for receipt check`,
    auszahlen: (n) => `${n} to pay out`,
    freigabeBetreff: (n) => `Reminder: ${n} ${n === 1 ? "expense report is" : "expense reports are"} waiting for you`,
    freigabeZeile: (teile) => `These expense reports are waiting for you: ${teile}.`,
    freigabeKnopf: "Open approvals",
  },
};
