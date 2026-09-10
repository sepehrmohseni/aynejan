/**
 * دادهٔ آیتم‌ها — تنها منبع حقیقت برای همهٔ دسته‌ها.
 *
 * ساختار عمداً شبیه پاسخ یک API است تا بعداً بتوان این فایل را با یک بک‌اند
 * جایگزین کرد: هر دسته یک آرایه از آیتم‌ها با کلید `id` یکتا.
 *
 * رژ لب و لاک ناخن «داده» هستند نه تصویر: نام فارسی، کد رنگ، و پرداخت.
 * بافت لنز در زمان اجرا به‌صورت procedural ساخته می‌شود.
 * تصویر لباس‌ها وکتور و ساختهٔ همین پروژه است (ASSETS_LICENSES.md).
 */

// تصاویر لباس با هش نسخه از طریق Vite وارد می‌شوند تا هیچ مسیر CDN لازم نباشد.
const garmentUrls = import.meta.glob('../assets/garments/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})
const garment = (file) => garmentUrls[`../assets/garments/${file}`]

/** پرداخت‌ها: نام نمایشی فارسی */
export const FINISHES = {
  matte: 'مات',
  glossy: 'براق',
  satin: 'ساتن',
}

export const CATEGORIES = [
  {
    id: 'garment',
    title: 'لباس',
    subtitle: 'مانتو، شومیز، تیشرت، هودی',
    hint: 'کمی عقب‌تر برو تا شونه‌ها و کمرت دیده بشه',
    icon: 'mdi-tshirt-crew-outline',
    accent: '#D94F74',
  },
  {
    id: 'lip',
    title: 'رژ لب',
    subtitle: 'شانزده رنگ، سه پرداخت',
    hint: 'صورتت رو وسط کادر بیار',
    icon: 'mdi-lipstick',
    accent: '#B4234C',
  },
  {
    id: 'nail',
    title: 'ناخن',
    subtitle: 'لاک با پرداخت مات و براق',
    hint: 'پشت دستت رو رو به دوربین بگیر',
    icon: 'mdi-hand-back-right-outline',
    accent: '#E8A33D',
  },
  {
    id: 'lens',
    title: 'لنز',
    subtitle: 'شش رنگ طبیعی',
    hint: 'صورتت رو وسط کادر بیار و مستقیم نگاه کن',
    icon: 'mdi-eye-outline',
    accent: '#2E9C93',
  },
]

export const categoryById = (id) => CATEGORIES.find((c) => c.id === id)

/* ------------------------------------------------------------------ رژ لب */
/* رنگ‌ها بر پایهٔ محدوده‌های رایج آرایشی (نود، صورتی، قرمز، بری، قهوه‌ای)
   انتخاب شده‌اند. نام‌ها ساختهٔ همین پروژه‌اند و به هیچ برندی وابسته نیستند. */
export const LIPS = [
  { id: 'lip-01', name: 'شهد خرما', hex: '#A9705C', finish: 'satin' },
  { id: 'lip-02', name: 'بادام سوخته', hex: '#B4796B', finish: 'matte' },
  { id: 'lip-03', name: 'نُقلی', hex: '#D89A93', finish: 'satin' },
  { id: 'lip-04', name: 'گلاب', hex: '#E3A9A4', finish: 'glossy' },
  { id: 'lip-05', name: 'شکوفهٔ بهار', hex: '#E58AA0', finish: 'glossy' },
  { id: 'lip-06', name: 'ارکیده', hex: '#C96C8F', finish: 'satin' },
  { id: 'lip-07', name: 'صورتی یخی', hex: '#EFA6B4', finish: 'glossy' },
  { id: 'lip-08', name: 'انار', hex: '#B4234C', finish: 'matte' },
  { id: 'lip-09', name: 'شقایق', hex: '#D62F3A', finish: 'glossy' },
  { id: 'lip-10', name: 'لعل', hex: '#A81E36', finish: 'satin' },
  { id: 'lip-11', name: 'آتش‌گون', hex: '#E23B2E', finish: 'matte' },
  { id: 'lip-12', name: 'توت وحشی', hex: '#9E2050', finish: 'satin' },
  { id: 'lip-13', name: 'بادمجانی', hex: '#6E2340', finish: 'matte' },
  { id: 'lip-14', name: 'شرابِ کهنه', hex: '#7B1E3C', finish: 'matte' },
  { id: 'lip-15', name: 'دارچین', hex: '#94513F', finish: 'matte' },
  { id: 'lip-16', name: 'قهوهٔ ترک', hex: '#6F3B33', finish: 'satin' },
]

/* ------------------------------------------------------------------- ناخن */
export const NAILS = [
  { id: 'nail-01', name: 'صدفی', hex: '#EFE3DC', finish: 'glossy' },
  { id: 'nail-02', name: 'شیر و عسل', hex: '#E8C9A8', finish: 'satin' },
  { id: 'nail-03', name: 'نودِ خاکی', hex: '#C9A18A', finish: 'matte' },
  { id: 'nail-04', name: 'صورتی باله', hex: '#F0C3CB', finish: 'glossy' },
  { id: 'nail-05', name: 'گل یخ', hex: '#E1A7B8', finish: 'satin' },
  { id: 'nail-06', name: 'سرخابی', hex: '#D2456F', finish: 'glossy' },
  { id: 'nail-07', name: 'انار', hex: '#B4234C', finish: 'glossy' },
  { id: 'nail-08', name: 'لعل سرخ', hex: '#A31931', finish: 'matte' },
  { id: 'nail-09', name: 'شرابی', hex: '#6E1F38', finish: 'satin' },
  { id: 'nail-10', name: 'بادمجانی', hex: '#4C1E3D', finish: 'matte' },
  { id: 'nail-11', name: 'فیروزه', hex: '#2E9C93', finish: 'glossy' },
  { id: 'nail-12', name: 'نیلی', hex: '#2B4C86', finish: 'satin' },
  { id: 'nail-13', name: 'زیتونی', hex: '#6B6B3A', finish: 'matte' },
  { id: 'nail-14', name: 'طلایی', hex: '#C9962F', finish: 'glossy' },
  { id: 'nail-15', name: 'دودی', hex: '#6E6670', finish: 'matte' },
  { id: 'nail-16', name: 'مشکی مخملی', hex: '#1B1620', finish: 'matte' },
]

/* -------------------------------------------------------------------- لنز */
/* هر لنز فقط پارامتر است؛ بافت الیاف و حلقهٔ لیمبال در lensRenderer ساخته می‌شود.
   `hex` رنگ پایه، `ring` رنگ حلقهٔ بیرونی، `fiber` رنگ الیاف روشن. */
export const LENSES = [
  { id: 'lens-01', name: 'عسلی', hex: '#A8763C', ring: '#4A3316', fiber: '#E0B36A' },
  { id: 'lens-02', name: 'طوسی', hex: '#7C8896', ring: '#2E3740', fiber: '#C3CDD8' },
  { id: 'lens-03', name: 'سبز', hex: '#4E8B5A', ring: '#1E3A26', fiber: '#96C79E' },
  { id: 'lens-04', name: 'آبی', hex: '#3C6EA5', ring: '#16304F', fiber: '#8FB8DC' },
  { id: 'lens-05', name: 'قهوه‌ای روشن', hex: '#8B5A3C', ring: '#3A2115', fiber: '#C99A6E' },
  { id: 'lens-06', name: 'زیتونی', hex: '#7E8B4F', ring: '#333A1C', fiber: '#C0CC91' },
]

/* ------------------------------------------------------------------- لباس */
/* لنگرها در فضای نرمال‌شدهٔ تصویر (۰ تا ۱) — با ساخت SVG ثابت شده‌اند و
   garmentRenderer با همین‌ها تصویر را روی شانه و لگن کاربر تطبیق می‌دهد. */
const GARMENT_ANCHORS = {
  shoulderL: [178 / 800, 150 / 1100],
  shoulderR: [622 / 800, 150 / 1100],
  hipL: [248 / 800, 760 / 1100],
  hipR: [552 / 800, 760 / 1100],
}

export const GARMENTS = [
  {
    id: 'garment-01',
    name: 'مانتوی کِرِم',
    kind: 'مانتو',
    hex: '#E4CDB2',
    src: garment('manto-cream.svg'),
    anchors: GARMENT_ANCHORS,
  },
  {
    id: 'garment-02',
    name: 'مانتوی جین',
    kind: 'مانتو',
    hex: '#4A6D96',
    src: garment('manto-denim.svg'),
    anchors: GARMENT_ANCHORS,
  },
  {
    id: 'garment-03',
    name: 'شومیز گل‌ریز',
    kind: 'شومیز',
    hex: '#DCA0AE',
    src: garment('shomiz-rose.svg'),
    anchors: GARMENT_ANCHORS,
  },
  {
    id: 'garment-04',
    name: 'شومیز شیری',
    kind: 'شومیز',
    hex: '#F1EAE0',
    src: garment('shomiz-ivory.svg'),
    anchors: GARMENT_ANCHORS,
  },
  {
    id: 'garment-05',
    name: 'تیشرت انار',
    kind: 'تیشرت',
    hex: '#B4234C',
    src: garment('tshirt-anar.svg'),
    anchors: GARMENT_ANCHORS,
  },
  {
    id: 'garment-06',
    name: 'هودی دودی',
    kind: 'هودی',
    hex: '#6E6470',
    src: garment('hoodie-ash.svg'),
    anchors: GARMENT_ANCHORS,
  },
]

const BY_CATEGORY = { lip: LIPS, nail: NAILS, lens: LENSES, garment: GARMENTS }

export const itemsOf = (categoryId) => BY_CATEGORY[categoryId] ?? []
export const itemById = (categoryId, itemId) =>
  itemsOf(categoryId).find((i) => i.id === itemId)
