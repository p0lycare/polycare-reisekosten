import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { berechneRoute } from "./osm";

/**
 * Berechnete Route einer Fahrt nach der Antwort festhalten (meist aus dem Zwischenspeicher),
 * damit Speichern nie auf OpenStreetMap wartet. Nur der Server setzt sie (die Datenbank verwirft
 * Nutzeränderungen); aufrufen nur für eine Fahrt, die vorher RLS-geprüft geschrieben wurde.
 */
export function routeNachtragen(fahrtId: string, strecke: string) {
  after(async () => {
    const route = await berechneRoute(strecke);
    const kmRoute = "km" in route && route.km > 0 && route.km < 10000 ? route.km : null;
    const { error } = await createAdminClient().from("fahrt").update({ km_route: kmRoute }).eq("id", fahrtId);
    if (error) console.error("Route konnte nicht gespeichert werden", error.message);
  });
}
