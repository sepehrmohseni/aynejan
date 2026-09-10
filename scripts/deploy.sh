#!/usr/bin/env bash
#
# انتشار آینه‌جان روی سرور.
#
#   bash scripts/deploy.sh            # ساخت + آپلود + فعال‌سازی
#   bash scripts/deploy.sh --no-build # فقط آپلود همان dist موجود
#
# هر انتشار در یک پوشهٔ جدید می‌نشیند و در آخر لینک `current` جابه‌جا می‌شود،
# پس اپ حتی یک لحظه هم نیمه‌کاره سرو نمی‌شود. سه نسخهٔ آخر نگه داشته می‌شوند.
set -euo pipefail
cd "$(dirname "$0")/.."

SERVER="${AYNEJAN_SERVER:-root@185.190.39.56}"
BASE="/var/www/aynejan"
STAMP="$(date +%Y%m%d-%H%M%S)"
REL="$BASE/releases/$STAMP"

if [ "${1:-}" != "--no-build" ]; then
  echo "▸ ساخت نسخهٔ تولید…"
  npm run build
fi
[ -f dist/index.html ] || { echo "dist ساخته نشده"; exit 1; }

# نسخهٔ کش سرویس‌ورکر = همین مهر زمانی، تا هر انتشار کش خودش را داشته باشد
if [ -f dist/sw.js ]; then
  sed -i "s/__BUILD__/$STAMP/g" dist/sw.js
  echo "▸ نسخهٔ سرویس‌ورکر: $STAMP"
fi

echo "▸ فشرده‌سازی پیش‌ساخته (gzip_static)…"
# مدل‌های .task و .tflite عملاً فشرده نمی‌شوند (کمتر از ۱۰٪) و فقط حجم
# آپلود را دو برابر می‌کنند، پس فقط بقیه پیش‌فشرده می‌شوند.
find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' \
  -o -name '*.svg' -o -name '*.json' -o -name '*.wasm' \) \
  -size +1k -exec sh -c 'gzip -9 -kf "$1"' _ {} \;

echo "▸ آپلود به $SERVER:$REL …"
ssh "$SERVER" "mkdir -p '$REL'"
rsync -az --delete --info=progress2 dist/ "$SERVER:$REL/"

echo "▸ فعال‌سازی…"
ssh "$SERVER" "set -e
  ln -sfn '$REL' '$BASE/current.new'
  mv -Tf '$BASE/current.new' '$BASE/current'
  chown -R www-data:www-data '$REL' 2>/dev/null || true
  ls -1dt '$BASE'/releases/*/ | tail -n +4 | xargs -r rm -rf
  nginx -t && systemctl reload nginx
  echo 'نسخهٔ فعال:' \$(readlink '$BASE/current')"

echo "▸ بررسی سلامت…"
# مستقیم روی مبدأ، چون کلودفلیر به درخواستِ بدون‌مرورگر چالش ربات می‌دهد و
# ۴۰۳ می‌گیریم؛ آن ۴۰۳ ربطی به سلامت خودِ اپ ندارد.
HOST="$(echo "$SERVER" | sed "s/.*@//")"
curl -sk -H "Host: aynejan.sepehrmoh97.ir" -o /dev/null \
  -w "  مبدأ  → %{http_code}\n" "https://$HOST/" || true
curl -s -o /dev/null -w "  کلودفلیر → %{http_code}  (۴۰۳ یعنی چالش ربات، نه خرابی)\n" \
  https://aynejan.sepehrmoh97.ir/ || true
echo "✓ انتشار تمام شد."
