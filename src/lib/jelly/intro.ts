/**
 * The entrance: the resume waits as a galaxy of its own glyph sparks; the camera swings
 * in while a cyan scanline prints the page top to bottom and each word's stardust
 * streams in, landing with a jelly splat.
 */

import { INTRO } from './config'
import { galaxyAt } from './galaxy'
import { smooth } from './math'
import { releaseHole } from './physics'
import { bilerp, hidden, type World } from './world'

const tmp = [0, 0, 0]
const gtmp = [0, 0, 0]
const y01 = (w: World, hcy: number) => (hcy - w.pageBottom) / w.pageH

/** pre: every word hides at once and the sparks wait in the galaxy (no landing yet). */
export function startIntro(w: World, pre = false) {
  const { home, pos, vel, vis, ptLu, ptLv, ptHome, ptPos, ptAlpha, ptAge } = w
  const dur = w.s.introTime
  if (w.hole.on) releaseHole(w)
  const fromPage = !pre && !(w.intro && w.intro.pre)
  w.intro = { t: 0, dur, pre, ended: false, lead: 0, direct: false }
  const camY = w.cam.y ?? 0
  for (const bd of w.bodies) {
    // a word that's on screen dissolves into the galaxy from where it is; anything else jumps straight there
    const showing = fromPage && !hidden(bd)
    for (let k = bd.pt0; k < bd.pt0 + bd.ptN; k++) {
      const o = k * 3
      bilerp(home, bd, ptLu[k], ptLv[k], tmp)
      ptHome[o] = tmp[0]; ptHome[o + 1] = tmp[1]; ptHome[o + 2] = tmp[2] + 0.004
      if (showing) { bilerp(pos, bd, ptLu[k], ptLv[k], tmp); ptPos[o] = tmp[0]; ptPos[o + 1] = tmp[1]; ptPos[o + 2] = tmp[2] }
      else if (bd.state !== INTRO) { galaxyAt(w.ptGal, k, w.time, camY, gtmp); ptPos[o] = gtmp[0]; ptPos[o + 1] = gtmp[1]; ptPos[o + 2] = gtmp[2] }
      ptAlpha[k] = 1
      ptAge[k] = 9
    }
    for (let i = bd.p0; i < bd.p1; i++) {
      for (let a = 0; a < 3; a++) { pos[i * 3 + a] = home[i * 3 + a]; vel[i * 3 + a] = 0 }
      vis[i] = 0
    }
    // top of the page lands first; replays wait a beat so the page can dissolve first
    bd.state = INTRO
    bd.strength = 1
    bd.escaped = false
    bd.jig = 0
    bd.timer = (fromPage ? 1.2 : 0.35) + (1 - y01(w, bd.hcy)) * dur * 0.62 + Math.random() * dur * 0.08
    bd.rt = 0.25 + dur * 0.22
  }
  w.hole.eaten = []
  w.burstQueue.clear()
  if (!pre) {
    w.intro.lead = fromPage ? 1.2 : 0.35
    w.sfx.intro(w.intro.lead + dur * 0.62)
  }
}

/** Advances the entrance; calls `landed` once every word is home. */
export function updateIntro(w: World, dt: number, landed: () => void) {
  const intro = w.intro
  if (!intro || intro.pre) return
  intro.t += dt
  const at = intro.lead + 0.25 + intro.dur * 0.84
  if (!intro.ended && intro.t > at) {
    intro.ended = true
    landed()
  }
  if (intro.t > at + 1.5) w.intro = null
}

/** The neon scanline that prints the page, top to bottom, just ahead of the words landing. */
export function revealY(w: World, closingReveal: number | null) {
  const intro = w.intro
  if (!intro) return -1e9
  if (intro.pre) return closingReveal ?? 1e9 // closing: the sheet un-prints bottom to top behind the scanline
  const d = intro.dur, f = (intro.t - intro.lead - 0.25 - d * 0.18) / (d * 0.66)
  return w.pageH / 2 + 0.3 - (w.pageH + 0.6) * smooth(f)
}

/** How far out the camera swings (1 = the pre-intro pose, 0 = reading). */
export function introCam(w: World, open: boolean, closingCam: number | null) {
  if (closingCam !== null) return closingCam
  const intro = w.intro
  if (!intro) return open ? 0 : 1
  if (intro.pre) return 1
  return 1 - smooth((intro.t - intro.lead * 0.5) / (intro.dur * 0.75 + 0.6))
}
