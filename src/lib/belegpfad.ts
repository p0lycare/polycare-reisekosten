const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const DATEI = new RegExp(`^(${UUID})/(${UUID}|eingang)/${UUID}\\.(jpe?g|png|webp|heic|pdf)$`);

/**
 * Prüft, ob ein Speicherpfad genau dem Schema <user>/<reise>/<uuid>.<endung> entspricht
 * bzw. <user>/eingang/<uuid>.<endung> für Fotos aus dem Belegeingang (dann reiseId = "eingang"
 * oder ein Eingangsfoto, das einer Reise zugeordnet wird).
 * Ein reiner Präfixvergleich würde Pfade wie "<user>/<reise>/../../fremd/…" durchlassen.
 */
export function istBelegPfad(pfad: string, userId: string, reiseId: string): boolean {
  const m = DATEI.exec(pfad);
  return !!m && m[1] === userId && (m[2] === reiseId || m[2] === "eingang");
}

export function eingangPfad(pfad: string, userId: string): boolean {
  return istBelegPfad(pfad, userId, "eingang") && pfad.split("/")[1] === "eingang";
}
