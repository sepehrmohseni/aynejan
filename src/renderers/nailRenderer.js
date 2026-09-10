import { loadHandLandmarker } from '@/lib/mediapipe'
import { LandmarkFilter } from '@/lib/oneEuro'
import { HAND, NAIL_FINGERS } from '@/lib/landmarks'
import { dist, clamp, hexToRgb, shade } from '@/lib/geom'
import { handHint } from '@/lib/coach'

/**
 * ناخن.
 *
 * صادقانه: HandLandmarker خودِ صفحهٔ ناخن را تشخیص نمی‌دهد. تنها بیست‌ویک
 * مفصل دست را می‌دهد. پس جای ناخن اینجا «تخمین» است: روی پارهٔ خطِ مفصل DIP
 * تا نوک انگشت، نزدیک نوک، با چرخشِ همان پاره و عرضی که از پهنای محلی انگشت
 * مقیاس می‌گیرد. ضریب‌ها با لایهٔ دیباگ روی دست واقعی تنظیم شده‌اند و برای شست
 * جداگانه‌اند، چون شست هم پهن‌تر است و هم زاویه‌اش با بقیه فرق دارد.
 */

/* --------------------------------------------------------------- تنظیم‌ها */
// کمترین «رو به دوربین بودنِ پشت دست» که از آن به بعد ناخن کشیده می‌شود.
const BACK_FACING_MIN = 0.12
// نرم‌کردن تصمیمِ رو/پشت دست تا با لرزش، ناخن‌ها چشمک نزنند.
const FACING_SMOOTH = 0.18

const FINISH_GLOSS = { matte: 0.1, satin: 0.34, glossy: 0.72 }

/** شکل ناخن («اسکوآل»): پایهٔ باریک‌تر با خط کوتیکول، پهلوهای کمی برجسته،
    نوک گرد. در فضای محلی: y از پایه (منفی) تا نوک (مثبت). */
function nailPath(ctx, len, wid) {
  const hw = wid / 2
  const base = -len / 2
  const tip = len / 2
  ctx.beginPath()
  ctx.moveTo(-hw * 0.8, base)
  ctx.quadraticCurveTo(0, base + len * 0.1, hw * 0.8, base)
  ctx.bezierCurveTo(hw, base + len * 0.3, hw, base + len * 0.66, hw * 0.84, tip - len * 0.2)
  ctx.quadraticCurveTo(hw * 0.6, tip, 0, tip)
  ctx.quadraticCurveTo(-hw * 0.6, tip, -hw * 0.84, tip - len * 0.2)
  ctx.bezierCurveTo(-hw, base + len * 0.66, -hw, base + len * 0.3, -hw * 0.8, base)
  ctx.closePath()
}

export function createNailRenderer() {
  let model = null
  // برای هر دست یک بانک فیلتر جدا
  const filters = [
    new LandmarkFilter({ minCutOff: 1.4, beta: 0.1 }),
    new LandmarkFilter({ minCutOff: 1.4, beta: 0.1 }),
  ]
  // کلید بر اساس چپ/راست بودن دست، نه ترتیب در آرایه — چون ترتیب بین
  // فریم‌ها جابه‌جا می‌شود و آن‌وقت نرم‌سازیِ یک دست روی دست دیگر می‌افتد.
  const facingSmooth = new Map()

  return {
    id: 'nail',
    needs: 'hand',

    async init(onProgress) {
      model = await loadHandLandmarker(onProgress)
    },

    reset() {
      filters.forEach((f) => f.reset())
      facingSmooth.clear()
    },

    detect(video, ts) {
      if (!model) return null
      const res = model.detectForVideo(video, ts)
      const hands = res?.landmarks
      if (!hands?.length) return null
      return {
        hands: hands.slice(0, 2).map((lm, i) => ({
          landmarks: filters[i].apply(lm, ts),
          handedness: res.handedness?.[i]?.[0]?.categoryName ?? null,
        })),
      }
    },

    hint(result, frame) {
      if (!result?.hands?.length) return 'دستت رو بیار جلوی دوربین'
      // بهترین دست را ملاک می‌گیریم: آن‌که بیشتر پشتش رو به دوربین است
      let best = null
      let bestFacing = -Infinity
      result.hands.forEach((h, i) => {
        const f = facingSmooth.get(h.handedness ?? `h${i}`) ?? 0
        if (f > bestFacing) {
          bestFacing = f
          best = h
        }
      })
      if (!best) return 'دستت رو بیار جلوی دوربین'
      return handHint(best.landmarks, frame, { backFacing: bestFacing > BACK_FACING_MIN })
    },

    draw(ctx, result, item, frame) {
      if (!result || !item) return
      result.hands.forEach((hand, i) => {
        const lm = hand.landmarks

        /* پشت دست رو به دوربین است؟
           بردار عمود کف دست از ضرب خارجی (اشاره−مچ) × (کوچک−مچ) به دست می‌آید.
           علامتِ مؤلفهٔ z می‌گوید کدام طرف رو به دوربین است، و این علامت با
           چپ/راست بودن دست عوض می‌شود؛ پس با handedness تصحیح می‌شود.
           
           به مدل همیشه فریم خام داده می‌شود (نه نسخهٔ آینه‌شدهٔ روی صفحه)، پس
           این قرارداد برای دوربین جلو و عقب یکسان است. روی عکس واقعی دستِ
           پشت‌رو آزمایش و تأیید شده.

           حالت آینه هم درست کار می‌کند: اگر کاربر دوربین پشت را رو به آینه
           بگیرد، هم ضرب خارجی علامت عوض می‌کند و هم برچسب چپ/راست؛ دو
           تغییرِ علامت همدیگر را خنثی می‌کنند و نتیجه دست‌نخورده می‌ماند.
           (با همان عکس، آینه‌شده، آزمایش شد.) */
        const w = lm[HAND.WRIST]
        const idx = lm[HAND.INDEX_MCP]
        const pky = lm[HAND.PINKY_MCP]
        const ax = idx.x - w.x
        const ay = idx.y - w.y
        const bx = pky.x - w.x
        const by = pky.y - w.y
        const cross = ax * by - ay * bx
        const scale = Math.hypot(ax, ay) * Math.hypot(bx, by) || 1
        const sign = hand.handedness === 'Left' ? -1 : 1
        const facing = (cross / scale) * sign

        const key = hand.handedness ?? `h${i}`
        const prev = facingSmooth.get(key) ?? facing
        const smooth = prev + (facing - prev) * FACING_SMOOTH
        facingSmooth.set(key, smooth)
        const strength = clamp((smooth - BACK_FACING_MIN) / 0.22, 0, 1)
        if (strength <= 0.01) return

        const alpha = strength * frame.alpha
        // مقیاس دست: مچ تا مفصل انگشت میانی — پایدارترین اندازهٔ در دسترس
        const handScale = dist(frame.map(lm[HAND.WRIST]), frame.map(lm[HAND.MIDDLE_MCP]))
        if (!(handScale > 10)) return
        for (const finger of NAIL_FINGERS) {
          drawNail(ctx, lm, finger, item, frame, alpha, handScale)
        }
      })
    },

    drawDebug(ctx, result, frame) {
      if (!result) return
      ctx.save()
      ctx.font = '10px monospace'
      result.hands.forEach((hand, i) => {
        const lm = hand.landmarks
        ctx.fillStyle = '#2E9C93'
        lm.forEach((p, k) => {
          const q = frame.map(p)
          ctx.beginPath()
          ctx.arc(q.x, q.y, 2.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillText(String(k), q.x + 3, q.y - 3)
        })
        ctx.strokeStyle = '#E8A33D'
        ctx.lineWidth = 1.6
        for (const f of NAIL_FINGERS) {
          const a = frame.map(lm[f.dip])
          const b = frame.map(lm[f.tip])
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
        const wr = frame.map(lm[HAND.WRIST])
        ctx.fillStyle = '#F7E9EC'
        ctx.fillText(
          `${hand.handedness ?? '?'} facing=${(
            facingSmooth.get(hand.handedness ?? `h${i}`) ?? 0
          ).toFixed(2)}`,
          wr.x - 30,
          wr.y + 18
        )
      })
      ctx.restore()
    },
  }
}

function drawNail(ctx, lm, finger, item, frame, alpha, handScale) {
  const dip = frame.map(lm[finger.dip])
  const tip = frame.map(lm[finger.tip])

  const segLen = dist(dip, tip)
  if (!(segLen > 3)) return

  const t = finger.tune
  // عرض از مقیاس دست، طول از پارهٔ DIP→نوک تا با چرخش انگشت کوتاه شود
  const wid = Math.max(3, handScale * t.wK)
  const len = clamp(segLen * t.lenK, wid * 0.55, wid * t.ratio)

  const ang = Math.atan2(tip.y - dip.y, tip.x - dip.x)
  const cx = dip.x + (tip.x - dip.x) * t.along
  const cy = dip.y + (tip.y - dip.y) * t.along

  const rgb = hexToRgb(item.hex)
  const gloss = FINISH_GLOSS[item.finish] ?? FINISH_GLOSS.satin

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(cx, cy)
  // مسیر در فضای محلی «طول رو به نوک» تعریف شده، پس ۹۰ درجه اضافه می‌شود
  ctx.rotate(ang + Math.PI / 2)

  nailPath(ctx, len, wid)
  ctx.save()
  ctx.clip()

  // رنگ پایه با کمی حجم: تیره‌تر در لبه‌ها، روشن‌تر در مرکز
  const g = ctx.createLinearGradient(-wid / 2, 0, wid / 2, 0)
  g.addColorStop(0, shade(item.hex, 0.72))
  g.addColorStop(0.3, item.hex)
  g.addColorStop(0.55, shade(item.hex, 1.12))
  g.addColorStop(1, shade(item.hex, 0.78))
  ctx.fillStyle = g
  ctx.fillRect(-wid, -len, wid * 2, len * 2)

  // سایهٔ کوتیکول
  const cg = ctx.createLinearGradient(0, -len / 2, 0, -len * 0.1)
  cg.addColorStop(0, 'rgba(0,0,0,0.3)')
  cg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = cg
  ctx.fillRect(-wid, -len, wid * 2, len)

  // هایلایت براق — یک نوار نرمِ کشیده، بدون لبهٔ تیز
  if (gloss > 0.05) {
    const hx = -wid * 0.2
    const hr = Math.max(wid, len) * 0.5
    const hg = ctx.createRadialGradient(hx, -len * 0.06, 0, hx, -len * 0.06, hr)
    hg.addColorStop(0, `rgba(255,255,255,${0.6 * gloss})`)
    hg.addColorStop(0.45, `rgba(255,255,255,${0.16 * gloss})`)
    hg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.save()
    ctx.scale(0.5, 1)
    ctx.fillStyle = hg
    ctx.fillRect(-wid * 3, -len, wid * 6, len * 2)
    ctx.restore()
  }

  // لبهٔ آزادِ ناخن کمی روشن‌تر
  const eg = ctx.createLinearGradient(0, len * 0.2, 0, len * 0.5)
  eg.addColorStop(0, 'rgba(255,255,255,0)')
  eg.addColorStop(1, `rgba(255,255,255,${0.14 + 0.12 * gloss})`)
  ctx.fillStyle = eg
  ctx.fillRect(-wid, len * 0.14, wid * 2, len * 0.4)

  ctx.restore()

  // خط دور بسیار کم‌رنگ تا ناخن از انگشت جدا دیده شود
  ctx.strokeStyle = `rgba(${Math.round(rgb.r * 0.45)},${Math.round(
    rgb.g * 0.45
  )},${Math.round(rgb.b * 0.45)},0.5)`
  ctx.lineWidth = Math.max(0.6, len * 0.03)
  nailPath(ctx, len, wid)
  ctx.stroke()
  ctx.restore()
}
