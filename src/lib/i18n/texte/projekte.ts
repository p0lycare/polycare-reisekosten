import type { Uebersetzung } from "../typen";

/** Reisekosten je Projekt (Buchhaltung) */
export const de = {
  titel: "Reisekosten je Projekt",
  intro: "Eingereichte Reisen nach Reisebeginn; Beträge vor Abzug eines Vorschusses, netto ohne erstattungsfähige Vorsteuer.",
  projektePflegen: "Projekte pflegen",
  von: "von",
  bis: "bis",
  anzeigen: "Anzeigen",
  keineReisen: "Im gewählten Zeitraum sind keine Reisen einem Projekt zugeordnet.",
  keineProjekte: "Noch keine Projekte angelegt – das geht unter Einstellungen.",
  anzahlProjekte: (n: number) => `${n} ${n === 1 ? "Projekt" : "Projekte"}`,
  zusammen: "zusammen",
  fkz: (kennzeichen: string) => `FKZ ${kennzeichen}`,
  anzahlReisen: (n: number) => `${n} ${n === 1 ? "Reise" : "Reisen"}`,
  nettoBetrag: (betrag: string) => `netto ${betrag}`,
  bruttoBetrag: (betrag: string) => `brutto ${betrag}`,
  spalte: {
    datum: "Datum",
    person: "Person",
    anlass: "Anlass",
    belegNr: "Beleg-Nr.",
    status: "Status",
    netto: "netto",
    brutto: "brutto",
  },
};

export const en: Uebersetzung<typeof de> = {
  titel: "Travel expenses by project",
  intro: "Submitted trips by trip start; amounts before deduction of any advance, net excluding recoverable input VAT.",
  projektePflegen: "Manage projects",
  von: "from",
  bis: "to",
  anzeigen: "Show",
  keineReisen: "No trips are assigned to a project in the selected period.",
  keineProjekte: "No projects created yet – you can do that under Settings.",
  anzahlProjekte: (n) => `${n} ${n === 1 ? "project" : "projects"}`,
  zusammen: "total",
  fkz: (kennzeichen) => `Grant ref. ${kennzeichen}`,
  anzahlReisen: (n) => `${n} ${n === 1 ? "trip" : "trips"}`,
  nettoBetrag: (betrag) => `net ${betrag}`,
  bruttoBetrag: (betrag) => `gross ${betrag}`,
  spalte: {
    datum: "Date",
    person: "Person",
    anlass: "Purpose",
    belegNr: "Receipt no.",
    status: "Status",
    netto: "net",
    brutto: "gross",
  },
};
