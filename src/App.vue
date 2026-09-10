<script setup>
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { warmRuntime, pruneOldCaches, prefetchCategory } from '@/lib/mediapipe'

/* موتور wasm بین همهٔ دسته‌ها مشترک است، پس همان لحظهٔ باز شدن اپ و در زمان
   بی‌کاری مرورگر گرم می‌شود. کاربر هنوز دارد دسته را انتخاب می‌کند که این
   کار تمام شده است. */
onMounted(() => {
  const warm = () => {
    pruneOldCaches()
    warmRuntime()
      .then(() => {
        /* مدل چهره پرکاربردترین است (هم رژ، هم لنز) و ۳٫۷ مگابایت بیشتر
           نیست؛ در زمان بی‌کاری از قبل گرفته می‌شود تا اولین ورود به صفحهٔ
           پرو تقریباً بی‌انتظار باشد. بقیهٔ مدل‌ها فقط وقتی لازم شوند. */
        if (navigator.connection?.saveData) return
        prefetchCategory('lip')
      })
      .catch(() => {})
  }
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 1500 })
  else setTimeout(warm, 400)
})
</script>

<template>
  <v-app class="aynejan-app">
    <RouterView v-slot="{ Component }">
      <component :is="Component" />
    </RouterView>
  </v-app>
</template>

<style>
.aynejan-app {
  background: var(--c-shabaq) !important;
}
.aynejan-app .v-application__wrap {
  min-height: 100dvh;
}
</style>
