const SHELL_CACHE = 'nevolium-shell-v4-connected'
const SHELL_ASSETS = [
  '/',
  '/popout.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/nevolium.svg',
  '/icons/nevolium-192.png',
  '/icons/nevolium-512.png',
  '/icons/nevolium-maskable-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/v1/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(request)) || caches.match('/offline.html')),
    )
    return
  }

  if (!['script', 'style', 'font', 'image', 'manifest'].includes(request.destination)) return
  event.respondWith(
    caches.match(request).then((cached) => {
      const refresh = fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          void caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
      return cached || refresh
    }),
  )
})
