import type { Uebersetzung } from "../typen";

/**
 * Bereichsübergreifende Texte: Status, Kategorien, Verkehrsmittel, Knöpfe. Die Schlüssel sind die
 * Datenbankwerte – die Datenbank bleibt unverändert, nur die Anzeige wird übersetzt.
 * Das PDF und der DATEV-Versand nutzen diese Texte NICHT, sondern die deutschen Konstanten in lib/reisekosten.
 */
export const de = {
  app: {
    titel: "Polycare Reisekosten",
    kurz: "Reisekosten",
    beschreibung: "Dienstreisen erfassen, Belege hochladen, Pauschalen berechnen",
  },
  status: {
    entwurf: "Entwurf",
    eingereicht: "Eingereicht",
    freigegeben: "Genehmigt",
    geprueft: "Geprüft",
    abgelehnt: "Abgelehnt",
    ausgezahlt: "Ausgezahlt",
  },
  vorschussStatus: {
    beantragt: "Beantragt",
    genehmigt: "Genehmigt",
    abgelehnt: "Abgelehnt",
    ausgezahlt: "Ausgezahlt",
  },
  verkehrsmittel: {
    flugzeug: "Flugzeug",
    eisenbahn: "Eisenbahn",
    firmenwagen: "Firmenwagen",
    eigener_pkw: "Eigener PKW",
    mitfahrt: "Mitfahrt",
    mietwagen: "Mietwagen",
  },
  abschnitt: {
    A: "Fahrtkosten",
    B: "Verpflegungskosten pauschal",
    C: "Übernachtungskosten",
    D: "Abzüglich Verpflegungspauschale",
    E: "Bewirtung (mit Fremden)",
    F: "Sonstige Ausgaben",
    G: "Auslagen (ohne Reise)",
  },
  rolle: {
    mitarbeiter: "Mitarbeiter:in",
    freigeber: "Freigeber:in",
    buchhaltung: "Buchhaltung",
    admin: "Admin",
  },
  /** Standardkategorien nach ID; eigene Kategorien der Buchhaltung zeigen ihre deutsche Bezeichnung */
  kategorie: {
    flug: "Flugzeug",
    tanken: "Auto tanken",
    parken_waschanlage: "Parken/Waschanlage",
    maut: "Maut/Vignette",
    mietwagen: "Mietwagen (selbst bezahlt)",
    taxi: "Taxi",
    bahn: "Zugticket",
    km_geld: "Km-Geld bei Privatwagen",
    verpflegung: "Verpflegungspauschale",
    uebernachtung: "Übernachtung",
    hotel_fruehstueck: "Frühstück (Hotelrechnung)",
    servicepauschale: "Servicepauschale",
    beherbergungssteuer: "Beherbergungssteuer",
    hotel_parken: "Parken (Hotel)",
    kurtaxe: "Kurtaxe",
    hotel_sonstiges: "Sonstiges (Hotel)",
    bewirtung_19: "Bewirtung mit 19 % MwSt",
    bewirtung_7: "Bewirtung mit 7 % MwSt",
    telefon_porto: "Telefon, Porto inkl. MwSt",
    telefon_porto_ohne: "Telefon, Porto ohne MwSt",
    trinkgeld: "Trinkgeld ohne MwSt",
    parken_ohne: "Parken ohne MwSt",
    buerobedarf: "Bürobedarf",
    aus_material: "Material und Werkzeug (z. B. Baumarkt)",
    aus_buero: "Büromaterial",
    aus_porto: "Porto und Versand",
    aus_software: "Software und Abos",
    aus_fachliteratur: "Fachliteratur",
    aus_sonstiges: "Sonstige Auslagen",
  } as Record<string, string>,
  /** Positionen, die die Abrechnung selbst erzeugt (nicht aus der Kategorientabelle) */
  gestellteMahlzeiten: "Gestellte Mahlzeiten",
  wochentageKurz: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
  deutschland: "Deutschland",
  knopf: {
    speichern: "Speichern",
    speichert: "Speichert …",
    gespeichert: "Gespeichert.",
    abbrechen: "Abbrechen",
    loeschen: "Löschen",
    bearbeiten: "Bearbeiten",
    zurueck: "Zurück",
    weiter: "Weiter",
    schliessen: "Schließen",
    abmelden: "Abmelden",
  },
  fehler: {
    speichern: "Speichern fehlgeschlagen.",
    keineBerechtigung: "Keine Berechtigung.",
    nichtGefunden: "Nicht gefunden.",
  },
  pflichtangabe: {
    label: (angabe: "anlass" | "person" | "kfz", abschnitt: string) =>
      angabe === "person"
        ? abschnitt === "C"
          ? "Wer hat übernachtet?"
          : "Person"
        : angabe === "kfz"
          ? "Kfz-Kennzeichen"
          : abschnitt === "C"
            ? "Anlass der Übernachtung"
            : abschnitt === "A"
              ? "Anlass der Fahrt"
              : "Anlass",
    hinweis: (angabe: "anlass" | "person" | "kfz", abschnitt: string) =>
      angabe === "person"
        ? "Name, bei mehreren Personen alle"
        : angabe === "kfz"
          ? "auch beim Mietwagen"
          : abschnitt === "C"
            ? "z. B. Meeting mit Kunde X in Berlin"
            : "z. B. Fahrt Köln – Kassel, Kundentermin",
    person: "Person",
    anlass: "Anlass",
    kfz: "Kfz-Kennzeichen",
    bewirtete: "Bewirtete Personen",
  },
};

export const en: Uebersetzung<typeof de> = {
  app: {
    titel: "Polycare Travel Expenses",
    kurz: "Travel expenses",
    beschreibung: "Record business trips, upload receipts, calculate allowances",
  },
  status: {
    entwurf: "Draft",
    eingereicht: "Submitted",
    freigegeben: "Approved",
    geprueft: "Checked",
    abgelehnt: "Rejected",
    ausgezahlt: "Paid out",
  },
  vorschussStatus: {
    beantragt: "Requested",
    genehmigt: "Approved",
    abgelehnt: "Rejected",
    ausgezahlt: "Paid out",
  },
  verkehrsmittel: {
    flugzeug: "Plane",
    eisenbahn: "Train",
    firmenwagen: "Company car",
    eigener_pkw: "Own car",
    mitfahrt: "Ride-along",
    mietwagen: "Rental car",
  },
  abschnitt: {
    A: "Travel costs",
    B: "Meal allowance (flat rate)",
    C: "Accommodation",
    D: "Less meal allowance",
    E: "Business entertainment (with external guests)",
    F: "Other expenses",
    G: "Expenses (without a trip)",
  },
  rolle: {
    mitarbeiter: "Employee",
    freigeber: "Approver",
    buchhaltung: "Accounting",
    admin: "Admin",
  },
  kategorie: {
    flug: "Flight",
    tanken: "Fuel",
    parken_waschanlage: "Parking/car wash",
    maut: "Tolls/vignette",
    mietwagen: "Rental car (paid yourself)",
    taxi: "Taxi",
    bahn: "Train ticket",
    km_geld: "Mileage allowance (private car)",
    verpflegung: "Meal allowance",
    uebernachtung: "Accommodation",
    hotel_fruehstueck: "Breakfast (hotel bill)",
    servicepauschale: "Service charge",
    beherbergungssteuer: "Accommodation tax",
    hotel_parken: "Parking (hotel)",
    kurtaxe: "Tourist tax",
    hotel_sonstiges: "Other (hotel)",
    bewirtung_19: "Business meal, 19 % VAT",
    bewirtung_7: "Business meal, 7 % VAT",
    telefon_porto: "Phone, postage incl. VAT",
    telefon_porto_ohne: "Phone, postage without VAT",
    trinkgeld: "Tips without VAT",
    parken_ohne: "Parking without VAT",
    buerobedarf: "Office supplies",
    aus_material: "Materials and tools (e.g. DIY store)",
    aus_buero: "Office supplies",
    aus_porto: "Postage and shipping",
    aus_software: "Software and subscriptions",
    aus_fachliteratur: "Specialist literature",
    aus_sonstiges: "Other expenses",
  },
  gestellteMahlzeiten: "Meals provided",
  wochentageKurz: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  deutschland: "Germany",
  knopf: {
    speichern: "Save",
    speichert: "Saving …",
    gespeichert: "Saved.",
    abbrechen: "Cancel",
    loeschen: "Delete",
    bearbeiten: "Edit",
    zurueck: "Back",
    weiter: "Next",
    schliessen: "Close",
    abmelden: "Sign out",
  },
  fehler: {
    speichern: "Saving failed.",
    keineBerechtigung: "Not permitted.",
    nichtGefunden: "Not found.",
  },
  pflichtangabe: {
    label: (angabe, abschnitt) =>
      angabe === "person"
        ? abschnitt === "C"
          ? "Who stayed overnight?"
          : "Person"
        : angabe === "kfz"
          ? "Licence plate"
          : abschnitt === "C"
            ? "Reason for the stay"
            : abschnitt === "A"
              ? "Reason for the journey"
              : "Reason",
    hinweis: (angabe, abschnitt) =>
      angabe === "person"
        ? "Name; if several people, all of them"
        : angabe === "kfz"
          ? "also for rental cars"
          : abschnitt === "C"
            ? "e.g. meeting with customer X in Berlin"
            : "e.g. trip Cologne – Kassel, customer appointment",
    person: "Person",
    anlass: "Reason",
    kfz: "Licence plate",
    bewirtete: "Guests",
  },
};
