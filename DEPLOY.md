# راهنمای انتشار — aynejan.sepehrmoh97.ir

این فایل برای کسی (یا مدلی) نوشته شده که بعداً می‌خواهد این پروژه را روی همان
سرور به‌روز کند. همه‌چیز واقعی است و روی همین سرور اجرا و آزمایش شده است.

## وضعیت فعلی سرور

| | |
|---|---|
| میزبان | `185.190.39.56` (Ubuntu 26.04) |
| کاربر | `root` با کلید SSH |
| وب‌سرور | nginx ۱.۲۸ روی پورت ۸۰ و ۴۴۳ |
| گواهی TLS | `/etc/ssl/cloudflare/sepehrmoh97.ir.pem` — Origin CA کلودفلیر، شامل `*.sepehrmoh97.ir`، معتبر تا ۲۰۴۱ |
| پروژهٔ دیگر روی همین سرور | `sepehrmoh97.ir` — یک اپ Nuxt/Nitro که با سرویس `portfolio.service` روی `127.0.0.1:3000` بالاست و nginx به آن پروکسی می‌کند |
| فایل پیکربندی پورتفولیو | `/etc/nginx/sites-enabled/portfolio` |
| فایل پیکربندی آینه‌جان | `/etc/nginx/sites-enabled/aynejan` → `/etc/nginx/sites-available/aynejan` |
| بدنهٔ مشترک آینه‌جان | `/etc/nginx/snippets/aynejan-app.conf` |
| ریشهٔ فایل‌ها | `/var/www/aynejan/current` (لینک نمادین به آخرین انتشار) |
| نسخه‌ها | `/var/www/aynejan/releases/<تاریخ-ساعت>/` — سه تای آخر نگه داشته می‌شوند |
| پشتیبان nginx | `/root/nginx-backups/nginx-<تاریخ>.tar.gz` |

## چرا داکر نیست

این اپ یک بستهٔ کاملاً استاتیک است (HTML/JS/WASM/مدل). nginx همین حالا روی
۸۰ و ۴۴۳ نشسته و TLS را تمام می‌کند. اگر داکر اضافه کنیم یا باید یک nginx
دوم داخل کانتینر بگذاریم و از میزبان به آن پروکسی کنیم (یک پرش اضافه و
قطعهٔ متحرک بیشتر)، یا باید پیکربندی nginx میزبان را جابه‌جا کنیم که مستقیماً
پورتفولیوی زنده را به خطر می‌اندازد. برای یک بستهٔ استاتیک هیچ سودی ندارد.

اگر بعداً واقعاً داکر لازم شد (مثلاً چند سرویس شد)، مسیر امن این است:
کانتینر روی یک پورت محلی مثل `127.0.0.1:8080` بالا بیاید و در بلوک
`aynejan` به‌جای `root` از `proxy_pass` استفاده شود. بلوک پورتفولیو دست
نخورد.

## به‌روزرسانی کد (کار همیشگی)

از روی همین پوشهٔ پروژه، روی ماشین خودت:

```bash
bash scripts/deploy.sh
```

این اسکریپت پشت صحنه:

1. `npm run build` می‌زند.
2. فایل‌های متنی و WASM را با gzip پیش‌فشرده می‌کند (`gzip_static` در nginx
   همان `.gz` را مستقیم سرو می‌کند — حجم wasm از ۱۱ مگابایت به ۳٫۲ می‌رسد).
   مدل‌های `.task` و `.tflite` عمداً فشرده نمی‌شوند چون کمتر از ۱۰ درصد
   کوچک می‌شوند و فقط حجم آپلود را دو برابر می‌کنند.
3. با rsync در یک پوشهٔ انتشار تازه می‌ریزد.
4. لینک `current` را یک‌جا جابه‌جا می‌کند، پس اپ هیچ لحظه‌ای نیمه‌کاره نیست.
5. نسخه‌های قدیمی‌تر از سه‌تا را پاک می‌کند.
6. `nginx -t` و بعد `systemctl reload nginx` می‌زند.

اگر `dist` را از قبل ساخته‌ای:

```bash
bash scripts/deploy.sh --no-build
```

سرور مقصد را می‌شود عوض کرد:

```bash
AYNEJAN_SERVER=root@1.2.3.4 bash scripts/deploy.sh
```

## برگشت به نسخهٔ قبلی

```bash
ssh root@185.190.39.56 'ls -1dt /var/www/aynejan/releases/*/'
ssh root@185.190.39.56 'ln -sfn /var/www/aynejan/releases/<نسخهٔ قبلی> /var/www/aynejan/current.new \
  && mv -Tf /var/www/aynejan/current.new /var/www/aynejan/current && systemctl reload nginx'
```

## نکته‌های کلودفلیر (مهم برای دمو)

دامنه پشت پروکسی کلودفلیر است، پس HTTPS عمومی را کلودفلیر می‌دهد و nginx هم
با گواهی Origin روی ۴۴۳ جواب می‌دهد.

- **حالت SSL باید `Full` یا `Full (strict)` باشد.** بلوک پورت ۸۰ آینه‌جان هم
  محتوا را سرو می‌کند تا اگر روی `Flexible` بود باز هم کار کند، ولی حالت درست
  `Full` است.
- **چالش ربات (Bot Fight Mode / Managed Challenge) را برای این ساب‌دامین خاموش
  کن.** در آزمایش، کلودفلیر به مرورگر بدون‌رابط صفحهٔ «Just a moment…» می‌داد.
  مرورگر معمولی رد می‌شود، ولی برای یک دموی زنده ریسکش را نپذیر.
  مسیر: Security → WAF → Custom rules → یک قانون با عمل **Skip** برای
  `Hostname equals aynejan.sepehrmoh97.ir`.
- **Rocket Loader را برای این ساب‌دامین خاموش کن.** جابه‌جا کردن اسکریپت‌ها
  می‌تواند راه‌اندازی Vue و بارگذاری WASM را خراب کند.
- **Auto Minify** روی JS/CSS لازم نیست؛ خروجی Vite از قبل کوچک شده است.
- کلودفلیر فایل‌های بزرگ `.wasm` و `.task` را کش می‌کند؛ بعد از هر انتشار،
  اگر چیزی قدیمی دیده شد یک بار **Purge Everything** بزن.

## سرویس‌ورکر

`public/sw.js` موتور wasm و مدل چهره را کش می‌کند تا بازدید دوم — حتی با
اینترنت ضعیف یا قطع — فوری بالا بیاید. رشتهٔ `__BUILD__` داخل آن هنگام
انتشار با مهر زمانیِ همان نسخه جایگزین می‌شود، پس هر انتشار کش خودش را دارد و
کش‌های قبلی در `activate` پاک می‌شوند.

خودِ صفحه network-first است، پس انتشار تازه هیچ‌وقت پشت کش گیر نمی‌کند.
`/assets/` و `/mediapipe/` cache-first‌اند و چون نامشان هش دارد بی‌خطرند.

اگر لازم شد روی یک دستگاه کاملاً پاک شود: در DevTools مرورگر،
Application → Service Workers → Unregister، بعد Clear storage.

## آزمایش سلامت

```bash
# از بیرون (از مسیر کلودفلیر)
curl -sI https://aynejan.sepehrmoh97.ir/ | head -1

# مستقیم روی خودِ سرور، بدون کلودفلیر
curl -sk -H 'Host: aynejan.sepehrmoh97.ir' -o /dev/null -w '%{http_code}\n' https://185.190.39.56/

# آیا gzip_static کار می‌کند؟ باید content-encoding: gzip بدهد
curl -sk -H 'Host: aynejan.sepehrmoh97.ir' -H 'Accept-Encoding: gzip' -D- -o /dev/null \
  https://185.190.39.56/mediapipe/wasm/vision_wasm_internal.wasm | grep -i content-

# پورتفولیو هنوز سالم است؟
curl -sI https://sepehrmoh97.ir/ | head -1
```

## قواعدی که نباید شکسته شوند

1. به `/etc/nginx/sites-enabled/portfolio` دست نزن. آن فایل `default_server`
   را برای پورت ۸۰ و ۴۴۳ تعریف می‌کند و بلوک‌های آینه‌جان فقط با نام دامنه
   match می‌شوند، پس تداخلی ندارند.
2. قبل از هر تغییر در پیکربندی nginx یک پشتیبان بگیر:
   `tar czf /root/nginx-backups/nginx-$(date +%F-%H%M).tar.gz /etc/nginx`
3. بعد از هر تغییر حتماً `nginx -t` بعد `systemctl reload nginx` — هیچ‌وقت
   `restart` لازم نیست.
4. هیچ آدرس CDN‌ای به کد اضافه نکن. کل ارزش این محصول این است که تصویر
   دوربین جایی نمی‌رود؛ هر درخواست بیرونی این ادعا را خراب می‌کند.
5. مدل‌ها در `.gitignore` هستند. روی هر ماشین تازه اول `npm run setup`.
