export type Benachrichtigung = "eingereicht" | "genehmigt" | "abgelehnt" | "geprueft" | "ausgezahlt";

export type VorlageDaten = {
  reisende: string;
  begruendung: string;
  zeitraum: string;
  betrag: string;
  link: string;
  handelnde?: string;
  grund?: string;
  belegNr?: string;
};

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Betreff und Text je Workflow-Schritt. Empfänger: siehe Funktion mail_empfaenger in der Datenbank. */
export function vorlage(art: Benachrichtigung, d: VorlageDaten): { betreff: string; zeilen: string[]; knopf: string } {
  const reise = `„${d.begruendung}“ (${d.zeitraum}, ${d.betrag})`;
  switch (art) {
    case "eingereicht":
      return {
        betreff: `Reisekosten zur Genehmigung: ${d.reisende} – ${d.begruendung}`,
        zeilen: [`${d.reisende} hat die Reisekostenabrechnung ${reise} zur Genehmigung eingereicht.`],
        knopf: "Abrechnung prüfen",
      };
    case "genehmigt":
      return {
        betreff: `Reisekosten zur Belegprüfung: ${d.reisende} – ${d.begruendung}`,
        zeilen: [
          `${d.handelnde} hat die Reisekostenabrechnung ${reise} von ${d.reisende} genehmigt. Bitte Belege prüfen.`,
          ...(d.grund ? [`Kommentar: ${d.grund}`] : []),
        ],
        knopf: "Belege prüfen",
      };
    case "abgelehnt":
      return {
        betreff: `Reisekosten abgelehnt: ${d.begruendung}`,
        zeilen: [
          `${d.handelnde} hat deine Reisekostenabrechnung ${reise} abgelehnt.`,
          `Grund: ${d.grund}`,
          "Du kannst die Abrechnung korrigieren und erneut einreichen.",
        ],
        knopf: "Abrechnung öffnen",
      };
    case "geprueft":
      return {
        betreff: `Reisekosten geprüft: ${d.begruendung}`,
        zeilen: [`Deine Reisekostenabrechnung ${reise} ist geprüft (Beleg-Nr. ${d.belegNr}) und wird ausgezahlt.`],
        knopf: "Abrechnung öffnen",
      };
    case "ausgezahlt":
      return {
        betreff: `Reisekosten ausgezahlt: ${d.begruendung}`,
        zeilen: [`Deine Reisekostenabrechnung ${reise} wurde ausgezahlt.`],
        knopf: "Abrechnung öffnen",
      };
  }
}

export function alsMail(art: Benachrichtigung, d: VorlageDaten): { betreff: string; text: string; html: string } {
  const { betreff, zeilen, knopf } = vorlage(art, d);
  const text = [...zeilen, "", `${knopf}: ${d.link}`, "", "– Polycare Reisekosten"].join("\n");
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;color:#171717;line-height:1.5">
${zeilen.map((z) => `<p>${escape(z)}</p>`).join("\n")}
<p><a href="${escape(d.link)}" style="display:inline-block;background:#171717;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${escape(knopf)}</a></p>
<p style="color:#737373;font-size:13px">Polycare Reisekosten</p>
</body></html>`;
  return { betreff, text, html };
}
