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
<p><a href="${escape(d.link)}" style="display:inline-block;background:#153c28;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${escape(knopf)}</a></p>
<p style="color:#737373;font-size:13px">Polycare Reisekosten</p>
</body></html>`;
  return { betreff, text, html };
}

export type SammelDaten = {
  art?: "eingereicht" | "genehmigt" | "geprueft" | "ausgezahlt";
  reisende: string;
  handelnde?: string;
  zeitraum: string;
  reisen: { begruendung: string; zeitraum: string; betrag: string }[];
  gesamt: string;
  link: string;
  kommentar?: string;
};

/** Eine Mail für mehrere Reisen derselben Person, die gemeinsam einen Workflow-Schritt durchlaufen haben */
export function alsSammelMail(d: SammelDaten): { betreff: string; text: string; html: string } {
  const art = d.art ?? "eingereicht";
  const n = d.reisen.length;
  const was = `${n} Reisekostenabrechnungen${d.zeitraum ? ` für ${d.zeitraum}` : ""}`;
  const texte = {
    eingereicht: {
      betreff: `Reisekosten zur Genehmigung: ${d.reisende} – ${d.zeitraum} (${n} Reisen, ${d.gesamt})`,
      kopf: `${d.reisende} hat ${was} zur Genehmigung eingereicht, zusammen ${d.gesamt}:`,
      knopf: "Freigaben öffnen",
    },
    genehmigt: {
      betreff: `Reisekosten zur Belegprüfung: ${d.reisende} (${n} Reisen, ${d.gesamt})`,
      kopf: `${d.handelnde} hat ${n} Reisekostenabrechnungen von ${d.reisende} genehmigt, zusammen ${d.gesamt}. Bitte Belege prüfen:`,
      knopf: "Freigaben öffnen",
    },
    geprueft: {
      betreff: `Reisekosten geprüft: ${n} Reisen, ${d.gesamt}`,
      kopf: `Deine ${n} Reisekostenabrechnungen sind geprüft und werden ausgezahlt, zusammen ${d.gesamt}:`,
      knopf: "Meine Reisen öffnen",
    },
    ausgezahlt: {
      betreff: `Reisekosten ausgezahlt: ${n} Reisen, ${d.gesamt}`,
      kopf: `Deine ${n} Reisekostenabrechnungen wurden ausgezahlt, zusammen ${d.gesamt}:`,
      knopf: "Meine Reisen öffnen",
    },
  }[art];
  const zeilen = d.reisen.map((r) => `${r.zeitraum} – ${r.begruendung}: ${r.betrag}`);
  const kommentar = d.kommentar ? [`Kommentar: ${d.kommentar}`] : [];
  const text = [texte.kopf, "", ...zeilen.map((z) => `• ${z}`), ...(kommentar.length ? ["", ...kommentar] : []), "", `${texte.knopf}: ${d.link}`, "", "– Polycare Reisekosten"].join("\n");
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;color:#171717;line-height:1.5">
<p>${escape(texte.kopf)}</p>
<ul>${zeilen.map((z) => `<li>${escape(z)}</li>`).join("")}</ul>
${kommentar.map((k) => `<p>${escape(k)}</p>`).join("")}
<p><a href="${escape(d.link)}" style="display:inline-block;background:#153c28;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${escape(texte.knopf)}</a></p>
<p style="color:#737373;font-size:13px">Polycare Reisekosten</p>
</body></html>`;
  return { betreff: texte.betreff, text, html };
}

/** Erinnerungsmail mit einigen Zeilen und einem Knopf */
export function alsErinnerung(d: { betreff: string; zeilen: string[]; knopf: string; link: string }): { betreff: string; text: string; html: string } {
  const text = [...d.zeilen, "", `${d.knopf}: ${d.link}`, "", "– Polycare Reisekosten"].join("\n");
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;color:#171717;line-height:1.5">
${d.zeilen.map((z) => `<p style="margin:0 0 8px">${escape(z)}</p>`).join("\n")}
<p style="margin-top:16px"><a href="${escape(d.link)}" style="display:inline-block;background:#153c28;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${escape(d.knopf)}</a></p>
<p style="color:#737373;font-size:13px">Polycare Reisekosten · Diese Erinnerung kommt automatisch.</p>
</body></html>`;
  return { betreff: d.betreff, text, html };
}
