/**
 * دریافت فایل مدل با نمایش پیشرفت، و نگه‌داشتن آن در Cache Storage.
 *
 * چرا نه `modelAssetPath`؟ چون آن‌وقت خودِ MediaPipe فایل را می‌گیرد و ما هیچ
 * خبری از پیشرفت دانلود نداریم و کاربر فقط یک چرخ‌فلک می‌بیند. این‌جا خودمان
 * فایل را می‌گیریم، درصد را گزارش می‌کنیم، در حافظهٔ مرورگر ذخیره می‌کنیم و
 * بایت‌ها را مستقیم به `modelAssetBuffer` می‌دهیم. دفعهٔ بعد دیگر هیچ دانلودی
 * لازم نیست — که برای دموی زنده مهم‌ترین قسمت است.
 */
const CACHE_NAME = 'aynejan-models-v1'

async function openCache() {
  try {
    if (!('caches' in window)) return null
    return await caches.open(CACHE_NAME)
  } catch {
    return null
  }
}

/** نسخه‌های قدیمی کش را پاک می‌کند. */
export async function pruneOldCaches() {
  try {
    if (!('caches' in window)) return
    const keys = await caches.keys()
    await Promise.all(
      keys.filter((k) => k.startsWith('aynejan-models-') && k !== CACHE_NAME).map((k) => caches.delete(k))
    )
  } catch {
    /* بی‌اهمیت */
  }
}

/**
 * @param {string} url
 * @param {(ratio:number)=>void} [onProgress] عددی بین ۰ و ۱
 * @returns {Promise<Uint8Array>}
 */
export async function fetchModel(url, onProgress) {
  const cache = await openCache()
  if (cache) {
    const hit = await cache.match(url).catch(() => null)
    if (hit) {
      onProgress?.(1)
      return new Uint8Array(await hit.arrayBuffer())
    }
  }

  const res = await fetch(url)
  if (!res.ok) throw new Error(`model ${url} → ${res.status}`)

  // فایل‌های مدل فشرده سرو نمی‌شوند، پس content-length دقیق است.
  const total = Number(res.headers.get('content-length')) || 0
  let bytes

  if (res.body && total > 0) {
    const reader = res.body.getReader()
    const chunks = []
    let received = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.length
      onProgress?.(Math.min(0.999, received / total))
    }
    bytes = new Uint8Array(received)
    let at = 0
    for (const c of chunks) {
      bytes.set(c, at)
      at += c.length
    }
  } else {
    bytes = new Uint8Array(await res.arrayBuffer())
  }
  onProgress?.(1)

  if (cache) {
    try {
      await cache.put(
        url,
        new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } })
      )
    } catch {
      /* فضای کش پر است — مهم نیست، دفعهٔ بعد دوباره دانلود می‌شود */
    }
  }
  return bytes
}

/** آیا این مدل از قبل روی دستگاه هست؟ */
export async function isCached(url) {
  const cache = await openCache()
  if (!cache) return false
  return Boolean(await cache.match(url).catch(() => null))
}
