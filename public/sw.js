// Polycare Reisekosten – Service Worker für die Offline-Nutzung (v1)
// Seiten: erst Netz, ohne Netz die zuletzt geladene Fassung (Belege fotografieren geht damit auch im Funkloch).
// Statische Dateien von Next.js sind unveränderlich und werden dauerhaft vorgehalten.
const SEITEN = "seiten-v1";
const STATISCH = "statisch-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((namen) => Promise.all(namen.filter((n) => n !== SEITEN && n !== STATISCH).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Abmelden: vorgehaltene Seiten mit persönlichen Daten löschen
  if (request.method === "POST" && url.pathname === "/auth/logout") {
    event.waitUntil(caches.delete(SEITEN));
    return;
  }
  if (request.method !== "GET" || url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (treffer) =>
          treffer ||
          fetch(request).then((antwort) => {
            if (antwort.ok) {
              const kopie = antwort.clone();
              caches.open(STATISCH).then((c) => c.put(request, kopie));
            }
            return antwort;
          }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((antwort) => {
          // Nur echte Seiten vorhalten, keine Umleitungen zur Anmeldung
          if (antwort.ok && !antwort.redirected) {
            const kopie = antwort.clone();
            caches.open(SEITEN).then((c) => c.put(url.pathname, kopie));
          }
          return antwort;
        })
        .catch(async () => {
          const cache = await caches.open(SEITEN);
          return (
            (await cache.match(url.pathname)) ||
            (await cache.match("/belege")) ||
            new Response(
              '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Offline</title><body style="font-family:sans-serif;padding:24px"><h1>Keine Verbindung</h1><p>Öffne „Belege“ einmal mit Netz – danach kannst du Belege auch offline fotografieren.</p></body>',
              { headers: { "Content-Type": "text/html; charset=utf-8" } },
            )
          );
        }),
    );
  }
});
