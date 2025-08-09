/// <reference lib="WebWorker" />
// Workbox precache manifest placeholder will be injected at build time
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };

import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST || []);
// Runtime caching (network-first with cache fallback) for same-origin GET
self.addEventListener('fetch', (event: any) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    fetch(req).then(resp => {
      const copy = resp.clone();
      caches.open('runtime-v1').then(cache => cache.put(req, copy)).catch(()=>{});
      return resp;
    }).catch(() => caches.match(req))
  );
});


