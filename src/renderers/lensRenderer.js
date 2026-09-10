import { loadFaceLandmarker } from '@/lib/mediapipe'
import { LandmarkFilter } from '@/lib/oneEuro'
import {
  EYE_LEFT,
  EYE_RIGHT,
  IRIS_LEFT,
  IRIS_RIGHT,
  EYE_OPEN_PROBE,
  FACE_WITH_IRIS,
} from '@/lib/landmarks'
import {
  closedSpline,
  centroid,
  dist,
  bbox,
  offscreen,
  hexToRgb,
} from '@/lib/geom'

/* --------------------------------------------------------------- تنظیم‌ها */
const TEX = 256 // اندازهٔ بافت procedural لنز
const PUPIL = 0.4 // شعاع مردمک نسبت به شعاع عنبیه — این ناحیه شفاف می‌ماند
const LIMBAL = 0.88 // شروع حلقهٔ تیرهٔ لبهٔ عنبیه
const IRIS_GROW = 1.03 // لنز واقعی کمی از عنبیه بزرگ‌تر است
const EYE_SHRINK = 0.97 // کمی جمع‌کردن کانتور پلک تا روی مژه نیفتد
const CLOSED_RATIO = 0.1 // پایین‌تر از این نسبت، چشم بسته حساب می‌شود

const OPACITY = 0.9 // پوشش رنگ لنز
const LUMINOSITY_BACK = 0.4 // برگرداندن سایه‌روشن واقعی چشم
const SPECULAR_BACK = 0.18 // برگرداندن برقِ چشم (catchlight)

/** بافت لنز: الیاف شعاعی + حلقهٔ لیمبال تیره + مردمک شفاف. */
function buildTexture(item) {
  const c = offscreen(TEX, TEX)
  const g = c.getContext('2d')
  const R = TEX / 2
  const cx = R
  const cy = R
  g.clearRect(0, 0, TEX, TEX)

  // ۱) پایهٔ رنگی: مرکز روشن‌تر، لبه تیره‌تر
  const base = g.createRadialGradient(cx, cy, R * PUPIL * 0.8, cx, cy, R)
  const rgb = hexToRgb(item.hex)
  const lighten = (k) =>
    `rgb(${Math.round(rgb.r + (255 - rgb.r) * k)},${Math.round(
      rgb.g + (255 - rgb.g) * k
    )},${Math.round(rgb.b + (255 - rgb.b) * k)})`
  const darken = (k) =>
    `rgb(${Math.round(rgb.r * k)},${Math.round(rgb.g * k)},${Math.round(rgb.b * k)})`
  base.addColorStop(0, lighten(0.16))
  base.addColorStop(0.45, item.hex)
  base.addColorStop(0.82, darken(0.7))
  base.addColorStop(1, darken(0.42))
  g.fillStyle = base
  g.beginPath()
  g.arc(cx, cy, R, 0, Math.PI * 2)
  g.fill()

  // ۲) الیاف شعاعی — همان بافت ریز عنبیهٔ واقعی
  const fib = hexToRgb(item.fiber)
  const rng = hexToRgb(item.ring)
  g.save()
  g.lineCap = 'round'
  const fibers = 130
  for (let i = 0; i < fibers; i++) {
    const a = (i / fibers) * Math.PI * 2 + Math.random() * 0.02
    const inner = R * (PUPIL + 0.03 + Math.random() * 0.1)
    const outer = R * (LIMBAL - Math.random() * 0.22)
    const light = Math.random()
    g.strokeStyle =
      light > 0.55
        ? `rgba(${fib.r},${fib.g},${fib.b},${0.2 + Math.random() * 0.5})`
        : `rgba(${rng.r},${rng.g},${rng.b},${0.16 + Math.random() * 0.45})`
    g.lineWidth = 1.6 + Math.random() * 3.4
    g.beginPath()
    g.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner)
    const bend = (Math.random() - 0.5) * 0.09
    g.quadraticCurveTo(
      cx + Math.cos(a + bend) * (inner + outer) * 0.5,
      cy + Math.sin(a + bend) * (inner + outer) * 0.5,
      cx + Math.cos(a + bend * 1.6) * outer,
      cy + Math.sin(a + bend * 1.6) * outer
    )
    g.stroke()
  }
  g.restore()

  // ۳) هالهٔ روشن دور مردمک
  const halo = g.createRadialGradient(cx, cy, R * PUPIL, cx, cy, R * (PUPIL + 0.22))
  halo.addColorStop(0, `rgba(255,255,255,0.14)`)
  halo.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = halo
  g.beginPath()
  g.arc(cx, cy, R, 0, Math.PI * 2)
  g.fill()

  // ۴) حلقهٔ لیمبال تیره
  const ring = g.createRadialGradient(cx, cy, R * LIMBAL * 0.78, cx, cy, R)
  ring.addColorStop(0, 'rgba(0,0,0,0)')
  ring.addColorStop(0.5, `rgba(${rng.r},${rng.g},${rng.b},0.85)`)
  ring.addColorStop(1, `rgba(${rng.r},${rng.g},${rng.b},1)`)
  g.fillStyle = ring
  g.beginPath()
  g.arc(cx, cy, R, 0, Math.PI * 2)
  g.fill()

  // ۵) مردمک شفاف می‌ماند و لبهٔ بیرونی نرم محو می‌شود
  g.globalCompositeOperation = 'destination-out'
  const hole = g.createRadialGradient(cx, cy, R * (PUPIL - 0.06), cx, cy, R * (PUPIL + 0.04))
  hole.addColorStop(0, 'rgba(0,0,0,1)')
  hole.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = hole
  g.beginPath()
  g.arc(cx, cy, R * (PUPIL + 0.05), 0, Math.PI * 2)
  g.fill()

  const edge = g.createRadialGradient(cx, cy, R * 0.94, cx, cy, R)
  edge.addColorStop(0, 'rgba(0,0,0,0)')
  edge.addColorStop(1, 'rgba(0,0,0,1)')
  g.fillStyle = edge
  g.beginPath()
  g.arc(cx, cy, R, 0, Math.PI * 2)
  g.fill()
  g.globalCompositeOperation = 'source-over'

  return c
}

/** ماسک دیسک نرم، هم‌اندازهٔ بافت — برای برگرداندن آلفا بعد از پاس‌های ترکیبی. */
function buildDisc() {
  const c = offscreen(TEX, TEX)
  const g = c.getContext('2d')
  const R = TEX / 2
  const grad = g.createRadialGradient(R, R, R * 0.9, R, R, R)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.beginPath()
  g.arc(R, R, R, 0, Math.PI * 2)
  g.fill()
  return c
}

export function createLensRenderer() {
  let model = null
  const filter = new LandmarkFilter({ minCutOff: 1.1, beta: 0.06 })
  const textures = new Map()
  let disc = null
  let workC = offscreen(2, 2)
  let snapC = offscreen(2, 2)

  const fit = (c, w, h) => {
    if (c.width < w || c.height < h) {
      c.width = Math.ceil(w)
      c.height = Math.ceil(h)
    }
    return c.getContext('2d')
  }

  const textureFor = (item) => {
    if (!textures.has(item.id)) textures.set(item.id, buildTexture(item))
    return textures.get(item.id)
  }

  /** چشم را رسم می‌کند؛ اگر بسته باشد چیزی نمی‌کشد. */
  function drawEye(ctx, lm, frame, tex, eyeIdx, irisIdx, probe, alpha) {
    const lid = eyeIdx.map((i) => frame.map(lm[i]))
    const iris = irisIdx.map((i) => frame.map(lm[i]))

    const top = frame.map(lm[probe.top])
    const bottom = frame.map(lm[probe.bottom])
    const inner = frame.map(lm[probe.inner])
    const outer = frame.map(lm[probe.outer])
    const width = dist(inner, outer)
    if (!(width > 6)) return
    const open = dist(top, bottom) / width
    if (open < CLOSED_RATIO) return // پلک زده — لنز نباید دیده شود

    const c = centroid(iris)
    let r = 0
    for (const p of iris) r += dist(p, c)
    r = (r / iris.length) * IRIS_GROW
    if (!(r > 2)) return

    // جمع‌کردن کانتور پلک حول مرکز خودش
    const lidC = centroid(lid)
    const clipPts = lid.map((p) => ({
      x: lidC.x + (p.x - lidC.x) * EYE_SHRINK,
      y: lidC.y + (p.y - lidC.y) * EYE_SHRINK,
    }))

    const box = bbox([...clipPts, { x: c.x - r, y: c.y - r }, { x: c.x + r, y: c.y + r }], 2)
    const w = Math.ceil(box.w)
    const h = Math.ceil(box.h)
    if (w < 2 || h < 2) return

    // عکس فوری از خودِ فریم زیر چشم (برای برگرداندن سایه‌روشن و برقِ چشم)
    const sc = fit(snapC, w, h)
    sc.clearRect(0, 0, w, h)
    sc.drawImage(ctx.canvas, box.x, box.y, w, h, 0, 0, w, h)

    const wc = fit(workC, w, h)
    wc.save()
    wc.clearRect(0, 0, w, h)
    const dx = c.x - box.x - r
    const dy = c.y - box.y - r
    wc.drawImage(tex, dx, dy, r * 2, r * 2)

    // سایه‌روشن واقعی چشم برمی‌گردد
    wc.globalCompositeOperation = 'luminosity'
    wc.globalAlpha = LUMINOSITY_BACK
    wc.drawImage(snapC, 0, 0, w, h, 0, 0, w, h)

    // برقِ چشم از روی همان تصویر واقعی
    wc.globalCompositeOperation = 'screen'
    wc.globalAlpha = SPECULAR_BACK
    wc.drawImage(snapC, 0, 0, w, h, 0, 0, w, h)

    // آلفا دوباره به شکل دیسک عنبیه محدود می‌شود
    wc.globalCompositeOperation = 'destination-in'
    wc.globalAlpha = 1
    wc.drawImage(disc, dx, dy, r * 2, r * 2)
    wc.restore()

    ctx.save()
    ctx.beginPath()
    closedSpline(ctx, clipPts, 0.5)
    ctx.clip()
    ctx.globalAlpha = OPACITY * alpha
    ctx.drawImage(workC, 0, 0, w, h, box.x, box.y, w, h)
    ctx.restore()
  }

  return {
    id: 'lens',
    needs: 'face',

    async init(onProgress) {
      model = await loadFaceLandmarker(onProgress)
      if (!disc) disc = buildDisc()
    },

    reset() {
      filter.reset()
    },

    detect(video, ts) {
      if (!model) return null
      const res = model.detectForVideo(video, ts)
      const lm = res?.faceLandmarks?.[0]
      if (!lm || lm.length < FACE_WITH_IRIS) return null
      return { landmarks: filter.apply(lm, ts) }
    },

    hint(result, frame) {
      if (!result) return 'صورتت رو وسط کادر بیار و مستقیم نگاه کن'
      const lm = result.landmarks
      const w = dist(frame.map(lm[33]), frame.map(lm[263]))
      if (w < frame.W * 0.16) return 'یه‌کم به دوربین نزدیک‌تر شو'
      return null
    },

    draw(ctx, result, item, frame) {
      if (!result || !item) return
      const tex = textureFor(item)
      const lm = result.landmarks
      drawEye(ctx, lm, frame, tex, EYE_RIGHT, IRIS_RIGHT, EYE_OPEN_PROBE.right, frame.alpha)
      drawEye(ctx, lm, frame, tex, EYE_LEFT, IRIS_LEFT, EYE_OPEN_PROBE.left, frame.alpha)
    },

    drawDebug(ctx, result, frame) {
      if (!result) return
      const lm = result.landmarks
      ctx.save()
      ctx.font = '10px monospace'
      const paint = (idxs, color, close = true) => {
        const pts = idxs.map((i) => frame.map(lm[i]))
        ctx.strokeStyle = color
        ctx.fillStyle = color
        ctx.lineWidth = 1.4
        if (close) {
          ctx.beginPath()
          closedSpline(ctx, pts, 0.5)
          ctx.stroke()
        }
        pts.forEach((p, k) => {
          ctx.beginPath()
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillText(String(idxs[k]), p.x + 3, p.y - 3)
        })
      }
      paint(EYE_RIGHT, '#2E9C93')
      paint(EYE_LEFT, '#2E9C93')
      paint(IRIS_RIGHT, '#E8A33D')
      paint(IRIS_LEFT, '#E8A33D')
      for (const [iris, probe] of [
        [IRIS_RIGHT, EYE_OPEN_PROBE.right],
        [IRIS_LEFT, EYE_OPEN_PROBE.left],
      ]) {
        const pts = iris.map((i) => frame.map(lm[i]))
        const c = centroid(pts)
        let r = 0
        for (const p of pts) r += dist(p, c)
        r /= pts.length
        ctx.strokeStyle = '#B4234C'
        ctx.beginPath()
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2)
        ctx.stroke()
        const open = (
          dist(frame.map(lm[probe.top]), frame.map(lm[probe.bottom])) /
          Math.max(1, dist(frame.map(lm[probe.inner]), frame.map(lm[probe.outer])))
        ).toFixed(2)
        ctx.fillStyle = '#F7E9EC'
        ctx.fillText(open, c.x - 10, c.y - r - 6)
      }
      ctx.restore()
    },
  }
}
