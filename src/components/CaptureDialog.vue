<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { saveImage, shareImage, canShareFile, fileFromBlob } from '@/lib/save'
import { burstConfetti } from '@/lib/confetti'
import { praiseFor } from '@/lib/praise'

const props = defineProps({
  modelValue: Boolean,
  blob: { type: Object, default: null },
  category: { type: String, default: '' },
  item: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'retake'])

const url = ref(null)
const status = ref(null)
const busy = ref(false)
const praise = ref(null)
const showPraise = ref(false)
const confettiRef = ref(null)

let stopConfetti = null
let praiseTimer = 0

function clearCelebration() {
  clearTimeout(praiseTimer)
  stopConfetti?.()
  stopConfetti = null
  showPraise.value = false
}

/* جشن کوتاه: کاغذرنگی + یک جملهٔ متناسب با همان رنگ و همان دسته.
   بعد از چند ثانیه خودش کنار می‌رود تا عکس بی‌مزاحمت دیده شود.
   دکمه‌ها از همان لحظهٔ اول فعال‌اند و جشن جلوی هیچ کاری را نمی‌گیرد. */
async function celebrate() {
  clearCelebration()
  praise.value = praiseFor(props.category, props.item)
  showPraise.value = true
  praiseTimer = window.setTimeout(() => {
    showPraise.value = false
  }, 4200)
  await nextTick()

  /* دیالوگ انیمیشن باز شدن دارد و عکس هم باید اول لود شود؛ تا وقتی بوم
     ارتفاع واقعی نگرفته، کاغذرنگی جایی برای افتادن ندارد. پس منتظر می‌مانیم. */
  const ready = await waitForCanvas()
  if (!ready || !showPraise.value) return

  stopConfetti = burstConfetti(confettiRef.value, {
    colors: praise.value.colors,
    duration: 3200,
  })
}

function waitForCanvas(maxMs = 2000) {
  return new Promise((resolve) => {
    const t0 = performance.now()
    const check = () => {
      const el = confettiRef.value
      if (!el) return resolve(false)
      const r = el.getBoundingClientRect()
      if (r.height > 60 && r.width > 60) return resolve(true)
      if (performance.now() - t0 > maxMs) return resolve(false)
      requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  })
}

watch(
  () => props.blob,
  (b) => {
    if (url.value) URL.revokeObjectURL(url.value)
    url.value = b ? URL.createObjectURL(b) : null
    status.value = null
  },
  { immediate: true }
)

watch(
  () => props.modelValue,
  (open) => {
    if (open && props.blob) celebrate()
    else clearCelebration()
  }
)

onBeforeUnmount(() => {
  clearCelebration()
  if (url.value) URL.revokeObjectURL(url.value)
})

const shareable = computed(() =>
  props.blob ? canShareFile(fileFromBlob(props.blob)) : false
)

const hint = computed(() =>
  shareable.value
    ? 'با زدن «ذخیره در گالری» برگهٔ اشتراک‌گذاری گوشی باز می‌شه؛ اون‌جا «ذخیرهٔ عکس» رو بزن.'
    : 'عکس در پوشهٔ دانلود ذخیره می‌شه و از گالری هم قابل دیدنه.'
)

async function onSave() {
  if (!props.blob || busy.value) return
  busy.value = true
  const r = await saveImage(props.blob)
  busy.value = false
  if (r === 'share') status.value = 'برگهٔ اشتراک‌گذاری باز شد.'
  else if (r === 'download') status.value = 'عکس در پوشهٔ دانلود ذخیره شد.'
  else status.value = null
}

async function onShare() {
  if (!props.blob || busy.value) return
  busy.value = true
  const r = await shareImage(props.blob)
  busy.value = false
  if (r === 'unsupported') status.value = 'این مرورگر اشتراک‌گذاری فایل رو پشتیبانی نمی‌کنه.'
  else if (r === 'share') status.value = 'اشتراک‌گذاری انجام شد.'
}

function retake() {
  clearCelebration()
  emit('update:modelValue', false)
  emit('retake')
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="520"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="sheet">
      <div class="shot">
        <img v-if="url" :src="url" alt="عکس گرفته‌شده" />
        <canvas ref="confettiRef" class="confetti" aria-hidden="true"></canvas>
        <transition name="pop">
          <p v-if="showPraise && praise" class="praise" role="status">
            {{ praise.title }}
          </p>
        </transition>
      </div>

      <p class="t-tiny note">{{ hint }}</p>
      <p v-if="status" class="t-tiny ok">{{ status }}</p>

      <div class="acts">
        <v-btn
          class="main"
          color="primary"
          size="large"
          block
          :loading="busy"
          prepend-icon="mdi-tray-arrow-down"
          @click="onSave"
        >
          ذخیره در گالری
        </v-btn>
        <div class="row">
          <v-btn variant="tonal" size="large" prepend-icon="mdi-share-variant" @click="onShare">
            اشتراک‌گذاری
          </v-btn>
          <v-btn variant="text" size="large" prepend-icon="mdi-camera-retake" @click="retake">
            عکس دوباره
          </v-btn>
        </div>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.sheet {
  background: var(--c-surface);
  border-radius: var(--r-card);
  padding: 16px 16px calc(16px + var(--safe-b));
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.shot {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  background: var(--c-shabaq);
  min-height: 180px;
  display: grid;
  place-items: center;
  isolation: isolate;
}
.shot img {
  width: 100%;
  height: auto;
  max-height: 58dvh;
  object-fit: contain;
  display: block;
}
.confetti {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
}
.praise {
  position: absolute;
  z-index: 3;
  inset-inline: 14px;
  bottom: 16px;
  margin: 0;
  padding: 12px 16px;
  border-radius: 18px;
  text-align: center;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.7;
  color: var(--c-golab);
  background: rgba(14, 9, 16, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: inset 0 0 0 1px rgba(232, 163, 61, 0.35);
}
.pop-enter-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.2, 1.3, 0.4, 1);
}
.pop-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.pop-enter-from {
  opacity: 0;
  transform: translateY(14px) scale(0.94);
}
.pop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.note {
  color: var(--c-ash);
  margin: 0;
  line-height: 1.8;
}
.ok {
  color: var(--c-firouzeh);
  margin: 0;
}
.acts {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.row {
  display: flex;
  gap: 10px;
}
.row .v-btn {
  flex: 1;
}
</style>
