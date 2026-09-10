import { timestampFilename } from './persian'

/**
 * ذخیرهٔ عکس.
 *
 * مرورگر اجازه ندارد مستقیم در گالری گوشی بنویسد. پس اگر «هم‌رسانی فایل»
 * پشتیبانی شود، فایل به برگهٔ اشتراک‌گذاری سیستم داده می‌شود (در آیفون کاربر
 * «Save Image» را می‌زند، در اندروید مقصد را انتخاب می‌کند). در غیر این صورت
 * فایل دانلود می‌شود؛ در اندروید پوشهٔ دانلود در گالری هم دیده می‌شود.
 */
export function fileFromBlob(blob) {
  return new File([blob], timestampFilename(), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })
}

export function canShareFile(file) {
  try {
    return Boolean(navigator.canShare?.({ files: [file] }) && navigator.share)
  } catch {
    return false
  }
}

/** برمی‌گرداند: 'share' | 'download' | 'cancelled' */
export async function saveImage(blob) {
  const file = fileFromBlob(blob)
  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title: 'آینه‌جان' })
      return 'share'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
      // اگر هم‌رسانی شکست خورد، دانلود جایگزین می‌شود
    }
  }
  downloadBlob(blob, file.name)
  return 'download'
}

/** فقط هم‌رسانی، بدون جایگزینِ دانلود (برای دکمهٔ «اشتراک‌گذاری»). */
export async function shareImage(blob) {
  const file = fileFromBlob(blob)
  if (!canShareFile(file)) return 'unsupported'
  try {
    await navigator.share({ files: [file], title: 'آینه‌جان', text: 'با آینه‌جان پرو کردم' })
    return 'share'
  } catch (err) {
    return err?.name === 'AbortError' ? 'cancelled' : 'unsupported'
  }
}

export function downloadBlob(blob, name = timestampFilename()) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
