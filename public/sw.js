/*
 * سرویس‌ورکر آینه‌جان.
 *
 * هدف: بعد از اولین باز شدن، اپ حتی با اینترنت بد یا قطع هم فوری بالا بیاید.
 * برای یک دموی زنده این مهم‌ترین بیمه‌نامه است.
 *
 *  • هنگام نصب: موتور wasm و مدل چهره (پرمصرف‌ترین مسیر) از قبل کش می‌شوند.
 *  • فایل‌های سنگین `/mediapipe/` و دارایی‌های هش‌دار `/assets/` اول از کش.
 *  • خودِ صفحه (navigation) اول از شبکه، و اگر شبکه نبود از کش — پس انتشار
 *    تازه همیشه دیده می‌شود و آفلاین بودن هم اپ را نمی‌خواباند.
 *
 * `__BUILD__` هنگام انتشار با مهر زمانیِ همان نسخه جایگزین می‌شود، پس هر
 * انتشار کش خودش را دارد و کش‌های قدیمی پاک می‌شوند.
 */
const VERSION = '__BUILD__'
const SHELL = `aynejan-shell-${VERSION}`
const HEAVY = `aynejan-heavy-${VERSION}`

// مسیرهای ثابت و سنگینی که ارزش دارد از همان اول کش شوند
const PRECACHE = [
  '/mediapipe/wasm/vision_wasm_internal.js',
  '/mediapipe/wasm/vision_wasm_internal.wasm',
  '/mediapipe/models/face_landmarker.task',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(HEAVY)
      // اگر یکی از فایل‌ها نیامد، نصب نباید شکست بخورد
      await Promise.allSettled(PRECACHE.map((u) => cache.add(new Request(u, { cache: 'reload' }))))
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => k.startsWith('aynejan-') && k !== SHELL && k !== HEAVY)
          .map((k) => caches.delete(k))
      )
      await self.clients.claim()
    })()
  )
})

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  if (hit) return hit
  const res = await fetch(request)
  if (res.ok && res.status === 200) cache.put(request, res.clone())
  return res
}

async function networkFirst(request, cacheName, fallbackPath) {
  const cache = await caches.open(cacheName)
  try {
    const res = await fetch(request)
    if (res.ok) cache.put(request, res.clone())
    return res
  } catch (err) {
    const hit = (await cache.match(request)) || (fallbackPath && (await cache.match(fallbackPath)))
    if (hit) return hit
    throw err
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  const network = fetch(request)
    .then((res) => {
      if (res.ok && res.status === 200) cache.put(request, res.clone())
      return res
    })
    .catch(() => null)
  return hit || (await network) || fetch(request)
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/mediapipe/')) {
    event.respondWith(cacheFirst(request, HEAVY))
    return
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, SHELL))
    return
  }
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL, '/index.html'))
    return
  }
  event.respondWith(staleWhileRevalidate(request, SHELL))
})
