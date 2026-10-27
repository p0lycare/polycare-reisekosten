export type Anhang = { name: string; contentType: string; inhalt: Uint8Array };

/**
 * Graph nimmt je sendMail-Aufruf ca. 4 MB an; Base64 vergrößert um ein Drittel. Bis zu dieser Summe geht
 * die Mail in einem Aufruf raus, darüber über Entwurf und Upload-Session (Anhänge bis 150 MB).
 */
export const DIREKT_MAX_BYTES = 2_800_000;

/** DATEV nimmt je Upload-Mail höchstens 20 MB an, inklusive Base64-Aufschlag – also rund 14 MB Anhänge */
export const DATEV_MAX_BYTES = 14_000_000;

/** Upload-Session-Stücke: Vielfache von 320 KiB, höchstens 4 MB je Stück (Vorgabe von Microsoft Graph) */
const STUECK = 320 * 1024 * 10;

export function brauchtUploadSession(anhaenge: Anhang[]): boolean {
  return anhaenge.reduce((s, a) => s + a.inhalt.byteLength, 0) >= DIREKT_MAX_BYTES;
}

/** Byte-Bereiche [von, bis) für das stückweise Hochladen */
export function uploadBereiche(groesse: number, stueck = STUECK): { von: number; bis: number }[] {
  const bereiche: { von: number; bis: number }[] = [];
  for (let von = 0; von < groesse; von += stueck) bereiche.push({ von, bis: Math.min(von + stueck, groesse) });
  return bereiche;
}
