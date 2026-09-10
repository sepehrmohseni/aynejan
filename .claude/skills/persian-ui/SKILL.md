---
name: persian-ui
description: Use when writing or reviewing any user-visible text, layout, or styling in the aynejan app — Persian copy, RTL layout, Persian digits, Vuetify theme, colors, typography, touch targets, or accessibility. Triggers: "add a screen", "change the wording", "fix the layout", "this looks off", "add a button", "error message", "empty state".
---

# رابط فارسی و راست‌به‌چپ

## متن

- **هیچ کلمهٔ انگلیسیِ قابل‌دیدن.** شامل پیام خطا، حالت خالی، `aria-label`،
  و متن دکمه‌ها.
- عددِ نمایشی همیشه با ارقام فارسی: `fa(12)` از `src/lib/persian.js`.
  نام فایل عکس استثناست (لاتین می‌ماند).
- لحن: گرم، صمیمی، محاوره‌ای ولی مؤدب. مخاطب دخترها و زن‌های ۱۸ تا ۳۵.
  «صورتت رو وسط کادر بیار» درست است؛ «لطفاً چهرهٔ خود را در مرکز کادر قرار
  دهید» خشک است.
- پیام خطا باید بگوید چه کار کند، نه فقط چه شد. نمونه در `useCamera.js`.

## چیدمان

- `<html lang="fa" dir="rtl">` و Vuetify با `locale: 'fa'` و `rtl: { fa: true }`.
- از ویژگی‌های منطقی استفاده کن: `inset-inline`, `margin-inline`,
  `padding-inline` — نه `left`/`right`.
- آیکون بازگشت `mdi-chevron-right` است (در راست‌به‌چپ، برگشت به راست است).
- هر هدف لمسی حداقل ۴۴×۴۴ پیکسل.

## پالت (از `DESIGN.md`)

| نام | متغیر | کاربرد |
|---|---|---|
| شبق | `--c-shabaq` `#17101A` | زمینه |
| انار | `--c-anar` `#B4234C` | کنش اصلی |
| زعفران | `--c-zaferan` `#E8A33D` | تأکید، حالت فعال |
| گلاب | `--c-golab` `#F7E9EC` | متن روی تیره |
| فیروزه | `--c-firouzeh` `#2E9C93` | موفقیت |
| خاکستر گلی | `--c-ash` `#8A7680` | متن ثانویه |

گرادیان تزئینی و کارت‌های عمومیِ SaaS ممنوع. نقش «شمسه»
(`.shamse-bg`) برای بافت پس‌زمینه هست.

## تایپ

وزیرمتن، محلی. کلاس‌های آماده: `.t-page` ۳۲/۸۰۰، `.t-tile` ۲۲/۷۰۰،
`.t-body` ۱۷/۵۰۰، `.t-note` ۱۵/۴۰۰، `.t-tiny` ۱۳/۵۰۰.

## روی تصویر دوربین

هر متنی که روی تصویر زنده می‌نشیند باید داخل کلاس `.on-camera` باشد
(زمینهٔ تیرهٔ نیمه‌شفاف + بلور)، وگرنه روی تصویر روشن خوانده نمی‌شود.

## حرکت

`prefers-reduced-motion` در `main.css` همهٔ انیمیشن‌ها را خاموش می‌کند.
هر انیمیشن تازه باید با آن سازگار باشد؛ کاغذرنگی (`confetti.js`) در آن حالت
به‌جای حرکت، یک تصویر ثابت می‌کشد.

## بررسی چشمی

```bash
npm run dev
# بعد با کروم بدون‌رابط از صفحه‌ها عکس بگیر و واقعاً نگاه کن
```

اندازهٔ مرجع: ۴۱۲×۸۹۲ (گوشی) و ۱۴۴۰×۹۰۰ (دسکتاپ). هر دو باید درست باشند.
