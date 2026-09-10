/**
 * به‌روزرسانی خودکار.
 *
 * وقتی نسخهٔ تازه‌ای منتشر می‌شود، مرورگر کاربر باید خودش آن را بگیرد — بدون
 * هیچ پیام، دکمه یا «رفرش کن». مسیرش این است:
 *
 *  ۱ سرویس‌ورکر تازه با `skipWaiting` بلافاصله جای قبلی را می‌گیرد.
 *  ۲ صفحه رویداد `controllerchange` را می‌شنود و یک‌بار خودش را نو می‌کند.
 *  ۳ برای تبی که ساعت‌ها باز مانده، هر دقیقه و هر بار که تب دوباره دیده
 *    می‌شود، وجود نسخهٔ تازه بررسی می‌شود.
 *
 * تنها ملاحظه: اگر کاربر همان لحظه وسط صفحهٔ پرو و جلوی دوربین است، نو شدن
 * تا وقتی از آن صفحه بیرون بیاید (یا تب پنهان شود) عقب می‌افتد. وسط دمو،
 * صفحه نباید زیر دست کاربر ری‌لود شود.
 */
const CHECK_EVERY_MS = 60_000

let reloading = false

function reloadNow() {
  if (reloading) return
  reloading = true
  window.location.reload()
}

function reloadWhenSafe(router) {
  const safe = () => document.hidden || router?.currentRoute?.value?.name !== 'tryon'
  if (safe()) return reloadNow()

  // تا خروج از صفحهٔ پرو صبر می‌کنیم
  const stop = router.afterEach(() => {
    if (safe()) {
      stop?.()
      reloadNow()
    }
  })
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) reloadNow()
    },
    { once: true }
  )
}

export function setupAutoUpdate(router, swUrl) {
  if (!('serviceWorker' in navigator)) return

  /* بارِ اول که سرویس‌ورکر نصب می‌شود هم `controllerchange` شلیک می‌شود، ولی
     آن‌جا چیزی برای نو کردن نیست. این پرچم باید *در لحظهٔ رویداد* بررسی شود،
     نه یک‌بار موقع راه‌اندازی — وگرنه بعد از همان نصبِ اول برای همیشه روی
     «هنوز کنترلری نیست» می‌ماند و آپدیت‌های بعدی هیچ‌وقت اعمال نمی‌شوند. */
  let controlled = Boolean(navigator.serviceWorker.controller)

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (controlled) reloadWhenSafe(router)
    controlled = true
  })

  navigator.serviceWorker
    .register(swUrl)
    .then((reg) => {
      // مسیر دوم: نسخهٔ تازه نصب شد در حالی که نسخهٔ قبلی کنترل را داشت
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing
        if (!sw) return
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            // `skipWaiting` داخل خود سرویس‌ورکر است؛ این فقط بیمهٔ مضاعف است
            sw.postMessage?.({ type: 'SKIP_WAITING' })
          }
        })
      })

      const check = () => reg.update().catch(() => {})
      check()
      setInterval(check, CHECK_EVERY_MS)
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) check()
      })
      window.addEventListener('online', check)
    })
    .catch((err) => {
      console.warn('[aynejan] service worker registration failed', err)
    })
}
