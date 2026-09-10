/**
 * راهنمای کادربندی.
 *
 * وقتی کاربر جای درستی نایستاده، به‌جای اینکه پوشش بی‌دلیل نیفتد، دقیقاً
 * گفته می‌شود چه کار کند. جمله‌ها کوتاه و محاوره‌ای‌اند و هر لحظه فقط یکی
 * نشان داده می‌شود — مهم‌ترینش.
 */
import { dist, clamp } from './geom'

/** نسبت‌های قابل قبولِ اندازهٔ سوژه در کادر. */
export const FRAMING = {
  face: { min: 0.18, center: 0.4 },
  hand: { min: 0.14 },
  body: { min: 0.16, max: 0.62 },
}

/** آیا نقطه بیرون از ناحیهٔ دیده‌شونده افتاده است؟ */
export function outOfView(p, frame, margin = 0.015) {
  const mx = frame.W * margin
  const my = frame.VH * margin
  return p.x < mx || p.x > frame.W - mx || p.y < my || p.y > frame.VH - my
}

/**
 * راهنمای چهره (رژ و لنز).
 *
 * «خیلی نزدیکی» را از بریده‌شدنِ واقعیِ صورت تشخیص می‌دهیم، نه از نسبت اندازه.
 * در یک اپ آرایشی کاربر عمداً صورتش را نزدیک می‌آورد؛ اگر همان‌جا بگوییم
 * عقب برو، آزاردهنده است. فقط وقتی چانه یا پیشانی یا گونه‌ها از کادر بیرون
 * زده‌اند گفته می‌شود عقب‌تر برود.
 *
 * @returns {string|null}
 */
export function faceHint(lm, frame, opts = {}) {
  const L = frame.map(lm[234]) // گونهٔ یک طرف
  const R = frame.map(lm[454]) // گونهٔ طرف دیگر
  const nose = frame.map(lm[1])
  const chin = frame.map(lm[152])
  const brow = frame.map(lm[10])

  const w = dist(L, R)
  const h = dist(brow, chin)
  const size = Math.max(w / frame.W, h / frame.VH)

  if (size < FRAMING.face.min) return 'یه‌کم بیا نزدیک‌تر'

  // صورت از کادر زده بیرون؟ آن‌وقت لبه‌ها دقیق درنمی‌آیند
  const clipped = [brow, chin, L, R].filter((p) => outOfView(p, frame)).length
  if (clipped >= 2) return 'یه‌کم عقب‌تر برو تا کل صورتت توی کادر بیاد'
  if (outOfView(chin, frame)) return 'کمی پایین‌تر رو نشون بده؛ چونه‌ات از کادر بیرونه'

  // چرخش سر: فاصلهٔ بینی تا دو گونه باید نزدیک به هم باشد
  const dl = Math.abs(nose.x - L.x)
  const dr = Math.abs(nose.x - R.x)
  const yaw = dl > 0 && dr > 0 ? Math.max(dl, dr) / Math.min(dl, dr) : 1
  if (yaw > 2.8) return 'کمی صاف‌تر به دوربین نگاه کن'

  // بیرون بودن از مرکز
  const cx = (L.x + R.x) / 2
  const cy = (brow.y + chin.y) / 2
  const offX = Math.abs(cx - frame.W / 2) / frame.W
  const offY = Math.abs(cy - frame.VH / 2) / frame.VH
  if (offX > FRAMING.face.center || offY > FRAMING.face.center)
    return 'صورتت رو بیار وسط کادر'

  if (opts.eyesClosed) return 'چشمات رو باز نگه دار'
  return null
}

/** راهنمای دست (ناخن). */
export function handHint(lm, frame, { backFacing }) {
  const wrist = frame.map(lm[0])
  const middleTip = frame.map(lm[12])
  const indexMcp = frame.map(lm[5])
  const pinkyMcp = frame.map(lm[17])

  const span = Math.max(dist(wrist, middleTip), dist(indexMcp, pinkyMcp) * 2.2)
  const size = span / Math.max(frame.W, frame.VH)

  if (size < FRAMING.hand.min) return 'دستت رو نزدیک‌تر بیار'
  if (!backFacing) return 'پشت دستت رو رو به دوربین بگیر'

  const tips = [4, 8, 12, 16, 20].map((i) => frame.map(lm[i]))
  if (tips.filter((p) => outOfView(p, frame, 0.005)).length >= 2)
    return 'کل دستت رو بیار توی کادر'

  return null
}

/** راهنمای بدن (لباس). */
export function bodyHint(lm, frame, P) {
  const vis = (i) => lm[i]?.visibility ?? 1
  const inFrame = (i) => lm[i] && lm[i].y < 0.985 && lm[i].y > -0.02

  const shouldersOk =
    vis(P.LEFT_SHOULDER) > 0.5 && vis(P.RIGHT_SHOULDER) > 0.5
  if (!shouldersOk) return 'کمی عقب‌تر برو تا شونه‌هات دیده بشه'

  const LS = frame.map(lm[P.LEFT_SHOULDER])
  const RS = frame.map(lm[P.RIGHT_SHOULDER])
  const shoulderW = dist(LS, RS)

  const hipsOk =
    vis(P.LEFT_HIP) > 0.5 &&
    vis(P.RIGHT_HIP) > 0.5 &&
    inFrame(P.LEFT_HIP) &&
    inFrame(P.RIGHT_HIP)
  if (!hipsOk) return 'کمی عقب‌تر برو تا کمرت هم توی کادر بیاد'

  const LH = frame.map(lm[P.LEFT_HIP])
  const RH = frame.map(lm[P.RIGHT_HIP])
  const torso = dist(
    { x: (LS.x + RS.x) / 2, y: (LS.y + RS.y) / 2 },
    { x: (LH.x + RH.x) / 2, y: (LH.y + RH.y) / 2 }
  )

  const size = shoulderW / frame.W
  if (size > FRAMING.body.max) return 'یه‌کم عقب‌تر برو'
  if (size < FRAMING.body.min) return 'یه‌کم بیا جلوتر'

  // اگر بدن نیم‌رخ باشد، شانه‌ها نسبت به طول تنه باریک دیده می‌شوند
  if (torso > 0 && shoulderW / torso < 0.62) return 'روبه‌روی دوربین بایست'

  return null
}

/** میانگین روشنایی یک کادر کوچک — برای هشدار نور کم. */
export function meanLuma(ctx, canvas, sampler) {
  const s = sampler
  const w = s.width
  const h = s.height
  const sctx = s.getContext('2d', { willReadFrequently: true })
  sctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, w, h)
  const { data } = sctx.getImageData(0, 0, w, h)
  let sum = 0
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
  }
  return clamp(sum / (data.length / 4) / 255, 0, 1)
}
