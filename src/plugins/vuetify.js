import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { fa } from 'vuetify/locale'

// تم آینه‌جان — رنگ‌ها از DESIGN.md
const aynejan = {
  dark: true,
  colors: {
    background: '#17101A',
    surface: '#211725',
    'surface-bright': '#2C1F31',
    primary: '#B4234C',
    'primary-darken-1': '#8E1A3C',
    secondary: '#E8A33D',
    accent: '#2E9C93',
    error: '#E05263',
    info: '#2E9C93',
    success: '#2E9C93',
    warning: '#E8A33D',
    'on-background': '#F7E9EC',
    'on-surface': '#F7E9EC',
    'on-primary': '#FFFFFF',
    'on-secondary': '#2A1A06',
  },
}

export default createVuetify({
  locale: {
    locale: 'fa',
    fallback: 'fa',
    messages: { fa },
    rtl: { fa: true },
  },
  theme: {
    defaultTheme: 'aynejan',
    themes: { aynejan },
  },
  icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
  defaults: {
    VBtn: { rounded: 'pill', style: 'text-transform:none;letter-spacing:0' },
    VCard: { rounded: 'xl' },
  },
})
