import type { Uebersetzung } from "../typen";

/** Fahrten mit eigenem PKW: Liste, Erfassungszeile, Routenkarte */
export const de = {
  liste: {
    titel: (kfz: string | null) => `Fahrten mit eigenem PKW${kfz ? ` (${kfz})` : ""}`,
    route: (km: string) => `Route ${km} km`,
    kmGeld: (km: string, satz: string) => `Km-Geld: ${km} km × ${satz}`,
    steuerfrei: (satz: string) => `davon steuerfrei (${satz}/km)`,
    steuerpflichtig: "davon steuerpflichtig (Lohnabrechnung)",
  },
  zeile: {
    datum: "Datum",
    strecke: "Fahrstrecke",
    zweck: "Zweck",
    km: "km",
    kilometer: "Kilometer",
    berechnenTitel: "Kilometer aus der Fahrstrecke berechnen (OpenStreetMap)",
    berechnen: "km berechnen",
    hinzufuegen: "Hinzufügen",
    route: (km: string, orte?: string) => `Route: ${km} km${orte !== undefined ? ` über ${orte}` : ""}`,
    abweichung: " – deine Angabe weicht deutlich ab; bitte kurz im Zweck begründen (z. B. Umleitung).",
    gespeichert: "Gespeichert",
  },
  karte: {
    unterschrift: (km: string, orte: string) => `${km} km über ${orte} · Zoomen mit + / − oder Doppelklick`,
    laedt: "Karte lädt …",
    ausblenden: "Karte ausblenden",
    zeigen: "Route auf Karte",
  },
  fehler: {
    anmelden: "Bitte neu anmelden.",
    datum: "Datum fehlt.",
    strecke: "Fahrstrecke fehlt.",
    km: "Kilometer müssen größer als 0 sein.",
    nurReisen: "Fahrten gibt es nur bei Reisen.",
    speichern: "Speichern fehlgeschlagen. Ist die Reise noch bearbeitbar?",
  },
};

export const en: Uebersetzung<typeof de> = {
  liste: {
    titel: (kfz) => `Journeys by own car${kfz ? ` (${kfz})` : ""}`,
    route: (km) => `Route ${km} km`,
    kmGeld: (km, satz) => `Mileage allowance: ${km} km × ${satz}`,
    steuerfrei: (satz) => `of which tax-free (${satz}/km)`,
    steuerpflichtig: "of which taxable (payroll)",
  },
  zeile: {
    datum: "Date",
    strecke: "Route",
    zweck: "Purpose",
    km: "km",
    kilometer: "Kilometres",
    berechnenTitel: "Calculate kilometres from the route (OpenStreetMap)",
    berechnen: "Calculate km",
    hinzufuegen: "Add",
    route: (km, orte) => `Route: ${km} km${orte !== undefined ? ` via ${orte}` : ""}`,
    abweichung: " – your figure differs significantly; please give a brief reason under purpose (e.g. diversion).",
    gespeichert: "Saved",
  },
  karte: {
    unterschrift: (km, orte) => `${km} km via ${orte} · Zoom with + / − or double-click`,
    laedt: "Loading map …",
    ausblenden: "Hide map",
    zeigen: "Show route on map",
  },
  fehler: {
    anmelden: "Please sign in again.",
    datum: "Date missing.",
    strecke: "Route missing.",
    km: "Kilometres must be greater than 0.",
    nurReisen: "Journeys are only possible for trips.",
    speichern: "Saving failed. Can the trip still be edited?",
  },
};
