/**
 * Every frame each particle gets a target offset on its home spring: the Finder lift,
 * the dance (spectrum across the page plus kick ripples) and the bending paper.
 */

import { HOME } from './config'
import { loosen } from './physics'
import { swellOffset } from './trip'
import type { World } from './world'

/** Kicks send rings across the page, alternating between the middle and either side. */
export function onBeat(w: World, k: number) {
  const s = w.s
  if (s.danceStyle === 'groove' || s.danceStyle === 'ripples') {
    const x = w.rippleSide === 0 ? 0 : w.rippleSide * w.pageW * 0.28, y = (w.cam.y ?? 0) + (Math.random() - 0.5) * w.pageH * 0.3
    w.rippleSide = w.rippleSide === 1 ? -1 : w.rippleSide === -1 ? 0 : 1
    w.ripples.push({ x, y, t: 0, k })
    if (w.ripples.length > 5) w.ripples.shift()
  }
  // Mosh pit: big hits knock a few words loose (off in the shipped config)
  if (s.mosh > 0 && w.danceMix > 0.5) {
    const n = Math.floor(k * s.mosh * 7 * Math.random())
    for (let c = 0; c < n; c++) {
      const bd = w.bodies[Math.floor(Math.random() * w.bodies.length)]
      if (bd.state !== HOME || bd.hlT) continue
      loosen(w, bd)
      for (let i = bd.p0; i < bd.p1; i++) { w.vel[i * 3] += (Math.random() - 0.5) * 3; w.vel[i * 3 + 1] += 2 + k * 3; w.vel[i * 3 + 2] += 1.5 }
    }
  }
}

export function updateBend(w: World) {
  const p = w.bend.p, s = w.s
  p.a = s.paperBend * 0.16 * (1 + 2.5 * w.danceMix * s.dance * w.music.bass) * (1 + 2 * w.tripAmt) // (the trip: the page breathes ×3)
  p.c = s.paperCurl * 0.6
  p.t = w.time
  p.s = w.shroomAmt
  w.bend.update(w.pageW, w.pageH)
}

const sw: [number, number] = [0, 0]

/** a swelling word's own springs grow (or shrink) with it: its lattice is stiff, so scaled targets alone only slide it */
function swellSprings(w: World) {
  const swollen = w.swollen // (the words whose springs are scaled: they get their rest lengths back when their swell ends)
  if (!w.swells.length && !swollen.size) return
  const now = new Set(w.swells.map((s) => s.body))
  for (const bi of swollen) if (!now.has(bi)) { const bd = w.bodies[bi]; if (bd) w.srest.set(w.srest0.subarray(bd.s0, bd.s1), bd.s0); swollen.delete(bi) }
  for (const s of w.swells) {
    const bd = w.bodies[s.body]
    if (!bd) continue
    for (let q = bd.s0; q < bd.s1; q++) w.srest[q] = w.srest0[q] * (1 + s.a)
    swollen.add(s.body)
  }
}

export function updateTargets(w: World, dt: number) {
  swellSprings(w)
  const { s, music, home, off } = w
  w.danceMix += ((music.playing && s.dance > 0 ? 1 : 0) - w.danceMix) * Math.min(1, dt * 2)
  for (const r of w.ripples) r.t += dt
  while (w.ripples.length && w.ripples[0].t > 2.5) w.ripples.shift()
  const D = w.danceMix * s.dance, st = s.danceStyle, beat = music.beat, ease = Math.min(1, dt * 22)
  const eq = st === 'groove' || st === 'eq', wv = st === 'wave', rp = st === 'groove' || st === 'ripples'
  for (let bi = 0; bi < w.bodies.length; bi++) {
    const bd = w.bodies[bi], hl = bd.hl, bob = 0.05 * Math.sin(w.time * 1.8 + bd.seed * 6.283) * hl
    for (let i = bd.p0; i < bd.p1; i++) {
      const o = i * 3, hx = home[o], hy = home[o + 1]
      let ox = 0, oy = 0, oz = 0
      // Finder matches lift toward you, grow and bob
      if (hl > 0.001) { ox = (hx - bd.hcx) * 0.6 * hl; oy = (hy - bd.hcy) * 0.6 * hl + bob; oz = 0.7 * hl }
      if (D > 0.001) {
        const xn = (hx + w.pageW / 2) / w.pageW, yn = (hy - w.pageBottom) / w.pageH
        if (eq) {
          // a spectrum analyzer laid across the page: bass in the middle, treble at the edges
          const e = music.bandAt(Math.abs(xn - 0.5) * 2)
          oz += e * 0.5 * D; oy += e * 0.13 * D
        }
        if (wv) {
          // the live waveform runs across the page, a little later on each line, and the words ride it
          const wave = music.waveAt(xn * 0.85 + yn * 0.6)
          oy += wave * 0.32 * D; oz += Math.abs(wave) * 0.35 * D
        }
        if (rp) for (const r of w.ripples) {
          const d = Math.hypot(hx - r.x, hy - r.y), front = d - r.t * 7
          if (front < -1.6 || front > 1.6) continue
          const a = r.k * Math.exp(-front * front * 3) * Math.exp(-r.t * 1.4)
          oz += a * 0.55 * D; oy += a * 0.12 * D
        }
        oz += beat * 0.1 * D // everyone hops a little on the beat
      }
      // the trip's swelling words: each scales about its middle and shoves (or, shrinking, pulls) its neighbors
      if (w.swells.length) { swellOffset(w.swells, hx, hy, sw, bi); ox += sw[0]; oy += sw[1] }
      // ease toward the new target (~50 ms) so the springs never see an instant jump
      oz += w.bend.at(hx, hy) // ride the bending paper
      off[o] += (ox - off[o]) * ease; off[o + 1] += (oy - off[o + 1]) * ease; off[o + 2] += (oz - off[o + 2]) * ease
    }
  }
}
