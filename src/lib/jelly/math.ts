export type Vec3 = [number, number, number]

/** Column-major 4×4 matrices, as WebGL wants them. */
export const M4 = {
  persp(fovy: number, asp: number, n: number, f: number) {
    const t = 1 / Math.tan(fovy / 2), nf = 1 / (n - f)
    return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0])
  },
  lookAt(e: Vec3, c: Vec3, u: Vec3) {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2], l = Math.hypot(zx, zy, zz)
    zx /= l; zy /= l; zz /= l
    let xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx
    l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx
    return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1])
  },
  mul(a: Float32Array, b: Float32Array) {
    const o = new Float32Array(16)
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      let s = 0
      for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]
      o[i * 4 + j] = s
    }
    return o
  },
}

/** Smoothstep from 0 to 1. */
export const smooth = (t: number) => {
  t = Math.max(0, Math.min(1, t))
  return t * t * (3 - 2 * t)
}

/** '#rrggbb' → [r, g, b] in 0…1. */
export const hex = (h: string): Vec3 => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]

/** The playground's seeded generator (a 32-bit LCG), so builds are repeatable. */
export const lcg = (seed: number) => {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
