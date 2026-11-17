/** Sprachen der Oberfläche. Offizielle Unterlagen (PDF, DATEV, Kontierung) sind immer deutsch. */
export const SPRACHEN = ["de", "en"] as const;
export type Sprache = (typeof SPRACHEN)[number];

export const STANDARD_SPRACHE: Sprache = "de";

/** Zwischenspeicher der Profileinstellung, damit nicht jede Seite das Profil laden muss */
export const SPRACH_COOKIE = "sprache";

/** Cookie-Optionen: ein Jahr, für die ganze App */
export const SPRACH_COOKIE_OPTIONEN = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const };

/**
 * Markiert eine Sprachwahl ohne Anmeldung (Login-Seite). Nur dann übernimmt der Login die Sprache ins
 * Profil – ein altes Cookie (gemeinsam genutzter Rechner, Sprache inzwischen auf anderem Gerät geändert)
 * überschreibt das Profil nicht.
 */
export const SPRACH_WAHL_COOKIE = "sprache_gewaehlt";

/** Die Wahl auf der Login-Seite gilt für die nächste Anmeldung, höchstens einen Tag */
export const SPRACH_WAHL_OPTIONEN = { path: "/", maxAge: 60 * 60 * 24, sameSite: "lax" as const };

/**
 * Sprache nach der Anmeldung: Wurde auf der Login-Seite gewählt, gilt diese Wahl und kommt ins Profil,
 * sonst gilt das Profil.
 */
export function spracheBeimLogin(
  cookie: string | undefined,
  gewaehlt: boolean,
  profil: unknown,
): { sprache: Sprache; insProfil: boolean } {
  if (gewaehlt && istSprache(cookie)) return { sprache: cookie, insProfil: cookie !== profil };
  return { sprache: alsSprache(profil), insProfil: false };
}

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
