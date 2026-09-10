/**
 * کاغذرنگیِ سبک، نوشته‌شده برای همین پروژه.
 *
 * هیچ کتابخانه‌ای از بیرون نمی‌آید (قاعدهٔ «هیچ درخواستی به بیرون» شامل
 * کتابخانه‌ها هم می‌شود). هر تکه یک مستطیل کوچک است که می‌چرخد و می‌افتد؛
 * تعداد تکه‌ها روی موبایل کمتر گرفته می‌شود تا نرخ فریم نیفتد.
 */
const REDUCED = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{colors?: string[], duration?: number, count?: number}} [opts]
 * @returns {() => void} تابع توقف
 */
export function burstConfetti(canvas, opts = {}) {
  if (!canvas) return () => {}
  const colors = opts.colors?.length ? opts.colors : ['#B4234C', '#E8A33D', '#F7E9EC']
  const duration = opts.duration ?? 3200

  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const rect = canvas.getBoundingClientRect()
  const W = Math.max(1, Math.round(rect.width))
  const H = Math.max(1, Math.round(rect.height))
  canvas.width = Math.round(W * dpr)
  canvas.height = Math.round(H * dpr)
  ctx.scale(dpr, dpr)

  // اگر کاربر حرکت کمتر خواسته، فقط یک بار تکه‌ها را ثابت می‌کشیم
  const still = REDUCED()
  const count = opts.count ?? (W < 420 ? 70 : 110)

  const pieces = Array.from({ length: count }, () => {
    const fromLeft = Math.random() < 0.5
    return {
      x: fromLeft ? W * 0.08 + Math.random() * W * 0.2 : W * 0.72 + Math.random() * W * 0.2,
      y: H * (0.42 + Math.random() * 0.14),
      vx: (fromLeft ? 1 : -1) * (1.4 + Math.random() * 3.4),
      vy: -(5 + Math.random() * 6),
      w: 5 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.34,
      color: colors[(Math.random() * colors.length) | 0],
      wobble: Math.random() * Math.PI * 2,
      round: Math.random() < 0.28,
    }
  })

  let raf = 0
  let start = 0
  let stopped = false

  const drawPiece = (p, alpha) => {
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)
    ctx.fillStyle = p.color
    if (p.round) {
      ctx.beginPath()
      ctx.ellipse(0, 0, p.w * 0.5, p.w * 0.5, 0, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // پهنای متغیر، مثل تکه‌کاغذی که در هوا می‌چرخد
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w * Math.abs(Math.cos(p.wobble)) + 1.5, p.h)
    }
    ctx.restore()
  }

  if (still) {
    ctx.clearRect(0, 0, W, H)
    for (const p of pieces) {
      p.y = H * (0.2 + Math.random() * 0.5)
      p.x = W * (0.06 + Math.random() * 0.88)
      drawPiece(p, 0.85)
    }
    return () => ctx.clearRect(0, 0, W, H)
  }

  const frame = (ts) => {
    if (stopped) return
    if (!start) start = ts
    const t = ts - start
    if (t > duration) {
      ctx.clearRect(0, 0, W, H)
      return
    }
    const fade = t > duration - 700 ? Math.max(0, (duration - t) / 700) : 1

    ctx.clearRect(0, 0, W, H)
    for (const p of pieces) {
      p.vy += 0.28 // جاذبه
      p.vx *= 0.995
      p.wobble += 0.12
      p.x += p.vx + Math.sin(p.wobble) * 0.6
      p.y += p.vy
      p.rot += p.vr
      if (p.y < H + 30) drawPiece(p, fade)
    }
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)

  return () => {
    stopped = true
    cancelAnimationFrame(raf)
    ctx.clearRect(0, 0, W, H)
  }
}
