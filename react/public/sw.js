// Minimal service worker — required for Chrome/Android install prompt.
// No caching strategy yet; everything passes through to the network.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Pass through. A real caching strategy would intercept here.
});
