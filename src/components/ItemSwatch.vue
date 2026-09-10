<script setup>
import { computed } from 'vue'
import { FINISHES } from '@/data/items'

/** سواچ گرد برای رژ و لاک، پیش‌نمای عنبیه برای لنز، تصویر برای لباس. */
const props = defineProps({
  item: { type: Object, required: true },
  category: { type: String, required: true },
  size: { type: Number, default: 64 },
  active: Boolean,
})

const finishLabel = computed(() => FINISHES[props.item.finish] ?? '')
const px = computed(() => `${props.size}px`)
/* لباس‌ها پهن‌اند: اگر داخل دایره بروند، در نوار پایین به هم می‌چسبند.
   برای همین کاشیِ گوشه‌گرد می‌گیرند و کمی باریک‌تر از ارتفاعشان‌اند. */
const boxW = computed(() =>
  props.category === 'garment' ? `${Math.round(props.size * 0.82)}px` : `${props.size}px`
)
const fibers = computed(() =>
  Array.from({ length: 18 }, (_, n) => {
    const a = (n / 18) * Math.PI * 2
    return `M ${50 + Math.cos(a) * 20} ${50 + Math.sin(a) * 20} L ${
      50 + Math.cos(a) * 44
    } ${50 + Math.sin(a) * 44}`
  })
)
defineExpose({ finishLabel })
</script>

<template>
  <div
    class="swatch"
    :class="{ active, tile: category === 'garment' }"
    :style="{ width: boxW, height: px }"
  >
    <!-- لنز: پیش‌نمای عنبیه -->
    <svg v-if="category === 'lens'" viewBox="0 0 100 100" class="fill">
      <defs>
        <radialGradient :id="`ir-${item.id}`">
          <stop offset="0.2" :stop-color="item.fiber" />
          <stop offset="0.62" :stop-color="item.hex" />
          <stop offset="1" :stop-color="item.ring" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="50" :fill="`url(#ir-${item.id})`" />
      <g :stroke="item.fiber" stroke-opacity="0.55" stroke-width="2.2">
        <path v-for="(d, i) in fibers" :key="i" :d="d" />
      </g>
      <circle cx="50" cy="50" r="50" fill="none" :stroke="item.ring" stroke-width="9" />
      <circle cx="50" cy="50" r="19" fill="#140f16" />
      <circle cx="36" cy="34" r="8" fill="#fff" fill-opacity="0.7" />
    </svg>

    <!-- لباس: تصویر وکتور -->
    <img v-else-if="category === 'garment'" :src="item.src" :alt="item.name" class="fill garment" />

    <!-- رژ و لاک: رنگ + پرداخت -->
    <div v-else class="fill color" :style="{ background: item.hex }">
      <span v-if="item.finish === 'glossy'" class="gloss" />
      <span v-else-if="item.finish === 'satin'" class="satin" />
    </div>
  </div>
</template>

<style scoped>
.swatch {
  position: relative;
  border-radius: 50%;
  overflow: hidden;
  flex: 0 0 auto;
  box-shadow:
    inset 0 0 0 1px rgba(247, 233, 236, 0.16),
    inset 0 -6px 12px rgba(0, 0, 0, 0.18);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.swatch.tile {
  border-radius: 16px;
}
.swatch.active {
  /* یک فاصلهٔ تیره بین سواچ و حلقه، تا حلقه واضح و جدا دیده شود */
  box-shadow:
    0 0 0 2px rgba(14, 9, 16, 0.92),
    0 0 0 5px var(--c-zaferan),
    inset 0 0 0 1px rgba(0, 0, 0, 0.25);
  transform: scale(1.04);
}
.fill {
  width: 100%;
  height: 100%;
  display: block;
}
.color {
  position: relative;
}
.garment {
  object-fit: contain;
  object-position: center 22%;
  /* زمینهٔ روشن تا لباس‌های تیره هم روی تم تیره دیده شوند */
  background: radial-gradient(circle at 50% 34%, #f3e8ea 0%, #d9cbd1 72%, #bfaeb6 100%);
  padding: 7%;
}
.gloss {
  position: absolute;
  inset: 0;
  background: radial-gradient(
      circle at 33% 27%,
      rgba(255, 255, 255, 0.62) 0%,
      rgba(255, 255, 255, 0.1) 24%,
      rgba(255, 255, 255, 0) 46%
    ),
    linear-gradient(205deg, rgba(255, 255, 255, 0.08), rgba(0, 0, 0, 0.3));
}
.satin {
  position: absolute;
  inset: 0;
  background: radial-gradient(
      circle at 34% 28%,
      rgba(255, 255, 255, 0.28) 0%,
      rgba(255, 255, 255, 0) 44%
    ),
    linear-gradient(205deg, rgba(255, 255, 255, 0.04), rgba(0, 0, 0, 0.22));
}
</style>
