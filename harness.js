// بستر آزمایش محلی — در build نهایی نیست، فقط برای بررسی چشمی جای‌گذاری.
import { createLipRenderer } from '@/renderers/lipRenderer'
import { createLensRenderer } from '@/renderers/lensRenderer'
import { createNailRenderer } from '@/renderers/nailRenderer'
import { createGarmentRenderer } from '@/renderers/garmentRenderer'
import { LIPS, NAILS, LENSES, GARMENTS } from '@/data/items'

const q = new URLSearchParams(location.search)
const mode = q.get('mode') || 'lip'
const src = q.get('img') || '/devtest/face.jpg'
const debug = q.get('debug') === '1'
const itemIdx = +(q.get('i') || 0)
const mirror = q.get('mirror') === '1'
const log = (m) => { document.getElementById('log').textContent += '\n' + m }

const SETUP = {
  lip: [createLipRenderer, LIPS],
  lens: [createLensRenderer, LENSES],
  nail: [createNailRenderer, NAILS],
  garment: [createGarmentRenderer, GARMENTS],
}

async function main() {
  const img = new Image()
  img.src = src
  await img.decode()

  // ویدیوی مصنوعی از تصویر ثابت
  const feed = document.createElement('canvas')
  const H = 720
  const W = Math.round((img.naturalWidth / img.naturalHeight) * H)
  feed.width = W
  feed.height = H
  const fctx = feed.getContext('2d')
  const paint = () => { fctx.drawImage(img, 0, 0, W, H) }
  paint()
  const stream = feed.captureStream(30)
  const video = document.createElement('video')
  video.srcObject = stream
  video.muted = true
  video.playsInline = true
  await video.play()
  await new Promise((r) => (video.readyState >= 2 ? r() : (video.onloadeddata = r)))
  log(`video ${video.videoWidth}x${video.videoHeight}`)

  const out = document.getElementById('out')
  out.width = W
  out.height = H
  const ctx = out.getContext('2d')

  const [make, items] = SETUP[mode]
  const r = make()
  await r.init()
  log('model ready: ' + mode)
  const item = items[itemIdx % items.length]
  log('item: ' + item.name)

  // همان شکلی که useTryOnLoop می‌سازد، تا رندررها دقیقاً همان ورودی را ببینند
  const frame = {
    sx: 0, sy: 0, sw: W, sh: H,
    dx: 0, dy: 0, dw: W, dh: H,
    vw: W, vh: H, W, H, VH: H, mirror, alpha: 1,
    map(lm) {
      const xv = mirror ? (1 - lm.x) * W : lm.x * W
      return { x: xv, y: lm.y * H }
    },
  }

  let result = null
  let n = 0
  await new Promise((resolve) => {
    const tick = (ts) => {
      paint()
      const res = r.detect(video, ts)
      if (res) result = res
      ctx.save()
      if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1) }
      ctx.drawImage(video, 0, 0, W, H)
      ctx.restore()
      if (result) {
        r.draw(ctx, result, item, frame)
        if (debug) r.drawDebug?.(ctx, result, frame)
      }
      n++
      if (n > 24) { log('frames=' + n + ' detected=' + !!result); return resolve() }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  document.title = 'done'
  window.__done = true
}
main().catch((e) => { log('ERR ' + e.message); console.error(e) })
