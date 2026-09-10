<script setup>
import { useRouter } from 'vue-router'
import { CATEGORIES } from '@/data/items'
import { prefetchCategory } from '@/lib/mediapipe'
import CategoryArt from '@/components/CategoryArt.vue'

const router = useRouter()
// به‌محض لمس (حتی قبل از رها کردن انگشت) دانلود مدل شروع می‌شود
const warm = (id) => prefetchCategory(id)
const go = (id) => {
  prefetchCategory(id)
  router.push({ name: 'picker', params: { category: id } })
}
</script>

<template>
  <main class="home shamse-bg">
    <span class="glow" aria-hidden="true"></span>

    <header class="head">
      <h1 class="t-page brand">
        <img src="/icon.svg" alt="" class="mark" aria-hidden="true" />
        <span>آینه‌جان</span>
      </h1>
      <span class="rule" aria-hidden="true"></span>
      <p class="t-body lead">هرچی دوست داری رو همین‌جا پرو کن.</p>
      <p class="t-note privacy">
        تصویر دوربینت روی همین گوشی می‌مونه و هیچ‌جا فرستاده نمی‌شه.
      </p>
    </header>

    <nav class="grid">
      <button
        v-for="c in CATEGORIES"
        :key="c.id"
        class="tile"
        type="button"
        :style="{ '--accent': c.accent }"
        @pointerdown="warm(c.id)"
        @click="go(c.id)"
      >
        <span class="art-wrap"><CategoryArt :category="c.id" /></span>
        <span class="t-tile name">{{ c.title }}</span>
        <span class="t-tiny sub">{{ c.subtitle }}</span>
      </button>
    </nav>
  </main>
</template>

<style scoped>
.glow {
  position: absolute;
  top: -170px;
  inset-inline-end: -110px;
  width: 380px;
  height: 380px;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(
    circle,
    rgba(180, 35, 76, 0.5) 0%,
    rgba(232, 163, 61, 0.16) 42%,
    rgba(23, 16, 26, 0) 70%
  );
  filter: blur(6px);
}

.home {
  position: relative;
  overflow: hidden;
  min-height: 100dvh;
  padding: calc(var(--safe-t) + 34px) 20px calc(var(--safe-b) + 24px);
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.brand {
  margin: 0;
  color: var(--c-golab);
  display: flex;
  align-items: center;
  gap: 12px;
}
.mark {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  flex: 0 0 auto;
  box-shadow: 0 6px 16px rgba(180, 35, 76, 0.34);
}
.rule {
  display: block;
  width: 52px;
  height: 3px;
  margin-top: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--c-anar), var(--c-zaferan));
}
.lead {
  margin: 12px 0 0;
  color: rgba(247, 233, 236, 0.86);
}
.privacy {
  margin: 8px 0 0;
  padding-inline-start: 11px;
  border-inline-start: 2px solid var(--c-firouzeh);
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: minmax(176px, auto);
  gap: 14px;
  margin-block: auto;
}
.tile {
  min-height: 168px;
  border: 0;
  border-radius: var(--r-tile);
  padding: 16px 14px 18px;
  background:
    radial-gradient(120% 80% at 18% 0%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 62%),
    linear-gradient(158deg, var(--c-surface-2), var(--c-surface));
  color: var(--c-golab);
  font: inherit;
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  cursor: pointer;
  position: relative;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 34%, transparent);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}
.tile:active {
  transform: scale(0.975);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 70%, transparent);
}
.tile:focus-visible {
  outline: 3px solid var(--c-zaferan);
  outline-offset: 3px;
}
.art-wrap {
  width: 96px;
  margin: 4px auto 12px 0;
}
.name {
  color: var(--c-golab);
}
.sub {
  color: var(--c-ash);
}
@media (min-width: 620px) {
  .home {
    max-width: 640px;
    margin: 0 auto;
  }
  .tile {
    min-height: 208px;
  }
  .art-wrap {
    width: 116px;
  }
}
</style>
