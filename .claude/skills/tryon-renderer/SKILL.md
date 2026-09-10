---
name: tryon-renderer
description: Use when adding, tuning, or debugging a try-on overlay renderer in the aynejan app (lipstick, colored lenses, nails, garments) — anything involving MediaPipe landmarks, overlay placement accuracy, canvas blending, or the debug landmark layer. Triggers: "lipstick is offset", "nails are the wrong size", "add a blush renderer", "lens drifts", "garment does not follow shoulders", "tune landmark placement".
---

# ساخت و تنظیم رندرر پرو

## قاعدهٔ اول: ایندکس را حدس نزن

همهٔ ایندکس‌ها در `src/lib/landmarks.js` هستند و از روی ثابت‌های خودِ بستهٔ
`@mediapipe/tasks-vision` استخراج شده‌اند، نه از حافظه. اگر ایندکس تازه لازم
داری، همان‌طور استخراج کن:

```bash
node -e "
const { FaceLandmarker, HandLandmarker, PoseLandmarker } =
  require('./node_modules/@mediapipe/tasks-vision/vision_bundle.cjs')
console.log(JSON.stringify(FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW))
"
```

یال‌ها `{start, end}` هستند. برای تبدیل به حلقهٔ مرتب، گراف مجاورت بساز و
پیمایش کن (نمونه‌اش همان روشی است که حلقه‌های لب و چشم ساخته شده‌اند).

## قرارداد

```js
export function createXRenderer() {
  return {
    id: 'x',
    needs: 'face',                    // face | hand | pose
    async init(onProgress) { model = await loadFaceLandmarker(onProgress) },
    reset() { filter.reset() },
    detect(video, ts) { /* → نتیجه یا null */ },
    hint(result, frame) { /* → جملهٔ فارسی یا null */ },
    draw(ctx, result, item, frame) { /* روی همان بوم */ },
    drawDebug(ctx, result, frame) { /* نقطه + شماره */ },
  }
}
```

بعد در `src/views/TryOnView.vue` به `FACTORIES` اضافه‌اش کن و در
`src/lib/mediapipe.js` به `NEEDS` (برای پیش‌دریافت).

## هندسه

همیشه `frame.map(landmark)` — هیچ‌وقت دستی `x * canvas.width`. این تابع
آینه‌شدن دوربین سلفی، برشِ پوشاننده و حالت جا-شدنِ کامل را با هم درست می‌کند.
اگر خودت حساب کنی، روی یکی از سه حالت خراب می‌شود.

`frame.alpha` را در `globalAlpha` ضرب کن تا وقتی ردیابی از دست می‌رود پوشش
محو شود، نه اینکه سرِ جایش یخ بزند.

## نرم‌کردن

`LandmarkFilter` از `src/lib/oneEuro.js`. `minCutOff` کمتر = نرم‌تر ولی
کندتر؛ `beta` بیشتر = دنبال‌کردن بهتر حرکت تند. مقدارهای فعلی:

| رندرر | minCutOff | beta | چرا |
|---|---|---|---|
| لب | ۱٫۶ | ۰٫۱۲ | باید با حرف‌زدن سریع همراه شود |
| لنز | ۱٫۱ | ۰٫۰۶ | چشم کم‌حرکت است، نرمی مهم‌تر است |
| ناخن | ۱٫۴ | ۰٫۱ | دست تند حرکت می‌کند |
| لباس | ۰٫۹ | ۰٫۰۵ | تنه آرام است، لرزش زشت‌تر است |

## ترکیب رنگ روی پوست

رنگ تخت روی پوست مصنوعی می‌شود. الگوی به‌کاررفته در `lipRenderer`:

1. ماسک بساز (کانتور بیرونی منهای کانتور داخلی).
2. لبه را با `ctx.filter = 'blur(Npx)'` نرم کن — و حتماً حالتی هم بگذار که
   مرورگر `filter` نداشته باشد (سافاری قدیمی).
3. یک پاس `multiply` تا بافت و سایهٔ طبیعی حفظ شود.
4. برای رنگ‌های روشن یک پاس `screen` با شدت وابسته به روشنایی رنگ.
5. یک پاس کم‌رنگ `source-over` برای پوشش.
6. براقی: هایلایت نرم با `screen`، بریده‌شده به همان ماسک.

برای بازگرداندن جزئیات واقعیِ زیر پوشش (مثل برقِ چشم در `lensRenderer`)،
قبل از کشیدن پوشش از همان ناحیه عکس فوری بگیر و بعد با `luminosity` و
`screen` برگردان، بعد آلفا را با `destination-in` به شکل درست محدود کن.

## روش تنظیم

۱. دیباگ را روشن کن (نگه‌داشتن نام دسته در نوار بالا).
۲. با `harness.html` روی عکس واقعی اجرا کن:
   `?mode=lip&img=/devtest/face.jpg&i=7&debug=1`
۳. ضریب‌ها را در بالای فایل رندرر (بخش «تنظیم‌ها») عوض کن، نه وسط کد.
۴. دوباره نگاه کن. تا وقتی روی سوژهٔ واقعی درست ننشسته، کار تمام نیست.

## چیزهایی که قبلاً اشتباه بوده‌اند

- عرض ناخن از طول بند انگشت گرفته می‌شد؛ با چرخش انگشت خراب می‌شد. حالا عرض
  از «مقیاس دست» (مچ تا مفصل انگشت میانی) می‌آید و طول از پارهٔ DIP→نوک.
- برشِ پوشاننده وقتی نسبت ویدیو با نسبت صفحه خیلی فرق داشت، بزرگ‌نمایی
  افراطی می‌داد. حالا بالای آستانه، به حالت جا-شدنِ کامل سوییچ می‌کند.
- نقاط لگن وقتی بیرون کادرند هم `visibility` بالا می‌گیرند؛ باید `y` هم
  بررسی شود وگرنه طول تنه بی‌اندازه می‌شود.
