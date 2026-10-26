"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Koordinate } from "@/lib/routing/osm";
import { kmBerechnen } from "./actions";

type Route = { km: number; orte: string[]; halte: Koordinate[]; linie: Koordinate[] };

function kmText(km: number): string {
  return km.toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

/** Zoombare Karte (OpenStreetMap) mit Routenverlauf und den gefundenen Orten */
export function RouteKarte({ route }: { route: Route }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let karte: import("leaflet").Map | null = null;
    let aktiv = true;
    // Leaflet braucht das Browserfenster – erst im Browser laden
    import("leaflet").then((L) => {
      if (!aktiv || !ref.current) return;
      karte = L.map(ref.current, { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(karte);
      const linie = route.linie.length ? route.linie : route.halte;
      const farbe = getComputedStyle(document.documentElement).getPropertyValue("--marke").trim() || "#20a95e";
      L.polyline(linie, { color: farbe, weight: 4 }).addTo(karte);
      route.halte.forEach((p, i) =>
        L.circleMarker(p, { radius: 6, color: "#153c28", fillColor: "#ffffff", fillOpacity: 1, weight: 2 })
          .bindTooltip(`${i + 1}. ${route.orte.at(i) ?? ""}`)
          .addTo(karte!),
      );
      karte.fitBounds(L.latLngBounds([...linie, ...route.halte]), { padding: [24, 24] });
    });
    return () => {
      aktiv = false;
      karte?.remove();
    };
  }, [route]);

  return (
    <div className="mt-2 flex flex-col gap-1">
      <div ref={ref} className="h-72 w-full overflow-hidden rounded-md border border-neutral-300 dark:border-neutral-700" />
      <p className="text-xs text-neutral-500">
        {kmText(route.km)} km über {route.orte.join(" → ")} · Zoomen mit + / − oder Doppelklick
      </p>
    </div>
  );
}

/** Knopf, der die Route zur Fahrstrecke berechnet und als Karte ein- bzw. ausblendet */
export function KarteKnopf({ strecke }: { strecke: string }) {
  const [route, setRoute] = useState<Route | null>(null);
  const [offen, setOffen] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, laden] = useTransition();

  function umschalten() {
    if (offen) return setOffen(false);
    setFehler(null);
    if (route) return setOffen(true);
    laden(async () => {
      const ergebnis = await kmBerechnen(strecke);
      if ("fehler" in ergebnis) return setFehler(ergebnis.fehler);
      setRoute(ergebnis);
      setOffen(true);
    });
  }

  return (
    <div className="w-full">
      <button type="button" onClick={umschalten} disabled={laedt} className="text-xs text-neutral-600 underline disabled:opacity-50 dark:text-neutral-400">
        {laedt ? "Karte lädt …" : offen ? "Karte ausblenden" : "Route auf Karte"}
      </button>
      {fehler && <p className="text-xs text-amber-700 dark:text-amber-400">{fehler}</p>}
      {offen && route && <RouteKarte route={route} />}
    </div>
  );
}
