/**
 * The Relic Vault's pure math, ported from the mockup (docs/design/projects-vault/vault.js): the hall's layout and
 * spring, the CRT's cover crop and scanline count, and the hologram's homography, hull, landing rect and camera look-up.
 * No three, no DOM: src/__tests__/vault-math.test.ts covers it.
 */

export type Pt = [number, number]
/** corners in the order top-left, top-right, bottom-right, bottom-left */
export type Quad = [Pt, Pt, Pt, Pt]
/** a projective map of the unit square: x = (a·u + b·v + c) / w, y = (d·u + e·v + f) / w, w = g·u + h·v + 1 */
export type Homography = { a: number; b: number; c: number; d: number; e: number; f: number; g: number; h: number }
export type Rect = { x: number; y: number; w: number; h: number }

/** the hall's radius: the sets stand on it, facing its centre */
export const R = 7
/** radians between sets */
export const STEP = 0.27
/** every screen's centre, whatever the set (the plinths make up the difference) */
export const SCREEN_Y = 1.5
/** Number Slayers in front at load */
export const START = 1
/** the hologram's title and buttons sit in a bar this tall over the panel */
export const BAR_H = 60

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const easeOut = (t: number) => 1 - (1 - t) ** 3
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

/** a set's angle on the arc (s may be fractional: the camera's position between sets) */
export const angleOf = (s: number, n: number) => (s - (n - 1) / 2) * STEP

/** the camera pulls back this far while the hologram is up */
export const holoBack = (wide: boolean) => (wide ? 1.9 : 1.3)

/** a drag of this many CSS px moves the hall one set */
export const dragPer = (stageW: number, wide: boolean) => stageW * (wide ? 0.26 : 0.5)

/** scanlines: about 3.2 device px each, whatever the distance (screenPx = the screen's projected height) */
export const scanLines = (screenPx: number) => clamp(screenPx / 3.2, 50, 240)

/** the texture's crop (fraction of it shown across, down) so it covers a screen of another aspect */
export function coverCrop(texAspect: number, screenAspect: number): Pt {
  return texAspect > screenAspect ? [screenAspect / texAspect, 1] : [1, texAspect / screenAspect]
}

const SPRING_K = 34
const SPRING_C = 2 * Math.sqrt(SPRING_K) * 1.02
const MAX_VEL = 9

/** one step of the hall's spring toward the target (k 34, damping 1.02 × critical, |v| ≤ 9), snapping when there */
export function springStep(pos: number, vel: number, target: number, dt: number) {
  vel = clamp(vel + (SPRING_K * (target - pos) - SPRING_C * vel) * dt, -MAX_VEL, MAX_VEL)
  pos += vel * dt
  if (Math.abs(target - pos) < 0.002 && Math.abs(vel) < 0.02) return { pos: target, vel: 0 }
  return { pos, vel }
}

/** where a released drag lands: the nearest set after the flick's throw (velocity × 0.16, capped at ±6 sets/s) */
export const releaseTarget = (pos: number, vel: number, n: number) => clamp(Math.round(pos + clamp(vel, -6, 6) * 0.16), 0, n - 1)

/** the unit square → a quad (TL TR BR BL), as a projective map */
export function sq2quad(q: Quad): Homography {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q
  const dx1 = x1 - x2
  const dx2 = x3 - x2
  const dx3 = x0 - x1 + x2 - x3
  const dy1 = y1 - y2
  const dy2 = y3 - y2
  const dy3 = y0 - y1 + y2 - y3
  let g = 0
  let h = 0
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) {
    const den = dx1 * dy2 - dx2 * dy1
    g = (dx3 * dy2 - dx2 * dy3) / den
    h = (dx1 * dy3 - dx3 * dy1) / den
  }
  return { a: x1 - x0 + g * x1, b: x3 - x0 + h * x3, c: x0, d: y1 - y0 + g * y1, e: y3 - y0 + h * y3, f: y0, g, h }
}

export const mapH = (M: Homography, u: number, v: number): Pt => {
  const w = M.g * u + M.h * v + 1
  return [(M.a * u + M.b * v + M.c) / w, (M.d * u + M.e * v + M.f) / w]
}

/** the CSS matrix3d that maps a W × H box (origin top-left) by M */
export const cssH = (M: Homography, W: number, H: number) =>
  `matrix3d(${M.a / W},${M.d / W},0,${M.g / W},${M.b / H},${M.e / H},0,${M.h / H},0,0,1,0,${M.c},${M.f},0,1)`

/** the convex hull (monotone chain) */
export function hull(pts: Pt[]): Pt[] {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lo: Pt[] = []
  const up: Pt[] = []
  for (const q of p) {
    while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop()
    lo.push(q)
  }
  for (const q of p.reverse()) {
    while (up.length > 1 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop()
    up.push(q)
  }
  return lo.slice(0, -1).concat(up.slice(0, -1))
}

/** where the hologram lands: centred under its bar, as big as fits (vw < 760: the phone layout) */
export function finalRect(aspect: number, vw: number, vh: number): Rect {
  const narrow = vw < 760
  const top = narrow ? 16 + BAR_H + 8 : Math.max(16 + BAR_H, vh * 0.06 + BAR_H)
  const maxW = Math.min(vw - (narrow ? 32 : 96), 1000)
  const maxH = vh * (narrow ? 0.5 : 0.56) - top + (narrow ? 60 : 40)
  let w = maxW
  let h = w / aspect
  if (h > maxH) {
    h = maxH
    w = h * aspect
  }
  return { x: (vw - w) / 2, y: top, w, h }
}

/**
 * How far the camera looks up while the hologram is up, so the set lands below the panel: the point halfway between
 * the panel's bottom and the viewport's, kept on the stage (30 %–81 % down it), as a world offset at the screen's depth.
 */
export function lookUp(f: Rect, stage: { top: number; height: number }, vh: number, wide: boolean, camD: number, fov: number) {
  const want = clamp((f.y + f.h + vh) / 2 + (wide ? 30 : 10), stage.top + stage.height * 0.3, stage.top + stage.height * 0.81)
  const ndcY = 1 - (2 * (want - stage.top)) / stage.height
  return -ndcY * (camD + holoBack(wide)) * Math.tan(((fov / 2) * Math.PI) / 180)
}

/** the full picture's corners while its cropped middle sits on the glass (quad = the glass, crop = coverCrop's) */
export function startCorners(quad: Quad, crop: Pt): Quad {
  const [cx, cy] = crop
  const Hq = sq2quad(quad)
  const u0 = -(1 - cx) / 2 / cx
  const u1 = 1 + (1 - cx) / 2 / cx
  const v0 = -(1 - cy) / 2 / cy
  const v1 = 1 + (1 - cy) / 2 / cy
  return [mapH(Hq, u0, v0), mapH(Hq, u1, v0), mapH(Hq, u1, v1), mapH(Hq, u0, v1)]
}
