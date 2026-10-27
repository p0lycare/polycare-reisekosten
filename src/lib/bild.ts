const MAX_KANTE = 2000;

/**
 * Verkleinert Handyfotos vor dem Hochladen auf max. 2000 px Kantenlänge (JPEG),
 * damit Belege schnell hochladen und klein bleiben. PDFs und Formate, die der Browser
 * nicht dekodieren kann (z. B. HEIC außerhalb von Safari), bleiben unverändert.
 */
export async function verkleinereBild(datei: File): Promise<File> {
  if (!datei.type.startsWith("image/")) return datei;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(datei);
  } catch {
    return datei;
  }

  const faktor = Math.min(1, MAX_KANTE / Math.max(bitmap.width, bitmap.height));
  if (faktor === 1 && datei.type === "image/jpeg" && datei.size < 1_500_000) return datei;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * faktor);
  canvas.height = Math.round(bitmap.height * faktor);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
  if (!blob) return datei;
  return new File([blob], datei.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

/** Diese Formate lassen sich ins PDF für DATEV einbetten – alles andere würde dort ein loser Einzelbeleg */
const ERLAUBT = ["image/jpeg", "image/png", "application/pdf"];

/** Fehlermeldung, wenn eine (bereits verkleinerte) Datei kein einbettbares Format hat, sonst null */
export function formatFehler(datei: File): string | null {
  if (ERLAUBT.includes(datei.type)) return null;
  return "Dieses Format kann nicht verarbeitet werden – bitte als Foto (JPEG) oder PDF. Am iPhone: Einstellungen → Kamera → Formate → „Maximale Kompatibilität“.";
}
