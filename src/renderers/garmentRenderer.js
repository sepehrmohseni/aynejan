import { loadPoseLandmarker, loadSegmenter } from '@/lib/mediapipe'
import { LandmarkFilter } from '@/lib/oneEuro'
import { POSE } from '@/lib/landmarks'
import { bodyHint } from '@/lib/coach'
import { dist, offscreen, clamp } from '@/lib/geom'

/**
 * لباس — پوشش دوبعدی، نه شبیه‌سازی فیزیکی پارچه.
 *
 * تصویر وکتور لباس با یک تبدیل هموگرافی (چهار نقطه) روی چهارضلعیِ
 * شانه‌ها و لگنِ کاربر می‌نشیند، پس با پهنای شانه، طول تنه و کجیِ بدن
 * می‌چرخد و کشیده می‌شود. تصویر به شبکه‌ای از مثلث‌ها بریده می‌شود تا
 * هموگرافی با تبدیل‌های افاین هر مثلث تقریب زده شود (بوم خودش تبدیل
 * پرسپکتیو ندارد).
 *
 * جلوآمدنِ سر و ساعد با ماسک قطعه‌بندی سلفی انجام می‌شود: پیکسل‌های مو و
 * پوستِ صورت همیشه جلوی لباس‌اند، و پوستِ بدن هرجا بیرون از چهارضلعی تنه
 * یا داخل نوارِ ساعد باشد هم جلو می‌آید.
 */

/* --------------------------------------------------------------- تنظیم‌ها */
const SHOULDER_W = 1.18 // درز شانهٔ لباس از مفصل شانه بیرون‌تر است
const SHOULDER_LIFT = 0.07 // و کمی بالاتر، نسبت به طول تنه
const HIP_W = 1.12
const GRID_X = 7 // ستون‌های شبکهٔ وارپ
const GRID_Y = 9 // سطرهای شبکهٔ وارپ
const MIN_VIS = 0.5 // کمترین اطمینان دیده‌شدن شانه و لگن
// لگن باید واقعاً داخل کادر باشد؛ مدل نقاط بیرون از کادر را هم حدس می‌زند و
// اگر به آن اعتماد کنیم طول تنه بی‌اندازه بزرگ می‌شود.
const IN_FRAME = 0.985
const ARM_STRIP = 0.16 // ضخامت نوار ساعد نسبت به طول تنه
const SEG_EVERY = 2 // قطعه‌بندی هر چند فریم یک‌بار


const imageCache = new Map()
function loadGarmentImage(item) {
  if (!imageCache.has(item.id)) {
    const img = new Image()
    const p = new Promise((resolve, reject) => {
      img.onload = () => resolve(img)
      img.onerror = reject
    })
    img.src = item.src
    imageCache.set(item.id, { img, ready: p.then(() => true).catch(() => false), ok: false })
    p.then(() => {
      imageCache.get(item.id).ok = true
    }).catch(() => {})
  }
  return imageCache.get(item.id)
}

/** هموگرافی از چهار نقطهٔ مبدأ به چهار نقطهٔ مقصد (DLT با حذف گاوسی). */
function homography(src, dst) {
  const A = []
  const b = []
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i]
    const { x: u, y: v } = dst[i]
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y])
    b.push(u)
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y])
    b.push(v)
  }
  // حذف گاوسی با محورگیری جزئی
  for (let i = 0; i < 8; i++) {
    let piv = i
    for (let r = i + 1; r < 8; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r
    if (Math.abs(A[piv][i]) < 1e-9) return null
    ;[A[i], A[piv]] = [A[piv], A[i]]
    ;[b[i], b[piv]] = [b[piv], b[i]]
    for (let r = 0; r < 8; r++) {
      if (r === i) continue
      const f = A[r][i] / A[i][i]
      if (!f) continue
      for (let c = i; c < 8; c++) A[r][c] -= f * A[i][c]
      b[r] -= f * b[i]
    }
  }
  const h = b.map((v, i) => v / A[i][i])
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1]
}

const applyH = (H, x, y) => {
  const w = H[6] * x + H[7] * y + H[8]
  return { x: (H[0] * x + H[1] * y + H[2]) / w, y: (H[3] * x + H[4] * y + H[5]) / w }
}

/** یک مثلث از تصویر را با تبدیل افاین روی مثلث مقصد می‌کشد. */
function drawTriangle(ctx, img, s0, s1, s2, d0, d1, d2, bleed) {
  const den = (s1.x - s0.x) * (s2.y - s0.y) - (s2.x - s0.x) * (s1.y - s0.y)
  if (Math.abs(den) < 1e-6) return
  const a = ((d1.x - d0.x) * (s2.y - s0.y) - (d2.x - d0.x) * (s1.y - s0.y)) / den
  const b = ((d2.x - d0.x) * (s1.x - s0.x) - (d1.x - d0.x) * (s2.x - s0.x)) / den
  const c = ((d1.y - d0.y) * (s2.y - s0.y) - (d2.y - d0.y) * (s1.y - s0.y)) / den
  const d = ((d2.y - d0.y) * (s1.x - s0.x) - (d1.y - d0.y) * (s2.x - s0.x)) / den
  const e = d0.x - a * s0.x - b * s0.y
  const f = d0.y - c * s0.x - d * s0.y

  ctx.save()
  ctx.beginPath()
  // مثلث مقصد کمی بزرگ می‌شود تا بین خانه‌ها درز نیفتد
  const cx = (d0.x + d1.x + d2.x) / 3
  const cy = (d0.y + d1.y + d2.y) / 3
  const grow = (p) => ({ x: cx + (p.x - cx) * bleed, y: cy + (p.y - cy) * bleed })
  const g0 = grow(d0)
  const g1 = grow(d1)
  const g2 = grow(d2)
  ctx.moveTo(g0.x, g0.y)
  ctx.lineTo(g1.x, g1.y)
  ctx.lineTo(g2.x, g2.y)
  ctx.closePath()
  ctx.clip()
  ctx.transform(a, c, b, d, e, f)
  ctx.drawImage(img, 0, 0)
  ctx.restore()
}

export function createGarmentRenderer() {
  let pose = null
  let segmenter = null
  const filter = new LandmarkFilter({ minCutOff: 0.9, beta: 0.05 })
  let frameCount = 0
  let lastStencil = null // بوم استنسیل در وضوح ماسک
  let bodyC = offscreen(2, 2)
  let occC = offscreen(2, 2)
  let warpC = offscreen(2, 2)

  const fit = (c, w, h) => {
    if (c.width !== w || c.height !== h) {
      c.width = Math.max(1, Math.ceil(w))
      c.height = Math.max(1, Math.ceil(h))
    }
    return c.getContext('2d')
  }

  /**
   * استنسیلِ «چه چیزی جلوی لباس بماند».
   *
   * مدل قطعه‌بندی سلفی فقط «شخص» را از پس‌زمینه جدا می‌کند. برای اینکه فقط سر و
   * ساعد جلوی لباس بیایند (نه کل بدن)، ماسکِ شخص با هندسه محدود می‌شود:
   * هرچه بالای خط شانه است، به‌علاوهٔ نوارِ آرنج تا مچ.
   *
   * کدام عدد در ماسک به معنای «شخص» است در فایل مدل تضمین‌شده نیست، پس با
   * نمونه‌گیری از محل بینی تعیین می‌شود.
   */
  function buildStencil(mask, noseN, shoulderYN, armsN) {
    const mw = mask.width
    const mh = mask.height
    const data = mask.getAsUint8Array()

    // دستهٔ «شخص» را از روی بینی می‌خوانیم (میانگین یک پنجرهٔ کوچک)
    const nx = Math.round(clamp(noseN.x, 0, 0.999) * mw)
    const ny = Math.round(clamp(noseN.y, 0, 0.999) * mh)
    const votes = new Map()
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = clamp(nx + dx, 0, mw - 1)
        const y = clamp(ny + dy, 0, mh - 1)
        const v = data[y * mw + x]
        votes.set(v, (votes.get(v) ?? 0) + 1)
      }
    }
    let person = 0
    let best = -1
    for (const [v, c] of votes) if (c > best) ((best = c), (person = v))

    const img = new ImageData(mw, mh)
    for (let i = 0, p = 0; i < data.length; i++, p += 4) {
      if (data[i] === person) {
        img.data[p] = 255
        img.data[p + 1] = 255
        img.data[p + 2] = 255
        img.data[p + 3] = 255
      }
    }

    const bc = fit(bodyC, mw, mh)
    bc.putImageData(img, 0, 0)
    bc.globalCompositeOperation = 'destination-in'
    bc.fillStyle = '#fff'
    bc.strokeStyle = '#fff'
    bc.lineCap = 'round'
    bc.fillRect(0, 0, mw, Math.max(0, shoulderYN * mh)) // سر و گردن
    for (const seg of armsN) {
      bc.lineWidth = seg.w * mh
      bc.beginPath()
      bc.moveTo(seg.a.x * mw, seg.a.y * mh)
      bc.lineTo(seg.b.x * mw, seg.b.y * mh)
      bc.stroke()
    }
    bc.globalCompositeOperation = 'source-over'

    lastStencil = { canvas: bodyC, w: mw, h: mh }
    return lastStencil
  }

  return {
    id: 'garment',
    needs: 'pose',

    async init(onProgress) {
      /* هر دو مدل هم‌زمان گرفته می‌شوند، نه پشت سر هم — لباس تنها دسته‌ای است
         که دو مدل لازم دارد و پشت‌سرهم گرفتنشان انتظار را دو برابر می‌کرد. */
      const posePromise = loadPoseLandmarker(onProgress)
      const segPromise = loadSegmenter().catch((err) => {
        // بدون قطعه‌بندی هم کار می‌کند، فقط سر جلوی لباس نمی‌آید
        console.warn('[aynejan] segmenter unavailable', err)
        return null
      })
      const [p, seg] = await Promise.all([posePromise, segPromise])
      pose = p
      segmenter = seg
    },

    reset() {
      filter.reset()
      lastStencil = null
      frameCount = 0
    },

    detect(video, ts) {
      if (!pose) return null
      const res = pose.detectForVideo(video, ts)
      const lm = res?.landmarks?.[0]
      if (!lm) return null
      const smoothed = filter.apply(lm, ts)

      /* قطعه‌بندی هر چند فریم یک‌بار اجرا می‌شود و همان‌جا به استنسیل تبدیل
         و بسته می‌شود، تا حافظهٔ ماسک هیچ‌وقت نشت نکند. */
      frameCount++
      if (segmenter && frameCount % SEG_EVERY === 0) {
        const out = segmenter.segmentForVideo(video, ts)
        try {
          if (out?.categoryMask) {
            const vis = (i) => smoothed[i]?.visibility ?? 1
            const n = (i) => ({ x: smoothed[i].x, y: smoothed[i].y })
            // پایین‌ترین شانه، کمی بالاتر، مرز «گردن به بالا» است
            const shoulderYN =
              Math.max(n(POSE.LEFT_SHOULDER).y, n(POSE.RIGHT_SHOULDER).y) - 0.01
            const armsN = []
            for (const [e, w] of [
              [POSE.LEFT_ELBOW, POSE.LEFT_WRIST],
              [POSE.RIGHT_ELBOW, POSE.RIGHT_WRIST],
            ]) {
              if (vis(e) > MIN_VIS && vis(w) > MIN_VIS)
                armsN.push({ a: n(e), b: n(w), w: ARM_STRIP })
            }
            buildStencil(out.categoryMask, n(POSE.NOSE), shoulderYN, armsN)
          }
        } catch (err) {
          console.warn('[aynejan] stencil failed', err)
        } finally {
          out?.close?.()
        }
      }

      return { landmarks: smoothed }
    },

    hint(result, frame) {
      if (!result) return 'کمی عقب‌تر برو تا شونه‌هات دیده بشه'
      return bodyHint(result.landmarks, frame, POSE)
    },

    draw(ctx, result, item, frame) {
      if (!result || !item) return
      const entry = loadGarmentImage(item)
      if (!entry.ok) return
      const img = entry.img
      const lm = result.landmarks

      const vis = (i) => lm[i]?.visibility ?? 1
      const needed = [POSE.LEFT_SHOULDER, POSE.RIGHT_SHOULDER, POSE.LEFT_HIP, POSE.RIGHT_HIP]
      if (needed.some((i) => vis(i) < MIN_VIS)) return
      if (lm[POSE.LEFT_HIP].y > IN_FRAME || lm[POSE.RIGHT_HIP].y > IN_FRAME) return

      const LS = frame.map(lm[POSE.LEFT_SHOULDER])
      const RS = frame.map(lm[POSE.RIGHT_SHOULDER])
      const LH = frame.map(lm[POSE.LEFT_HIP])
      const RH = frame.map(lm[POSE.RIGHT_HIP])

      const sc = { x: (LS.x + RS.x) / 2, y: (LS.y + RS.y) / 2 }
      const hc = { x: (LH.x + RH.x) / 2, y: (LH.y + RH.y) / 2 }
      const torso = dist(sc, hc)
      if (!(torso > 8)) return
      const up = { x: (sc.x - hc.x) / torso, y: (sc.y - hc.y) / torso }
      const lift = torso * SHOULDER_LIFT

      const tSL = { x: sc.x + (LS.x - sc.x) * SHOULDER_W + up.x * lift, y: sc.y + (LS.y - sc.y) * SHOULDER_W + up.y * lift }
      const tSR = { x: sc.x + (RS.x - sc.x) * SHOULDER_W + up.x * lift, y: sc.y + (RS.y - sc.y) * SHOULDER_W + up.y * lift }
      const tHL = { x: hc.x + (LH.x - hc.x) * HIP_W, y: hc.y + (LH.y - hc.y) * HIP_W }
      const tHR = { x: hc.x + (RH.x - hc.x) * HIP_W, y: hc.y + (RH.y - hc.y) * HIP_W }

      const a = item.anchors
      const iw = img.naturalWidth || img.width
      const ih = img.naturalHeight || img.height
      const src = [
        { x: a.shoulderL[0] * iw, y: a.shoulderL[1] * ih },
        { x: a.shoulderR[0] * iw, y: a.shoulderR[1] * ih },
        { x: a.hipR[0] * iw, y: a.hipR[1] * ih },
        { x: a.hipL[0] * iw, y: a.hipL[1] * ih },
      ]
      const H = homography(src, [tSL, tSR, tHR, tHL])
      if (!H) return

      /* --- عکس فوری از فریم، برای بازگرداندن سر و ساعد جلوی لباس --- */
      const stencil = lastStencil
      let occCtx = null
      if (stencil) {
        occCtx = fit(occC, frame.W, frame.H)
        occCtx.clearRect(0, 0, frame.W, frame.H)
        occCtx.drawImage(ctx.canvas, 0, 0)
      }

      /* --- وارپ لباس روی شبکهٔ مثلث‌ها --- */
      const wc = fit(warpC, frame.W, frame.H)
      wc.clearRect(0, 0, frame.W, frame.H)
      const P = []
      for (let j = 0; j <= GRID_Y; j++) {
        const row = []
        for (let i = 0; i <= GRID_X; i++) {
          const sx = (i / GRID_X) * iw
          const sy = (j / GRID_Y) * ih
          row.push({ s: { x: sx, y: sy }, d: applyH(H, sx, sy) })
        }
        P.push(row)
      }
      for (let j = 0; j < GRID_Y; j++) {
        for (let i = 0; i < GRID_X; i++) {
          const p00 = P[j][i]
          const p10 = P[j][i + 1]
          const p01 = P[j + 1][i]
          const p11 = P[j + 1][i + 1]
          drawTriangle(wc, img, p00.s, p10.s, p11.s, p00.d, p10.d, p11.d, 1.02)
          drawTriangle(wc, img, p00.s, p11.s, p01.s, p00.d, p11.d, p01.d, 1.02)
        }
      }

      ctx.save()
      ctx.globalAlpha = frame.alpha
      ctx.drawImage(warpC, 0, 0, frame.W, frame.H, 0, 0, frame.W, frame.H)
      ctx.restore()

      /* --- سر و ساعد دوباره جلوی لباس --- */
      if (stencil && occCtx) {
        occCtx.globalCompositeOperation = 'destination-in'
        drawStencil(occCtx, stencil, frame)
        occCtx.globalCompositeOperation = 'source-over'
        ctx.save()
        ctx.globalAlpha = frame.alpha
        ctx.drawImage(occC, 0, 0, frame.W, frame.H, 0, 0, frame.W, frame.H)
        ctx.restore()
      }

    },

    drawDebug(ctx, result, frame) {
      if (!result) return
      const lm = result.landmarks
      ctx.save()
      ctx.font = '11px monospace'
      const show = [
        [POSE.LEFT_SHOULDER, 'شانه چپ'],
        [POSE.RIGHT_SHOULDER, 'شانه راست'],
        [POSE.LEFT_HIP, 'لگن چپ'],
        [POSE.RIGHT_HIP, 'لگن راست'],
        [POSE.LEFT_ELBOW, 'آرنج چپ'],
        [POSE.RIGHT_ELBOW, 'آرنج راست'],
        [POSE.LEFT_WRIST, 'مچ چپ'],
        [POSE.RIGHT_WRIST, 'مچ راست'],
      ]
      ctx.fillStyle = '#2E9C93'
      ctx.strokeStyle = '#E8A33D'
      ctx.lineWidth = 2
      const pt = {}
      for (const [i, label] of show) {
        const p = frame.map(lm[i])
        pt[i] = p
        ctx.beginPath()
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillText(`${i} ${label} ${(lm[i].visibility ?? 1).toFixed(2)}`, p.x + 6, p.y - 6)
      }
      ctx.beginPath()
      ctx.moveTo(pt[POSE.LEFT_SHOULDER].x, pt[POSE.LEFT_SHOULDER].y)
      ctx.lineTo(pt[POSE.RIGHT_SHOULDER].x, pt[POSE.RIGHT_SHOULDER].y)
      ctx.lineTo(pt[POSE.RIGHT_HIP].x, pt[POSE.RIGHT_HIP].y)
      ctx.lineTo(pt[POSE.LEFT_HIP].x, pt[POSE.LEFT_HIP].y)
      ctx.closePath()
      ctx.stroke()
      ctx.restore()
    },
  }
}

/** استنسیل (در فضای ویدیو) را با همان برش، جای‌گذاری و آینهٔ فریم می‌کشد. */
function drawStencil(c, stencil, frame) {
  const kx = stencil.w / frame.vw
  const ky = stencil.h / frame.vh
  c.save()
  if (frame.mirror) {
    c.translate(frame.W, 0)
    c.scale(-1, 1)
  }
  c.drawImage(
    stencil.canvas,
    frame.sx * kx,
    frame.sy * ky,
    frame.sw * kx,
    frame.sh * ky,
    frame.mirror ? frame.W - frame.dx - frame.dw : frame.dx,
    frame.dy,
    frame.dw,
    frame.dh
  )
  c.restore()
}
