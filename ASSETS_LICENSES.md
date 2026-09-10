# منابع و پروانهٔ فایل‌ها

هیچ تصویر محصولی، لوگو یا نام برندی از فروشگاه‌ها و سایت‌های برندها برداشته نشده است.
فروشگاه‌های همکار بعداً تصاویر خودشان را می‌دهند.

## قلم

| فایل | منبع | پروانه |
|---|---|---|
| `src/assets/fonts/Vazirmatn-*.woff2` | https://github.com/rastikerdar/vazirmatn — نسخهٔ v33.003 | SIL Open Font License 1.1 — متن کامل در `src/assets/fonts/OFL.txt` |

## مدل‌ها و WASM

| فایل | منبع | پروانه |
|---|---|---|
| `public/mediapipe/wasm/*` | بستهٔ npm `@mediapipe/tasks-vision` | Apache License 2.0 |
| `public/mediapipe/models/face_landmarker.task` | https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task | Apache License 2.0 |
| `public/mediapipe/models/hand_landmarker.task` | https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task | Apache License 2.0 |
| `public/mediapipe/models/pose_landmarker_lite.task` | https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task | Apache License 2.0 |
| `public/mediapipe/models/selfie_segmenter.tflite` | https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite | Apache License 2.0 |

نسخهٔ سبکِ مدل بدن و مدل قطعه‌بندیِ دودسته‌ای عمداً انتخاب شده‌اند: برای
کاری که این‌جا لازم است (فقط شانه و لگن، و فقط جدا کردن شخص از پس‌زمینه)
دقتشان کافی است و در مجموع حدود ۱۹ مگابایت از حجم دانلود کم می‌کنند.

این فایل‌ها یک‌بار با `npm run setup` گرفته و داخل خود پروژه ذخیره می‌شوند.
در زمان اجرای اپ هیچ درخواستی به بیرون از دامنهٔ خود اپ فرستاده نمی‌شود.

## آیکون‌ها

| فایل | منبع | پروانه |
|---|---|---|
| `@mdi/font` (فونت Material Design Icons) | بستهٔ npm، محلی | Apache License 2.0 (خودِ آیکون‌ها) و SIL OFL 1.1 (فونت) |

آیکون شاتر (`mdi-camera-iris`)، چرخاندن دوربین، ذخیره و اشتراک‌گذاری از همین
مجموعه‌اند و داخل باندل‌اند؛ هیچ‌کدام از CDN گرفته نمی‌شوند.

## تصویر لباس‌ها

| فایل | منبع | پروانه |
|---|---|---|
| `src/assets/garments/*.svg` | ساختهٔ همین پروژه (وکتور، با اسکریپت پارامتری) | متعلق به همین پروژه |

به‌دنبال عکس‌های واقعیِ آزادِ لباس گشتیم، اما تعداد کافی عکسِ صافِ روبه‌روی
لباس با پروانهٔ مناسب پیدا نشد و ابزار حذف پس‌زمینه (`rembg`) هم روی این ماشین
نصب نبود. طبق همان قاعدهٔ جایگزین، به‌جای عکس، تصویرسازی وکتورِ تمیز ساخته شد:
مانتو (کرم و جین)، شومیز (گل‌ریز و شیری)، تیشرت و هودی. هر فایل پس‌زمینهٔ شفاف
دارد و نقاط لنگرِ شانه و لگن در آن ثابت‌اند، که همان چیزی است که موتور تطبیق
لازم دارد.

## کاغذرنگی و پیام‌های تشویقی

`src/lib/confetti.js` و `src/lib/praise.js` هر دو نوشتهٔ همین پروژه‌اند. هیچ
کتابخانهٔ کاغذرنگیِ بیرونی استفاده نشده است، چون قاعدهٔ «هیچ درخواستی به
بیرون» شامل کتابخانه‌ها هم می‌شود.

## نقش شمسه

`src/assets/shamse.svg` — ترسیم‌شده در همین پروژه، الهام‌گرفته از نقش‌های
هندسی کاشی‌کاری ایرانی. متعلق به همین پروژه.

## رنگ رژ، لاک و لنز

داده‌اند، نه تصویر: نام فارسیِ ساختهٔ همین پروژه، کد رنگ، و پرداخت
(`src/data/items.js`). بافت لنز در زمان اجرا به‌صورت procedural ساخته می‌شود.
هیچ نام یا کد رنگی از کاتالوگ برندی کپی نشده است؛ محدوده‌های رنگی بر پایهٔ
گروه‌های رایج آرایشی (نود، صورتی، قرمز، بری، قهوه‌ای) انتخاب شده‌اند.

## تصاویر آزمایش محلی

پوشهٔ `devtest/` سه عکس از ویکی‌مدیا کامنز دارد که فقط برای بررسی چشمیِ محلِ
قرارگیری پوشش‌ها استفاده می‌شوند. این پوشه در `.gitignore` است و در خروجی
`npm run build` نمی‌آید.

| فایل | منبع |
|---|---|
| `devtest/face.jpg` | https://commons.wikimedia.org/wiki/File:Elderly_Gambian_woman_face_portrait.jpg |
| `devtest/hand.jpg` | https://commons.wikimedia.org/wiki/File:Hand,_fingers_-_back.jpg |
| `devtest/body.jpg` | https://commons.wikimedia.org/wiki/File:Full-length_portrait_of_a_woman,_standing,_facing_front_LCCN2005692484.jpg |
| `devtest/person.jpg` | https://commons.wikimedia.org/wiki/File:Man_in_t-shirt_posing_(Unsplash).jpg |
