---
name: deploy-aynejan
description: Use when deploying, updating, rolling back, or troubleshooting the aynejan app on the production server (aynejan.sepehrmoh97.ir, 185.190.39.56) — nginx config, releases, Cloudflare settings, service-worker cache, or health checks. Triggers: "deploy", "push to server", "update production", "site is down", "roll back", "cloudflare", "nginx".
---

# انتشار روی سرور

راهنمای کامل و همهٔ جزئیات سرور در `DEPLOY.md` ریشهٔ پروژه است. **اول آن را
بخوان.** این‌جا فقط مسیر سریع و خط‌قرمزهاست.

## مسیر همیشگی

```bash
bash scripts/deploy.sh
```

می‌سازد، پیش‌فشرده می‌کند، نسخهٔ سرویس‌ورکر را مهر می‌زند، با rsync در یک
پوشهٔ انتشار تازه می‌ریزد، لینک `current` را یک‌جا جابه‌جا می‌کند، نسخه‌های
قدیمی را هرس می‌کند و nginx را reload می‌کند.

## خط‌قرمزها

1. روی همین سرور یک پروژهٔ زندهٔ دیگر هست: `sepehrmoh97.ir` با سرویس
   `portfolio.service` روی `127.0.0.1:3000`. به
   `/etc/nginx/sites-enabled/portfolio` دست نزن.
2. قبل از هر تغییر در پیکربندی nginx پشتیبان بگیر:
   `tar czf /root/nginx-backups/nginx-$(date +%F-%H%M).tar.gz /etc/nginx`
3. همیشه `nginx -t` بعد `systemctl reload nginx`. هرگز `restart`.
4. هیچ آدرس بیرونی به کد اضافه نکن.

## وقتی چیزی درست دیده نمی‌شود

به ترتیب بررسی کن:

```bash
# ۱) خودِ مبدأ سالم است؟ (بدون کلودفلیر)
curl -sk -H 'Host: aynejan.sepehrmoh97.ir' -o /dev/null -w '%{http_code}\n' https://185.190.39.56/

# ۲) از بیرون چه می‌آید؟
curl -sI https://aynejan.sepehrmoh97.ir/ | head -1

# ۳) نسخهٔ فعال کدام است؟
ssh root@185.190.39.56 'readlink /var/www/aynejan/current'
```

- اگر مبدأ ۲۰۰ می‌دهد ولی از بیرون نه → مشکل از کلودفلیر است (چالش ربات،
  حالت SSL، یا Rocket Loader). بخش کلودفلیر در `DEPLOY.md`.
- اگر نسخهٔ قدیمی دیده می‌شود → کش کلودفلیر را Purge کن. صفحهٔ اصلی
  network-first است پس سرویس‌ورکر نسخهٔ کهنه را نگه نمی‌دارد، ولی
  `/assets/` و `/mediapipe/` کش می‌شوند (نامشان هش دارد، پس مشکلی نیست).

## برگشت

```bash
ssh root@185.190.39.56 'ls -1dt /var/www/aynejan/releases/*/'
ssh root@185.190.39.56 'ln -sfn <نسخه> /var/www/aynejan/current.new && \
  mv -Tf /var/www/aynejan/current.new /var/www/aynejan/current && systemctl reload nginx'
```
