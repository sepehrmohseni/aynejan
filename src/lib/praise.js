/**
 * پیام تشویقیِ بعد از گرفتن عکس.
 *
 * پیام باید به همان چیزی بخورد که کاربر همین الان پرو کرده. برای همین دو کار
 * می‌کند: خانوادهٔ رنگی را درست تشخیص می‌دهد، و اسم خودِ رنگ را داخل جمله
 * می‌آورد. اگر کاربر رنگ را عوض کند و جمله عوض نشود، حس می‌کند اپ حواسش
 * نیست — و همین یک حس، کل جشن را بی‌اثر می‌کند.
 */
import { hexToRgb } from './geom'

/** hex → h (درجه)، s و l (۰ تا ۱). */
function hsl(hex) {
  const { r, g, b } = hexToRgb(hex)
  const R = r / 255
  const G = g / 255
  const B = b / 255
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const d = max - min
  const l = (max + min) / 2
  const s = d === 0 || l === 0 || l === 1 ? 0 : d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (d > 0) {
    if (max === R) h = ((G - B) / d) % 6
    else if (max === G) h = (B - R) / d + 2
    else h = (R - G) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s, l }
}

/**
 * hex → یکی از خانواده‌های رنگیِ آرایشی.
 *
 * مرزها با خودِ رنگ‌های `data/items.js` سنجیده شده‌اند، چون در آرایش مرزها
 * جای همیشگیِ چرخهٔ رنگ نیستند: قهوه‌ای همان نارنجیِ تیره و کم‌رمق است، نود
 * همان نارنجیِ روشن، و شرابی و سرخابی هر دو در محدودهٔ سرخ‌آبی‌اند و فقط
 * روشنایی از هم جدایشان می‌کند.
 */
export function colorFamily(hex) {
  const { h, s, l } = hsl(hex)

  if (l <= 0.15) return 'dark'
  if (s < 0.14) return l < 0.35 ? 'dark' : 'neutral'

  // نارنجی تا زرد کم‌رنگ: قلمروِ نود، قهوه‌ای و قرمزِ آتشی
  if (h < 35) {
    if (s >= 0.6 && l < 0.62) return 'red'
    return l > 0.62 ? 'nude' : 'brown'
  }
  if (h < 70) return l < 0.45 && s < 0.5 ? 'green' : 'gold' // زیتونی از طلایی جدا
  if (h < 170) return 'green'
  if (h < 265) return 'blue'
  if (h < 325) return 'plum'
  // سرخ‌آبی: از صورتیِ روشن تا شرابیِ تیره
  if (h < 348) return l > 0.5 ? 'pink' : l > 0.4 ? 'red' : 'berry'
  return l > 0.62 ? 'pink' : l > 0.35 ? 'red' : 'berry'
}

/* هر خانواده چند جمله دارد و دست‌کم یکی‌شان اسم رنگ را می‌آورد، تا وقتی
   کاربر رنگ را عوض می‌کند جملهٔ تازه بی‌برو‌برگرد به همان رنگ تازه بخورد. */
const LIP = {
  red: [
    '«{name}» انگار برای تو نوشته شده.',
    'با «{name}» نگاه‌ها روی تو می‌مونه.',
    'یه قرمزِ درست، کل روزت رو عوض می‌کنه.',
  ],
  pink: [
    '«{name}» خیلی بهت میاد، خیلی.',
    'لبخندت با «{name}» قشنگ‌تره.',
    'ملیح و شیرین — دقیقاً اندازهٔ خودت.',
  ],
  nude: [
    '«{name}» آروم و شیکه؛ انگار اصلاً رژ نزدی، فقط قشنگ‌تر شدی.',
    '«{name}» پوستت رو روشن‌تر نشون می‌ده.',
    'ساده ولی حساب‌شده — سلیقه داری.',
  ],
  brown: [
    '«{name}» کلاسیک و بی‌زمانه.',
    'یه قهوه‌ایِ گرم که همیشه جواب می‌ده.',
    'رنگ‌های خاکی رو خوب می‌شناسی.',
  ],
  berry: [
    '«{name}» جسارت داره، مثل خودت.',
    'شب‌ها با «{name}» بدرخش.',
    'یه بریِ عمیق که همه‌چیزت رو جمع می‌کنه.',
  ],
  plum: [
    '«{name}» خیلی خاصه، مثل انتخابت.',
    'این بنفشِ گرم کم پیدا می‌شه.',
  ],
  gold: ['«{name}» گرم و آفتابیه، درست مثل حالِ خوب.'],
  dark: ['«{name}» بی‌پرواست. اگه دوستش داری، پس مالِ توئه.'],
  neutral: ['«{name}» ساده و تمیزه — همیشه جواب می‌ده.'],
  green: ['«{name}» جسورانه‌ست و تو خوب از پسش برمیای.'],
  blue: ['«{name}» جسورانه‌ست و تو خوب از پسش برمیای.'],
}

const NAIL = {
  red: ['با «{name}» دستات آمادهٔ عکس گرفتنه.', 'قرمزِ روی ناخن همیشه یعنی اعتمادبه‌نفس.'],
  pink: ['«{name}» دستات رو ظریف‌تر نشون می‌ده.', 'با «{name}» خیلی دخترونه و قشنگ شد.'],
  nude: ['«{name}» تمیز و مرتبه — انگار همین الان از سالن اومدی.', 'یه نودِ شیک که با همه‌چی می‌خوره.'],
  brown: ['«{name}» گرم و آرومه، مثل یه بعدازظهر خوب.'],
  berry: ['«{name}» روی ناخن خیلی گرون به‌نظر می‌رسه.', 'یه بریِ سیر که دست‌هات رو خاص می‌کنه.'],
  plum: ['«{name}» یه بنفشِ مخملیه که کم پیدا می‌شه.'],
  gold: ['«{name}» روی ناخن یعنی امشب مهمونی داری.'],
  green: ['«{name}» رو کم‌کسی جرئت می‌کنه؛ تو کردی.'],
  blue: ['«{name}» یه آبیِ آرومه که خیلی بهت میاد.'],
  dark: ['«{name}» تیره و شیکه. جسارتِ قشنگیه.'],
  neutral: ['«{name}» مرتب و ساده‌ست — همیشه درست.'],
}

const LENS = {
  brown: ['با «{name}» نگاهت گرم‌تر شد.', '«{name}» خیلی طبیعی نشست.'],
  nude: ['با «{name}» نگاهت گرم‌تر شد.', '«{name}» خیلی طبیعی نشست.'],
  gold: ['چشمات با «{name}» یه رنگ عسلیِ دلنشین داره.'],
  neutral: ['«{name}» نگاهت رو آروم و خاص کرده.'],
  dark: ['با «{name}» نگاهت عمق پیدا کرد.'],
  green: ['«{name}» خیلی بهت میاد؛ انگار همیشه همین بوده.'],
  blue: ['«{name}» نگاهت رو روشن کرده.'],
  red: ['نگاهت با «{name}» یه قصهٔ تازه‌ست.'],
  pink: ['نگاهت با «{name}» یه قصهٔ تازه‌ست.'],
  berry: ['نگاهت با «{name}» یه قصهٔ تازه‌ست.'],
  plum: ['نگاهت با «{name}» یه قصهٔ تازه‌ست.'],
}

const GARMENT_BY_KIND = {
  مانتو: ['«{name}» قشنگ تنت نشست.', '«{name}» اندازه‌ست و شیک — همینه.'],
  شومیز: ['«{name}» خیلی بهت میاد.', '«{name}» ظریف و مرتبه، دقیقاً اندازهٔ تو.'],
  تیشرت: ['«{name}» ساده و راحته، ولی خوش‌فرم.', 'همین سادگیِ «{name}» قشنگش کرده.'],
  هودی: ['«{name}» راحت و بامزه‌ست — حالِ خوبِ آخر هفته.'],
}

const GENERIC = [
  'عالی شد! همین‌طوری بدرخش.',
  'خیلی قشنگ شدی.',
  'این یکی رو نگه دار، ارزششو داره.',
]

/* دو جملهٔ آخر کنار گذاشته می‌شوند، نه یکی — وگرنه در خانواده‌های سه‌جمله‌ای
   کاربر مدام بین دو جملهٔ ثابت می‌چرخد. */
const recent = []
function pick(list) {
  const pool = list.filter((m) => !recent.includes(m))
  const from = pool.length ? pool : list
  const chosen = from[Math.floor(Math.random() * from.length)]
  recent.push(chosen)
  if (recent.length > 2) recent.shift()
  return chosen
}

let lastItemId = null

/**
 * @param {string} categoryId
 * @param {object} item
 * @returns {{ title: string, colors: string[] }}
 */
export function praiseFor(categoryId, item) {
  if (!item) return { title: pick(GENERIC), colors: ['#B4234C', '#E8A33D', '#F7E9EC'] }

  const table =
    categoryId === 'garment'
      ? null
      : categoryId === 'nail'
        ? NAIL
        : categoryId === 'lens'
          ? LENS
          : LIP

  const list = table
    ? (table[colorFamily(item.hex)] ?? GENERIC)
    : (GARMENT_BY_KIND[item.kind] ?? GENERIC)

  /* اگر کاربر رنگ را عوض کرده، جمله حتماً اسم رنگِ تازه را می‌آورد. همین یک
     قاعده، شبههٔ «انگار هنوز مال رنگ قبلیه» را از بین می‌برد. */
  const changed = item.id !== lastItemId
  lastItemId = item.id
  const named = list.filter((m) => m.includes('{name}'))
  const pool = changed && named.length ? named : list

  return {
    title: pick(pool).replace('{name}', item.name),
    colors: confettiColors(item.hex),
  }
}

/** رنگ‌های کاغذرنگی: رنگ خودِ آیتم + رنگ‌های برند. */
export function confettiColors(hex) {
  return [hex, hex, '#E8A33D', '#B4234C', '#F7E9EC', '#2E9C93']
}
