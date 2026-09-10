/** ابزار هندسی مشترک رندررها. همهٔ مختصات در فضای پیکسل بوم‌اند. */

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
export const lerp = (a, b, t) => a + (b - a) * t
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)
export const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

/**
 * مسیر بستهٔ نرم از روی نقاط، با Catmull-Rom تبدیل‌شده به بزیه مکعبی.
 * `tension` کوچک‌تر = منحنی نرم‌تر.
 */
export function closedSpline(ctx, pts, tension = 0.5) {
  const n = pts.length
  if (n < 3) return
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    ctx.bezierCurveTo(
      p1.x + ((p2.x - p0.x) * tension) / 6,
      p1.y + ((p2.y - p0.y) * tension) / 6,
      p2.x - ((p3.x - p1.x) * tension) / 6,
      p2.y - ((p3.y - p1.y) * tension) / 6,
      p2.x,
      p2.y
    )
  }
  ctx.closePath()
}

/** مرکز ثقل مجموعه‌ای از نقاط. */
export function centroid(pts) {
  let x = 0
  let y = 0
  for (const p of pts) {
    x += p.x
    y += p.y
  }
  return { x: x / pts.length, y: y / pts.length }
}

/** کادر دربرگیرنده با حاشیه. */
export function bbox(pts, pad = 0) {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const p of pts) {
    if (p.x < x0) x0 = p.x
    if (p.y < y0) y0 = p.y
    if (p.x > x1) x1 = p.x
    if (p.y > y1) y1 = p.y
  }
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 }
}

/** نقاط را حول مرکزشان به اندازهٔ k بزرگ می‌کند (برای پهن‌کردن ماسک). */
export function scaleAbout(pts, k, c = centroid(pts)) {
  return pts.map((p) => ({ x: c.x + (p.x - c.x) * k, y: c.y + (p.y - c.y) * k }))
}

/* ------------------------------------------------------------------ رنگ */

export function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export const rgba = (hex, a) => {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

/** روشنایی نسبی (sRGB) — برای تنظیم شدت ترکیب رنگ روی لب. */
export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex)
  const f = (v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** نسخهٔ روشن‌تر یا تیره‌تر همان رنگ. k>1 روشن، k<1 تیره. */
export function shade(hex, k) {
  const { r, g, b } = hexToRgb(hex)
  const f = (v) =>
    clamp(Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1)), 0, 255)
  return `rgb(${f(r)},${f(g)},${f(b)})`
}

/** بوم خارج از صفحه با اندازهٔ دلخواه (برای ماسک و بافت). */
export function offscreen(w, h) {
  const c =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(Math.max(1, w | 0), Math.max(1, h | 0))
      : Object.assign(document.createElement('canvas'), {
          width: Math.max(1, w | 0),
          height: Math.max(1, h | 0),
        })
  return c
}
