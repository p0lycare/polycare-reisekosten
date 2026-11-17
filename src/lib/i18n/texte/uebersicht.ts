import type { Uebersetzung } from "../typen";

/** Monatsübersicht für Führungskräfte und Buchhaltung */
export const de = {
  vormonat: "Vormonat",
  folgemonat: "Folgemonat",
  titelUebersicht: "Übersicht",
  titelTeam: "Team",
  anzahlReisen: (n: number) => `${n} ${n === 1 ? "Reise" : "Reisen"}`,
  hilfe: (buchhaltung: boolean) =>
    `Stand aller eingereichten Reisen ${buchhaltung ? "" : "deines Teams "}im Monat (nach Reisebeginn) – wer wo im Ablauf steht${buchhaltung ? " und ob die Übertragung an DATEV geklappt hat" : ""}.`,
  keine: "Keine eingereichten Reisen in diesem Monat.",
  auslagenOhneReise: "Auslagen ohne Reise",
  datev: (uebertragen: boolean) => `DATEV ${uebertragen ? "übertragen" : "offen"}`,
};

export const en: Uebersetzung<typeof de> = {
  vormonat: "Previous month",
  folgemonat: "Next month",
  titelUebersicht: "Overview",
  titelTeam: "Team",
  anzahlReisen: (n) => `${n} ${n === 1 ? "trip" : "trips"}`,
  hilfe: (buchhaltung) =>
    `Status of all submitted trips ${buchhaltung ? "" : "of your team "}in the month (by trip start) – who is where in the process${buchhaltung ? " and whether the transfer to DATEV worked" : ""}.`,
  keine: "No submitted trips this month.",
  auslagenOhneReise: "Expenses without a trip",
  datev: (uebertragen) => `DATEV ${uebertragen ? "transferred" : "pending"}`,
};
