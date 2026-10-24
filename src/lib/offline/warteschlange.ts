/**
 * Warteschlange für Belegfotos ohne Netz: liegt im Browser (IndexedDB) des eigenen Geräts
 * und wird hochgeladen, sobald wieder eine Verbindung besteht.
 */
/** pfad: schon hochgeladen, nur der Eingang fehlt noch */
export type WartenderBeleg = { id: string; userId: string; datei: Blob; name: string; zeit: number; pfad?: string };

const DB = "polycare-reisekosten";
const STORE = "belege-offline";

function oeffnen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const anfrage = indexedDB.open(DB, 1);
    anfrage.onupgradeneeded = () => anfrage.result.createObjectStore(STORE, { keyPath: "id" });
    anfrage.onsuccess = () => resolve(anfrage.result);
    anfrage.onerror = () => reject(anfrage.error);
  });
}

async function mitStore<T>(modus: IDBTransactionMode, aktion: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await oeffnen();
  try {
    return await new Promise<T>((resolve, reject) => {
      const anfrage = aktion(db.transaction(STORE, modus).objectStore(STORE));
      anfrage.onsuccess = () => resolve(anfrage.result);
      anfrage.onerror = () => reject(anfrage.error);
    });
  } finally {
    db.close();
  }
}

export async function ablegen(userId: string, datei: Blob, name: string, pfad?: string): Promise<void> {
  const eintrag: WartenderBeleg = { id: crypto.randomUUID(), userId, datei, name, zeit: Date.now(), pfad };
  await mitStore("readwrite", (s) => s.put(eintrag));
}

/** Wartende Belege der Person, älteste zuerst */
export async function wartende(userId: string): Promise<WartenderBeleg[]> {
  if (typeof indexedDB === "undefined") return [];
  const alle = await mitStore<WartenderBeleg[]>("readonly", (s) => s.getAll());
  return alle.filter((e) => e.userId === userId).sort((a, b) => a.zeit - b.zeit);
}

export async function entfernen(id: string): Promise<void> {
  await mitStore("readwrite", (s) => s.delete(id));
}

/** Netzwerkfehler (kein Netz, Abbruch) – im Gegensatz zu einer Ablehnung durch den Server */
export function istNetzfehler(e: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  return e instanceof TypeError || (e instanceof Error && /fetch|network|netzwerk|load failed/i.test(e.message));
}
