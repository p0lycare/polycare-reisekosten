import type { Uebersetzung } from "../typen";

/** Feedback: Fehler, Wünsche und Fragen melden (die Mail an die Admins bleibt deutsch) */
export const de = {
  titel: "Feedback",
  intro:
    "Etwas klemmt, rechnet falsch oder könnte einfacher sein? Schreib es hier – die Admins bekommen eine Mail und kümmern sich darum.",
  deineMeldungen: "Deine Meldungen",
  art: { fehler: "Fehler", wunsch: "Wunsch", frage: "Frage" } as Record<string, string>,
  artHinweis: {
    fehler: "Etwas funktioniert nicht oder rechnet falsch",
    wunsch: "Idee, was besser oder einfacher sein könnte",
    frage: "Unklar, wie etwas geht",
  },
  status: { offen: "offen", in_arbeit: "in Arbeit", erledigt: "erledigt" } as Record<string, string>,
  formular: {
    worum: "Worum geht es?",
    beschreibung: "Beschreibung",
    platzhalter: "Was hast du gemacht, was ist passiert, was hättest du erwartet?",
    gemeldetVon: (seite: string) => `Gemeldet von der Seite ${seite} – die Seite und dein Browser werden mitgeschickt.`,
    danke: "Danke! Deine Meldung ist angekommen – du siehst ihren Stand unten.",
    sendet: "Sendet …",
    absenden: "Absenden",
  },
  bearbeiten: {
    notizPlatzhalter: "Notiz (sieht auch die meldende Person)",
    gespeichert: "Gespeichert",
  },
  antwort: (notiz: string) => `Antwort: ${notiz}`,
  fehler: {
    art: "Bitte auswählen, ob es ein Fehler, Wunsch oder eine Frage ist.",
    beschreibung: "Bitte kurz beschreiben, worum es geht.",
    anmelden: "Bitte neu anmelden.",
    zuViele: "Du hast gerade schon mehrere Meldungen geschickt – bitte später noch einmal.",
    senden: "Senden fehlgeschlagen. Bitte später noch einmal versuchen.",
    status: "Ungültiger Status.",
    speichern: "Speichern fehlgeschlagen. Fehlt die Berechtigung?",
  },
};

export const en: Uebersetzung<typeof de> = {
  titel: "Feedback",
  intro:
    "Something stuck, calculated wrongly or could be simpler? Write it here – the admins get an email and take care of it.",
  deineMeldungen: "Your reports",
  art: { fehler: "Bug", wunsch: "Request", frage: "Question" },
  artHinweis: {
    fehler: "Something doesn't work or calculates wrongly",
    wunsch: "An idea for what could be better or simpler",
    frage: "Not sure how something works",
  },
  status: { offen: "open", in_arbeit: "in progress", erledigt: "done" },
  formular: {
    worum: "What is it about?",
    beschreibung: "Description",
    platzhalter: "What did you do, what happened, what did you expect?",
    gemeldetVon: (seite) => `Reported from the page ${seite} – the page and your browser are sent along.`,
    danke: "Thank you! Your report has arrived – you can see its status below.",
    sendet: "Sending …",
    absenden: "Send",
  },
  bearbeiten: {
    notizPlatzhalter: "Note (also visible to the reporter)",
    gespeichert: "Saved",
  },
  antwort: (notiz) => `Reply: ${notiz}`,
  fehler: {
    art: "Please choose whether it is a bug, a request or a question.",
    beschreibung: "Please briefly describe what it is about.",
    anmelden: "Please sign in again.",
    zuViele: "You have just sent several reports – please try again later.",
    senden: "Sending failed. Please try again later.",
    status: "Invalid status.",
    speichern: "Saving failed. Missing permission?",
  },
};
