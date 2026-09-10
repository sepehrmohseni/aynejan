import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import './styles/main.css'
import shamse from './assets/shamse.svg'
import { setupAutoUpdate } from './lib/appUpdate'

document.documentElement.style.setProperty('--shamse-url', `url(${shamse})`)

createApp(App).use(router).use(vuetify).mount('#app')

/* سرویس‌ورکر فقط در نسخهٔ نهایی: موتور و مدل‌ها روی دستگاه می‌مانند تا
   بازدید بعدی — حتی آفلاین — بی‌درنگ بالا بیاید، و هر انتشار تازه خودبه‌خود
   و بدون هیچ پیامی به کاربر می‌رسد. */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    setupAutoUpdate(router, `${import.meta.env.BASE_URL}sw.js`)
  })
}
