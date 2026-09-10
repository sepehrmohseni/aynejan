import { ref, shallowRef, onBeforeUnmount } from 'vue'

/**
 * دوربین: گرفتن استریم، جابه‌جایی جلو/عقب، و خطاهای فارسی.
 * تصویر هیچ‌وقت از دستگاه بیرون نمی‌رود؛ اینجا هیچ درخواست شبکه‌ای نیست.
 */
export function useCamera(videoRef) {
  const stream = shallowRef(null)
  const facingMode = ref('user')
  const ready = ref(false)
  const starting = ref(false)
  const error = ref(null) // { title, body, canRetry }
  const needsTap = ref(false)

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
         ۷۲۰×۱۲۸۰ و روی دسکتاپِ افقی ۱۲۸۰×۷۲۰. اگر دوربین این نسبت را نداشته
         باشد مرورگر نزدیک‌ترین حالت را می‌دهد و حلقهٔ پرو خودش تطبیق می‌دهد. */
      const portrait = window.innerHeight >= window.innerWidth
      const long = 1280
      const short = 720
      const s = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: mode },
          width: { ideal: portrait ? short : long },
          height: { ideal: portrait ? long : short },
        },
      })
      stream.value = s

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
    isMirrored,
    start,
    stop,
    toggleFacing,
  }
}
