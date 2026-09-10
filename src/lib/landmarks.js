/**
 * ایندکس لندمارک‌ها.
 *
 * این حلقه‌ها از روی ثابت‌های خودِ بستهٔ @mediapipe/tasks-vision استخراج شده‌اند
 * (FaceLandmarker.FACE_LANDMARKS_LIPS / _LEFT_EYE / _RIGHT_EYE / _LEFT_IRIS /
 * _RIGHT_IRIS) — یال‌های هر ثابت پیمایش شده و به یک حلقهٔ مرتب تبدیل شده است،
 * نه از روی حافظه. با لایهٔ دیباگ روی چهرهٔ واقعی هم بررسی شده‌اند.
 *
 * ترتیب نقاط پادساعت‌گرد/ساعت‌گرد پیوسته است، پس می‌شود مستقیم به منحنی بستهٔ
 * Catmull-Rom دادشان.
 */

/** کانتور بیرونی لب (۲۰ نقطه) — ناحیهٔ پرشدنی رژ. */
export const LIPS_OUTER = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37,
  39, 40, 185,
]

/** کانتور داخلی لب (۲۰ نقطه) — از ماسک کم می‌شود تا دندان رنگی نشود. */
export const LIPS_INNER = [
  78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82,
  81, 80, 191,
]

/** پلک چشم چپِ تصویر‌شده (در MediaPipe «چشم چپِ فرد») — ۱۶ نقطه. */
export const EYE_LEFT = [
  263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466,
]

/** پلک چشم راستِ فرد — ۱۶ نقطه. */
export const EYE_RIGHT = [
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
]

/** حلقهٔ عنبیه (نیاز به outputFaceBlendshapes ندارد ولی مدل باید ۴۷۸ نقطه بدهد). */
export const IRIS_LEFT = [474, 475, 476, 477]
export const IRIS_RIGHT = [469, 470, 471, 472]
/** مرکز عنبیه‌ای که خود مدل می‌دهد؛ به‌عنوان کنترل کنار مرکز محاسبه‌شده به کار می‌رود. */
export const IRIS_LEFT_CENTER = 473
export const IRIS_RIGHT_CENTER = 468

/** نقاط عمودی/افقی برای سنجش باز بودن چشم (پلک بالا/پایین و گوشه‌ها). */
export const EYE_OPEN_PROBE = {
  left: { top: 386, bottom: 374, inner: 362, outer: 263 },
  right: { top: 159, bottom: 145, inner: 133, outer: 33 },
}

/** تعداد لندمارک چهره وقتی عنبیه هم برگردانده می‌شود. */
export const FACE_WITH_IRIS = 478

/* ------------------------------------------------------------------- دست */
/* از HandLandmarker.HAND_CONNECTIONS: 0 مچ، 1..4 شست، 5..8 اشاره،
   9..12 میانی، 13..16 انگشتری، 17..20 کوچک. */
export const HAND = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
}

/**
 * انگشت‌ها برای رندر ناخن.
 *
 * `wK`   عرض ناخن نسبت به «مقیاس دست» = فاصلهٔ مچ تا مفصل انگشت میانی.
 *        عرض از مقیاس دست گرفته می‌شود نه از طول بند، چون وقتی انگشت به سمت
 *        دوربین می‌چرخد طول بند کوتاه دیده می‌شود ولی عرض ناخن تقریباً ثابت است.
 * `lenK` طول ناخن نسبت به فاصلهٔ DIP تا نوک (این یکی باید با چرخش کوتاه شود).
 * `ratio` بیشینهٔ نسبت طول به عرض؛ جلوی کشیده‌شدن بیش از حد را می‌گیرد.
 *
 * جای ناخن از نوک انگشت لنگر می‌گیرد، نه از مفصل: لبهٔ آزاد کمی عقب‌تر از
 * نقطهٔ نوک می‌نشیند و ناخن از همان‌جا به عقب کشیده می‌شود (`TIP_INSET` در
 * `nailRenderer`). قبلاً مرکز ناخن روی درصدی از پارهٔ مفصل→نوک گذاشته می‌شد و
 * چون طول ناخن سقف دارد و با چرخش انگشت کوتاه می‌شود، هر خطای طول، لاک را از
 * روی ناخن به سمت بند انگشت پایین می‌آورد. با لنگرِ نوک، لبه همیشه سرِ جایش
 * است و فقط طول کم و زیاد می‌شود.
 */
export const NAIL_FINGERS = [
  { key: 'thumb', dip: HAND.THUMB_IP, tip: HAND.THUMB_TIP, base: HAND.THUMB_MCP, tune: { lenK: 0.62, wK: 0.176, ratio: 1.3 } },
  { key: 'index', dip: HAND.INDEX_DIP, tip: HAND.INDEX_TIP, base: HAND.INDEX_PIP, tune: { lenK: 0.62, wK: 0.148, ratio: 1.35 } },
  { key: 'middle', dip: HAND.MIDDLE_DIP, tip: HAND.MIDDLE_TIP, base: HAND.MIDDLE_PIP, tune: { lenK: 0.62, wK: 0.152, ratio: 1.35 } },
  { key: 'ring', dip: HAND.RING_DIP, tip: HAND.RING_TIP, base: HAND.RING_PIP, tune: { lenK: 0.62, wK: 0.139, ratio: 1.35 } },
  { key: 'pinky', dip: HAND.PINKY_DIP, tip: HAND.PINKY_TIP, base: HAND.PINKY_PIP, tune: { lenK: 0.62, wK: 0.116, ratio: 1.35 } },
]

/* -------------------------------------------------------------------- بدن */
/* از POSE_CONNECTIONS: 11-12 خط شانه، 11-13-15 و 12-14-16 بازوها،
   11-23 و 12-24 تنه، 23-24 خط لگن. (BlazePose، ۳۳ نقطه) */
export const POSE = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
}

/* ---------------------------------------------- مدل قطعه‌بندی سلفی (باینری) */
/* selfie_segmenter دو دسته دارد: پس‌زمینه و شخص. کدام عدد کدام است در فایل
   مدل تضمین‌شده نیست، پس در زمان اجرا با نمونه‌گیری از نقطهٔ بینی تعیین می‌شود
   (`personCategoryAt` در garmentRenderer). */
