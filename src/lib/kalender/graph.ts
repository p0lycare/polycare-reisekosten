import "server-only";
import { mailKonfiguration, zugriffstoken } from "@/lib/mail/graph";
import type { Termin } from "./vorschlaege";

/**
 * Kalender lesen über Microsoft Graph (App-Berechtigung Calendars.Read, per Exchange-Richtlinie
 * auf die Polycare-Postfächer beschränkt). Gelesen wird nur der Kalender der angemeldeten Person
 * und nur, wenn sie im Profil zugestimmt hat; Termine werden nicht gespeichert.
 */
export type KalenderAntwort = { termine: Termin[] } | { fehler: "nicht_eingerichtet" | "kein_zugriff" | "fehler" };

const FELDER = "subject,start,end,location,isAllDay,isOnlineMeeting,isCancelled";

type GraphTermin = {
  id: string;
  subject: string | null;
  start: { dateTime: string };
  end: { dateTime: string };
  location?: { displayName?: string | null } | null;
  isAllDay: boolean;
  isOnlineMeeting?: boolean | null;
  isCancelled?: boolean | null;
};

function alsTermin(g: GraphTermin): Termin {
  return {
    id: g.id,
    betreff: g.subject ?? "",
    ort: g.location?.displayName ?? "",
    beginn: g.start.dateTime.slice(0, 16),
    ende: g.end.dateTime.slice(0, 16),
    ganztaegig: g.isAllDay,
    online: !!g.isOnlineMeeting,
    abgesagt: !!g.isCancelled,
  };
}

async function graph(pfad: string): Promise<Response | KalenderAntwort> {
  const k = mailKonfiguration();
  if (!k) return { fehler: "nicht_eingerichtet" };
  try {
    const token = await zugriffstoken(k);
    const antwort = await fetch(`https://graph.microsoft.com/v1.0${pfad}`, {
      headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="W. Europe Standard Time"' },
      cache: "no-store",
    });
    if (antwort.status === 401 || antwort.status === 403) return { fehler: "kein_zugriff" };
    if (!antwort.ok) {
      console.error("Kalender lesen fehlgeschlagen", antwort.status);
      return { fehler: "fehler" };
    }
    return antwort;
  } catch (e) {
    console.error("Kalender lesen fehlgeschlagen", e);
    return { fehler: "fehler" };
  }
}

/** Termine zwischen zwei Tagen (von einschließlich, bis ausschließlich, "YYYY-MM-DD") */
export async function ladeTermine(email: string, von: string, bis: string): Promise<KalenderAntwort> {
  const parameter = new URLSearchParams({
    startDateTime: `${von}T00:00:00`,
    endDateTime: `${bis}T00:00:00`,
    $select: FELDER,
    $orderby: "start/dateTime",
    $top: "250",
  });
  const antwort = await graph(`/users/${encodeURIComponent(email)}/calendarView?${parameter}`);
  if (!(antwort instanceof Response)) return antwort;
  const daten = (await antwort.json()) as { value: GraphTermin[] };
  return { termine: daten.value.map(alsTermin) };
}

/** Ein einzelner Termin, z. B. zum Vorbelegen einer neuen Reise */
export async function ladeTermin(email: string, id: string): Promise<Termin | null> {
  const antwort = await graph(`/users/${encodeURIComponent(email)}/events/${encodeURIComponent(id)}?$select=${FELDER}`);
  if (!(antwort instanceof Response)) return null;
  return alsTermin((await antwort.json()) as GraphTermin);
}
