<script setup>
/** پیش‌نمای ترسیمی هر دسته — ساختهٔ خودِ پروژه، نه آیکون آماده. */
defineProps({ category: { type: String, required: true } })
</script>

<template>
  <svg viewBox="0 0 120 96" class="art" aria-hidden="true">
    <!-- لباس -->
    <g v-if="category === 'garment'">
      <path
        d="M38 20 C30 22 22 28 18 34 L28 46 L34 41 L34 78 C34 82 37 84 41 84 L79 84 C83 84 86 82 86 78 L86 41 L92 46 L102 34 C98 28 90 22 82 20 L72 18 C68 27 52 27 48 18 Z"
        fill="url(#garGrad)"
      />
      <path d="M48 18 C52 27 68 27 72 18" fill="none" stroke="#8E1A3C" stroke-width="2.4" />
      <path d="M60 30 L60 82" stroke="#0f0a12" stroke-opacity="0.2" stroke-width="2" />
      <defs>
        <linearGradient id="garGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#D94F74" />
          <stop offset="1" stop-color="#8E1A3C" />
        </linearGradient>
      </defs>
    </g>

    <!-- رژ لب -->
    <g v-else-if="category === 'lip'">
      <path
        d="M22 48 C34 34 46 30 52 36 C55 39 57 41 60 41 C63 41 65 39 68 36 C74 30 86 34 98 48 C86 66 72 74 60 74 C48 74 34 66 22 48 Z"
        fill="url(#lipGrad)"
      />
      <path d="M22 48 C40 42 80 42 98 48" fill="none" stroke="#5c0f24" stroke-width="2" stroke-opacity="0.7" />
      <ellipse cx="56" cy="60" rx="13" ry="5" fill="#fff" fill-opacity="0.3" />
      <defs>
        <linearGradient id="lipGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#D2456F" />
          <stop offset="1" stop-color="#96162F" />
        </linearGradient>
      </defs>
    </g>

    <!-- ناخن -->
    <g v-else-if="category === 'nail'">
      <g stroke="#3a2a34" stroke-width="1.4" fill="#E9CBBE">
        <path d="M30 84 L30 52 C30 42 36 34 44 34 C52 34 58 42 58 52 L58 84 Z" />
        <path d="M62 84 L62 44 C62 34 68 26 76 26 C84 26 90 34 90 44 L90 84 Z" />
      </g>
      <path d="M32 52 C32 42 37 36 44 36 C51 36 56 42 56 52 C56 58 32 58 32 52 Z" fill="#B4234C" />
      <path d="M64 44 C64 34 69 28 76 28 C83 28 88 34 88 44 C88 50 64 50 64 44 Z" fill="#D2456F" />
      <ellipse cx="40" cy="44" rx="4" ry="6" fill="#fff" fill-opacity="0.45" transform="rotate(-14 40 44)" />
      <ellipse cx="72" cy="36" rx="4" ry="6" fill="#fff" fill-opacity="0.45" transform="rotate(-14 72 36)" />
    </g>

    <!-- لنز -->
    <g v-else>
      <path d="M14 48 C32 24 88 24 106 48 C88 72 32 72 14 48 Z" fill="#F7E9EC" fill-opacity="0.9" />
      <circle cx="60" cy="48" r="19" fill="url(#irisGrad)" />
      <g stroke="#1E3A26" stroke-opacity="0.55" stroke-width="1.2">
        <path v-for="n in 16" :key="n"
          :d="`M ${60 + Math.cos((n / 16) * 6.283) * 8} ${48 + Math.sin((n / 16) * 6.283) * 8} L ${60 + Math.cos((n / 16) * 6.283) * 18} ${48 + Math.sin((n / 16) * 6.283) * 18}`" />
      </g>
      <circle cx="60" cy="48" r="19" fill="none" stroke="#16301F" stroke-width="3" />
      <circle cx="60" cy="48" r="7.5" fill="#140f16" />
      <circle cx="54" cy="42" r="3.4" fill="#fff" fill-opacity="0.85" />
      <path d="M14 48 C32 24 88 24 106 48" fill="none" stroke="#2a1d2f" stroke-width="3" />
      <path d="M14 48 C32 72 88 72 106 48" fill="none" stroke="#2a1d2f" stroke-width="2.4" />
      <defs>
        <radialGradient id="irisGrad">
          <stop offset="0.25" stop-color="#7FC08C" />
          <stop offset="1" stop-color="#2F6B3D" />
        </radialGradient>
      </defs>
    </g>
  </svg>
</template>

<style scoped>
.art {
  width: 100%;
  height: auto;
  display: block;
}
</style>
