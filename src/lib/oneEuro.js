/**
 * فیلتر One Euro — کاهش لرزش لندمارک‌ها بدون ایجاد تأخیر محسوس.
 * Casiez, Roussel, Vogel (CHI 2012).
 *
 * minCutOff پایین‌تر = نرم‌تر ولی کندتر. beta بالاتر = دنبال‌کردن سریع‌تر حرکت تند.
 */
class LowPass {
  constructor() {
    this.y = null
    this.s = null
  }
  filter(x, alpha) {
    this.s = this.s === null ? x : alpha * x + (1 - alpha) * this.s
    this.y = x
    return this.s
  }
  reset() {
    this.y = null
    this.s = null
  }
}

const alphaOf = (cutOff, dt) => {
  const tau = 1 / (2 * Math.PI * cutOff)
  return 1 / (1 + tau / dt)
}

export class OneEuro {
  constructor({ minCutOff = 1.2, beta = 0.02, dCutOff = 1.0 } = {}) {
    this.minCutOff = minCutOff
    this.beta = beta
    this.dCutOff = dCutOff
    this.x = new LowPass()
    this.dx = new LowPass()
    this.lastTs = null
  }
  filter(value, ts) {
    let dt = this.lastTs === null ? 1 / 60 : (ts - this.lastTs) / 1000
    if (!(dt > 0) || dt > 0.5) dt = 1 / 60
    this.lastTs = ts

    const prev = this.x.y
    const dValue = prev === null ? 0 : (value - prev) / dt
    const edValue = this.dx.filter(dValue, alphaOf(this.dCutOff, dt))
    const cutOff = this.minCutOff + this.beta * Math.abs(edValue)
    return this.x.filter(value, alphaOf(cutOff, dt))
  }
  reset() {
    this.x.reset()
    this.dx.reset()
    this.lastTs = null
  }
}

/**
 * یک بانک فیلتر برای آرایه‌ای از لندمارک‌ها. هر مختصات فیلتر خودش را دارد.
 * ورودی و خروجی: آرایه‌ای از {x, y, z}. اگر تعداد نقاط عوض شود، بانک بازنشانی می‌شود.
 */
export class LandmarkFilter {
  constructor(options = {}) {
    this.options = options
    this.banks = []
    this.count = 0
  }
  reset() {
    this.banks = []
    this.count = 0
  }
  apply(points, ts) {
    if (!points) return points
    if (points.length !== this.count) {
      this.count = points.length
      this.banks = points.map(() => ({
        x: new OneEuro(this.options),
        y: new OneEuro(this.options),
        z: new OneEuro(this.options),
      }))
    }
    const out = new Array(points.length)
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      const b = this.banks[i]
      out[i] = {
        x: b.x.filter(p.x, ts),
        y: b.y.filter(p.y, ts),
        z: b.z.filter(p.z ?? 0, ts),
        visibility: p.visibility,
      }
    }
    return out
  }
}
