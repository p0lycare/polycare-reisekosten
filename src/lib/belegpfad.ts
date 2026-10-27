const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const pfadMuster = (endungen: string) => new RegExp(`^(${UUID})/(${UUID}|eingang)/${UUID}\\.(${endungen})$`);
// Neue Uploads nur in Formaten, die sich ins Abrechnungs-PDF für DATEV einbetten lassen (siehe formatFehler in lib/bild)
const NEU = pfadMuster("jpe?g|png|pdf");
// Bereits gespeicherte Dateien (z. B. offline vorgemerkte Fotos von vor der Umstellung) bleiben verwendbar
const BESTAND = pfadMuster("jpe?g|png|webp|heic|pdf");

/**
 * Prüft, ob ein Speicherpfad genau dem Schema <user>/<reise>/<uuid>.<endung> entspricht
 * bzw. <user>/eingang/<uuid>.<endung> für Fotos aus dem Belegeingang (dann reiseId = "eingang"
 * oder ein Eingangsfoto, das einer Reise zugeordnet wird).
 * Ein reiner Präfixvergleich würde Pfade wie "<user>/<reise>/../../fremd/…" durchlassen.
 * bestand: Datei liegt schon im Speicher (unveränderter Beleg, Foto aus dem Eingang) – ältere Formate erlaubt.
 */
export function istBelegPfad(pfad: string, userId: string, reiseId: string, bestand = false): boolean {
  const m = (bestand ? BESTAND : NEU).exec(pfad);
  return !!m && m[1] === userId && (m[2] === reiseId || m[2] === "eingang");
}

export function eingangPfad(pfad: string, userId: string, bestand = false): boolean {
  return istBelegPfad(pfad, userId, "eingang", bestand) && pfad.split("/")[1] === "eingang";
}
