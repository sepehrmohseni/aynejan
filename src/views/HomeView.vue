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
    <header class="head">
      <h1 class="t-page brand">آینه‌جان</h1>
      <p class="t-body lead">هرچی دوست داری رو همین‌جا پرو کن.</p>
      <p class="t-note privacy">
        <span class="dot" />
        تصویر دوربینت روی همین گوشی می‌مونه و هیچ‌جا فرستاده نمی‌شه.
      </p>
    </header>

    <nav class="grid">
      <button
        v-for="c in CATEGORIES"
        :key="c.id"
        class="tile"
        type="button"
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
.home {
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
}
.brand::after {
  content: '';
  display: block;
  width: 46px;
  height: 3px;
  margin-top: 10px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--c-anar), var(--c-zaferan));
}
.lead {
  margin: 10px 0 0;
  color: rgba(247, 233, 236, 0.86);
}
.privacy {
  margin: 6px 0 0;
  display: flex;
  align-items: flex-start;
  gap: 9px;
}
.privacy .dot {
  margin-top: 12px;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c-firouzeh);
  flex: 0 0 auto;
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
  background: linear-gradient(158deg, var(--c-surface-2), var(--c-surface));
  color: var(--c-golab);
  font: inherit;
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  cursor: pointer;
  position: relative;
  box-shadow: inset 0 0 0 1px rgba(232, 163, 61, 0.16);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}
.tile:active {
  transform: scale(0.975);
  box-shadow: inset 0 0 0 1px rgba(232, 163, 61, 0.4);
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
