/** Sprachen der Oberfläche. Offizielle Unterlagen (PDF, DATEV, Kontierung) sind immer deutsch. */
export const SPRACHEN = ["de", "en"] as const;
export type Sprache = (typeof SPRACHEN)[number];

export const STANDARD_SPRACHE: Sprache = "de";

/** Zwischenspeicher der Profileinstellung, damit nicht jede Seite das Profil laden muss */
export const SPRACH_COOKIE = "sprache";

/** Cookie-Optionen: ein Jahr, für die ganze App */
export const SPRACH_COOKIE_OPTIONEN = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const };

export function istSprache(wert: unknown): wert is Sprache {
  return (SPRACHEN as readonly unknown[]).includes(wert);
}

export function alsSprache(wert: unknown): Sprache {
  return istSprache(wert) ? wert : STANDARD_SPRACHE;
}

/** Locale für Intl-Formatierungen (Monatsnamen, Wochentage, Ländernamen) */
export function locale(sprache: Sprache): string {
  return sprache === "en" ? "en-GB" : "de-DE";
}
