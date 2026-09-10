import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import './styles/main.css'
import shamse from './assets/shamse.svg'

document.documentElement.style.setProperty('--shamse-url', `url(${shamse})`)

createApp(App).use(router).use(vuetify).mount('#app')

/* سرویس‌ورکر فقط در نسخهٔ نهایی. کارش این است که بعد از اولین بازدید، موتور
   و مدل‌ها روی خود دستگاه بمانند تا دفعهٔ بعد — حتی با اینترنت ضعیف — اپ
   بی‌درنگ بالا بیاید. صفحهٔ اصلی همیشه اول از شبکه خوانده می‌شود، پس انتشار
   تازه گیر نمی‌کند. */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((err) => {
      console.warn('[aynejan] service worker registration failed', err)
    })
  })
}
