"use client";

import { useEffect } from "react";

/** Registriert den Service Worker (nur im Produktivbetrieb, damit die Entwicklung nicht aus dem Cache läuft) */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((e) => console.error("Service Worker nicht registriert", e));
  }, []);
  return null;
}
