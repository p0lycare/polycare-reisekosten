const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const DATEI = new RegExp(`^(${UUID})/(${UUID})/${UUID}\\.(jpe?g|png|webp|heic|pdf)$`);

/**
 * Prüft, ob ein Speicherpfad genau dem Schema <user>/<reise>/<uuid>.<endung> entspricht.
 * Ein reiner Präfixvergleich würde Pfade wie "<user>/<reise>/../../fremd/…" durchlassen.
 */
export function istBelegPfad(pfad: string, userId: string, reiseId: string): boolean {
  const m = DATEI.exec(pfad);
  return !!m && m[1] === userId && m[2] === reiseId;
}
