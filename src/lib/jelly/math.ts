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

export type Quat = [number, number, number, number]

/** Quaternions [x, y, z, w] and in-place 4×4 helpers for the cast (no allocation per frame). */
export const Q = {
  mul(a: ArrayLike<number>, b: ArrayLike<number>, o: Quat | Float32Array = [0, 0, 0, 1]) {
    const ax = a[0], ay = a[1], az = a[2], aw = a[3], bx = b[0], by = b[1], bz = b[2], bw = b[3]
    o[0] = aw * bx + ax * bw + ay * bz - az * by
    o[1] = aw * by - ax * bz + ay * bw + az * bx
    o[2] = aw * bz + ax * by - ay * bx + az * bw
    o[3] = aw * bw - ax * bx - ay * by - az * bz
    return o
  },
  /** rotation of `ang` radians about the unit axis */
  axis(x: number, y: number, z: number, ang: number, o: Quat | Float32Array = [0, 0, 0, 1]) {
    const s = Math.sin(ang / 2)
    o[0] = x * s; o[1] = y * s; o[2] = z * s; o[3] = Math.cos(ang / 2)
    return o
  },
  norm(q: Quat | Float32Array) {
    const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1
    q[0] /= l; q[1] /= l; q[2] /= l; q[3] /= l
    return q
  },
  slerp(a: ArrayLike<number>, b: ArrayLike<number>, t: number, o: Quat | Float32Array) {
    let bx = b[0], by = b[1], bz = b[2], bw = b[3]
    let d = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw
    if (d < 0) { d = -d; bx = -bx; by = -by; bz = -bz; bw = -bw }
    let ka = 1 - t, kb = t
    if (d < 0.9995) { const th = Math.acos(d), s = Math.sin(th); ka = Math.sin(ka * th) / s; kb = Math.sin(kb * th) / s }
    o[0] = a[0] * ka + bx * kb; o[1] = a[1] * ka + by * kb; o[2] = a[2] * ka + bz * kb; o[3] = a[3] * ka + bw * kb
    return Q.norm(o)
  },
}

export const M4x = {
  /** o = a · b (column-major), written into o (which may not alias a or b) */
  mulInto(o: Float32Array, a: ArrayLike<number>, b: ArrayLike<number>, oo = 0, ao = 0, bo = 0) {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      o[oo + i * 4 + j] = a[ao + j] * b[bo + i * 4] + a[ao + 4 + j] * b[bo + i * 4 + 1] + a[ao + 8 + j] * b[bo + i * 4 + 2] + a[ao + 12 + j] * b[bo + i * 4 + 3]
    }
    return o
  },
  /** translation · rotation · scale, written into o at offset oo */
  compose(o: Float32Array, t: ArrayLike<number>, r: ArrayLike<number>, s: ArrayLike<number>, oo = 0) {
    const x = r[0], y = r[1], z = r[2], w = r[3], x2 = x + x, y2 = y + y, z2 = z + z
    const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2
    o[oo] = (1 - (yy + zz)) * s[0]; o[oo + 1] = (xy + wz) * s[0]; o[oo + 2] = (xz - wy) * s[0]; o[oo + 3] = 0
    o[oo + 4] = (xy - wz) * s[1]; o[oo + 5] = (1 - (xx + zz)) * s[1]; o[oo + 6] = (yz + wx) * s[1]; o[oo + 7] = 0
    o[oo + 8] = (xz + wy) * s[2]; o[oo + 9] = (yz - wx) * s[2]; o[oo + 10] = (1 - (xx + yy)) * s[2]; o[oo + 11] = 0
    o[oo + 12] = t[0]; o[oo + 13] = t[1]; o[oo + 14] = t[2]; o[oo + 15] = 1
    return o
  },
  /** p transformed by the matrix at offset mo (a point: w = 1) */
  point(m: ArrayLike<number>, x: number, y: number, z: number, o: number[] = [0, 0, 0], mo = 0) {
    o[0] = m[mo] * x + m[mo + 4] * y + m[mo + 8] * z + m[mo + 12]
    o[1] = m[mo + 1] * x + m[mo + 5] * y + m[mo + 9] * z + m[mo + 13]
    o[2] = m[mo + 2] * x + m[mo + 6] * y + m[mo + 10] * z + m[mo + 14]
    return o
  },
}
