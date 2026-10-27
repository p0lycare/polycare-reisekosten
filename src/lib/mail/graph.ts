import "server-only";
import { brauchtUploadSession, DIREKT_MAX_BYTES, uploadBereiche, type Anhang } from "./anhaenge";

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

const GRAPH = "https://graph.microsoft.com/v1.0";

/** Fehlertext mit Status und dem Anfang der Graph-Antwort */
async function graphFehler(schritt: string, antwort: Response): Promise<Error> {
  const details = await antwort.text().catch(() => "");
  if (antwort.status === 403 && schritt !== "Mailversand") {
    return new Error(
      "Für große Anhänge braucht die App in Microsoft Entra zusätzlich die Berechtigung Mail.ReadWrite (Anwendung) – bitte freigeben.",
    );
  }
  return new Error(`${schritt} fehlgeschlagen (${antwort.status}) ${details.slice(0, 200)}`);
}

/**
 * Sendet eine Mail mit allen Anhängen in einer einzigen Mail. Kleine Mails gehen direkt über sendMail
 * (Grenze ca. 4 MB je Aufruf). Größere werden als Entwurf angelegt, die Anhänge per Upload-Session
 * hochgeladen und dann versendet – so wird z. B. eine Abrechnung in DATEV nie in Teile zerlegt.
 */
export async function sendeMail(mail: Mail): Promise<void> {
  const k = mailKonfiguration();
  if (!k) throw new Error("E-Mail-Versand ist nicht eingerichtet");
  const token = await zugriffstoken(k);
  const anhaenge = mail.anhaenge ?? [];
  const postfach = `${GRAPH}/users/${encodeURIComponent(k.absender)}`;
  const nachricht = {
    subject: mail.betreff,
    body: { contentType: "HTML", content: mail.html },
    toRecipients: mail.an.map((address) => ({ emailAddress: { address } })),
  };
  const json = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  if (!brauchtUploadSession(anhaenge)) {
    const antwort = await fetch(`${postfach}/sendMail`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ message: { ...nachricht, attachments: anhaenge.map(alsAnhang) }, saveToSentItems: true }),
    });
    if (!antwort.ok) throw await graphFehler("Mailversand", antwort);
    return;
  }

  const entwurf = await fetch(`${postfach}/messages`, { method: "POST", headers: json, body: JSON.stringify(nachricht) });
  if (!entwurf.ok) throw await graphFehler("Mailentwurf", entwurf);
  const { id } = (await entwurf.json()) as { id: string };
  const nachrichtUrl = `${postfach}/messages/${encodeURIComponent(id)}`;

  try {
    for (const a of anhaenge) {
      if (a.inhalt.byteLength < DIREKT_MAX_BYTES) {
        const antwort = await fetch(`${nachrichtUrl}/attachments`, { method: "POST", headers: json, body: JSON.stringify(alsAnhang(a)) });
        if (!antwort.ok) throw await graphFehler("Anhang", antwort);
        continue;
      }
      const sitzung = await fetch(`${nachrichtUrl}/attachments/createUploadSession`, {
        method: "POST",
        headers: json,
        body: JSON.stringify({ AttachmentItem: { attachmentType: "file", name: a.name, size: a.inhalt.byteLength, contentType: a.contentType } }),
      });
      if (!sitzung.ok) throw await graphFehler("Upload-Session", sitzung);
      const { uploadUrl } = (await sitzung.json()) as { uploadUrl: string };
      // Die Upload-URL ist vorab berechtigt – ohne Authorization-Header senden
      for (const { von, bis } of uploadBereiche(a.inhalt.byteLength)) {
        const teil = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream", "Content-Range": `bytes ${von}-${bis - 1}/${a.inhalt.byteLength}` },
          body: Buffer.from(a.inhalt.subarray(von, bis)),
        });
        if (!teil.ok) throw await graphFehler("Hochladen des Anhangs", teil);
      }
    }
    const senden = await fetch(`${nachrichtUrl}/send`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Length": "0" } });
    if (!senden.ok) throw await graphFehler("Mailversand", senden);
  } catch (e) {
    // Halb fertigen Entwurf nicht im Postfach liegen lassen
    await fetch(nachrichtUrl, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
    throw e;
  }
}

function alsAnhang(a: Anhang) {
  return { "@odata.type": "#microsoft.graph.fileAttachment", name: a.name, contentType: a.contentType, contentBytes: base64(a.inhalt) };
}
