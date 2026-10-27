/** Ziel-Adresse in DATEV: Auslagen an die eigene Auslagen-Adresse, sonst (oder wenn leer) an die Reisekosten-Adresse */
export function datevAdresseFuer(
  art: "reise" | "auslagen",
  intern: { datev_upload_mail: string | null; datev_upload_mail_auslagen: string | null } | null,
): string | null {
  if (art === "auslagen" && intern?.datev_upload_mail_auslagen) return intern.datev_upload_mail_auslagen;
  return intern?.datev_upload_mail ?? null;
}
