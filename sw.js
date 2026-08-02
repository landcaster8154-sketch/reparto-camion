// Service Worker - Mis Rutas de Reparto
// Sube este número cada vez que publiques cambios importantes en index.html/jukebox.html
const CACHE_VERSION = "v1";
const CACHE_NAME = "reparto-camion-" + CACHE_VERSION;

const APP_SHELL = [
  "./",
  "./index.html",
  "./jukebox.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  const req = event.request;
  if (req.method !== "GET") return;

  // Paginas HTML: red primero (para pillar cambios nuevos), cache como respaldo offline
  if (req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") !== -1) {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, resClone); });
          return res;
        })
        .catch(function () { return caches.match(req).then(function (r) { return r || caches.match("./index.html"); }); })
    );
    return;
  }

  // Resto de recursos (iconos, manifest, etc.): cache primero, red como respaldo
  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, resClone); });
        return res;
      }).catch(function () { /* sin red y sin cache: deja fallar */ });
    })
  );
});
