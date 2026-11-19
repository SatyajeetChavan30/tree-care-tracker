/**
 * sw.js: the service worker that makes Tree Care Tracker work without internet.
 *
 * A service worker is a small script the browser keeps running in the background,
 * between the page and the network. This one does three jobs:
 *   1. install:  save a copy of every file of the app (the "app shell") in a cache.
 *   2. activate: delete the copies left over from older versions.
 *   3. fetch:    answer each request from the saved copy at once, and quietly
 *                download a fresh copy for next time ("stale-while-revalidate").
 *
 * The data itself (saplings and visits) is not here: it lives in localStorage,
 * which works offline anyway.
 *
 * After you change files and deploy again, add 1 to CACHE_VERSION. Phones then
 * throw away their old copy and save the new one.
 */
const CACHE_VERSION = 1;
const CACHE_PREFIX = "tree-care-tracker-";
const CACHE_NAME = CACHE_PREFIX + "v" + CACHE_VERSION;

// Every file the app needs to open. "./" is index.html.
const APP_SHELL = [
  "./",
  "./css/styles.css",
  "./js/app.js",
  "./js/storage.js",
  "./js/logic.js",
  "./js/ui.js",
  "./js/qr.js",
  "./js/samples.js",
  "./vendor/qrcode-generator/qrcode-esm.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

// The folder the app lives in, for example "/" or "/tree-care-tracker/" on GitHub Pages.
const APP_PATH = new URL("./", self.location).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // cache: "reload" skips the browser's ordinary download cache, so the newest files are saved.
      .then((cache) => cache.addAll(APP_SHELL.map((path) => new Request(path, { cache: "reload" }))))
      .then(() => self.skipWaiting()), // start using this version straight away
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()), // take control of pages that are already open
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Only handle our own files. Anything else goes to the network as normal.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Opening the app (also ./#T-007 from a QR label, since the part after # is never sent)
  // always uses the saved index page.
  const isAppPage =
    request.mode === "navigate" && (url.pathname === APP_PATH || url.pathname === APP_PATH + "index.html");
  const cacheKey = isAppPage ? "./" : request;

  event.respondWith(staleWhileRevalidate(event, cacheKey, request));
});

/** Answers from the cache if possible, and refreshes the cached copy from the network. */
async function staleWhileRevalidate(event, cacheKey, request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(cacheKey, { ignoreSearch: true });

  // "no-cache" asks the server whether the file changed (cheap when it hasn't).
  // Page loads can't be copied with new options, so they are sent as they are.
  const networkRequest = request.mode === "navigate" ? request : new Request(request, { cache: "no-cache" });
  const fromNetwork = fetch(networkRequest).then((response) => {
    // Keep only complete, normal answers (not errors or redirects).
    if (response.ok && response.type === "basic" && !response.redirected) {
      cache.put(cacheKey, response.clone());
    }
    return response;
  });

  if (cached) {
    // Use the saved copy now; let the download finish in the background (it may fail offline).
    event.waitUntil(fromNetwork.catch(() => undefined));
    return cached;
  }
  return fromNetwork; // not saved yet: the network is the only option
}
