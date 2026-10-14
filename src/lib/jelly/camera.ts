/**
 * The camera and map-style navigation: zoom 1 fits the whole page between the Finder and
 * the HUD; zoom toward the cursor, pan in 2D with a fling, rotate the page in 3D.
 */

import { FOV, JELLY_CONFIG, ZMAX, ZMIN } from './config'
import { M4, type Vec3 } from './math'
import type { World } from './world'

/** How much of the screen the Finder (top) and the HUD (bottom) cover. */
export interface UiInsets {
  top: number
  bot: number
}

export interface Ray {
  eye: Vec3
  dir: Vec3
}

export function updateCamera(w: World, dt: number, width: number, height: number, ui: UiInsets, ic: number) {
  const cam = w.cam, s = w.s
  const asp = width / height, tf = Math.tan(FOV / 2)
  const topF = ui.top, botF = ui.bot
  const fitW = (w.pageW / 2 + 0.35) / (tf * asp), fitH = (w.pageH / 2 + 0.25) / (tf * Math.max(0.3, 1 - topF - botF))
  const ease = Math.min(1, dt * 12)
  cam.zoom = cam.zoom === null ? s.zoom : cam.zoom + (s.zoom - cam.zoom) * ease
  const dist = Math.max(fitW, fitH) * cam.zoom * (1 + 0.75 * ic) // the entrance swings in from further out
  const halfH = dist * tf, halfW = halfH * asp
  // pan limits: bigger than the view, the page edges can come to the edges of the free area, never further;
  // smaller than the view, the page can slide around as long as it stays fully on screen (so zooming at the cursor holds the point)
  const lo = -w.pageH / 2 - 0.25 + halfH * (1 - 2 * botF), hi = w.pageH / 2 + 0.25 - halfH * (1 - 2 * topF), xr = w.pageW / 2 + 0.3 - halfW
  cam.canPan = hi - lo > 0.05 || xr > 0.05
  cam.scrollY = Math.max(Math.min(lo, hi), Math.min(Math.max(lo, hi), cam.scrollY))
  // (around the width where the page just fits, the strict limit is ~0; keep some sideways room so zooming at the cursor holds the point)
  const xl = Math.max(Math.abs(xr), Math.min(w.pageW / 2, halfW) * 0.75)
  cam.scrollX = Math.max(-xl, Math.min(xl, cam.scrollX))
  cam.y = cam.y === null ? cam.scrollY : cam.y + (cam.scrollY - cam.y) * ease
  cam.x = cam.x === null ? cam.scrollX : cam.x + (cam.scrollX - cam.x) * ease
  cam.halfW = halfW
  cam.halfH = halfH
  const tg: Vec3 = [cam.x + cam.shake.x, cam.y + cam.shake.y, 0]
  const el = s.tilt + 0.2 * ic, az = s.yaw + 0.5 * ic
  cam.eye = [tg[0] + dist * Math.sin(az) * Math.cos(el), tg[1] + dist * Math.sin(el), tg[2] + dist * Math.cos(az) * Math.cos(el)]
  cam.target = tg
  cam.aspect = asp
  cam.mvp = M4.mul(M4.persp(FOV, asp, 0.05, 300), M4.lookAt(cam.eye, tg, [0, 1, 0]))
  let f: Vec3 = [tg[0] - cam.eye[0], tg[1] - cam.eye[1], tg[2] - cam.eye[2]]
  const fl = Math.hypot(...f)
  f = [f[0] / fl, f[1] / fl, f[2] / fl]
  let r: Vec3 = [-f[2], 0, f[0]]
  const rl = Math.hypot(...r)
  r = [r[0] / rl, r[1] / rl, r[2] / rl]
  cam.fwd = f
  cam.right = r
  cam.up = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]
}

export const camDist = (w: World) => Math.hypot(w.cam.eye[0] - w.cam.target[0], w.cam.eye[1] - w.cam.target[1], w.cam.eye[2] - w.cam.target[2])

export function rayAt(w: World, rc: DOMRect, clientX: number, clientY: number): Ray {
  const cam = w.cam
  const nx = ((clientX - rc.left) / rc.width) * 2 - 1, ny = 1 - ((clientY - rc.top) / rc.height) * 2, tf = Math.tan(FOV / 2)
  const d = [0, 1, 2].map((a) => cam.fwd[a] + cam.right[a] * nx * tf * cam.aspect + cam.up[a] * ny * tf)
  const l = Math.hypot(...d)
  return { eye: [...cam.eye] as Vec3, dir: [d[0] / l, d[1] / l, d[2] / l] }
}

export const planeZ = (ray: Ray, z: number): Vec3 => {
  const t = (z - ray.eye[2]) / ray.dir[2]
  return [ray.eye[0] + ray.dir[0] * t, ray.eye[1] + ray.dir[1] * t, z]
}

/** Lattice particle i on screen (CSS px within the canvas). */
export function project(w: World, i: number, rc: DOMRect): [number, number] {
  const m = w.cam.mvp, o = i * 3, X = w.pos[o], Y = w.pos[o + 1], Z = w.pos[o + 2]
  const ww = m[3] * X + m[7] * Y + m[11] * Z + m[15]
  if (ww <= 0) return [-1e9, -1e9]
  return [
    (((m[0] * X + m[4] * Y + m[8] * Z + m[12]) / ww) * 0.5 + 0.5) * rc.width,
    (1 - (((m[1] * X + m[5] * Y + m[9] * Z + m[13]) / ww) * 0.5 + 0.5)) * rc.height,
  ]
}

/** The visible lattice particle nearest a screen point, within maxPx (-1 if none). */
export function pickParticle(w: World, sx: number, sy: number, rc: DOMRect, maxPx = 22) {
  let best = -1, bd2 = maxPx * maxPx
  for (let i = 0; i < w.NP; i++) {
    if (w.vis[i] < 0.5) continue
    const [px, py] = project(w, i, rc)
    const d2 = (px - sx) ** 2 + (py - sy) ** 2
    if (d2 < bd2) { bd2 = d2; best = i }
  }
  return best
}

/** World units per CSS pixel at the camera target. */
export const pxToWorld = (w: World, rc: DOMRect) => (2 * Math.tan(FOV / 2) * camDist(w)) / rc.height

/** Zoom by factor f keeping the point under the cursor where it is. */
export function zoomAt(w: World, rc: DOMRect, ui: UiInsets, clientX: number, clientY: number, f: number, instant = true) {
  const cam = w.cam, s = w.s
  const z0 = s.zoom, z1 = Math.max(ZMIN, Math.min(ZMAX, z0 * f))
  if (Math.abs(z1 - z0) < 1e-5) return
  // target' = p - (p - target) * (z1 / z0)
  const p = planeZ(rayAt(w, rc, clientX, clientY), 0), r = z1 / z0
  const tx = instant ? (cam.x ?? cam.scrollX) : cam.scrollX, ty = instant ? (cam.y ?? cam.scrollY) : cam.scrollY
  cam.scrollX = p[0] - (p[0] - tx) * r
  cam.scrollY = p[1] - (p[1] - ty) * r
  if (z1 >= 0.999) { cam.scrollX = 0; cam.scrollY = 0 } // back to the whole page: recentre
  s.zoom = z1
  cam.mom = null
  w.navCalm = 1
  if (instant) { cam.zoom = z1; cam.x = cam.y = null; updateCamera(w, 0, rc.width, rc.height, ui, 0) } // direct manipulation: no easing lag under the fingers
}

export function zoomCenter(w: World, rc: DOMRect, ui: UiInsets, f: number) {
  zoomAt(w, rc, ui, rc.left + rc.width / 2, rc.top + rc.height * (0.5 + (ui.top - ui.bot) / 2), f, false)
}

/** Rotate the page in 3D (yaw around, tilt over). */
export function orbitBy(w: World, dxPx: number, dyPx: number) {
  w.navCalm = 1
  w.s.yaw = Math.max(-1.25, Math.min(1.25, w.s.yaw - dxPx * 0.005))
  w.s.tilt = Math.max(-0.6, Math.min(1.1, w.s.tilt + dyPx * 0.004))
}

export function panBy(w: World, rc: DOMRect, dxPx: number, dyPx: number) {
  const k = pxToWorld(w, rc)
  w.cam.scrollX -= dxPx * k
  w.cam.scrollY += dyPx * k
  w.navCalm = 1
}

export function stepMomentum(w: World, dt: number) {
  const cam = w.cam
  if (!cam.mom) return
  cam.scrollX += cam.mom.x * dt
  cam.scrollY += cam.mom.y * dt
  const d = Math.exp(-dt * 4.5)
  cam.mom.x *= d
  cam.mom.y *= d
  if (Math.hypot(cam.mom.x, cam.mom.y) < 0.05) cam.mom = null
}

export function resetView(w: World) {
  w.s.yaw = JELLY_CONFIG.yaw
  w.s.tilt = JELLY_CONFIG.tilt
  w.s.zoom = JELLY_CONFIG.zoom
  w.cam.scrollX = 0
  w.cam.scrollY = 0
  w.cam.mom = null
}
