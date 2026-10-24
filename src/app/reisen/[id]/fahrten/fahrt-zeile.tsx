"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ohneZuruecksetzen } from "@/lib/formular";
import { weichtAb } from "@/lib/routing/strecke";
import { fahrtLoeschen, fahrtSpeichern, kmBerechnen, type FahrtStatus } from "./actions";

export type FahrtWerte = { id?: string; datum: string; strecke: string; zweck: string; km: string; kmRoute?: number | null };

function kmText(km: number): string {
  return km.toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

const feld =
  "w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function FahrtZeile({
  reiseId,
  werte,
  reiseVon,
  reiseBis,
}: {
  reiseId: string;
  werte: FahrtWerte;
  reiseVon: string;
  reiseBis: string;
}) {
  const [status, absenden, laeuft] = useActionState<FahrtStatus, FormData>(fahrtSpeichern, {});
  const formRef = useRef<HTMLFormElement>(null);
  const neu = !werte.id;
  const [km, setKm] = useState(werte.km);
  const [route, setRoute] = useState<{ km: number; orte?: string[] } | null>(werte.kmRoute ? { km: werte.kmRoute } : null);
  const [routeFehler, setRouteFehler] = useState<string | null>(null);
  const [rechnet, rechnen] = useTransition();
  const kmZahl = Number(km.replace(",", "."));
  const abweichung = route && Number.isFinite(kmZahl) && kmZahl > 0 && weichtAb(kmZahl, route.km);

  function berechnen() {
    const strecke = formRef.current?.querySelector<HTMLInputElement>("input[name=strecke]")?.value ?? "";
    setRouteFehler(null);
    rechnen(async () => {
      const ergebnis = await kmBerechnen(strecke);
      if ("fehler" in ergebnis) {
        setRouteFehler(ergebnis.fehler);
        return;
      }
      setRoute(ergebnis);
      setKm(kmText(ergebnis.km));
    });
  }

  function loeschen() {
    const formData = new FormData();
    formData.set("id", werte.id!);
    formData.set("reise_id", reiseId);
    startTransition(() => fahrtLoeschen(formData));
  }

  // Nach dem Anlegen einer neuen Fahrt das Formular für die nächste leeren
  useEffect(() => {
    if (neu && status.gespeichert) {
      setKm("");
      setRoute(null);
    }
  }, [neu, status]);

  return (
    <div className="py-2">
      <form ref={formRef} onSubmit={ohneZuruecksetzen(absenden)} className="grid grid-cols-[8.5rem_1fr] items-end gap-2 sm:grid-cols-[8.5rem_1fr_1fr_5.5rem_auto]">
        {werte.id && <input type="hidden" name="id" value={werte.id} />}
        <input type="hidden" name="reise_id" value={reiseId} />
        <label className="flex flex-col gap-1">
          {neu && <span className="text-xs text-neutral-500">Datum</span>}
          <input type="date" name="datum" required defaultValue={werte.datum} min={reiseVon} max={reiseBis} aria-label="Datum" className={feld} />
        </label>
        <label className="flex flex-col gap-1">
          {neu && <span className="text-xs text-neutral-500">Fahrstrecke</span>}
          <input name="strecke" required defaultValue={werte.strecke} aria-label="Fahrstrecke" className={feld} />
        </label>
        <label className="flex flex-col gap-1">
          {neu && <span className="text-xs text-neutral-500">Zweck</span>}
          <input name="zweck" defaultValue={werte.zweck} aria-label="Zweck" className={feld} />
        </label>
        <label className="flex flex-col gap-1">
          {neu && <span className="text-xs text-neutral-500">km</span>}
          <input
            name="km"
            required
            inputMode="decimal"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            aria-label="Kilometer"
            className={`${feld} text-right tabular-nums`}
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={berechnen}
            disabled={rechnet}
            title="Kilometer aus der Fahrstrecke berechnen (OpenStreetMap)"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {rechnet ? "…" : "km berechnen"}
          </button>
          <button type="submit" disabled={laeuft} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
            {laeuft ? "…" : neu ? "Hinzufügen" : "Speichern"}
          </button>
          {werte.id && (
            <button type="button" onClick={loeschen} className="text-sm text-red-700 underline dark:text-red-400">
              Löschen
            </button>
          )}
        </div>
      </form>
      {route && (
        <p className={`mt-1 text-xs ${abweichung ? "text-amber-700 dark:text-amber-400" : "text-neutral-500"}`}>
          Route: {kmText(route.km)} km{route.orte && ` über ${route.orte.join(" → ")}`}
          {abweichung && " – deine Angabe weicht deutlich ab; bitte kurz im Zweck begründen (z. B. Umleitung)."}
        </p>
      )}
      {routeFehler && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{routeFehler}</p>}
      {status.fehler && <p role="alert" className="mt-1 text-sm text-red-700 dark:text-red-400">{status.fehler}</p>}
      {status.gespeichert && !neu && <p role="status" className="mt-1 text-sm text-green-700 dark:text-green-400">Gespeichert</p>}
    </div>
  );
}
