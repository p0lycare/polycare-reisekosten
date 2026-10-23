/** Entfernt Leerzeichen und wandelt in Großbuchstaben um. */
export function normalisiereIban(eingabe: string): string {
  return eingabe.replace(/\s+/g, "").toUpperCase();
}

/** Prüft Format und Prüfziffer (ISO 13616, Modulo 97). Erwartet eine normalisierte IBAN. */
export function istGueltigeIban(iban: string): boolean {
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  if (iban.startsWith("DE") && iban.length !== 22) return false;

  const umgestellt = iban.slice(4) + iban.slice(0, 4);
  let rest = 0;
  for (const zeichen of umgestellt) {
    const ziffern = /[A-Z]/.test(zeichen) ? String(zeichen.charCodeAt(0) - 55) : zeichen;
    for (const z of ziffern) rest = (rest * 10 + Number(z)) % 97;
  }
  return rest === 1;
}

/** "DE89370400440532013000" → "DE89 3704 0044 0532 0130 00" */
export function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}
