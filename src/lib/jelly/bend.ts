/**
 * The paper bends: slow waves through the sheet and curling corners. The same formula
 * runs in the page vertex shader (BEND in shaders.ts); the CPU samples it from a small
 * per-frame table so words, loose words and sparks all sit on the bent surface.
 */

export interface BendParams {
  /** wave amplitude */
  a: number
  /** corner curl */
  c: number
  t: number
  /** shroom wobble */
  s: number
}

export function bendZ(p: BendParams, halfW: number, halfH: number, x: number, y: number) {
  const qx = x / halfW, qy = y / halfH, t = p.t
  let z = p.a * (0.55 * Math.sin(1.6 * qx + 0.5 * t) * Math.cos(1.2 * qy + 0.35 * t) + 0.35 * Math.sin(2.3 * qy - 0.45 * t + 0.8 * qx))
  const k = Math.max(0, (qx - qy) * 0.5 - 0.55) / 0.45, k2 = Math.max(0, (qy - qx) * 0.5 - 0.7) / 0.3
  z += p.c * (k * k * (0.85 + 0.15 * Math.sin(t * 0.6)) + 0.5 * k2 * k2 * (0.85 + 0.15 * Math.sin(t * 0.5 + 2)))
  z += p.s * (0.06 * Math.sin(y * 1.3 + t * 1.4) + 0.04 * Math.sin(x * 0.9 + t))
  return z
}

const BGX = 24, BGY = 32

/** bendZ sampled on a 24×32 grid once a frame, read back bilinearly. */
export class BendTable {
  readonly p: BendParams = { a: 0, c: 0, t: 0, s: 0 }
  private tab = new Float32Array((BGX + 1) * (BGY + 1))
  private w = 8.5
  private h = 11

  update(pageW: number, pageH: number) {
    this.w = pageW; this.h = pageH
    const hw = pageW / 2, hh = pageH / 2
    for (let j = 0; j <= BGY; j++) for (let i = 0; i <= BGX; i++)
      this.tab[j * (BGX + 1) + i] = bendZ(this.p, hw, hh, -hw + (pageW * i) / BGX, -hh + (pageH * j) / BGY)
  }

  at(x: number, y: number) {
    const fx = Math.max(0, Math.min(BGX - 1e-4, ((x + this.w / 2) / this.w) * BGX))
    const fy = Math.max(0, Math.min(BGY - 1e-4, ((y + this.h / 2) / this.h) * BGY))
    const i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j, r = BGX + 1, t = this.tab
    const a = t[j * r + i], b = t[j * r + i + 1], c = t[(j + 1) * r + i], d = t[(j + 1) * r + i + 1]
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty
  }
}
