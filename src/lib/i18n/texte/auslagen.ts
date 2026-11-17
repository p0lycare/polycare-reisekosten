import type { Uebersetzung } from "../typen";

/** Meine Auslagen (/auslagen) */
export const de = {
  titel: "Meine Auslagen",
  belegFotografieren: "Beleg fotografieren",
  hilfe:
    "Für privat vorgestreckte Ausgaben ohne Reise, z. B. im Baumarkt oder ein Geschäftsessen am eigenen Standort. Beleg fotografieren und im Eingang „Als Auslage erfassen“ – je Monat entsteht eine Auslagenabrechnung, die du unter „Monat abrechnen“ zusammen mit deinen Reisen einreichst.",
  ohneFoto: "Auslage ohne Foto im Eingang erfassen",
  kleinbetrag: "Ab 250 € brutto muss die Rechnung auf Polycare Research Technology GmbH ausgestellt sein (Vorsteuerabzug).",
  keine: "Noch keine Auslagen.",
  belege: (n: number) => (n === 1 ? "1 Beleg" : `${n} Belege`),
  einreichen: "Einreichen →",
  erfassen: {
    monat: "Monat",
    knopf: "Auslage erfassen",
  },
};

export const en: Uebersetzung<typeof de> = {
  titel: "My expenses",
  belegFotografieren: "Photograph receipt",
  hilfe:
    "For expenses you paid privately without a trip, e.g. at a DIY store or a business meal at your own location. Photograph the receipt and choose “Record as expense” in the inbox – each month gets one expense report, which you submit together with your trips under “Submit month”.",
  ohneFoto: "Record an expense without a photo in the inbox",
  kleinbetrag: "From €250 gross, the invoice must be made out to Polycare Research Technology GmbH (input VAT deduction).",
  keine: "No expenses yet.",
  belege: (n) => (n === 1 ? "1 receipt" : `${n} receipts`),
  einreichen: "Submit →",
  erfassen: {
    monat: "Month",
    knopf: "Record expense",
  },
};
