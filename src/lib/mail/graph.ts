import "server-only";
import { teileAnhaenge, type Anhang } from "./anhaenge";

/**
 * E-Mail-Versand über Microsoft Graph aus einem Funktionspostfach (App-Berechtigung Mail.Send,
 * per Exchange-Richtlinie auf genau dieses Postfach beschränkt). Zugangsdaten nur als Env-Variablen.
 */
export type { Anhang };

export type Mail = {
  an: string[];
  betreff: string;
  text: string;
  html: string;
  anhaenge?: Anhang[];
};

type Konfiguration = { tenantId: string; clientId: string; clientSecret: string; absender: string };

export function mailKonfiguration(): Konfiguration | null {
  const tenantId = process.env.MAIL_TENANT_ID;
  const clientId = process.env.MAIL_CLIENT_ID;
  const clientSecret = process.env.MAIL_CLIENT_SECRET;
  const absender = process.env.MAIL_ABSENDER;
  if (!tenantId || !clientId || !clientSecret || !absender) return null;
  return { tenantId, clientId, clientSecret, absender };
}

let tokenCache: { token: string; gueltigBis: number } | null = null;

export async function zugriffstoken(k: Konfiguration): Promise<string> {
  if (tokenCache && tokenCache.gueltigBis > Date.now() + 60_000) return tokenCache.token;

  const antwort = await fetch(`https://login.microsoftonline.com/${k.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: k.clientId,
      client_secret: k.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  if (!antwort.ok) throw new Error(`Anmeldung bei Microsoft fehlgeschlagen (${antwort.status})`);
  const daten = (await antwort.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: daten.access_token, gueltigBis: Date.now() + daten.expires_in * 1000 };
  return daten.access_token;
}

function base64(inhalt: Uint8Array): string {
  return Buffer.from(inhalt).toString("base64");
}

/** Sendet eine Mail; bei vielen Anhängen als mehrere Mails "(Teil x/y)". */
export async function sendeMail(mail: Mail): Promise<void> {
  const k = mailKonfiguration();
  if (!k) throw new Error("E-Mail-Versand ist nicht eingerichtet");
  const token = await zugriffstoken(k);

  const pakete = teileAnhaenge(mail.anhaenge ?? []);
  for (const [i, anhaenge] of pakete.entries()) {
    const betreff = pakete.length > 1 ? `${mail.betreff} (Teil ${i + 1}/${pakete.length})` : mail.betreff;
    const antwort = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(k.absender)}/sendMail`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          subject: betreff,
          body: { contentType: "HTML", content: mail.html },
          toRecipients: mail.an.map((address) => ({ emailAddress: { address } })),
          attachments: anhaenge.map((a) => ({
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: a.name,
            contentType: a.contentType,
            contentBytes: base64(a.inhalt),
          })),
        },
        saveToSentItems: true,
      }),
    });
    if (!antwort.ok) {
      const details = await antwort.text().catch(() => "");
      throw new Error(`Mailversand fehlgeschlagen (${antwort.status}) ${details.slice(0, 200)}`);
    }
  }
}
