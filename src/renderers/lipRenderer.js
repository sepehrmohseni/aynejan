import { loadFaceLandmarker } from '@/lib/mediapipe'
import { LandmarkFilter } from '@/lib/oneEuro'
import { LIPS_OUTER, LIPS_INNER } from '@/lib/landmarks'
import { faceHint } from '@/lib/coach'
import {
  closedSpline,
  bbox,
  centroid,
  scaleAbout,
  dist,
  mid,
  offscreen,
  luminance,
  clamp,
} from '@/lib/geom'

/* --------------------------------------------------------------- تنظیم‌ها */
/* با لایهٔ دیباگ روی چهرهٔ واقعی تنظیم شده‌اند. */

// کانتور بیرونی کمی گشاد می‌شود تا لبهٔ سرخی لب کامل پوشیده شود.
const OUTER_GROW = 1.025
// وقتی دهان باز است سوراخ داخلی کمی گشاد می‌شود تا هرگز روی دندان نیفتد.
const INNER_GROW_OPEN = 1.07
// نسبت بازشدگی دهان که از آن به بعد «باز» حساب می‌شود.
const OPEN_RATIO = 0.055

const FINISH = {
  matte: { multiply: 0.74, cover: 0.3, gloss: 0.0, edgeDark: 0.16 },
  satin: { multiply: 0.66, cover: 0.2, gloss: 0.2, edgeDark: 0.1 },
  glossy: { multiply: 0.58, cover: 0.13, gloss: 0.46, edgeDark: 0.06 },
}

// شاخص‌های کلیدی داخل خودِ حلقه‌ها (ترتیب حلقه ثابت است):
const I_CORNER_A = 0 // 61 / 78  — گوشهٔ یک‌طرف
const I_BOTTOM = 5 //  17 / 14  — وسط لب پایین
const I_CORNER_B = 10 // 291 / 308 — گوشهٔ طرف دیگر
const I_TOP = 15 //   0 / 13  — وسط لب بالا

export function createLipRenderer() {
  let model = null
  const filter = new LandmarkFilter({ minCutOff: 1.6, beta: 0.12, dCutOff: 1.0 })

  // بوم‌های کمکی؛ یک‌بار ساخته و در صورت نیاز بزرگ می‌شوند.
  let maskC = offscreen(2, 2)
  let blurC = offscreen(2, 2)
  let tintC = offscreen(2, 2)
  let glossC = offscreen(2, 2)
  let canFilter = null

  const fit = (c, w, h) => {
    if (c.width < w || c.height < h) {
      c.width = Math.ceil(w)
      c.height = Math.ceil(h)
    }
    return c.getContext('2d')
  }

  return {
    id: 'lip',
    needs: 'face',

    async init(onProgress) {
      model = await loadFaceLandmarker(onProgress)
      if (canFilter === null) {
        const t = offscreen(2, 2).getContext('2d')
        canFilter = typeof t.filter === 'string'
      }
    },

    reset() {
      filter.reset()
    },

    detect(video, ts) {
      if (!model) return null
      const res = model.detectForVideo(video, ts)
      const lm = res?.faceLandmarks?.[0]
      if (!lm) return null
      return { landmarks: filter.apply(lm, ts) }
    },

    /** راهنمای فارسی بر اساس وضعیت ردیابی و کادربندی. */
    hint(result, frame) {
      if (!result) return 'صورتت رو بیار توی کادر'
      const lm = result.landmarks
      const framing = faceHint(lm, frame)
      if (framing) return framing
      // اگر دهان خیلی کوچک دیده شود، لبه‌ها دقیق درنمی‌آیند
      const a = frame.map(lm[LIPS_OUTER[I_CORNER_A]])
      const b = frame.map(lm[LIPS_OUTER[I_CORNER_B]])
      if (dist(a, b) < frame.W * 0.075) return 'یه‌کم بیا نزدیک‌تر'
      return null
    },

    draw(ctx, result, item, frame) {
      if (!result || !item) return
      const lm = result.landmarks
      const outerRaw = LIPS_OUTER.map((i) => frame.map(lm[i]))
      const innerRaw = LIPS_INNER.map((i) => frame.map(lm[i]))

      const mouthW = dist(outerRaw[I_CORNER_A], outerRaw[I_CORNER_B])
      if (!(mouthW > 4)) return

      const openRatio =
        dist(innerRaw[I_TOP], innerRaw[I_BOTTOM]) / Math.max(1, mouthW)
      const isOpen = openRatio > OPEN_RATIO

      const outer = scaleAbout(outerRaw, OUTER_GROW, centroid(outerRaw))
      const inner = isOpen
        ? scaleAbout(innerRaw, INNER_GROW_OPEN, centroid(innerRaw))
        : innerRaw

      const feather = clamp(mouthW * 0.03, 1.2, 7)
      const pad = Math.ceil(feather * 3 + 4)
      const box = bbox(outer, pad)
      if (box.w < 2 || box.h < 2) return

      const w = Math.ceil(box.w)
      const h = Math.ceil(box.h)
      const ox = -box.x
      const oy = -box.y

      /* ۱) ماسک: بیرونی پر می‌شود، داخلی از آن کم می‌شود. */
      const mc = fit(maskC, w, h)
      mc.save()
      mc.clearRect(0, 0, w, h)
      mc.translate(ox, oy)
      mc.fillStyle = '#fff'
      mc.beginPath()
      closedSpline(mc, outer, 0.55)
      mc.fill()
      mc.globalCompositeOperation = 'destination-out'
      mc.beginPath()
      closedSpline(mc, inner, 0.55)
      mc.fill()
      mc.restore()

      /* ۲) پر کردن لبه (feather) تا رنگ مثل برچسب نچسبد. */
      let maskSrc = maskC
      if (canFilter) {
        const bc = fit(blurC, w, h)
        bc.clearRect(0, 0, w, h)
        bc.filter = `blur(${feather.toFixed(2)}px)`
        bc.drawImage(maskC, 0, 0, w, h, 0, 0, w, h)
        bc.filter = 'none'
        maskSrc = blurC
      }

      /* ۳) لایهٔ رنگ به شکل ماسک. */
      const tc = fit(tintC, w, h)
      tc.save()
      tc.clearRect(0, 0, w, h)
      tc.fillStyle = item.hex
      tc.fillRect(0, 0, w, h)
      // کمی تیرگی در لبه‌ها، مثل خط لب — برای پرداخت مات بیشتر
      const f = FINISH[item.finish] ?? FINISH.satin
      if (f.edgeDark > 0) {
        const c = centroid(outer)
        const g = tc.createRadialGradient(
          c.x + ox,
          c.y + oy,
          mouthW * 0.1,
          c.x + ox,
          c.y + oy,
          mouthW * 0.62
        )
        g.addColorStop(0, 'rgba(0,0,0,0)')
        g.addColorStop(1, `rgba(0,0,0,${f.edgeDark})`)
        tc.fillStyle = g
        tc.fillRect(0, 0, w, h)
      }
      tc.globalCompositeOperation = 'destination-in'
      tc.drawImage(maskSrc, 0, 0, w, h, 0, 0, w, h)
      tc.restore()

      /* ۴) ترکیب روی فریم.
         multiply بافت و سایهٔ طبیعی لب را نگه می‌دارد ولی رنگ‌های روشن را
         تیره می‌کند؛ برای همین برای رنگ‌های روشن یک پاس screen هم می‌آید و
         در آخر یک پاس کم‌رنگ source-over پوشش را کامل می‌کند. */
      const L = luminance(item.hex)
      const screenA = clamp((L - 0.14) * 0.9, 0, 0.42)
      const a = frame.alpha

      ctx.save()
      ctx.globalCompositeOperation = 'multiply'
      ctx.globalAlpha = f.multiply * a
      ctx.drawImage(tintC, 0, 0, w, h, box.x, box.y, w, h)

      if (screenA > 0.01) {
        ctx.globalCompositeOperation = 'screen'
        ctx.globalAlpha = screenA * a
        ctx.drawImage(tintC, 0, 0, w, h, box.x, box.y, w, h)
      }

      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = f.cover * a
      ctx.drawImage(tintC, 0, 0, w, h, box.x, box.y, w, h)
      ctx.restore()

      /* ۵) براقی: یک هایلایت نرم روی لب پایین (و کمی روی لب بالا). */
      if (f.gloss > 0.01) {
        const lowC = mid(innerRaw[I_BOTTOM], outerRaw[I_BOTTOM])
        const lowH = Math.max(2, dist(innerRaw[I_BOTTOM], outerRaw[I_BOTTOM]))
        const gc = fit(glossC, w, h)
        gc.save()
        gc.clearRect(0, 0, w, h)
        gc.translate(ox, oy)
        // بیضی کشیده در راستای لب: مقیاس عمودی کم می‌شود
        gc.translate(lowC.x, lowC.y)
        gc.scale(1, clamp(lowH / (mouthW * 0.3), 0.26, 0.85))
        gc.translate(-lowC.x, -lowC.y)
        const rad = Math.max(mouthW * 0.3, lowH * 1.6)
        const grad = gc.createRadialGradient(lowC.x, lowC.y, 0, lowC.x, lowC.y, rad)
        grad.addColorStop(0, 'rgba(255,255,255,0.95)')
        grad.addColorStop(0.45, 'rgba(255,255,255,0.26)')
        grad.addColorStop(1, 'rgba(255,255,255,0)')
        gc.fillStyle = grad
        gc.fillRect(lowC.x - rad, lowC.y - rad * 2, rad * 2, rad * 4)
        gc.restore()

        // درخشش کم‌رنگ روی لب بالا
        const upC = mid(innerRaw[I_TOP], outerRaw[I_TOP])
        gc.save()
        gc.translate(ox, oy)
        const rad2 = mouthW * 0.16
        const g2 = gc.createRadialGradient(upC.x, upC.y, 0, upC.x, upC.y, rad2)
        g2.addColorStop(0, 'rgba(255,255,255,0.5)')
        g2.addColorStop(1, 'rgba(255,255,255,0)')
        gc.fillStyle = g2
        gc.fillRect(upC.x - rad2, upC.y - rad2, rad2 * 2, rad2 * 2)
        gc.restore()

        // فقط داخل ماسک لب باقی بماند
        gc.save()
        gc.globalCompositeOperation = 'destination-in'
        gc.drawImage(maskSrc, 0, 0, w, h, 0, 0, w, h)
        gc.restore()

        ctx.save()
        ctx.globalCompositeOperation = 'screen'
        ctx.globalAlpha = f.gloss * a
        ctx.drawImage(glossC, 0, 0, w, h, box.x, box.y, w, h)
        ctx.restore()
      }
    },

    drawDebug(ctx, result, frame) {
      if (!result) return
      const lm = result.landmarks
      ctx.save()
      ctx.font = '10px monospace'
      const paint = (idxs, color) => {
        ctx.fillStyle = color
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        const pts = idxs.map((i) => frame.map(lm[i]))
        ctx.beginPath()
        closedSpline(ctx, pts, 0.55)
        ctx.stroke()
        pts.forEach((p, k) => {
          ctx.beginPath()
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillText(String(idxs[k]), p.x + 3, p.y - 3)
        })
      }
      paint(LIPS_OUTER, '#2E9C93')
      paint(LIPS_INNER, '#E8A33D')
      ctx.restore()
    },
  }
}
