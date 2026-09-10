/**
 * پیام تشویقیِ بعد از گرفتن عکس.
 *
 * پیام بر اساس دسته و «خانوادهٔ رنگی» آیتم انتخاب می‌شود، تا حرفی که به کاربر
 * زده می‌شود واقعاً به همان چیزی بخورد که پرو کرده — نه یک جملهٔ عمومی.
 */
import { hexToRgb } from './geom'

/** hex → یکی از خانواده‌های رنگی. */
export function colorFamily(hex) {
  const { r, g, b } = hexToRgb(hex)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2 / 255
  const d = max - min
  const s = d === 0 ? 0 : d / (255 - Math.abs(max + min - 255))

  if (s < 0.16) return l < 0.3 ? 'dark' : 'neutral'

  let h
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
  else if (max === g) h = ((b - r) / d + 2) * 60
  else h = ((r - g) / d + 4) * 60

  if (h < 16 || h >= 340) return l < 0.34 ? 'berry' : 'red'
  if (h < 40) return l > 0.55 ? 'nude' : 'brown'
  if (h < 70) return 'gold'
  if (h < 170) return 'green'
  if (h < 260) return 'blue'
  if (h < 300) return 'plum'
  return l > 0.6 ? 'pink' : 'berry'
}

/* هر گروه چند جمله دارد تا دوبار پشت‌سرهم یکی تکرار نشود. */
const LIP = {
  red: [
    'این قرمز انگار برای تو نوشته شده.',
    'با این رنگ، نگاه‌ها روی تو می‌مونه.',
    'یه قرمزِ درست، کل روزت رو عوض می‌کنه.',
  ],
  pink: [
    'این صورتی خیلی بهت میاد، خیلی.',
    'ملیح و شیرین — دقیقاً اندازهٔ خودت.',
    'لبخندت با این رنگ قشنگ‌تره.',
  ],
  nude: [
    'آروم و شیک. انگار اصلاً رژ نزدی، فقط قشنگ‌تر شدی.',
    'این نودِ گرم، پوستت رو روشن‌تر نشون می‌ده.',
    'ساده ولی حساب‌شده — سلیقه داری.',
  ],
  berry: [
    'این رنگ جسارت داره، مثل خودت.',
    'یه بریِ عمیق که همه‌چیزت رو جمع می‌کنه.',
    'شب‌ها با این رنگ بدرخش.',
  ],
  plum: ['این بنفشِ گرم خیلی خاصه، مثل انتخابت.', 'رنگ‌های کم‌پیدا رو خوب می‌شناسی.'],
  brown: [
    'این قهوه‌ای، کلاسیک و بی‌زمانه.',
    'یه رنگ گرم که همیشه جواب می‌ده.',
  ],
  gold: ['یه رنگ گرم و آفتابی، درست مثل حالِ خوب.'],
  dark: ['تیره و بی‌پروا. اگه دوستش داری، پس مالِ توئه.'],
  neutral: ['ساده و تمیز — همیشه جواب می‌ده.'],
  green: ['جسور بودن هم قشنگه.'],
  blue: ['جسور بودن هم قشنگه.'],
}

const NAIL = {
  red: ['دستات آمادهٔ عکس گرفتنه.', 'قرمزِ روی ناخن، همیشه یعنی اعتمادبه‌نفس.'],
  pink: ['این صورتی، دستات رو ظریف‌تر نشون می‌ده.', 'خیلی دخترونه و قشنگ شد.'],
  nude: ['تمیز و مرتب — انگار همین الان از سالن اومدی.', 'یه نودِ شیک که با همه‌چی می‌خوره.'],
  berry: ['این رنگ روی ناخن خیلی گرون به‌نظر می‌رسه.'],
  plum: ['یه بنفشِ مخملی که کم پیدا می‌شه.'],
  brown: ['گرم و آروم، مثل یه بعدازظهر خوب.'],
  gold: ['طلایی روی ناخن یعنی امشب مهمونی داری.'],
  dark: ['تیره و شیک. جسارتِ قشنگیه.'],
  neutral: ['مرتب و ساده — همیشه درست.'],
  green: ['این رنگ رو کم‌کسی جرئت می‌کنه؛ تو کردی.'],
  blue: ['یه آبیِ آروم که خیلی بهت میاد.'],
}

const LENS = {
  brown: ['نگاهت گرم‌تر شد.', 'این عسلی خیلی طبیعی نشست.'],
  nude: ['نگاهت گرم‌تر شد.', 'این عسلی خیلی طبیعی نشست.'],
  gold: ['چشمات الان یه رنگ عسلیِ دلنشین داره.'],
  neutral: ['این طوسی، نگاهت رو آروم و خاص کرده.'],
  dark: ['نگاهت عمق پیدا کرد.'],
  green: ['چشمای سبز خیلی بهت میاد؛ انگار همیشه همین بوده.'],
  blue: ['این آبی، نگاهت رو روشن کرده.'],
  red: ['نگاهت الان یه قصهٔ تازه‌ست.'],
  pink: ['نگاهت الان یه قصهٔ تازه‌ست.'],
  berry: ['نگاهت الان یه قصهٔ تازه‌ست.'],
  plum: ['نگاهت الان یه قصهٔ تازه‌ست.'],
}

const GARMENT_BY_KIND = {
  مانتو: ['این مانتو قشنگ تنت نشست.', 'اندازه‌ست و شیک — همینه.'],
  شومیز: ['این شومیز خیلی بهت میاد.', 'ظریف و مرتب، دقیقاً اندازهٔ تو.'],
  تیشرت: ['ساده و راحت، ولی خوش‌فرم.', 'همین سادگی قشنگش کرده.'],
  هودی: ['راحت و بامزه — حالِ خوبِ آخر هفته.'],
}

const GENERIC = [
  'عالی شد! همین‌طوری بدرخش.',
  'خیلی قشنگ شدی.',
  'این یکی رو نگه دار، ارزششو داره.',
]

let lastPicked = null
function pick(list) {
  const pool = list.filter((m) => m !== lastPicked)
  const chosen = (pool.length ? pool : list)[Math.floor(Math.random() * (pool.length || list.length))]
  lastPicked = chosen
  return chosen
}

/**
 * @param {string} categoryId
 * @param {object} item
 * @returns {{ title: string, colors: string[] }}
 */
export function praiseFor(categoryId, item) {
  if (!item) return { title: pick(GENERIC), colors: ['#B4234C', '#E8A33D', '#F7E9EC'] }

  if (categoryId === 'garment') {
    const list = GARMENT_BY_KIND[item.kind] ?? GENERIC
    return { title: pick(list), colors: confettiColors(item.hex) }
  }

  const table = categoryId === 'nail' ? NAIL : categoryId === 'lens' ? LENS : LIP
  const family = colorFamily(item.hex)
  return { title: pick(table[family] ?? GENERIC), colors: confettiColors(item.hex) }
}

/** رنگ‌های کاغذرنگی: رنگ خودِ آیتم + رنگ‌های برند. */
export function confettiColors(hex) {
  return [hex, hex, '#E8A33D', '#B4234C', '#F7E9EC', '#2E9C93']
}
