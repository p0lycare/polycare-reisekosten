// Polycare Reisekosten – Service Worker für die Offline-Nutzung (v3)
// Nur die Seite "Belege" wird vorgehalten (Belege fotografieren im Funkloch), keine Seiten mit Reise- oder Kontodaten.
// Beim Abmelden oder wenn die Anmeldeseite erscheint (Sitzung abgelaufen, Personenwechsel), wird sie gelöscht.
// Statische Dateien von Next.js sind unveränderlich und werden dauerhaft vorgehalten.
const SEITEN = "seiten-v2";
const OFFLINE_SEITEN = ["/belege"];
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

  if (request.mode === "navigate" && url.pathname === "/login") {
    event.waitUntil(caches.delete(SEITEN));
    return;
  }

  if (request.mode === "navigate" && OFFLINE_SEITEN.includes(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((antwort) => {
          // Nur echte Seiten vorhalten. Umleitung zur Anmeldung = Sitzung abgelaufen: alte Seite löschen,
          // damit sie offline nicht der nächsten Person am Gerät erscheint
          if (antwort.redirected) {
            caches.delete(SEITEN);
          } else if (antwort.ok) {
            const kopie = antwort.clone();
            caches.open(SEITEN).then((c) => c.put(url.pathname, kopie));
          }
          return antwort;
        })
        .catch(async () => {
          const cache = await caches.open(SEITEN);
          return (
            (await cache.match(url.pathname)) ||
            new Response(
              '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Offline</title><body style="font-family:sans-serif;padding:24px"><h1>Keine Verbindung</h1><p>Öffne „Belege“ einmal mit Netz – danach kannst du Belege auch offline fotografieren.</p></body>',
              { headers: { "Content-Type": "text/html; charset=utf-8" } },
            )
          );
        }),
    );
  }
});
