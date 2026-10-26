import "server-only";
import { zerlegeStrecke } from "./strecke";

/**
 * Fahrstrecke über OpenStreetMap: Orte per Nominatim finden, Route per OSRM berechnen.
 * Beide Dienste sind frei nutzbar bei geringem Aufkommen (Nominatim: höchstens 1 Anfrage/s,
 * mit Kennung). Ergebnisse werden im Speicher gehalten, damit Speichern keine zweite Abfrage braucht.
 */
/** Koordinaten als [Breite, Länge] */
export type Koordinate = [number, number];
/** km, gefundene Orte (Name + Lage) und der vereinfachte Linienverlauf für die Karte */
export type RoutenErgebnis = { km: number; orte: string[]; halte: Koordinate[]; linie: Koordinate[] } | { fehler: string };

type Punkt = { lat: string; lon: string; name: string };

// Deutschland und Nachbarländer
const LAENDER = "de,at,ch,nl,be,lu,fr,dk,pl,cz,it";

const orteCache = new Map<string, Punkt | null>();
const routenCache = new Map<string, RoutenErgebnis>();
let letzteAnfrage = 0;

type Treffer = {
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: { road?: string; house_number?: string; city?: string; town?: string; village?: string; municipality?: string };
};

/** Lesbarer Name: Adresse als "Straße Nr, Ort", sonst der Name des Ortes/Gebäudes mit Ort */
function anzeigeName(t: Treffer): string {
  const a = t.address ?? {};
  const ort = a.city ?? a.town ?? a.village ?? a.municipality;
  if (a.road && a.house_number) return [`${a.road} ${a.house_number}`, ort].filter(Boolean).join(", ");
  const name = t.name && !/^\d/.test(t.name) ? t.name : t.display_name.split(",")[0];
  return ort && name !== ort ? `${name}, ${ort}` : name;
}

/** Ein zweiter Versuch bei Zeitüberschreitung oder Netzfehler – die freien Dienste antworten gelegentlich langsam */
async function mitWiederholung(anfrage: () => Promise<Response>): Promise<Response> {
  try {
    return await anfrage();
  } catch {
    await new Promise((r) => setTimeout(r, 1100));
    return anfrage();
  }
}

function kennung(): string {
  const kontakt = process.env.MAIL_ABSENDER;
  return `Polycare-Reisekosten/1.0${kontakt ? ` (${kontakt})` : ""}`;
}

async function findeOrt(ort: string): Promise<Punkt | null> {
  const schluessel = ort.toLowerCase();
  if (orteCache.has(schluessel)) return orteCache.get(schluessel)!;

  const warten = letzteAnfrage + 1100 - Date.now();
  if (warten > 0) await new Promise((r) => setTimeout(r, warten));
  letzteAnfrage = Date.now();

  const parameter = new URLSearchParams({ format: "jsonv2", limit: "1", addressdetails: "1", countrycodes: LAENDER, "accept-language": "de", q: ort });
  const antwort = await mitWiederholung(() =>
    fetch(`https://nominatim.openstreetmap.org/search?${parameter}`, { headers: { "User-Agent": kennung() }, signal: AbortSignal.timeout(8000) }),
  );
  if (!antwort.ok) throw new Error(`Ortssuche fehlgeschlagen (${antwort.status})`);
  const [treffer] = (await antwort.json()) as Treffer[];
  const punkt = treffer ? { lat: treffer.lat, lon: treffer.lon, name: anzeigeName(treffer) } : null;
  orteCache.set(schluessel, punkt);
  return punkt;
}

export async function berechneRoute(strecke: string): Promise<RoutenErgebnis> {
  const orte = zerlegeStrecke(strecke);
  if (orte.length < 2) return { fehler: "Bitte Start und Ziel angeben, z. B. „Köln – Essen – Köln“." };
  const schluessel = orte.join("|").toLowerCase();
  const bekannt = routenCache.get(schluessel);
  if (bekannt) return bekannt;

  try {
    const punkte: Punkt[] = [];
    for (const ort of orte) {
      const punkt = await findeOrt(ort);
      if (!punkt) return { fehler: `„${ort}“ wurde nicht gefunden. Bitte genauer angeben, z. B. mit Postleitzahl.` };
      punkte.push(punkt);
    }

    const koordinaten = punkte.map((p) => `${p.lon},${p.lat}`).join(";");
    const antwort = await mitWiederholung(() =>
      fetch(`https://router.project-osrm.org/route/v1/driving/${koordinaten}?overview=simplified&geometries=geojson`, {
        headers: { "User-Agent": kennung() },
        signal: AbortSignal.timeout(8000),
      }),
    );
    const daten = (await antwort.json()) as { code: string; routes?: { distance: number; geometry?: { coordinates: [number, number][] } }[] };
    if (!antwort.ok || daten.code !== "Ok" || !daten.routes?.length) return { fehler: "Für diese Strecke wurde keine Route gefunden." };

    const ergebnis = {
      km: Math.round(daten.routes[0].distance / 100) / 10,
      orte: punkte.map((p) => p.name),
      halte: punkte.map((p): Koordinate => [Number(p.lat), Number(p.lon)]),
      // GeoJSON liefert [Länge, Breite]
      linie: (daten.routes[0].geometry?.coordinates ?? []).map(([lon, lat]): Koordinate => [lat, lon]),
    };
    routenCache.set(schluessel, ergebnis);
    return ergebnis;
  } catch (e) {
    console.error("Routing fehlgeschlagen", e);
    return { fehler: "Die Strecke konnte gerade nicht berechnet werden. Bitte km selbst eintragen." };
  }
}
