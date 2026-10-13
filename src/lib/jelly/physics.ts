/**
 * Physics: each word is a mass-spring lattice held home by a spring (semi-implicit
 * Euler, 4 substeps a frame). Words break loose, fly "Into the Void", collide, burst
 * into comet sparks, and the sparks swarm home so the page always heals.
 */

import { BURST, EATEN, HOME, INTRO, LOOSE, R_COL, REFORM, RETURN, SLAB_MAX, SLAB_MIN } from './config'
import { galaxyAt } from './galaxy'
import { smooth, type Vec3 } from './math'
import { bilerp, hidden, type Body, type World } from './world'

const tmp = [0, 0, 0]
const gtmp = [0, 0, 0]

export function step(w: World, dt: number) {
  const { s, pos, vel, home, off, frc, inv, sa, sb, srest, sk, vis } = w
  const melt = w.shroomAmt * s.melt
  const K = s.stiffness * (1 - 0.72 * melt), D = s.damping, DT = D * 0.4
  frc.fill(0)
  for (let q = 0; q < w.NS; q++) {
    const a = sa[q] * 3, b = sb[q] * 3
    const dx = pos[b] - pos[a], dy = pos[b + 1] - pos[a + 1], dz = pos[b + 2] - pos[a + 2]
    const L = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6, nx = dx / L, ny = dy / L, nz = dz / L
    const rvx = vel[b] - vel[a], rvy = vel[b + 1] - vel[a + 1], rvz = vel[b + 2] - vel[a + 2]
    const rn = rvx * nx + rvy * ny + rvz * nz
    const f = K * sk[q] * (L - srest[q]) + D * rn
    const fx = f * nx + DT * (rvx - rn * nx), fy = f * ny + DT * (rvy - rn * ny), fz = f * nz + DT * (rvz - rn * nz)
    frc[a] += fx; frc[a + 1] += fy; frc[a + 2] += fz; frc[b] -= fx; frc[b + 1] -= fy; frc[b + 2] -= fz
  }
  const H = s.homePull * (1 - 0.8 * melt) * (1 + 0.8 * w.danceMix), HD = 2 * Math.sqrt(H) * 0.7 // a little snappier while dancing
  const g = s.space === 'fall' ? s.gravity : 0
  const TX = w.tiltG.on ? w.tiltG.x * s.tiltForce : 0, TY = w.tiltG.on ? w.tiltG.y * s.tiltForce : 0
  for (const bd of w.bodies) {
    const st = bd.strength, loose = bd.state === LOOSE, sag = bd.state === HOME ? 4 * melt : 0
    const wob = melt * 6, ph = bd.seed * 6.283
    for (let i = bd.p0; i < bd.p1; i++) {
      const o = i * 3, m = 1 / inv[i]
      if (st > 0) {
        const tx = home[o] + off[o], ty = home[o + 1] + off[o + 1], tz = home[o + 2] + off[o + 2]
        frc[o] += H * st * (tx - pos[o]) - HD * st * vel[o]
        frc[o + 1] += H * st * (ty - pos[o + 1]) - HD * st * vel[o + 1]
        frc[o + 2] += H * st * (tz - pos[o + 2]) - HD * st * vel[o + 2]
      }
      if (loose) { frc[o] += TX * m; frc[o + 1] += (TY - g) * m } else frc[o + 1] -= sag * m
      if (wob > 0 && !loose) {
        frc[o] += wob * Math.sin(w.time * 2.1 + home[o + 1] * 3 + ph)
        frc[o + 1] += wob * Math.cos(w.time * 1.7 + home[o] * 2.2 + ph)
      }
    }
  }
  const f = w.finger
  if (f.active && s.fingerForce > 0 && w.navCalm < 0.01) { // no hover squish while the page moves under the cursor
    const R = s.fingerRadius, [ex, ey, ez] = f.eye, [dx, dy, dz] = f.dir, [fvx, fvy, fvz] = f.vel
    for (let i = 0; i < w.NP; i++) {
      const o = i * 3, vx = pos[o] - ex, vy = pos[o + 1] - ey, vz = pos[o + 2] - ez
      const t = vx * dx + vy * dy + vz * dz, cx = vx - dx * t, cy = vy - dy * t, cz = vz - dz * t
      const d = Math.sqrt(cx * cx + cy * cy + cz * cz)
      if (d >= R || vis[i] < 0.5) continue
      const fall = (1 - d / R) * (1 - d / R), id = d > 1e-4 ? 1 / d : 0, F = s.fingerForce * fall
      frc[o] += F * (cx * id * 0.8 - dx * 0.6) + fvx * s.flick * fall * 4
      frc[o + 1] += F * (cy * id * 0.8 - dy * 0.6) + fvy * s.flick * fall * 4
      frc[o + 2] += F * (cz * id * 0.8 - dz * 0.6) + fvz * s.flick * fall * 4
    }
  }
  const hole = w.hole
  if (hole.amt > 0.01) {
    // Pull toward the hole with a swirl; the near end of a word is pulled harder than the far end, so it stretches
    const [hx, hy, hz] = hole.p, A = hole.amt * s.holePull, R = 1.3 + 3.2 * A, R2 = R * R, G = 70 * A
    for (let i = 0; i < w.NP; i++) {
      if (vis[i] < 0.5) continue
      const o = i * 3, dx = hx - pos[o], dy = hy - pos[o + 1], dz = hz - pos[o + 2], d2 = dx * dx + dy * dy + dz * dz
      if (d2 > R2) continue
      const d = Math.sqrt(d2) + 1e-4, ff = Math.min(140, (G * (1 - d2 / R2)) / (d2 + 0.06)) / d / inv[i]
      frc[o] += (dx - dy * 0.9) * ff; frc[o + 1] += (dy + dx * 0.9) * ff; frc[o + 2] += dz * ff
    }
  }
  const hw = w.pageW / 2 - 0.05, top = w.pageH / 2 - 0.05, bot = w.pageBottom + 0.05
  const e = s.bounce
  for (const bd of w.bodies) {
    const loose = bd.state === LOOSE
    const air = loose ? Math.max(0, 1 - s.airDrag * dt) : Math.max(0, 1 - 0.6 * dt)
    const slab = loose && !bd.escaped && s.space === 'float'
    const guard = loose && !(bd.escaped && s.space !== 'fall')
    for (let i = bd.p0; i < bd.p1; i++) {
      const o = i * 3, im = inv[i]
      for (let a = 0; a < 3; a++) { vel[o + a] = (vel[o + a] + frc[o + a] * im * dt) * air; pos[o + a] += vel[o + a] * dt }
      if (slab) {
        // Air-hockey table: slide over the (bent) page, bounce off its edges
        const zb = w.bend.at(pos[o], pos[o + 1])
        if (pos[o + 2] < zb + SLAB_MIN) { pos[o + 2] = zb + SLAB_MIN; if (vel[o + 2] < 0) vel[o + 2] *= -0.3 }
        else if (pos[o + 2] > zb + SLAB_MAX) { pos[o + 2] = zb + SLAB_MAX; if (vel[o + 2] > 0) vel[o + 2] *= -0.3 }
        if (pos[o] < -hw) { pos[o] = -hw; if (vel[o] < 0) vel[o] *= -e } else if (pos[o] > hw) { pos[o] = hw; if (vel[o] > 0) vel[o] *= -e }
        if (pos[o + 1] > top) { pos[o + 1] = top; if (vel[o + 1] > 0) vel[o + 1] *= -e } else if (pos[o + 1] < bot) { pos[o + 1] = bot; if (vel[o + 1] < 0) vel[o + 1] *= -e }
      } else if (guard) {
        // Can't pass back through the page
        if (Math.abs(pos[o]) < w.pageW / 2 && pos[o + 1] < w.pageH / 2 && pos[o + 1] > w.pageBottom) {
          const zb = w.bend.at(pos[o], pos[o + 1])
          if (pos[o + 2] < zb + 0.03 && pos[o + 2] > zb - 0.6) { pos[o + 2] = zb + 0.03; if (vel[o + 2] < 0) vel[o + 2] *= -e }
        }
        if (s.space === 'fall' && pos[o + 1] < w.pageBottom) { pos[o + 1] = w.pageBottom; if (vel[o + 1] < 0) vel[o + 1] *= -e; vel[o] *= 0.97; vel[o + 2] *= 0.97 }
      }
    }
  }
}

// Collisions: loose words vs each other and vs the text still on the page (a spatial hash)
const TABLE = 1 << 15
const cellStart = new Int32Array(TABLE + 1)
let list = new Int32Array(1), keys = new Int32Array(1), sorted = new Int32Array(1), isLoose = new Uint8Array(1)
const hashCell = (ix: number, iy: number, iz: number) => ((ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791)) & (TABLE - 1)

export function collide(w: World) {
  const { pos, vel, pBody, s } = w
  if (list.length < w.NP) { list = new Int32Array(w.NP); keys = new Int32Array(w.NP); sorted = new Int32Array(w.NP); isLoose = new Uint8Array(w.NP) }
  isLoose.fill(0)
  let n = 0
  for (const bd of w.bodies) if (bd.state === LOOSE) for (let i = bd.p0; i < bd.p1; i++) { list[n++] = i; isLoose[i] = 1 }
  const nl = n
  if (nl === 0) return
  if (s.contagion > 0 || s.burstSpeed > 0) for (const bd of w.bodies) if (bd.state === HOME) for (let i = bd.p0; i < bd.p1; i++) list[n++] = i
  const h = R_COL * 2
  cellStart.fill(0)
  for (let k = 0; k < n; k++) {
    const o = list[k] * 3
    const key = hashCell(Math.floor(pos[o] / h), Math.floor(pos[o + 1] / h), Math.floor(pos[o + 2] / h))
    keys[k] = key
    cellStart[key + 1]++
  }
  for (let i = 0; i < TABLE; i++) cellStart[i + 1] += cellStart[i]
  const fill = cellStart.slice(0, TABLE)
  for (let k = 0; k < n; k++) sorted[fill[keys[k]]++] = list[k]
  const rr = (2 * R_COL) ** 2, e = s.bounce, C = s.contagion, BS = s.burstSpeed
  for (let k = 0; k < nl; k++) {
    const i = list[k], o = i * 3
    const cx = Math.floor(pos[o] / h), cy = Math.floor(pos[o + 1] / h), cz = Math.floor(pos[o + 2] / h)
    for (let ax = -1; ax <= 1; ax++) for (let ay = -1; ay <= 1; ay++) for (let az = -1; az <= 1; az++) {
      const key = hashCell(cx + ax, cy + ay, cz + az)
      for (let q = cellStart[key]; q < cellStart[key + 1]; q++) {
        const j = sorted[q]
        if (pBody[j] === pBody[i] || (isLoose[j] && j <= i)) continue
        const p = j * 3, dx = pos[p] - pos[o], dy = pos[p + 1] - pos[o + 1], dz = pos[p + 2] - pos[o + 2]
        const d2 = dx * dx + dy * dy + dz * dz
        if (d2 >= rr || d2 < 1e-10) continue
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, nz = dz / d, overlap = 2 * R_COL - d
        const vn = (vel[o] - vel[p]) * nx + (vel[o + 1] - vel[p + 1]) * ny + (vel[o + 2] - vel[p + 2]) * nz // > 0: approaching
        if (isLoose[j]) {
          pos[o] -= nx * overlap * 0.5; pos[o + 1] -= ny * overlap * 0.5; pos[o + 2] -= nz * overlap * 0.5
          pos[p] += nx * overlap * 0.5; pos[p + 1] += ny * overlap * 0.5; pos[p + 2] += nz * overlap * 0.5
          if (vn > 0) {
            const imp = vn * 0.5 * (1 + e)
            vel[o] -= nx * imp; vel[o + 1] -= ny * imp; vel[o + 2] -= nz * imp; vel[p] += nx * imp; vel[p + 1] += ny * imp; vel[p + 2] += nz * imp
            if (BS > 0 && vn > BS) { w.burstQueue.add(pBody[i]); w.burstQueue.add(pBody[j]) }
          }
        } else {
          // Hitting text still on the page: bounce off it and shove it (contagion)
          pos[o] -= nx * overlap; pos[o + 1] -= ny * overlap; pos[o + 2] -= nz * overlap
          if (vn > 0) {
            vel[o] -= nx * vn * (0.5 + 0.5 * e); vel[o + 1] -= ny * vn * (0.5 + 0.5 * e); vel[o + 2] -= nz * vn * (0.5 + 0.5 * e)
            vel[p] += nx * vn * C * 3; vel[p + 1] += ny * vn * C * 3; vel[p + 2] += Math.abs(nz * vn) * C
            if (BS > 0 && vn > BS) w.burstQueue.add(pBody[i])
          }
        }
      }
    }
  }
}

export function loosen(w: World, bd: Body) {
  if (bd.state === LOOSE || hidden(bd)) return
  const { pos, vel, s } = w
  bd.state = LOOSE
  bd.strength = 0
  bd.timer = s.floatTime * (0.75 + 0.5 * Math.random()) * (1 + w.shroomAmt * s.melt * 0.5)
  bd.escaped = s.space === 'fly' || (s.space === 'float' && Math.random() < s.escape)
  if (bd.escaped) {
    // Toward the camera (gets bigger) or out past the page edge into the distance (gets smaller)
    const toward = Math.random() < 0.55
    let cx = 0, cy = 0
    for (let i = bd.p0; i < bd.p1; i++) { cx += pos[i * 3]; cy += pos[i * 3 + 1] }
    cx /= bd.p1 - bd.p0
    cy /= bd.p1 - bd.p0
    const ox = cx / (w.pageW / 2), oy = (cy - (w.pageH / 2 + w.pageBottom) / 2) / (w.pageH / 2)
    const l = Math.hypot(ox, oy) || 1
    const v = toward
      ? [(Math.random() - 0.5) * 2, (Math.random() - 0.3) * 2, 4 + Math.random() * 4]
      : [(ox / l) * (3 + Math.random() * 3), (oy / l) * (2 + Math.random() * 2), -(2 + Math.random() * 3)]
    const spin = (Math.random() - 0.5) * 6
    for (let i = bd.p0; i < bd.p1; i++) {
      vel[i * 3] += v[0] + spin * (pos[i * 3 + 1] - cy)
      vel[i * 3 + 1] += v[1] - spin * (pos[i * 3] - cx) * 0.3
      vel[i * 3 + 2] += v[2]
    }
  }
}

export function burst(w: World, bd: Body, shock = true) {
  if (hidden(bd)) return
  const { pos, vel, home, vis, s, ptLu, ptLv, ptPos, ptHome, ptVel, ptAlpha, ptAge } = w
  let vx = 0, vy = 0, vz = 0, cx = 0, cy = 0
  const n = bd.p1 - bd.p0
  for (let i = bd.p0; i < bd.p1; i++) { vx += vel[i * 3]; vy += vel[i * 3 + 1]; vz += vel[i * 3 + 2]; cx += pos[i * 3]; cy += pos[i * 3 + 1] }
  vx /= n; vy /= n; vz /= n; cx /= n; cy /= n
  const F = s.burstForce
  for (let k = bd.pt0; k < bd.pt0 + bd.ptN; k++) {
    bilerp(pos, bd, ptLu[k], ptLv[k], tmp)
    ptPos[k * 3] = tmp[0]; ptPos[k * 3 + 1] = tmp[1]; ptPos[k * 3 + 2] = tmp[2]
    bilerp(home, bd, ptLu[k], ptLv[k], tmp)
    ptHome[k * 3] = tmp[0]; ptHome[k * 3 + 1] = tmp[1]; ptHome[k * 3 + 2] = tmp[2] + 0.004
    const dx = ptPos[k * 3] - cx, dy = ptPos[k * 3 + 1] - cy, dz = (Math.random() - 0.2) * 0.6
    const l = Math.hypot(dx, dy, dz) || 1
    const r = F * (0.4 + Math.random())
    ptVel[k * 3] = vx * 0.6 + (dx / l) * r
    ptVel[k * 3 + 1] = vy * 0.6 + (dy / l) * r
    ptVel[k * 3 + 2] = vz * 0.6 + Math.abs(dz / l) * r + 0.6
    ptAlpha[k] = 1
    ptAge[k] = 0
  }
  // Shockwave: shove the words around the burst (they may break loose and burst too)
  if (shock && s.shockwave > 0) {
    const R = 0.35 + 0.55 * s.shockwave, S = 6 * s.shockwave, self = w.bodies.indexOf(bd)
    for (let i = 0; i < w.NP; i++) {
      if (w.pBody[i] === self || vis[i] < 0.5) continue
      const dx = pos[i * 3] - cx, dy = pos[i * 3 + 1] - cy, d = Math.hypot(dx, dy)
      if (d >= R || d < 1e-4) continue
      const f = (1 - d / R) ** 2 * S
      vel[i * 3] += (dx / d) * f; vel[i * 3 + 1] += (dy / d) * f; vel[i * 3 + 2] += f * 0.35
    }
  }
  // The lattice snaps home invisibly, ready to reappear
  for (let i = bd.p0; i < bd.p1; i++) {
    for (let a = 0; a < 3; a++) { pos[i * 3 + a] = home[i * 3 + a]; vel[i * 3 + a] = 0 }
    vis[i] = 0
  }
  bd.state = BURST
  bd.strength = 1
  bd.timer = s.burstTime * (0.8 + 0.4 * Math.random())
  bd.reform = 0
  bd.escaped = false
  bd.jig = 0
}

/** The swirl the sparks ride: the curl of sin(1.3x + 0.7t)·cos(1.1y − 0.6t), like the hero vortex. */
export function swirlKick(vel: Float32Array, pos: Float32Array, o: number, time: number, k: number) {
  const a1 = 1.3 * pos[o] + 0.7 * time + pos[o + 2], b1 = 1.1 * pos[o + 1] - 0.6 * time
  vel[o] += -1.1 * Math.sin(a1) * Math.sin(b1) * k
  vel[o + 1] += -1.3 * Math.cos(a1) * Math.cos(b1) * k
}

export function updateParticles(w: World, dt: number) {
  const { s, ptPos, ptVel, ptHome, ptAlpha, ptAge, hole, intro } = w
  const g = s.space === 'fall' ? s.gravity * 0.6 : 0, drag = Math.max(0, 1 - 1.1 * dt), e = s.bounce
  const HA = hole.amt * s.holePull, [hx, hy, hz] = hole.p, horizon = 0.08 + 0.12 * HA
  const TX = w.tiltG.on ? w.tiltG.x * s.tiltForce * 0.4 : 0, TY = w.tiltG.on ? w.tiltG.y * s.tiltForce * 0.4 : 0, SW = s.swirl * 3
  const camY = w.cam.y ?? 0
  for (const bd of w.bodies) {
    if (!hidden(bd) || bd.state === EATEN) continue
    if (bd.state === INTRO && intro && intro.direct) {
      // fresh from the hero: keep flying until this word's turn
      for (let k = bd.pt0; k < bd.pt0 + bd.ptN; k++) {
        const o = k * 3
        if (SW > 0) swirlKick(ptVel, ptPos, o, w.time, SW * dt)
        for (let a = 0; a < 3; a++) { ptVel[o + a] *= drag; ptPos[o + a] += ptVel[o + a] * dt }
        ptAlpha[k] = Math.min(1, ptAlpha[k] + dt * 3)
        ptAge[k] += dt
      }
      continue
    }
    if (bd.state === INTRO) {
      const ease = 1 - Math.exp(-2.2 * dt)
      for (let k = bd.pt0; k < bd.pt0 + bd.ptN; k++) {
        const o = k * 3
        galaxyAt(w.ptGal, k, w.time, camY, gtmp)
        for (let a = 0; a < 3; a++) ptPos[o + a] += (gtmp[a] - ptPos[o + a]) * ease
        ptAlpha[k] = Math.min(1, ptAlpha[k] + dt * 3)
        ptAge[k] = 9
      }
      continue
    }
    const reform = bd.state === REFORM
    const pull = reform ? 2 + bd.reform * 18 : 0
    for (let k = bd.pt0; k < bd.pt0 + bd.ptN; k++) {
      const o = k * 3
      if (reform) {
        const t = 1 - Math.exp(-pull * dt)
        const bz = w.bend.at(ptHome[o], ptHome[o + 1])
        for (let a = 0; a < 3; a++) { ptVel[o + a] *= 0.9; ptPos[o + a] += (ptHome[o + a] + (a === 2 ? bz : 0) - ptPos[o + a]) * t + ptVel[o + a] * dt }
      } else {
        ptVel[o + 1] -= g * dt; ptVel[o] += TX * dt; ptVel[o + 1] += TY * dt
        if (SW > 0) swirlKick(ptVel, ptPos, o, w.time, SW * dt)
        if (HA > 0.01) {
          const dx = hx - ptPos[o], dy = hy - ptPos[o + 1], dz = hz - ptPos[o + 2], d = Math.hypot(dx, dy, dz) + 1e-4
          if (d < horizon) { ptPos[o] = hx; ptPos[o + 1] = hy; ptPos[o + 2] = hz; ptVel[o] = ptVel[o + 1] = ptVel[o + 2] = 0; continue }
          const f = (Math.min(60, (26 * HA) / (d * d + 0.05)) * dt) / d
          ptVel[o] += (dx - dy * 1.2) * f; ptVel[o + 1] += (dy + dx * 1.2) * f; ptVel[o + 2] += dz * f
        }
        for (let a = 0; a < 3; a++) { ptVel[o + a] *= drag; ptPos[o + a] += ptVel[o + a] * dt }
        if (Math.abs(ptPos[o]) < w.pageW / 2 && ptPos[o + 1] < w.pageH / 2 && ptPos[o + 1] > w.pageBottom) {
          const zb = w.bend.at(ptPos[o], ptPos[o + 1])
          if (ptPos[o + 2] < zb + 0.02 && ptPos[o + 2] > zb - 0.6) { ptPos[o + 2] = zb + 0.02; ptVel[o + 2] = Math.abs(ptVel[o + 2]) * e }
        }
        if (g > 0 && ptPos[o + 1] < w.pageBottom) { ptPos[o + 1] = w.pageBottom; ptVel[o + 1] = Math.abs(ptVel[o + 1]) * e }
      }
      ptAlpha[k] = reform ? 1 - smooth((bd.reform - 0.75) / 0.25) : 1
      ptAge[k] += dt
    }
  }
  updateTrails(w, dt)
}

/** Comet trails: each spark's tail sits where its smoothed recent motion says it came from. */
function updateTrails(w: World, dt: number) {
  const { ptPos, ptPrev, ptSV, ptVel, ptTail, ptAge } = w
  const T = 0.05 * w.s.trail
  for (const bd of w.bodies) {
    if (!hidden(bd) || bd.state === EATEN) continue
    for (let k = bd.pt0; k < bd.pt0 + bd.ptN; k++) {
      const o = k * 3, dx = ptPos[o] - ptPrev[o], dy = ptPos[o + 1] - ptPrev[o + 1], dz = ptPos[o + 2] - ptPrev[o + 2]
      if (ptAge[k] <= dt * 1.01 || dx * dx + dy * dy + dz * dz > 4) { ptSV[o] = ptVel[o]; ptSV[o + 1] = ptVel[o + 1]; ptSV[o + 2] = ptVel[o + 2] } // just born, or teleported
      else {
        ptSV[o] += (dx / dt - ptSV[o]) * 0.45
        ptSV[o + 1] += (dy / dt - ptSV[o + 1]) * 0.45
        ptSV[o + 2] += (dz / dt - ptSV[o + 2]) * 0.45
      }
      for (let a = 0; a < 3; a++) { ptTail[o + a] = ptPos[o + a] - ptSV[o + a] * T; ptPrev[o + a] = ptPos[o + a] }
    }
  }
}

/** The hole swallows a word: it vanishes, and comes back out when the hole is released. */
function eat(w: World, bd: Body) {
  const { pos, vel, home, vis, ptAlpha } = w
  for (let i = bd.p0; i < bd.p1; i++) {
    for (let a = 0; a < 3; a++) { pos[i * 3 + a] = home[i * 3 + a]; vel[i * 3 + a] = 0 }
    vis[i] = 0
  }
  for (let k = bd.pt0; k < bd.pt0 + bd.ptN; k++) ptAlpha[k] = 0
  bd.state = EATEN
  bd.escaped = false
  bd.jig = 0
  w.hole.eaten.push(bd)
  w.sfx.gulp()
}

export function updateStates(w: World, dt: number) {
  const { s, pos, vel, home, off, vis, ptAlpha, ptPos, ptVel, hole, cam, intro } = w
  const shock = w.burstQueue.size <= 12 // a pile-up of bursts in one frame skips the shockwave
  for (const id of w.burstQueue) burst(w, w.bodies[id], shock)
  w.burstQueue.clear()
  const camZ = cam.eye[2], HA = hole.amt * s.holePull, [hx, hy, hz] = hole.p, horizon = 0.22 + 0.25 * HA
  w.actLoose = 0
  w.actBurst = 0
  for (const bd of w.bodies) {
    if (bd.state === INTRO) {
      if (!intro || intro.pre) continue
      bd.timer -= dt
      if (bd.timer <= 0) {
        // leave the galaxy on a curve, then swarm into the word
        bd.state = REFORM
        bd.reform = 0
        if (!intro.direct) for (let k = bd.pt0; k < bd.pt0 + bd.ptN; k++) {
          const o = k * 3, x = ptPos[o], y = ptPos[o + 1] - (cam.y ?? 0)
          ptVel[o] = -y * 0.9; ptVel[o + 1] = x * 0.9; ptVel[o + 2] = 2
        }
      }
      continue
    }
    if (bd.state === EATEN) { w.actBurst++; continue }
    if (bd.state === BURST) {
      w.actBurst++
      bd.timer -= dt
      if (bd.timer <= 0) { bd.state = REFORM; bd.reform = 0 }
      continue
    }
    if (bd.state === REFORM) {
      if (!bd.rt) w.actBurst++
      bd.reform = Math.min(1, bd.reform + dt / (bd.rt || s.reformTime))
      const v = smooth((bd.reform - 0.75) / 0.25)
      for (let i = bd.p0; i < bd.p1; i++) vis[i] = v
      if (bd.reform >= 1) {
        bd.state = HOME
        for (let k = bd.pt0; k < bd.pt0 + bd.ptN; k++) ptAlpha[k] = 0
        if (bd.rt) {
          // landing from the entrance: a jelly splat (squash out, spring back)
          const sx = 3 + Math.random() * 2
          for (let i = bd.p0; i < bd.p1; i++) {
            vis[i] = 1
            vel[i * 3] += (home[i * 3] - bd.hcx) * sx
            vel[i * 3 + 1] += (home[i * 3 + 1] - bd.hcy) * sx * 2 - 0.6
            vel[i * 3 + 2] += 1.2
          }
          bd.rt = 0
        } else {
          // reappear with a little wobble
          const kick = (Math.random() - 0.5) * 2
          for (let i = bd.p0; i < bd.p1; i++) { vis[i] = 1; vel[i * 3 + 1] += kick; vel[i * 3 + 2] += 0.6 }
        }
      }
      continue
    }
    if (bd.state === LOOSE) w.actLoose++
    let m = 0, cz = -1e9, far = 0, cx = 0, cy = 0, czz = 0
    for (let i = bd.p0; i < bd.p1; i++) {
      const o = i * 3
      const dx = pos[o] - home[o] - off[o], dy = pos[o + 1] - home[o + 1] - off[o + 1], dz = pos[o + 2] - home[o + 2] - off[o + 2]
      cx += pos[o]; cy += pos[o + 1]; czz += pos[o + 2]
      const d2 = dx * dx + dy * dy + dz * dz
      if (d2 > m) m = d2
      cz = Math.max(cz, pos[o + 2])
      far = Math.max(far, Math.abs(pos[o]), Math.abs(pos[o + 1] - cam.target[1]))
    }
    const md = Math.sqrt(m), nn = bd.p1 - bd.p0
    if (HA > 0.05 && bd.state === LOOSE && Math.hypot(cx / nn - hx, cy / nn - hy, czz / nn - hz) < horizon) { eat(w, bd); continue }
    const target = bd.state === LOOSE ? 1 : Math.min(1, md / s.breakDist)
    bd.jig += (target - bd.jig) * Math.min(1, dt * 8)
    if (bd.state === HOME) {
      bd.strength = 1
      // dancing words lag their targets, and scrolling sloshes them; neither should tear them loose
      if (md > s.breakDist * (1 + 1.6 * w.danceMix * Math.min(1.5, s.dance) + 2 * w.navCalm)) loosen(w, bd)
      else if (w.shroomAmt > 0.5 && Math.random() < s.dropRate * w.shroomAmt * dt * 0.04) loosen(w, bd)
    } else if (bd.state === LOOSE) {
      bd.timer -= dt
      // Escapees burst when they reach the camera or get far away
      if (bd.escaped && (cz > camZ - 2 || far > 16 || cz < -14)) { burst(w, bd); continue }
      if (bd.timer <= 0) { if (s.autoBurst) burst(w, bd); else bd.state = RETURN }
    } else if (bd.state === RETURN) {
      bd.strength = Math.min(1, bd.strength + dt / s.returnTime)
      if (bd.strength >= 1 && md < 0.03) bd.state = HOME
    }
  }
}

/** Click: a loose word under the cursor bursts; otherwise knock the words around the click loose. */
export function clickAt(w: World, ray: { eye: Vec3; dir: Vec3 }, hit: number) {
  const { pos, vel, vis, pBody, s } = w
  const hb = w.bodies[pBody[hit]]
  if (hb.state === LOOSE && s.clickBurst) { burst(w, hb); return }
  const R = s.fingerRadius, [ex, ey, ez] = ray.eye, [dx, dy, dz] = ray.dir
  const fly = s.space === 'fly'
  for (let i = 0; i < w.NP; i++) {
    if (vis[i] < 0.5) continue
    const o = i * 3, vx = pos[o] - ex, vy = pos[o + 1] - ey, vz = pos[o + 2] - ez
    const t = vx * dx + vy * dy + vz * dz, cx = vx - dx * t, cy = vy - dy * t, cz = vz - dz * t, d = Math.hypot(cx, cy, cz)
    const own = pBody[i] === pBody[hit]
    if (d >= R && !own) continue
    const fall = d >= R ? 0.3 : Math.max(0.3, (1 - d / R) ** 2), id = d > 1e-4 ? 1 / d : 0, S = s.smack * fall
    vel[o] += S * cx * id; vel[o + 1] += S * (cy * id + 0.2); vel[o + 2] += S * (fly ? 1.2 : 0.25)
    const bd = w.bodies[pBody[i]]
    if (bd.state === HOME || bd.state === RETURN) loosen(w, bd)
  }
}

export function chaos(w: World) {
  for (const bd of w.bodies) if (bd.state === HOME && Math.random() < 0.18) {
    loosen(w, bd)
    const a = (Math.random() - 0.5) * 8, b = (Math.random() - 0.5) * 8
    for (let i = bd.p0; i < bd.p1; i++) { w.vel[i * 3] += a; w.vel[i * 3 + 1] += b; w.vel[i * 3 + 2] += 0.5 }
  }
}

export function burstAll(w: World) {
  for (const bd of w.bodies) if (!hidden(bd)) burst(w, bd, false)
}

export function healAll(w: World) {
  for (const bd of w.bodies) {
    if (bd.state === LOOSE) { bd.state = RETURN; bd.strength = 0 }
    else if (bd.state === BURST) bd.timer = 0
  }
}

/** A hard shake of the phone scrambles the page. */
export function shakeIt(w: World, k: number) {
  for (const bd of w.bodies) if (bd.state === HOME && Math.random() < 0.08 + 0.2 * k) {
    loosen(w, bd)
    const a = (Math.random() - 0.5) * 10 * k, b = (Math.random() - 0.5) * 10 * k
    for (let i = bd.p0; i < bd.p1; i++) { w.vel[i * 3] += a; w.vel[i * 3 + 1] += b; w.vel[i * 3 + 2] += 0.5 }
  }
}

// ---- Black hole: hold Space (or toggle it and press-and-hold). Release spits everything back out ----
export function startHole(w: World, p: Vec3) {
  if (w.intro && !w.intro.ended) return
  w.hole.on = true
  w.hole.p = p
  w.hole.eaten = []
}

export function releaseHole(w: World) {
  const { hole, s, ptLu, ptLv, ptHome, ptPos, ptVel, ptAlpha, ptAge, pos, vel, vis } = w
  if (!hole.on) return
  hole.on = false
  const [hx, hy, hz] = hole.p, A = Math.max(0.3, hole.amt * s.holePull)
  // everything it swallowed comes back out as a spray of glowing particles, then re-forms at home
  for (const bd of hole.eaten) {
    for (let k = bd.pt0; k < bd.pt0 + bd.ptN; k++) {
      const o = k * 3
      bilerp(w.home, bd, ptLu[k], ptLv[k], tmp)
      ptHome[o] = tmp[0]; ptHome[o + 1] = tmp[1]; ptHome[o + 2] = tmp[2] + 0.004
      const th = Math.random() * 6.283, ph = Math.acos(Math.random() * 1.6 - 0.6), sp = (5 + Math.random() * 9) * (0.6 + 0.4 * A)
      ptPos[o] = hx; ptPos[o + 1] = hy; ptPos[o + 2] = hz
      ptVel[o] = Math.sin(ph) * Math.cos(th) * sp; ptVel[o + 1] = Math.sin(ph) * Math.sin(th) * sp; ptVel[o + 2] = Math.cos(ph) * sp * 0.8 + 1
      ptAlpha[k] = 1
      ptAge[k] = 0
    }
    bd.state = BURST
    bd.timer = s.burstTime * (0.8 + 0.4 * Math.random())
    bd.reform = 0
  }
  hole.eaten = []
  // and a shockwave that knocks the neighbourhood loose
  const R = 1.5 + 2.5 * A, S = 7 + 9 * A
  for (let i = 0; i < w.NP; i++) {
    if (vis[i] < 0.5) continue
    const dx = pos[i * 3] - hx, dy = pos[i * 3 + 1] - hy, d = Math.hypot(dx, dy)
    if (d >= R || d < 1e-4) continue
    const f = (1 - d / R) ** 2 * S
    vel[i * 3] += (dx / d) * f; vel[i * 3 + 1] += (dy / d) * f; vel[i * 3 + 2] += f * 0.3
  }
  w.sfx.boom()
}
