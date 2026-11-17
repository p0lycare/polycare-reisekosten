import type { Uebersetzung } from "../typen";

/** Hinweise der Plausibilitätsprüfung und Fehlermeldungen der Belegprüfung (src/lib/reisekosten) */
export const de = {
  plausi: {
    angabenFehlen: (liste: string) => `Pflichtangaben fehlen: ${liste} – bitte im Beleg ergänzen.`,
    keinBeleg: "Es ist noch kein Beleg erfasst.",
    ausserhalbMonat: (n: number) => `${n === 1 ? "Ein Beleg liegt" : `${n} Belege liegen`} außerhalb des Abrechnungsmonats (nachgereicht?).`,
    ohneZweck: (n: number) => `${n === 1 ? "Bei einem Beleg fehlt" : `Bei ${n} Belegen fehlt`} der Zweck (wofür wurde gekauft?).`,
    ueber250: (n: number) =>
      `${n === 1 ? "Ein Beleg ist" : `${n} Belege sind`} über 250 €: Die Rechnung muss auf Polycare ausgestellt sein (Name und Anschrift), sonst ist kein Vorsteuerabzug möglich.`,
    doppelAuslage: "Möglicher Doppelbeleg: zwei Belege am selben Tag mit gleichem Betrag.",
    ohneFoto: (liste: string) => `Ohne Belegfoto: ${liste}.`,
    verpflegung: (grund: string) => `Die Verpflegungspauschale kann nicht berechnet werden (${grund}) – bitte die Reise bearbeiten.`,
    ungueltig: "ungültige Angaben",
    ausserhalbReise: (n: number, liste: string) =>
      `${n === 1 ? "Ein Beleg liegt" : `${n} Belege liegen`} außerhalb des Reisezeitraums: ${liste}.`,
    fahrtAusserhalb: "Mindestens eine Fahrt liegt außerhalb des Reisezeitraums.",
    doppel: (bezeichnung: string) => `Möglicher Doppelbeleg: ${bezeichnung} am selben Tag mit gleichem Betrag.`,
    pkwOhneFahrten: "Eigener PKW ist gewählt, aber es sind keine Fahrten erfasst – es wird kein Km-Geld berechnet.",
    routeAbweichung: (n: number) => `${n === 1 ? "Eine Fahrt weicht" : `${n} Fahrten weichen`} deutlich von der berechneten Route ab.`,
    ohneRoute: (n: number) => `${n === 1 ? "Für eine Fahrt" : `Für ${n} Fahrten`} gibt es keine berechnete Route – Kilometer bitte prüfen.`,
    fahrtenOhnePkw: "Es sind Fahrten erfasst, aber „Eigener PKW“ ist nicht als Verkehrsmittel gewählt.",
    tankenUndKm:
      "Tankbelege und Km-Geld zusammen: Mit dem Km-Geld sind die Kosten des eigenen PKW abgegolten. Tanken nur für Firmen- oder Mietwagen abrechnen.",
    mietwagen: "Es gibt einen Mietwagenbeleg, aber „Mietwagen“ ist nicht als Verkehrsmittel gewählt.",
    uebernachtungOhne: "Es gibt einen Übernachtungsbeleg, die Reise ist aber ohne Übernachtung erfasst.",
    keineHotelrechnung: "Die Reise hat eine Übernachtung, aber es ist keine Hotelrechnung erfasst.",
    fruehstueck:
      "Die Hotelrechnung enthält Frühstück, es ist aber an keinem Tag als gestellt markiert. Gestelltes Frühstück kürzt die Verpflegungspauschale um 5,60 € pro Tag.",
  },
  beleg: {
    kategorieWaehlen: "Bitte eine Kategorie wählen.",
    auslagenKategorie: "Auslagen bitte einer Auslagen-Kategorie zuordnen.",
    nurAuslagen: "Diese Kategorie gilt nur für Auslagen, nicht für Reisen.",
    betrag: "Bitte einen gültigen Betrag angeben, z. B. 12,50.",
    mwst: "Bitte den MwSt-Satz angeben.",
    bewirtung: "Bei Bewirtungen sind Anlass und Teilnehmende Pflicht.",
    angeben: (liste: string) => `Bitte angeben: ${liste}.`,
    eherReise: "Der Beleg sieht nach Reisekosten aus – bitte einer Reise zuordnen oder von Hand erfassen.",
    eherAuslage: "Der Beleg sieht nach einer Auslage aus – bitte „Als Auslage erfassen“ oder von Hand erfassen.",
  },
  auslagen: {
    ungueltigerMonat: "Ungültiger Monat.",
    nichtAngelegt: "Die Auslagenabrechnung konnte nicht angelegt werden.",
    schonEingereicht: (monat: string) => `Die Auslagen für ${monat} sind schon eingereicht – bitte den Beleg einem anderen Monat zuordnen.`,
  },
};

export const en: Uebersetzung<typeof de> = {
  plausi: {
    angabenFehlen: (liste) => `Required details missing: ${liste} – please add them to the receipt.`,
    keinBeleg: "No receipt has been added yet.",
    ausserhalbMonat: (n) => `${n === 1 ? "One receipt is" : `${n} receipts are`} outside the billing month (submitted late?).`,
    ohneZweck: (n) => `${n === 1 ? "One receipt is" : `${n} receipts are`} missing the purpose (what was it bought for?).`,
    ueber250: (n) =>
      `${n === 1 ? "One receipt is" : `${n} receipts are`} over €250: the invoice must be made out to Polycare (name and address), otherwise input VAT cannot be deducted.`,
    doppelAuslage: "Possible duplicate: two receipts on the same day with the same amount.",
    ohneFoto: (liste) => `No receipt photo: ${liste}.`,
    verpflegung: (grund) => `The meal allowance cannot be calculated (${grund}) – please edit the trip.`,
    ungueltig: "invalid details",
    ausserhalbReise: (n, liste) => `${n === 1 ? "One receipt is" : `${n} receipts are`} outside the trip period: ${liste}.`,
    fahrtAusserhalb: "At least one journey is outside the trip period.",
    doppel: (bezeichnung) => `Possible duplicate: ${bezeichnung} on the same day with the same amount.`,
    pkwOhneFahrten: "Own car is selected, but no journeys have been entered – no mileage allowance will be calculated.",
    routeAbweichung: (n) => `${n === 1 ? "One journey differs" : `${n} journeys differ`} significantly from the calculated route.`,
    ohneRoute: (n) => `There is no calculated route for ${n === 1 ? "one journey" : `${n} journeys`} – please check the kilometres.`,
    fahrtenOhnePkw: "Journeys have been entered, but “Own car” is not selected as a means of transport.",
    tankenUndKm:
      "Fuel receipts and mileage allowance together: the mileage allowance already covers the costs of your own car. Only claim fuel for company or rental cars.",
    mietwagen: "There is a rental car receipt, but “Rental car” is not selected as a means of transport.",
    uebernachtungOhne: "There is an accommodation receipt, but the trip has been entered without an overnight stay.",
    keineHotelrechnung: "The trip includes an overnight stay, but no hotel bill has been added.",
    fruehstueck:
      "The hotel bill includes breakfast, but it isn't marked as provided on any day. A provided breakfast reduces the meal allowance by €5.60 per day.",
  },
  beleg: {
    kategorieWaehlen: "Please choose a category.",
    auslagenKategorie: "Please assign expenses to an expense category.",
    nurAuslagen: "This category is only for expenses, not for trips.",
    betrag: "Please enter a valid amount, e.g. 12,50.",
    mwst: "Please enter the VAT rate.",
    bewirtung: "For business entertainment, the reason and the attendees are required.",
    angeben: (liste) => `Please enter: ${liste}.`,
    eherReise: "This receipt looks like travel expenses – please assign it to a trip or enter it manually.",
    eherAuslage: "This receipt looks like an expense – please use “Record as expense” or enter it manually.",
  },
  auslagen: {
    ungueltigerMonat: "Invalid month.",
    nichtAngelegt: "The expense report could not be created.",
    schonEingereicht: (monat) => `The expenses for ${monat} have already been submitted – please assign the receipt to a different month.`,
  },
};
