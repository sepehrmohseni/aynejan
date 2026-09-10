<script setup>
import { ref, computed, shallowRef, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { categoryById, itemsOf, itemById, FINISHES } from '@/data/items'
import { fa } from '@/lib/persian'
import { useCamera } from '@/composables/useCamera'
import { useTryOnLoop } from '@/composables/useTryOnLoop'
import { createLipRenderer } from '@/renderers/lipRenderer'
import { createLensRenderer } from '@/renderers/lensRenderer'
import { createNailRenderer } from '@/renderers/nailRenderer'
import { createGarmentRenderer } from '@/renderers/garmentRenderer'
import ItemSwatch from '@/components/ItemSwatch.vue'
import CaptureDialog from '@/components/CaptureDialog.vue'

const props = defineProps({
  category: { type: String, required: true },
  item: { type: String, default: null },
})
const router = useRouter()

const FACTORIES = {
  lip: createLipRenderer,
  lens: createLensRenderer,
  nail: createNailRenderer,
  garment: createGarmentRenderer,
}

const cat = computed(() => categoryById(props.category))

/* بازگشت همیشه به صفحهٔ انتخاب همان دسته می‌رود. اگر کاربر لینک مستقیم را
   باز کرده باشد، `router.back()` او را از اپ بیرون می‌برد؛ این نه. */
function goBack() {
  router.push({ name: 'picker', params: { category: props.category } })
}
const items = computed(() => itemsOf(props.category))
const current = ref(itemById(props.category, props.item) ?? items.value[0] ?? null)

const videoRef = ref(null)
const canvasRef = ref(null)
const carouselRef = ref(null)
const bottomRef = ref(null)
// ارتفاع واقعی نوار کنترل‌ها؛ حلقهٔ پرو با همین، تصویر را طوری جا می‌دهد که
// هیچ بخشی از سوژه پشت دکمه‌ها نماند.
const safeBottom = ref(0)
let bottomObserver = null
const renderer = shallowRef(null)
const modelState = ref('loading') // loading | ready | failed
const loadStage = ref('engine') // engine | model | build
const loadPct = ref(0)

const camera = useCamera(videoRef)
const loop = useTryOnLoop({
  videoRef,
  canvasRef,
  getRenderer: () => (modelState.value === 'ready' ? renderer.value : null),
  getItem: () => current.value,
  isMirrored: camera.isMirrored,
  getSafeBottom: () => safeBottom.value,
})

const shotBlob = shallowRef(null)
const showShot = ref(false)
const capturing = ref(false)
const flash = ref(false)

/* فقط مدلِ همین دسته بالا می‌آید. جابه‌جایی آیتم داخل دسته نه دوربین را
   دوباره راه می‌اندازد، نه مدل را — فقط `current` عوض می‌شود. */
async function bootModel() {
  modelState.value = 'loading'
  loadStage.value = 'engine'
  loadPct.value = 0
  try {
    const make = FACTORIES[props.category]
    if (!make) throw new Error('unknown category')
    const r = make()
    await r.init((p) => {
      loadStage.value = p.stage
      loadPct.value = Math.round((p.value ?? 0) * 100)
    })
    renderer.value = r
    modelState.value = 'ready'
  } catch (err) {
    console.error('[aynejan] model init failed', err)
    modelState.value = 'failed'
  }
}

/* صفحه نباید وسط پرو خاموش شود. اگر مرورگر پشتیبانی نکند، بی‌سروصدا رد می‌شود. */
let wakeLock = null
async function keepAwake() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen')
      wakeLock.addEventListener?.('release', () => {
        wakeLock = null
      })
    }
  } catch {
    /* اجازه نداد یا پشتیبانی نمی‌شود */
  }
}
function releaseAwake() {
  try {
    wakeLock?.release?.()
  } catch {
    /* مهم نیست */
  }
  wakeLock = null
}

function measureBottom() {
  const el = bottomRef.value
  if (!el) return
  // فقط بخشِ مات و توپرِ نوار مهم است، نه سایهٔ گرادیانی بالای آن
  safeBottom.value = Math.round(el.getBoundingClientRect().height)
}

onMounted(async () => {
  await nextTick()
  measureBottom()
  if ('ResizeObserver' in window) {
    bottomObserver = new ResizeObserver(measureBottom)
    if (bottomRef.value) bottomObserver.observe(bottomRef.value)
  }
  window.addEventListener('orientationchange', measureBottom)
  window.addEventListener('resize', measureBottom)
  scrollActiveIntoView('auto')
  await camera.start('user')
  loop.start()
  keepAwake()
  await bootModel()
})

onBeforeUnmount(() => {
  loop.stop()
  camera.stop()
  releaseAwake()
  bottomObserver?.disconnect()
  window.removeEventListener('orientationchange', measureBottom)
  window.removeEventListener('resize', measureBottom)
})

// اگر صفحه پنهان شد، دوربین بسته می‌شود؛ با برگشت دوباره باز می‌شود.
const onVisible = async () => {
  if (document.hidden) {
    releaseAwake()
    return
  }
  keepAwake()
  if (!camera.ready.value && !camera.error.value) {
    await camera.start()
    loop.resetTracking()
  }
}
document.addEventListener('visibilitychange', onVisible)
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))

watch(
  () => camera.facingMode.value,
  () => {
    loop.resetTracking()
    renderer.value?.reset?.()
  }
)

function pick(item) {
  current.value = item
  scrollActiveIntoView()
}

/* وقتی کاربر از صفحهٔ انتخاب با یک رنگ وارد می‌شود، همان رنگ باید توی نوار
   پایین دیده شود، نه اینکه لازم باشد دنبالش بگردد. */
function scrollActiveIntoView(behavior = 'smooth') {
  const wrap = carouselRef.value
  const id = current.value?.id
  if (!wrap || !id) return
  const el = wrap.querySelector(`[data-id="${id}"]`)
  if (!el) return
  const reduce = matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const left = el.offsetLeft - (wrap.clientWidth - el.offsetWidth) / 2
  wrap.scrollTo({ left, behavior: reduce ? 'auto' : behavior })
}

async function retry() {
  await camera.start()
  if (modelState.value === 'failed') await bootModel()
}

async function onCapture() {
  if (capturing.value || !camera.ready.value) return
  capturing.value = true
  flash.value = true
  setTimeout(() => (flash.value = false), 180)
  const blob = await loop.capture()
  capturing.value = false
  if (!blob) return
  shotBlob.value = blob
  showShot.value = true
  // تا وقتی عکس روی صفحه است، حلقهٔ پرو لازم نیست کار کند
  loop.stop()
}

watch(showShot, (open) => {
  if (!open && camera.ready.value) {
    loop.resetTracking()
    loop.start()
  }
})

/* دیباگ پنهان: نگه‌داشتن نام دسته در نوار بالا */
let pressTimer = 0
const startPress = () => {
  pressTimer = window.setTimeout(() => {
    loop.debug.value = !loop.debug.value
  }, 700)
}
const endPress = () => clearTimeout(pressTimer)

const busyText = computed(() => {
  if (camera.error.value) return null
  if (!camera.ready.value) return 'در حال باز کردن دوربین…'
  if (modelState.value === 'failed') return 'مدل بالا نیامد'
  if (modelState.value === 'loading') {
    if (loadStage.value === 'model') return 'در حال دریافت مدل'
    if (loadStage.value === 'build') return 'در حال راه‌اندازی'
    return 'در حال آماده‌سازی'
  }
  return null
})

// درصد فقط وقتی معنی دارد که واقعاً داریم فایل می‌گیریم
const finishLabel = computed(() =>
  current.value ? (FINISHES[current.value.finish] ?? current.value.kind ?? '') : ''
)

const busyPct = computed(() =>
  modelState.value === 'loading' && loadStage.value === 'model' ? loadPct.value : null
)
</script>

<template>
  <main class="tryon">
    <video ref="videoRef" class="hidden-video" playsinline autoplay muted></video>
    <canvas ref="canvasRef" class="stage"></canvas>
    <div v-if="flash" class="flash" aria-hidden="true"></div>

    <!-- نوار بالا -->
    <div class="top">
      <button class="round on-camera tap" type="button" aria-label="بازگشت" @click="goBack">
        <v-icon icon="mdi-chevron-right" size="24" />
      </button>
      <button
        class="crumb on-camera t-tiny"
        type="button"
        @pointerdown="startPress"
        @pointerup="endPress"
        @pointerleave="endPress"
        @contextmenu.prevent
      >
        {{ cat?.title }}
        <span v-if="loop.debug.value" class="dbg">دیباگ · {{ fa(loop.fps.value) }}</span>
      </button>
      <span class="round-spacer" aria-hidden="true"></span>
    </div>

    <!-- خطای دوربین -->
    <div v-if="camera.error.value" class="overlay">
      <div class="panel">
        <v-icon icon="mdi-camera-off-outline" size="40" color="secondary" />
        <h2 class="t-tile">{{ camera.error.value.title }}</h2>
        <p class="t-note">{{ camera.error.value.body }}</p>
        <v-btn v-if="camera.error.value.canRetry" color="primary" size="large" @click="retry">
          دوباره تلاش کن
        </v-btn>
        <v-btn variant="text" @click="router.push('/')">بازگشت به خانه</v-btn>
      </div>
    </div>

    <!-- سافاری گاهی تا اولین لمس ویدیو را پخش نمی‌کند -->
    <div v-else-if="camera.needsTap.value" class="overlay">
      <div class="panel">
        <v-icon icon="mdi-gesture-tap" size="40" color="secondary" />
        <h2 class="t-tile">برای شروع، صفحه را لمس کن</h2>
        <p class="t-note">مرورگر منتظر یک لمس است تا دوربین را نشان بدهد.</p>
      </div>
    </div>

    <!-- در حال آماده‌سازی -->
    <div v-else-if="busyText" class="overlay soft">
      <div class="panel loading">
        <div v-if="modelState !== 'failed'" class="meter" :class="{ indet: busyPct === null }">
          <span class="bar" :style="busyPct !== null ? { width: busyPct + '%' } : null" />
        </div>
        <p class="t-body busy">
          {{ busyText }}
          <span v-if="busyPct !== null" class="pct">{{ fa(busyPct) }}٪</span>
        </p>
        <p v-if="modelState === 'loading'" class="t-tiny sub-note">
          یک‌بار دانلود می‌شه؛ دفعهٔ بعد فوری بالا میاد.
        </p>
        <v-btn v-if="modelState === 'failed'" color="primary" @click="bootModel">تلاش دوباره</v-btn>
      </div>
    </div>

    <!-- کنترل‌های پایین -->
    <!-- راهنما و نام رنگ بیرون از نوارِ اندازه‌گیری‌شده‌اند، تا آمدن و رفتنشان
         کادر دوربین را جابه‌جا نکند. -->
    <div class="float-row" :style="{ bottom: `calc(${safeBottom}px + 8px)` }">
      <transition name="swap" mode="out-in">
        <p v-if="loop.hint.value" key="hint" class="guide on-camera t-body">
          {{ loop.hint.value }}
        </p>
        <p v-else-if="current" key="name" class="shade on-camera">
          <span class="t-body shade-name">{{ current.name }}</span>
          <span v-if="finishLabel" class="t-tiny shade-finish">{{ finishLabel }}</span>
        </p>
      </transition>
    </div>

    <div ref="bottomRef" class="bottom">
      <div ref="carouselRef" class="carousel no-bar" role="listbox" aria-label="انتخاب آیتم">
        <button
          v-for="it in items"
          :key="it.id"
          :data-id="it.id"
          class="pick"
          type="button"
          role="option"
          :aria-selected="current?.id === it.id"
          :aria-label="it.name"
          @click="pick(it)"
        >
          <ItemSwatch
            :item="it"
            :category="category"
            :size="category === 'garment' ? 66 : 54"
            :active="current?.id === it.id"
          />
        </button>
      </div>

      <div class="dock">
        <button
          class="round on-camera tap dock-btn"
          type="button"
          aria-label="چرخاندن دوربین"
          @click="camera.toggleFacing()"
        >
          <v-icon icon="mdi-camera-flip-outline" size="24" />
        </button>

        <button
          class="shutter"
          type="button"
          aria-label="گرفتن عکس"
          :disabled="!camera.ready.value || capturing"
          @click="onCapture"
        >
          <span class="ring" />
          <span class="core"><v-icon icon="mdi-camera-iris" size="34" /></span>
        </button>

        <span class="dock-btn ghost-slot" aria-hidden="true"></span>
      </div>
    </div>

    <CaptureDialog
      v-model="showShot"
      :blob="shotBlob"
      :category="category"
      :item="current"
      @retake="showShot = false"
    />
  </main>
</template>

<style scoped>
.tryon {
  position: fixed;
  inset: 0;
  background: #000;
  overflow: hidden;
}
.hidden-video {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.stage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  /* بوم دقیقاً به اندازهٔ برشی است که کشیده شده، پس کشیدگی ایجاد نمی‌شود */
  object-fit: fill;
}
.flash {
  position: absolute;
  inset: 0;
  background: #fff;
  animation: fade 0.18s ease-out forwards;
  pointer-events: none;
}
@keyframes fade {
  from {
    opacity: 0.85;
  }
  to {
    opacity: 0;
  }
}

.top {
  position: absolute;
  top: calc(var(--safe-t) + 12px);
  inset-inline: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.round {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 0;
  color: var(--c-golab);
  display: grid;
  place-items: center;
  cursor: pointer;
}
.crumb {
  border: 0;
  color: var(--c-golab);
  border-radius: var(--r-pill);
  padding: 8px 16px;
  min-height: 44px;
  cursor: pointer;
  font: inherit;
  display: flex;
  align-items: center;
  gap: 8px;
}
.dbg {
  color: var(--c-zaferan);
}

.overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(15, 10, 17, 0.86);
  padding: 24px;
}
.overlay.soft {
  background: rgba(15, 10, 17, 0.55);
}
.panel {
  background: var(--c-surface);
  border-radius: var(--r-card);
  padding: 26px 22px;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}
.panel.small {
  padding: 20px 24px;
  flex-direction: row;
  gap: 14px;
}
.panel.loading {
  padding: 22px 24px 20px;
  min-width: min(300px, 82vw);
  gap: 10px;
}
.meter {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: rgba(247, 233, 236, 0.14);
  overflow: hidden;
}
.meter .bar {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--c-anar), var(--c-zaferan));
  transition: width 0.25s ease;
}
.meter.indet .bar {
  width: 40%;
  animation: slide 1.1s ease-in-out infinite;
}
@keyframes slide {
  0% {
    transform: translateX(-110%);
  }
  100% {
    transform: translateX(260%);
  }
}
.busy {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.pct {
  color: var(--c-zaferan);
  font-weight: 700;
}
.sub-note {
  margin: 0;
  color: var(--c-ash);
}
.panel h2 {
  margin: 0;
}
.panel p {
  margin: 0;
}

.bottom {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  padding: 10px 12px calc(var(--safe-b) + 10px);
  /* بالای نوار یک محو شدن نرم، پایینش تیرهٔ توپر — چون تصویر دوربین اصلاً
     زیر این نوار نمی‌آید، لبه نباید سخت دیده شود. */
  background: linear-gradient(
    to top,
    rgba(10, 6, 12, 0.96) 0%,
    rgba(10, 6, 12, 0.94) 62%,
    rgba(10, 6, 12, 0.6) 88%,
    rgba(10, 6, 12, 0) 100%
  );
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.float-row {
  position: absolute;
  inset-inline: 12px;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 2;
}
.guide {
  align-self: center;
  margin: 0;
  padding: 9px 18px;
  border-radius: var(--r-pill);
  color: var(--c-golab);
  text-align: center;
  animation: rise 0.24s ease-out;
}
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}
.carousel {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  padding: 8px 18px;
  scroll-snap-type: x proximity;
  scroll-padding-inline: 14px;
  /* محو شدن نرم دو سر نوار، تا معلوم باشد ادامه دارد */
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 22px, #000 calc(100% - 22px), transparent);
  mask-image: linear-gradient(90deg, transparent, #000 22px, #000 calc(100% - 22px), transparent);
}
.pick {
  border: 0;
  background: none;
  /* فضای کافی تا حلقهٔ آیتم انتخاب‌شده روی آیتم بعدی نیفتد */
  padding: 3px;
  cursor: pointer;
  scroll-snap-align: center;
  min-width: 44px;
  min-height: 44px;
  display: grid;
  place-items: center;
}
.pick:focus-visible {
  outline: 3px solid var(--c-zaferan);
  outline-offset: 3px;
  border-radius: 50%;
}

.dock {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}
.dock-btn {
  justify-self: center;
}
.ghost-slot {
  width: 44px;
  height: 44px;
}
.round-spacer {
  width: 44px;
  height: 44px;
}
.shade {
  align-self: center;
  margin: 0;
  padding: 7px 18px;
  border-radius: var(--r-pill);
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.shade-name {
  color: var(--c-golab);
}
.shade-finish {
  color: var(--c-zaferan);
}
.swap-enter-active,
.swap-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.swap-enter-from,
.swap-leave-to {
  opacity: 0;
  transform: translateY(5px);
}
.shutter {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  border: 0;
  background: none;
  position: relative;
  cursor: pointer;
  display: grid;
  place-items: center;
}
.shutter:disabled {
  opacity: 0.45;
}
.ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid rgba(247, 233, 236, 0.92);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
}
.core {
  width: 57px;
  height: 57px;
  border-radius: 50%;
  /* سفیدِ شیری، نه رنگِ محصول — تا با سواچ‌های رنگی اشتباه گرفته نشود */
  background: linear-gradient(160deg, #ffffff, #f2e7ea 62%, #e6d6dc);
  color: var(--c-shabaq);
  display: grid;
  place-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
  transition: transform 0.12s ease;
}
.shutter:active .core {
  transform: scale(0.9);
}
.shutter:focus-visible .ring {
  outline: 3px solid var(--c-golab);
  outline-offset: 3px;
}
</style>
