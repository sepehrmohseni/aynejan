<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { categoryById, itemsOf, FINISHES } from '@/data/items'
import { fa } from '@/lib/persian'
import { prefetchCategory } from '@/lib/mediapipe'
import ItemSwatch from '@/components/ItemSwatch.vue'

const props = defineProps({ category: { type: String, required: true } })
const router = useRouter()

const cat = computed(() => categoryById(props.category))
const items = computed(() => itemsOf(props.category))
const isGarment = computed(() => props.category === 'garment')

/* در حالی که کاربر دارد رنگ انتخاب می‌کند، مدل همین دسته پشت صحنه دانلود
   می‌شود؛ وقتی روی یک رنگ زد، معمولاً دیگر منتظر چیزی نمی‌ماند. */
onMounted(() => prefetchCategory(props.category))

const open = (item) =>
  router.push({ name: 'tryon', params: { category: props.category, item: item.id } })
</script>

<template>
  <main class="picker shamse-bg">
    <header class="bar">
      <button class="ghost tap" type="button" aria-label="بازگشت" @click="router.back()">
        <v-icon icon="mdi-chevron-right" size="26" />
      </button>
      <div class="titles">
        <h1 class="t-tile">{{ cat?.title }}</h1>
        <p class="t-tiny count">{{ fa(items.length) }} مورد</p>
      </div>
    </header>

    <p v-if="!items.length" class="t-note empty">فعلاً چیزی برای این بخش نداریم.</p>

    <ul v-else class="grid" :class="{ garments: isGarment }">
      <li v-for="item in items" :key="item.id">
        <button class="card tap" type="button" @click="open(item)">
          <ItemSwatch :item="item" :category="category" :size="isGarment ? 108 : 76" />
          <span class="t-body label">{{ item.name }}</span>
          <span v-if="item.finish" class="t-tiny finish">{{ FINISHES[item.finish] }}</span>
          <span v-else-if="item.kind" class="t-tiny finish">{{ item.kind }}</span>
        </button>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.picker {
  min-height: 100dvh;
  padding: calc(var(--safe-t) + 14px) 16px calc(var(--safe-b) + 30px);
}
.bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}
.ghost {
  background: var(--c-surface-2);
  border: 0;
  color: var(--c-golab);
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.titles h1 {
  margin: 0;
}
.count {
  margin: 0;
  color: var(--c-ash);
}
.empty {
  margin-top: 40px;
  text-align: center;
}
.grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.grid.garments {
  grid-template-columns: repeat(2, 1fr);
}
.card {
  width: 100%;
  border: 0;
  background: var(--c-surface);
  border-radius: var(--r-card);
  padding: 14px 8px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--c-golab);
  font: inherit;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(247, 233, 236, 0.07);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}
.card:active {
  transform: scale(0.97);
}
.card:focus-visible {
  outline: 3px solid var(--c-zaferan);
  outline-offset: 2px;
}
.label {
  text-align: center;
  line-height: 1.5;
}
.finish {
  color: var(--c-ash);
}
@media (min-width: 620px) {
  .picker {
    max-width: 640px;
    margin: 0 auto;
  }
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
  .grid.garments {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
