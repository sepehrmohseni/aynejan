#!/usr/bin/env bash
# فایل‌های WASM و مدل‌های MediaPipe را به‌صورت محلی آماده می‌کند.
# پس از `npm install` یک بار اجرا شود. در زمان اجرای اپ هیچ چیزی از CDN گرفته نمی‌شود.
set -euo pipefail
cd "$(dirname "$0")/.."

WASM_SRC="node_modules/@mediapipe/tasks-vision/wasm"
WASM_DST="public/mediapipe/wasm"
MODEL_DST="public/mediapipe/models"
BASE="https://storage.googleapis.com/mediapipe-models"

[ -d "$WASM_SRC" ] || { echo "ابتدا npm install را اجرا کن"; exit 1; }

mkdir -p "$WASM_DST" "$MODEL_DST"
cp -f "$WASM_SRC"/* "$WASM_DST"/
echo "wasm آماده شد"

get() { # get <url> <dest>
  [ -s "$2" ] && { echo "از قبل موجود: $(basename "$2")"; return; }
  echo "در حال دریافت $(basename "$2") …"
  curl -sSL --fail -o "$2" "$1"
}

get "$BASE/face_landmarker/face_landmarker/float16/1/face_landmarker.task"                 "$MODEL_DST/face_landmarker.task"
get "$BASE/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"                 "$MODEL_DST/hand_landmarker.task"
get "$BASE/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"  "$MODEL_DST/pose_landmarker_lite.task"
get "$BASE/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite"           "$MODEL_DST/selfie_segmenter.tflite"

echo "همه‌چیز آماده است."
