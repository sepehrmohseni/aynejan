import { ref, shallowRef, onBeforeUnmount } from 'vue'
import { clamp } from '@/lib/geom'

/**
 * حلقهٔ پرو.
 *
 * هر فریم: تصویر ویدیو روی بوم کشیده می‌شود، بعد پوشش روی همان بوم.
 * کاربر خودِ بوم را می‌بیند، نه ویدیو را؛ برای همین عکسِ ذخیره‌شده دقیقاً
 * همان چیزی است که روی صفحه بوده، با همان آینه‌شدن.
 *
 * اندازهٔ بوم برابر «برشِ پوشانندهٔ» ویدیو با نسبت کادرِ نمایش است، پس بوم با
 * object-fit: fill نمایش داده می‌شود و هیچ بخشی از تصویر بیرون از دید نمی‌ماند.
 */
const PRESENCE_UP = 0.35 // سرعت ظاهر شدن پوشش
const PRESENCE_DOWN = 0.12 // سرعت محو شدن وقتی ردیابی از دست می‌رود
const DROP_AT = 0.02 // زیر این مقدار، نتیجهٔ قدیمی دور ریخته می‌شود
const STABLE_MS = 900 // پس از این مدت ردیابیِ پیوسته، راهنما پنهان می‌شود
// اگر دستگاه ضعیف بود، تشخیص یک‌درمیان اجرا می‌شود ولی پوشش هر فریم کشیده
// می‌شود؛ فیلتر One Euro فاصله را نرم پر می‌کند، پس تصویر روان می‌ماند.
const SLOW_FRAME_MS = 42
const FAST_FRAME_MS = 26

export function useTryOnLoop({
  videoRef,
  canvasRef,
  getRenderer,
  getItem,
  isMirrored,
  getSafeBottom = () => 0,
}) {
  const running = ref(false)
  const hint = ref(null)
  const detected = ref(false)
  const debug = ref(false)
  const fps = ref(0)

  let raf = 0
  let lastResult = null
  let presence = 0
  let stableSince = 0
  let lastVideoTime = -1
  let frames = 0
  let fpsAt = 0
  let avgFrameMs = 16
  let lastTs = 0
  let detectEvery = 1
  let frameNo = 0
  const frame = shallowRef(null)

  /**
   * هندسهٔ فریم — مثل ریلزِ اینستاگرام.
   *
   * تصویر دوربین همیشه کل صفحه را پر می‌کند: تمام‌عرض، تمام‌ارتفاع، بدون
   * هیچ حاشیه یا نوار سیاه، برای دوربین جلو و عقب و روی هر نسبت صفحه‌ای.
   * چیزی که در کادر جا نمی‌شود بریده می‌شود، نه اینکه کوچک شود.
   *
   * تنها ملاحظه این است که مرکزِ تصویر روی مرکزِ *ناحیهٔ دیده‌شونده* (بالای
   * نوار کنترل‌ها) بنشیند، نه مرکز هندسی صفحه. پس صورت یا دست پشت دکمه‌ها
   * پنهان نمی‌شود، در حالی که تصویر همچنان تا لبهٔ پایین ادامه دارد.
   *
   * بوم دقیقاً به اندازهٔ پنجره‌ای از ویدیو در وضوح اصلی است، پس هیچ
   * بزرگ‌نماییِ نرم‌افزاری و هیچ افت کیفیتی وجود ندارد.
   */
  function computeGeometry(video, canvas) {
    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) return null

    const box = canvas.getBoundingClientRect()
    const boxW = box.width || vw
    const boxH = box.height || vh
    const boxRatio = boxW / boxH

    // بزرگ‌ترین بومی که هنوز از ویدیو بزرگ‌تر نیست و نسبتش با صفحه یکی است
    let W
    let H
    if (boxRatio <= vw / vh) {
      H = vh
      W = Math.max(1, Math.round(vh * boxRatio))
    } else {
      W = vw
      H = Math.max(1, Math.round(vw / boxRatio))
    }

    // ارتفاع نوار کنترل‌ها، تبدیل‌شده به پیکسل بوم
    const safeCss = Math.max(0, Math.min(getSafeBottom(), boxH * 0.42))
    const strip = Math.round((safeCss / boxH) * H)
    const VH = Math.max(1, H - strip)

    // ویدیو در وضوح اصلی کشیده می‌شود؛ سرریزش بیرون بوم می‌افتد و بریده می‌شود
    const dx = Math.round((W - vw) / 2)
    const dy = clamp(Math.round((VH - vh) / 2), H - vh, 0)

    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W
      canvas.height = H
    }
    return {
      vw,
      vh,
      W,
      H,
      VH,
      src: { x: 0, y: 0, w: vw, h: vh },
      dst: { x: dx, y: dy, w: vw, h: vh },
    }
  }

  function makeFrame(g, mirror, alpha) {
    const kx = g.dst.w / g.src.w
    const ky = g.dst.h / g.src.h
    return {
      vw: g.vw,
      vh: g.vh,
      W: g.W,
      H: g.H,
      /** ارتفاع بخشی از بوم که کاربر واقعاً می‌بیند (بالای نوار کنترل‌ها). */
      VH: g.VH,
      sx: g.src.x,
      sy: g.src.y,
      sw: g.src.w,
      sh: g.src.h,
      dx: g.dst.x,
      dy: g.dst.y,
      dw: g.dst.w,
      dh: g.dst.h,
      mirror,
      alpha,
      /** لندمارک نرمالِ ویدیو → پیکسل بوم، با همان آینه‌شدن و همان جای‌گذاری. */
      map(lm) {
        const xv = mirror ? (1 - lm.x) * g.vw : lm.x * g.vw
        return {
          x: g.dst.x + (xv - g.src.x) * kx,
          y: g.dst.y + (lm.y * g.vh - g.src.y) * ky,
        }
      },
    }
  }

  function tick(ts) {
    raf = requestAnimationFrame(tick)
    const video = videoRef.value
    const canvas = canvasRef.value
    if (!video || !canvas || video.readyState < 2) return

    const geom = computeGeometry(video, canvas)
    if (!geom) return
    // desynchronized عمداً روشن نیست: در بعضی مرورگرها خواندن دوبارهٔ بوم
    // (toBlob) را غیرقابل‌اعتماد می‌کند و عکسِ ذخیره‌شده باید دقیق باشد.
    const ctx = canvas.getContext('2d', { alpha: false })
    const mirror = isMirrored()

    // ۱) فریم ویدیو — همیشه تمام‌صفحه، سرریز بیرون بوم بریده می‌شود
    ctx.save()
    if (mirror) {
      ctx.translate(geom.W, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(
      video,
      geom.src.x,
      geom.src.y,
      geom.src.w,
      geom.src.h,
      mirror ? geom.W - geom.dst.x - geom.dst.w : geom.dst.x,
      geom.dst.y,
      geom.dst.w,
      geom.dst.h
    )
    ctx.restore()

    // ۲) تشخیص — فقط وقتی فریم ویدیو واقعاً عوض شده
    const renderer = getRenderer()
    if (renderer) {
      frameNo++
      const shouldDetect = video.currentTime !== lastVideoTime && frameNo % detectEvery === 0
      if (shouldDetect) {
        lastVideoTime = video.currentTime
        try {
          const res = renderer.detect(video, ts)
          if (res) lastResult = res
          presence += ((res ? 1 : 0) - presence) * (res ? PRESENCE_UP : PRESENCE_DOWN)
          if (!res && presence < DROP_AT) {
            presence = 0
            lastResult = null
          }
        } catch (err) {
          console.warn('[aynejan] detect failed', err)
        }
      }

      // ۳) پوشش
      const f = makeFrame(geom, mirror, Math.min(1, presence * 1.25))
      frame.value = f
      if (lastResult && presence > DROP_AT) {
        try {
          renderer.draw(ctx, lastResult, getItem(), f)
          if (debug.value) renderer.drawDebug?.(ctx, lastResult, f)
        } catch (err) {
          console.warn('[aynejan] draw failed', err)
        }
      } else if (debug.value && lastResult) {
        renderer.drawDebug?.(ctx, lastResult, f)
      }

      // ۴) راهنما
      const isOn = presence > 0.85
      detected.value = isOn
      if (isOn) {
        if (!stableSince) stableSince = ts
      } else {
        stableSince = 0
      }
      const stable = stableSince && ts - stableSince > STABLE_MS
      const h = renderer.hint?.(presence > 0.4 ? lastResult : null, f) ?? null
      hint.value = stable && !h ? null : h
    }

    // میانگین نرم زمان فریم، برای تصمیمِ کاهش یا برگرداندن نرخ تشخیص
    if (lastTs) avgFrameMs += (Math.min(ts - lastTs, 200) - avgFrameMs) * 0.08
    lastTs = ts
    if (avgFrameMs > SLOW_FRAME_MS) detectEvery = 2
    else if (avgFrameMs < FAST_FRAME_MS) detectEvery = 1

    frames++
    if (ts - fpsAt > 1000) {
      fps.value = Math.round((frames * 1000) / (ts - fpsAt))
      frames = 0
      fpsAt = ts
    }
  }

  function start() {
    if (running.value) return
    running.value = true
    fpsAt = performance.now()
    raf = requestAnimationFrame(tick)
  }

  function stop() {
    running.value = false
    cancelAnimationFrame(raf)
    raf = 0
  }

  /** وقتی مدل یا دوربین عوض می‌شود، حالت ردیابی از نو شروع شود. */
  function resetTracking() {
    lastResult = null
    presence = 0
    stableSince = 0
    lastVideoTime = -1
    avgFrameMs = 16
    lastTs = 0
    detectEvery = 1
    frameNo = 0
  }

  /**
   * خروجی JPEG از همان بخشی از بوم که کاربر دیده است — یعنی بدون نوارِ پشتِ
   * کنترل‌ها. پس عکس دقیقاً همان تصویری است که روی صفحه بوده، با همان
   * آینه‌شدن و همان کادر، و بدون هیچ حاشیهٔ اضافه.
   */
  function capture(quality = 0.92) {
    const canvas = canvasRef.value
    if (!canvas) return Promise.resolve(null)
    const f = frame.value
    const visH = f?.VH && f.VH < canvas.height ? f.VH : canvas.height
    if (visH >= canvas.height) {
      return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    }
    const out = document.createElement('canvas')
    out.width = canvas.width
    out.height = visH
    const octx = out.getContext('2d')
    octx.drawImage(canvas, 0, 0, canvas.width, visH, 0, 0, canvas.width, visH)
    return new Promise((resolve) => out.toBlob(resolve, 'image/jpeg', quality))
  }

  onBeforeUnmount(stop)

  return { running, hint, detected, debug, fps, frame, start, stop, resetTracking, capture }
}
