/**
 * "Köln – Essen – Köln" → ["Köln", "Essen", "Köln"]. Getrennt wird an Gedanken- und Pfeilstrichen,
 * Semikolon und an Bindestrichen mit Leerzeichen; Ortsnamen wie "Castrop-Rauxel" bleiben ganz.
 */
export function zerlegeStrecke(strecke: string): string[] {
  return strecke
    .split(/\s*[–—→;>]\s*|\s+-+\s+/)
    .map((o) => o.trim())
    .filter(Boolean)
    .slice(0, 10);
}

/** Eingetragene km weichen deutlich von der Route ab: mehr als 10 %, mindestens aber 5 km */
export function weichtAb(km: number, kmRoute: number | null | undefined): boolean {
  if (!kmRoute) return false;
  return Math.abs(km - kmRoute) > Math.max(5, kmRoute * 0.1);
}
