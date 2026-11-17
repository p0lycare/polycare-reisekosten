import { landName } from "@/lib/reisekosten/laender";
import type { Sprache } from "./sprache";

/**
 * Ländername für die Oberfläche. Auf Englisch über Intl (Codes wie "FR" oder "US:New York City"),
 * die Stadt bleibt wie in der BMF-Tabelle. Unbekannte Codes fallen auf den deutschen Namen zurück.
 */
export function landNameIn(land: string, sprache: Sprache, jahr?: number): string {
  const deutsch = landName(land, jahr);
  if (sprache === "de") return deutsch;
  const [code, stadt] = land.split(":");
  try {
    const name = new Intl.DisplayNames(["en"], { type: "region" }).of(code);
    if (!name || name === code) return deutsch;
    return stadt ? `${name} – ${stadt}` : name;
  } catch {
    return deutsch;
  }
}
