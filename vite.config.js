import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import basicSsl from '@vitejs/plugin-basic-ssl'

// HTTPS is required for getUserMedia on anything other than localhost, so the
// dev server always runs over TLS with a self-signed certificate. The phone
// will warn once about the certificate; that is expected.
export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true }), basicSsl()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    // The MediaPipe bundle is large; a bigger warning limit keeps the build log
    // readable without hiding real regressions.
    chunkSizeWarningLimit: 1600,
  },
})
