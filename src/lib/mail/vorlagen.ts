import { texte } from "@/lib/i18n/woerterbuch";
import type { Sprache } from "@/lib/i18n/sprache";

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

/**
 * Betreff und Text je Workflow-Schritt, in der Sprache der empfangenden Person.
 * Empfänger: siehe Funktion mail_empfaenger in der Datenbank.
 */
export function vorlage(art: Benachrichtigung, d: VorlageDaten, sprache: Sprache = "de"): { betreff: string; zeilen: string[]; knopf: string } {
  const t = texte(sprache).mails;
  const werte = {
    reisende: d.reisende,
    handelnde: d.handelnde ?? "",
    reise: t.reise(d.begruendung, d.zeitraum, d.betrag),
    grund: d.grund ?? "",
    belegNr: d.belegNr ?? "",
    begruendung: d.begruendung,
  };
  const v = t.workflow[art];
  return { betreff: v.betreff(werte), zeilen: v.zeilen(werte), knopf: v.knopf };
}

export function alsMail(art: Benachrichtigung, d: VorlageDaten, sprache: Sprache = "de"): { betreff: string; text: string; html: string } {
  const { betreff, zeilen, knopf } = vorlage(art, d, sprache);
  const fuss = texte(sprache).mails.fuss;
  const text = [...zeilen, "", `${knopf}: ${d.link}`, "", `– ${fuss}`].join("\n");
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;color:#171717;line-height:1.5">
${zeilen.map((z) => `<p>${escape(z)}</p>`).join("\n")}
<p><a href="${escape(d.link)}" style="display:inline-block;background:#153c28;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${escape(knopf)}</a></p>
<p style="color:#737373;font-size:13px">${escape(fuss)}</p>
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

/** Eine Mail für mehrere Abrechnungen derselben Person, die gemeinsam einen Workflow-Schritt durchlaufen haben */
export function alsSammelMail(d: SammelDaten, sprache: Sprache = "de"): { betreff: string; text: string; html: string } {
  const t = texte(sprache).mails;
  const art = d.art ?? "eingereicht";
  const n = d.reisen.length;
  const werte = {
    reisende: d.reisende,
    handelnde: d.handelnde ?? "",
    n,
    gesamt: d.gesamt,
    was: t.sammel.was(n, d.zeitraum),
    zeitraum: d.zeitraum,
  };
  const v = t.sammel[art];
  const texteArt = { betreff: v.betreff(werte), kopf: v.kopf(werte), knopf: v.knopf };
  const zeilen = d.reisen.map((r) => `${r.zeitraum} – ${r.begruendung}: ${r.betrag}`);
  const kommentar = d.kommentar ? [t.kommentar(d.kommentar)] : [];
  const text = [texteArt.kopf, "", ...zeilen.map((z) => `• ${z}`), ...(kommentar.length ? ["", ...kommentar] : []), "", `${texteArt.knopf}: ${d.link}`, "", `– ${t.fuss}`].join("\n");
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;color:#171717;line-height:1.5">
<p>${escape(texteArt.kopf)}</p>
<ul>${zeilen.map((z) => `<li>${escape(z)}</li>`).join("")}</ul>
${kommentar.map((k) => `<p>${escape(k)}</p>`).join("")}
<p><a href="${escape(d.link)}" style="display:inline-block;background:#153c28;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${escape(texteArt.knopf)}</a></p>
<p style="color:#737373;font-size:13px">${escape(t.fuss)}</p>
</body></html>`;
  return { betreff: texteArt.betreff, text, html };
}

/** Kurze Mail mit einigen Zeilen und einem Knopf (Erinnerungen, Vorschuss) */
export function alsKurzmail(d: { betreff: string; zeilen: string[]; knopf: string; link: string; fuss?: string; sprache?: Sprache }): {
  betreff: string;
  text: string;
  html: string;
} {
  const absender = texte(d.sprache ?? "de").mails.fuss;
  const fuss = d.fuss ? ` · ${d.fuss}` : "";
  const text = [...d.zeilen, "", `${d.knopf}: ${d.link}`, "", `– ${absender}`].join("\n");
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;color:#171717;line-height:1.5">
${d.zeilen.map((z) => `<p style="margin:0 0 8px">${escape(z)}</p>`).join("\n")}
<p style="margin-top:16px"><a href="${escape(d.link)}" style="display:inline-block;background:#153c28;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${escape(d.knopf)}</a></p>
<p style="color:#737373;font-size:13px">${escape(absender)}${escape(fuss)}</p>
</body></html>`;
  return { betreff: d.betreff, text, html };
}

/** Erinnerungsmail mit einigen Zeilen und einem Knopf */
export function alsErinnerung(d: { betreff: string; zeilen: string[]; knopf: string; link: string; sprache?: Sprache }): {
  betreff: string;
  text: string;
  html: string;
} {
  return alsKurzmail({ ...d, fuss: texte(d.sprache ?? "de").mails.erinnerungFuss });
}
