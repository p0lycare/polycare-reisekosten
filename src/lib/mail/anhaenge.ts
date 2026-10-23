export type Anhang = { name: string; contentType: string; inhalt: Uint8Array };

/** Graph erlaubt pro sendMail-Aufruf ca. 4 MB; Base64 vergrößert um ein Drittel */
export const MAX_ANHANG_BYTES_PRO_MAIL = 2_800_000;

/**
 * Verteilt Anhänge so auf mehrere Mails, dass keine die Größengrenze überschreitet.
 * Ein einzelner zu großer Anhang wird trotzdem allein verschickt (Graph lehnt ihn dann ab).
 */
export function teileAnhaenge(anhaenge: Anhang[], max = MAX_ANHANG_BYTES_PRO_MAIL): Anhang[][] {
  const pakete: Anhang[][] = [];
  let aktuell: Anhang[] = [];
  let groesse = 0;
  for (const a of anhaenge) {
    if (aktuell.length && groesse + a.inhalt.byteLength > max) {
      pakete.push(aktuell);
      aktuell = [];
      groesse = 0;
    }
    aktuell.push(a);
    groesse += a.inhalt.byteLength;
  }
  if (aktuell.length) pakete.push(aktuell);
  return pakete.length ? pakete : [[]];
}
