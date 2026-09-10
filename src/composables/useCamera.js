import { ref, shallowRef, onBeforeUnmount } from 'vue'
import { clamp } from '@/lib/geom'

/** سقف بزرگ‌نمایی. بالاتر از این، تصویر فقط بزرگ‌تر می‌شود نه دقیق‌تر. */
export const MAX_ZOOM = 3

/**
 * دوربین: گرفتن استریم، جابه‌جایی جلو/عقب، بزرگ‌نمایی، و خطاهای فارسی.
 * تصویر هیچ‌وقت از دستگاه بیرون نمی‌رود؛ اینجا هیچ درخواست شبکه‌ای نیست.
 */
export function useCamera(videoRef) {
  const stream = shallowRef(null)
  const facingMode = ref('user')
  const ready = ref(false)
  const starting = ref(false)
  const error = ref(null) // { title, body, canRetry }
  const needsTap = ref(false)
  /** ضریبی که کاربر خواسته؛ همیشه از ۱× شروع می‌شود. */
  const zoom = ref(1)
  /** آن بخش از بزرگ‌نمایی که خودِ دوربین نتوانسته و حلقهٔ پرو باید انجام دهد. */
  const digitalZoom = ref(1)
  const hasOpticalZoom = ref(false)

  const isMirrored = () => facingMode.value === 'user'

  function describe(err) {
    const name = err?.name || ''
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return {
        title: 'اجازهٔ دوربین داده نشده',
        body: 'برای پرو کردن باید به این صفحه اجازهٔ استفاده از دوربین بدهی. روی قفلِ کنار آدرس صفحه بزن، بخش دوربین را روی «اجازه دادن» بگذار و بعد صفحه را دوباره باز کن.',
        canRetry: true,
      }
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      return {
        title: 'دوربینی پیدا نشد',
        body: 'روی این دستگاه دوربینی در دسترس نیست. با گوشی امتحان کن.',
        canRetry: false,
      }
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return {
        title: 'دوربین در دست برنامهٔ دیگری است',
        body: 'یک برنامهٔ دیگر از دوربین استفاده می‌کند. آن را ببند و دوباره تلاش کن.',
        canRetry: true,
      }
    }
    return {
      title: 'دوربین باز نشد',
      body: 'دوباره تلاش کن؛ اگر باز هم نشد، مرورگر را ببند و از نو باز کن.',
      canRetry: true,
    }
  }

  /* ------------------------------------------------------------ بزرگ‌نمایی */
  /* اول از خودِ دوربین خواسته می‌شود: آن‌جا بزرگ‌نمایی روی سنسور انجام می‌شود و
     هیچ کیفیتی از دست نمی‌رود. هرچه از دست دوربین برنیاید (مثلاً در سافاری که
     این قابلیت را نمی‌دهد) حلقهٔ پرو با برش نرم‌افزاری کامل می‌کند. */
  let zoomCaps = null
  let zoomBusy = false
  let zoomPending = null
  // هر بار باز شدن دوربین یک نسل تازه است؛ نتیجهٔ درخواست‌های نسل قبل دور ریخته می‌شود
  let camGen = 0

  const videoTrack = () => stream.value?.getVideoTracks?.()[0] ?? null

  function readZoomCaps() {
    zoomCaps = null
    hasOpticalZoom.value = false
    try {
      const track = videoTrack()
      const z = track?.getCapabilities?.().zoom
      if (!z || !(z.min > 0) || !(z.max > z.min)) return
      /* «۱×» یعنی همان کادری که دوربین با آن باز شده، نه کمینهٔ سنسور — روی
         گوشی‌هایی که لنز فوق‌عریض دارند کمینه از حالت عادی بازتر است و اگر
         مبنا را کمینه بگیریم، اولین لمسِ دکمه تصویر را بازتر می‌کند نه نزدیک‌تر. */
      const opened = Number(track.getSettings?.().zoom)
      const base = opened > 0 ? opened : z.min
      if (!(z.max > base)) return
      zoomCaps = { base, max: z.max }
      hasOpticalZoom.value = true
    } catch {
      /* مرورگر این قابلیت را ندارد */
    }
  }

  /* درخواست‌ها صف می‌شوند: وسط حرکت دو انگشت ده‌ها بار مقدار عوض می‌شود و
     applyConstraints را نباید روی هم انباشت. */
  async function pumpZoom() {
    if (zoomBusy || zoomPending === null) return
    zoomBusy = true
    const gen = camGen
    const target = zoomPending
    zoomPending = null
    let optical = 1
    const track = videoTrack()
    if (zoomCaps && track) {
      optical = clamp(target, 1, zoomCaps.max / zoomCaps.base)
      try {
        await track.applyConstraints({ advanced: [{ zoom: zoomCaps.base * optical }] })
      } catch {
        // این دوربین از پسش برنیامد؛ از این به بعد نرم‌افزاری
        zoomCaps = null
        hasOpticalZoom.value = false
        optical = 1
      }
    }
    zoomBusy = false
    // اگر وسط کار دوربین عوض شده باشد، این نتیجه دیگر به درد نمی‌خورد
    if (gen !== camGen) return
    digitalZoom.value = target / optical
    pumpZoom()
  }

  function setZoom(value) {
    const target = clamp(Number(value) || 1, 1, MAX_ZOOM)
    if (Math.abs(target - zoom.value) < 0.005 && zoomPending === null) return
    zoom.value = target
    zoomPending = target
    pumpZoom()
  }

  function stop() {
    ready.value = false
    const s = stream.value
    if (s) for (const t of s.getTracks()) t.stop()
    stream.value = null
    const v = videoRef.value
    if (v) {
      v.srcObject = null
    }
  }

  async function start(mode = facingMode.value) {
    if (starting.value) return
    starting.value = true
    error.value = null

    try {
      if (!window.isSecureContext) {
        error.value = {
          title: 'این صفحه امن نیست',
          body: 'دسترسی به دوربین فقط روی نشانی‌های امن (https) ممکن است. لطفاً همان نشانی را با https باز کن.',
          canRetry: false,
        }
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        error.value = {
          title: 'مرورگر پشتیبانی نمی‌کند',
          body: 'این مرورگر به دوربین دسترسی نمی‌دهد. با کروم یا سافاری به‌روز امتحان کن.',
          canRetry: false,
        }
        return
      }

      stop()
      facingMode.value = mode
      /* اندازهٔ درخواستی با جهت صفحه هم‌راستا می‌شود: روی گوشیِ عمودی
         ۱۰۸۰×۱۹۲۰ و روی دسکتاپِ افقی ۱۹۲۰×۱۰۸۰. اگر دوربین این نسبت را نداشته
         باشد مرورگر نزدیک‌ترین حالت را می‌دهد و حلقهٔ پرو خودش تطبیق می‌دهد.

         چرا کامل ۱۰۸۰؟ چون بوم دقیقاً برشی از همین تصویر در وضوح اصلی است؛
         هرچه دوربین بدهد مستقیم به عکس ذخیره‌شده می‌رسد و هیچ‌جا بزرگ‌نمایی
         نرم‌افزاری وسط نیست. */
      const portrait = window.innerHeight >= window.innerWidth
      const long = 1920
      const short = 1080
      const s = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: mode },
          width: { ideal: portrait ? short : long },
          height: { ideal: portrait ? long : short },
        },
      })
      stream.value = s
      // هر بار که دوربین باز می‌شود، بزرگ‌نمایی از ۱× شروع می‌شود
      camGen++
      zoom.value = 1
      digitalZoom.value = 1
      zoomPending = null
      readZoomCaps()

      const v = videoRef.value
      if (!v) {
        stop()
        return
      }
      v.srcObject = s
      // iOS Safari بدون این‌ها ویدیو را تمام‌صفحه می‌کند یا پخش نمی‌کند
      v.setAttribute('playsinline', '')
      v.setAttribute('webkit-playsinline', '')
      v.muted = true
      try {
        await v.play()
      } catch {
        // بعضی مرورگرها (به‌ویژه سافاری) پخش را تا اولین لمس نگه می‌دارند
        needsTap.value = true
        const resume = async () => {
          try {
            await v.play()
            needsTap.value = false
          } catch {
            /* هنوز نه */
          }
        }
        document.addEventListener('touchend', resume, { once: true })
        document.addEventListener('click', resume, { once: true })
      }
      await new Promise((resolve) => {
        if (v.readyState >= 2 && v.videoWidth) return resolve()
        v.onloadeddata = () => resolve()
        setTimeout(resolve, 4000)
      })
      ready.value = true
    } catch (err) {
      error.value = describe(err)
      stop()
    } finally {
      starting.value = false
    }
  }

  async function toggleFacing() {
    await start(facingMode.value === 'user' ? 'environment' : 'user')
  }

  const onVisibility = () => {
    if (document.hidden) stop()
  }
  document.addEventListener('visibilitychange', onVisibility)

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibility)
    stop()
  })

  return {
    stream,
    facingMode,
    ready,
    starting,
    error,
    needsTap,
    zoom,
    digitalZoom,
    hasOpticalZoom,
    setZoom,
    isMirrored,
    start,
    stop,
    toggleFacing,
  }
}
