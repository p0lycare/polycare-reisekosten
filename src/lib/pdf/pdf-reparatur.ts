/**
 * Manche PDFs (z. B. eine nachträglich mit einem Vermerk versehene DB-Rechnung) enthalten neben einer
 * klassischen xref-Tabelle noch alte, komprimierte Objekt-Container (/ObjStm) mit veralteter Nummerierung.
 * Laut PDF-Standard zählen die nicht: Eine klassische xref-Tabelle kann gar nicht auf Objekte darin verweisen.
 * Acrobat und Vorschau richten sich nach der xref-Tabelle und zeigen die Datei korrekt an.
 *
 * pdf-lib wertet die xref-Tabelle aber nicht aus, sondern liest alle Objekte der Reihe nach ein – auch die aus
 * den alten Containern. Die überschreiben dann gültige Objekte (z. B. den Katalog), und das Laden scheitert mit
 * "catalog.Pages is not a function".
 *
 * Abhilfe: Verweisen alle xref-Abschnitte der Datei ausschließlich klassisch (keine xref-Streams, kein /XRefStm),
 * sind die Container unerreichbar. Dann wird ihr Typ gleich lang überschrieben, damit pdf-lib sie nicht entpackt.
 * Byte-Offsets bleiben unverändert. Gibt null zurück, wenn die Datei nicht in dieses Muster passt.
 */
export function entferneVerwaisteObjektStreams(inhalt: Uint8Array): Uint8Array | null {
  const text = latin1(inhalt);
  if (!/\/Type\s*\/ObjStm\b/.test(text) || /\/XRefStm\b/.test(text)) return null;

  // Alle xref-Abschnitte über startxref und /Prev ablaufen; jeder muss eine klassische Tabelle sein
  const start = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(text.slice(-1024));
  if (!start) return null;
  const besucht = new Set<number>();
  let offset: number | null = Number(start[1]);
  while (offset !== null) {
    if (besucht.has(offset) || !text.startsWith("xref", offset)) return null;
    besucht.add(offset);
    const trailerPos = text.indexOf("trailer", offset);
    if (trailerPos < 0) return null;
    const ende = text.indexOf(">>", trailerPos);
    const prev = /\/Prev\s+(\d+)/.exec(text.slice(trailerPos, ende < 0 ? undefined : ende));
    offset = prev ? Number(prev[1]) : null;
  }

  const ersetzt = text.replace(/\/Type(\s*)\/ObjStm\b/g, (_m, abstand: string) => `/Type${abstand}/OldStm`);
  return Uint8Array.from(ersetzt, (z) => z.charCodeAt(0));
}

function latin1(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return s;
}
