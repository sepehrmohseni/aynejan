const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

/** ارقام لاتین را به فارسی تبدیل می‌کند. */
export function fa(value) {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[+d])
}

/** تاریخ و ساعت برای نام فایل عکس — با ارقام لاتین چون نام فایل است. */
export function timestampFilename(prefix = 'aynejan') {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${prefix}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(
    d.getHours()
  )}${p(d.getMinutes())}${p(d.getSeconds())}.jpg`
}
