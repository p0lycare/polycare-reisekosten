import type { Uebersetzung } from "../typen";
import type { ReiseStatus } from "@/lib/reisekosten/reise";

/** Workflow einer Abrechnung: Schrittleiste, Einreichen/Genehmigen/Prüfen/Auszahlen, DATEV, Verlauf */
export const de = {
  tracker: {
    schritte: ["Erfasst", "Eingereicht", "Genehmigt", "Geprüft · DATEV", "Ausgezahlt"],
    ablaufReise: "Ablauf der Reise",
    ablaufAuslagen: "Ablauf der Auslagenabrechnung",
    /** Was als Nächstes passiert – aus Sicht der abrechnenden Person */
    naechstes: {
      entwurf: "Belege ergänzen und am Monatsende mit den anderen Reisen des Monats gesammelt einreichen.",
      abgelehnt: "Abgelehnt – bitte nach dem Hinweis korrigieren und erneut einreichen.",
      eingereicht: "Wartet auf die Genehmigung durch die Führungskraft. Bis dahin kannst du die Reise noch zurückziehen.",
      freigegeben: "Genehmigt – die Buchhaltung prüft die Belege und übergibt die Abrechnung an DATEV.",
      geprueft: "Geprüft und an DATEV übergeben – die Überweisung folgt über DATEV.",
      ausgezahlt: "Ausgezahlt – erledigt.",
    } satisfies Record<ReiseStatus, string>,
    naechstesAuslagen: {
      entwurf: "Belege des Monats sammeln und am Monatsende zusammen mit den Reisen einreichen.",
      eingereicht: "Wartet auf die Genehmigung durch die Führungskraft. Bis dahin kannst du die Abrechnung noch zurückziehen.",
    },
  },
  panel: {
    titel: {
      einreichen: "Einreichen",
      zurueckziehen: "Eingereicht",
      genehmigen: "Genehmigung",
      pruefen: "Belegprüfung",
      auszahlen: "Auszahlung",
    },
    hinweiseEinreichen: "Bitte vor dem Einreichen prüfen:",
    hinweisePruefung: "Hinweise zur Prüfung:",
    einreichen: {
      empfohlen: "Empfohlen:",
      empfohlenText:
        "Sammle alle Reisen und Auslagen eines Monats und reiche sie am Monatsende gemeinsam ein – deine Führungskraft genehmigt dann alles in einem Schritt.",
      gesammelt: (monat: string) => `${monat} abrechnen und gesammelt einreichen`,
      einzeln: "Jetzt einzeln einreichen",
      richtigkeit:
        "Für die Richtigkeit: Ich bestätige, dass die Angaben vollständig und richtig sind und die Kosten dienstlich veranlasst waren.",
      reichtEin: "Reicht ein …",
      knopf: (betrag: string) => `Einzeln zur Genehmigung einreichen (${betrag})`,
    },
    ablehnen: {
      grund: "Grund der Ablehnung",
      grundPlatzhalter: "z. B. Hotelrechnung fehlt",
      knopf: "Ablehnen",
      oeffnen: "Ablehnen …",
    },
    genehmigen: {
      kommentar: "Kommentar (optional)",
      kommentarPlatzhalter: "z. B. Hinweis für die Buchhaltung",
      knopf: "Genehmigen",
    },
    pruefen: {
      text: "Die Beleg-Nr. wird beim Prüfen fortlaufend vergeben. Danach gehen Abrechnung und Belege automatisch an DATEV.",
      buchungsmonat: "Buchungsmonat",
      knopf: "Belege geprüft",
    },
    zurueckziehen: {
      bestaetigen: "Einreichung zurückziehen? Die Abrechnung wird wieder zum Entwurf und kann bearbeitet werden.",
      text: "Zurückziehen macht die Abrechnung wieder zum Entwurf, den du korrigieren kannst.",
      knopf: "Einreichung zurückziehen",
    },
    auszahlen: {
      knopf: (betrag: string) => `In DATEV überwiesen – als ausgezahlt markieren (${betrag})`,
    },
  },
  datev: {
    titel: "DATEV",
    nochNicht: "Noch nicht an DATEV übertragen.",
    uebertragen: (zeit: string) => `An DATEV übertragen am ${zeit}.`,
    fehlgeschlagen: (zeit: string, fehler: string | null) =>
      `Übertragung am ${zeit} fehlgeschlagen${fehler ? `: ${fehler}` : "."}`,
    bestaetigen:
      "Die Abrechnung wurde bereits übertragen. Nochmals senden erzeugt in DATEV einen zweiten Beleg. Trotzdem senden?",
    sendet: "Sendet …",
    erneut: "Erneut an DATEV senden",
    senden: "An DATEV senden",
    gesendet: "Gesendet",
  },
  verlauf: {
    titel: "Verlauf",
    /** Anzeige der Ereignis-Aktionen; die Schlüssel sind die Werte in der Datenbank */
    aktion: {
      eingereicht: "Eingereicht – für die Richtigkeit bestätigt",
      zurueckgezogen: "Einreichung zurückgezogen",
      genehmigt: "Genehmigt",
      abgelehnt: "Abgelehnt",
      geprueft: "Belege geprüft",
      ausgezahlt: "Ausgezahlt",
    } as Record<string, string>,
    belegNr: (nr: string) => `Beleg-Nr. ${nr}`,
    kommentar: (text: string) => `„${text}“`,
  },
  fehler: {
    allgemein: "Das hat nicht geklappt. Bitte Seite neu laden und erneut versuchen.",
    richtigkeit: "Bitte bestätige die Richtigkeit deiner Angaben.",
    grund: "Bitte einen Grund für die Ablehnung angeben.",
    buchungsmonat: "Bitte den Buchungsmonat angeben.",
  },
};

export const en: Uebersetzung<typeof de> = {
  tracker: {
    schritte: ["Recorded", "Submitted", "Approved", "Checked · DATEV", "Paid out"],
    ablaufReise: "Trip progress",
    ablaufAuslagen: "Expense report progress",
    naechstes: {
      entwurf: "Add receipts and submit together with the month's other trips at the end of the month.",
      abgelehnt: "Rejected – please correct as noted and submit again.",
      eingereicht: "Waiting for approval by your manager. Until then you can still withdraw the trip.",
      freigegeben: "Approved – Accounting checks the receipts and passes the expense report to DATEV.",
      geprueft: "Checked and passed to DATEV – the transfer follows via DATEV.",
      ausgezahlt: "Paid out – done.",
    },
    naechstesAuslagen: {
      entwurf: "Collect the month's receipts and submit them together with your trips at the end of the month.",
      eingereicht: "Waiting for approval by your manager. Until then you can still withdraw the expense report.",
    },
  },
  panel: {
    titel: {
      einreichen: "Submit",
      zurueckziehen: "Submitted",
      genehmigen: "Approval",
      pruefen: "Receipt check",
      auszahlen: "Payout",
    },
    hinweiseEinreichen: "Please check before submitting:",
    hinweisePruefung: "Notes for the check:",
    einreichen: {
      empfohlen: "Recommended:",
      empfohlenText:
        "Collect all trips and expenses of a month and submit them together at the end of the month – your manager then approves everything in one step.",
      gesammelt: (monat) => `Submit ${monat} with everything else`,
      einzeln: "Submit individually now",
      richtigkeit:
        "Confirmation: I confirm that the details are complete and correct and that the costs were incurred for business purposes.",
      reichtEin: "Submitting …",
      knopf: (betrag) => `Submit individually for approval (${betrag})`,
    },
    ablehnen: {
      grund: "Reason for rejection",
      grundPlatzhalter: "e.g. hotel bill missing",
      knopf: "Reject",
      oeffnen: "Reject …",
    },
    genehmigen: {
      kommentar: "Comment (optional)",
      kommentarPlatzhalter: "e.g. note for Accounting",
      knopf: "Approve",
    },
    pruefen: {
      text: "The receipt no. is assigned sequentially when checking. The expense report and receipts then go to DATEV automatically.",
      buchungsmonat: "Posting month",
      knopf: "Receipts checked",
    },
    zurueckziehen: {
      bestaetigen: "Withdraw submission? The expense report becomes a draft again and can be edited.",
      text: "Withdrawing turns the expense report back into a draft that you can correct.",
      knopf: "Withdraw submission",
    },
    auszahlen: {
      knopf: (betrag) => `Transferred in DATEV – mark as paid out (${betrag})`,
    },
  },
  datev: {
    titel: "DATEV",
    nochNicht: "Not yet transferred to DATEV.",
    uebertragen: (zeit) => `Transferred to DATEV on ${zeit}.`,
    fehlgeschlagen: (zeit, fehler) => `Transfer on ${zeit} failed${fehler ? `: ${fehler}` : "."}`,
    bestaetigen:
      "The expense report has already been transferred. Sending again creates a second document in DATEV. Send anyway?",
    sendet: "Sending …",
    erneut: "Send to DATEV again",
    senden: "Send to DATEV",
    gesendet: "Sent",
  },
  verlauf: {
    titel: "History",
    aktion: {
      eingereicht: "Submitted – confirmed as correct",
      zurueckgezogen: "Submission withdrawn",
      genehmigt: "Approved",
      abgelehnt: "Rejected",
      geprueft: "Receipts checked",
      ausgezahlt: "Paid out",
    },
    belegNr: (nr) => `Receipt no. ${nr}`,
    kommentar: (text) => `“${text}”`,
  },
  fehler: {
    allgemein: "That didn't work. Please reload the page and try again.",
    richtigkeit: "Please confirm that your details are correct.",
    grund: "Please give a reason for the rejection.",
    buchungsmonat: "Please enter the posting month.",
  },
};
