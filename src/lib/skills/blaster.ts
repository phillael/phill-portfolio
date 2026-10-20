/**
 * The Skill blaster: the game the Skills section hides. The first click on a skill fires a laser, bursts the
 * word into letters that snap home and starts the game: waves 1–2 are whack-a-mole (lit skills, a closing ring
 * as the timer), from wave 3 red skills shoot back (5 health), elites take 3 hits, gold is worth 500; game over
 * shows the score and the best. It pauses after 5 s without a shot (9 s by keyboard) or offscreen; ✕ and Esc stop.
 *
 * Its own chunk, imported on the first click (src/components/skills/SkillsPlay.tsx), with its engine (synth.ts),
 * its rules (rules.ts) and its styles (blaster.css). Imperative DOM, like the 3D resume: no React state, no layout
 * reads inside a frame. Ported from docs/design/skills-game/round6/blaster-synth.js (the spec where this is
 * silent); plan docs/plans/2026-10-20-skills-blaster-plan.md.
 */

import './blaster.css'
import type { SkillGroupId } from '@/data/skills'
import { BAR, BEAT, BEATS, ON_8TH, PARTS, SIX, createSynth, hz, inChord, type SkillSynth } from './synth'
import {
  FIRST_FOE_WAVE, HEARD_BARS, KIND, MAX_HP, ORDER, SHIELD_PTS, bandSize as bandOf, clearBonus, inBand, isFoe, levelFor, lifeFor, need, pickWeighted, planFor, readoutClears, waveCfg,
  type Kind, type MusicState, type WaveCfg,
} from './rules'
import { labelOf, type Lean } from './lean'
import { setWizardAside } from '@/lib/wizard-aside'
import { getSiteMusic } from '@/lib/site-music'

/** a click in the section: on a skill (or on nothing), where, and whether it came from Enter or Space */
export interface Shot {
  skill: HTMLButtonElement | null
  x: number
  y: number
  keyboard: boolean
  target: Element
}

export interface BlasterOptions {
  section: HTMLElement
  /** the site player's AudioContext (made and resumed inside the first click) */
  ac: BaseAudioContext
  lean: Lean | null
}

export interface Blaster {
  shoot(shot: Shot): void
  dispose(): void
}

interface Pt { x: number; y: number }
/** where a word was before the arena moved it (its letters fly from there) */
interface Moved { dx: number; dy: number }
interface Key {
  el: HTMLButtonElement
  name: string
  group: SkillGroupId
  ai: boolean
  idx: number
  /** its place in its group: index, and 0…1 */
  gi: number
  frac: number
  label: HTMLElement
  t: Target | null
  fly: { box: HTMLElement; anims: Animation[]; timer: number } | null
  cool: number
  at?: Pt
}
interface Target {
  k: Key
  kind: Kind
  foe: boolean
  hp: number
  at?: Pt
  ring: HTMLElement
  anim: Animation
  ids: number[]
}
type State = 'rest' | 'intro' | 'wave' | 'between' | 'paused' | 'over'

const BEST_KEY = 'skill-blaster-best'
/** Arcade: the mockup's default intensity (the only one that ships) */
const IN = { force: 1, sparks: 1, beam: 1, bloom: 1, shake: 5, crack: true, banner: true, wave: 1 }
const RED = '355 100% 64%'
const RETICLE = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g fill="none" stroke-linecap="round"><g stroke="#00131a" stroke-width="3.6"><circle cx="16" cy="16" r="8.5"/><path d="M16 2.5v6M16 23.5v6M2.5 16h6M23.5 16h6"/></g><g stroke="#80eaff" stroke-width="1.6"><circle cx="16" cy="16" r="8.5"/><path d="M16 2.5v6M16 23.5v6M2.5 16h6M23.5 16h6"/></g></g><circle cx="16" cy="16" r="1.7" fill="#fff"/></svg>`

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const fmt = (n: number) => n.toLocaleString('en-US')
const now = () => performance.now()
const R = Math.round

export function createBlaster({ section: root, ac, lean }: BlasterOptions): Blaster {
  const rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  let rm = rmQuery.matches
  const live = root.querySelector<HTMLElement>('[data-sk-live]')

  /* ---------- the skills ---------- */
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-skill]')]
  const groupSize: Partial<Record<SkillGroupId, number>> = {}
  buttons.forEach((b) => { const g = b.dataset.group as SkillGroupId; groupSize[g] = (groupSize[g] || 0) + 1 })
  const per: Partial<Record<SkillGroupId, number>> = {}
  const keys: Key[] = buttons.map((el, idx) => {
    const group = el.dataset.group as SkillGroupId
    const gi = (per[group] = (per[group] ?? -1) + 1)
    el.style.setProperty('--c', PARTS[group].c)
    return { el, name: el.dataset.skill ?? '', group, ai: group === 'ai', idx, gi, frac: gi / Math.max(1, groupSize[group]! - 1), label: labelOf(el), t: null, fly: null, cool: 0 }
  })
  const keyByEl = new Map(keys.map((k) => [k.el, k]))
  const headings: Partial<Record<SkillGroupId, HTMLElement>> = {}
  ORDER.forEach((g) => {
    const h = root.querySelector<HTMLElement>(`[data-sk-group="${g}"] h3`)
    if (h) { headings[g] = h; h.style.setProperty('--pc', PARTS[g].c) }
  })

  /* ---------- the audio: one engine (synth.ts) on the site player's AudioContext, made with the first shot ---------- */
  let E: SkillSynth | null = null
  let muted = false
  const site = getSiteMusic()
  function init() {
    if (E) { if (ac.state === 'suspended') (ac as AudioContext).resume?.().catch(() => {}); return }
    E = createSynth(ac)
    if (muted) E.setMuted(true)
  }
  const eng = () => E!

  /* ---------- the clock: a look-ahead scheduler, only while the game plays; the drums are the only part that plays
     by itself (waves start on a bar, enemies fire on a beat) ---------- */
  const M = { on: false, zero: 0, cursor: 0, timer: 0, level: 0, next: null as { t: number; level: number } | null, muteUntil: 0, fills: new Set<number>(), dropBar: -1, last: {} as MusicState['last'] }
  const part: Partial<Record<SkillGroupId, number>> = {} // group → until when it counts in the band
  const barTime = (bar: number) => M.zero + bar * BAR
  const nextBar = (t: number) => Math.ceil((t - M.zero) / BAR - 1e-6)
  const q16 = (t: number) => M.zero + Math.ceil((t - M.zero) / SIX - 1e-6) * SIX
  const q8 = (t: number) => M.zero + Math.ceil((t - M.zero) / (2 * SIX) - 1e-6) * 2 * SIX
  function onGrid(sec: number, div = 2) { // seconds until the first 8th (div 2) or beat (div 1) at least `sec` away
    if (!M.on) return sec
    const t0 = ac.currentTime, unit = BEAT / div
    return M.zero + Math.ceil((t0 + sec - M.zero) / unit) * unit - t0
  }
  const pending = new Set<number>()
  function at(t: number, fn: () => void) { const id = window.setTimeout(() => { pending.delete(id); fn() }, Math.max(0, (t - ac.currentTime) * 1000)); pending.add(id) }

  function musicStart(level: number) {
    init()
    const { mbus, glitch } = eng()
    const t = ac.currentTime
    M.on = true; M.level = level; M.next = null; M.muteUntil = 0; M.fills.clear(); M.dropBar = -1; M.last = {}
    M.zero = t + 0.06
    M.cursor = t
    eng().resetHarmony()
    ORDER.forEach((g) => { part[g] = 0 })
    for (const p of [mbus.gain, glitch.frequency]) p.cancelScheduledValues(t)
    glitch.frequency.setValueAtTime(18000, t)
    mbus.gain.setValueAtTime(0.3, t)
    mbus.gain.linearRampToValueAtTime(1, M.zero + BAR) // the first bar fades in
    clearInterval(M.timer)
    M.timer = window.setInterval(tick, 25)
    drawBand()
  }
  function musicStop(fade = 0.35) {
    if (!M.on) return
    M.on = false
    clearInterval(M.timer); M.timer = 0
    pending.forEach(clearTimeout); pending.clear()
    const { mbus } = eng()
    const t = ac.currentTime
    mbus.gain.cancelScheduledValues(t)
    mbus.gain.setValueAtTime(mbus.gain.value, t)
    mbus.gain.linearRampToValueAtTime(0, t + fade)
    eng().releaseAll(t + fade)
    ORDER.forEach((g) => { part[g] = 0 })
    drawBand()
  }
  function tick() {
    const t0 = ac.currentTime, until = t0 + 0.12
    if (M.cursor < t0) M.cursor = t0 // after a stall, skip the backlog rather than play it late
    for (let s = Math.ceil((M.cursor - M.zero) / SIX - 1e-6); ; s++) {
      const t = M.zero + s * SIX
      if (t >= until) break
      if (t >= M.cursor - 1e-6) step(s, t)
    }
    M.cursor = until
  }
  function step(s: number, t: number) {
    const bar = Math.floor(s / 16), pos = s % 16
    if (M.next && t >= M.next.t - 1e-4) { M.level = M.next.level; M.next = null }
    if (bar === M.dropBar - 1 && pos >= 12) { if (pos === 12) eng().releaseAll(t); return } // the breath before the drop: everything stops for a beat
    if (t >= M.muteUntil - 1e-4) eng().beat(M.level, bar, pos, t, { drop: bar === M.dropBar, fill: M.fills.has(bar) })
    if (pos % 4 === 0) at(t, drawBand) // parts leave the band on the beat
  }

  /* a shot at a skill plays its part (chords, bass and vox on the next 8th, the rest on the next 16th, every
     note moved into the chord you hit last); a lit one (`heard`) also counts in the band */
  function partHit(k: Key, v = 1, heard = true) {
    if (!M.on || muted) { if (heard) hear(k.group); return }
    const t0 = ac.currentTime + 0.012, t = ON_8TH[k.group] ? q8(t0) : q16(t0)
    const ch = eng().hit(k.group, k, t, v)
    if (ch) status(`<span style="color:hsl(${PARTS.cloud.c})">${ch.name}</span>`, false)
    glow(k.group, t)
    if (heard) hear(k.group, t)
  }
  let joinedOnce = false
  function hear(g: SkillGroupId, t = ac.currentTime) {
    if (!M.on) return
    const was = (part[g] ?? 0) > ac.currentTime
    part[g] = Math.max(part[g] ?? 0, t + HEARD_BARS * BAR)
    M.last[g] = t
    if (!was) {
      drawBand()
      if (bandSize() === 2 && !joinedOnce) { joinedOnce = true; status('Every group is its own sound · mix them for a bigger multiplier'); tell('Every group is its own sound. Mix them for a bigger multiplier.') }
    }
  }
  const bandSize = () => (M.on ? bandOf(part, ac.currentTime) : 0)
  const musicState = (): MusicState => ({ on: M.on, now: ac.currentTime, last: M.last, active: [...G.active].map((a) => a.k.group) })
  /* a group's heading pulses when it plays */
  function glow(g: SkillGroupId, t: number) {
    if (rm) return
    at(t, () => headings[g]?.animate([{ textShadow: `0 0 10px hsl(${PARTS[g].c}), 0 0 26px hsl(${PARTS[g].c})`, color: '#fff' }, {}], { duration: 360, easing: 'ease-out' }))
  }

  /* the game's own sounds (not in the track): the laser, booms, the enemy's lock-on and shot, a clank */
  const T = () => ac.currentTime + 0.005
  const SFX = {
    zap() {
      if (muted || !E) return
      const { voice, osc, gain, env, play, sfx } = E, t = T(), v = voice(sfx)
      const o = osc(v, 'triangle', 2600); o.frequency.exponentialRampToValueAtTime(320, t + 0.08)
      const g = gain(v); env(g.gain, t, 0.002, 0.03, 0.09)
      o.connect(g).connect(v.out)
      play([o], t, t + 0.1)
    },
    boom(size = 1) {
      if (muted || !E) return
      const { voice, osc, gain, filter, env, play, noiseSrc, sfx } = E, t = T(), v = voice(sfx)
      const n = noiseSrc(v, t, 0.4 * size)
      const lp = filter(v, 'lowpass', 2200 + 1600 * size, 0.7)
      lp.frequency.setValueAtTime(2200 + 1600 * size, t); lp.frequency.exponentialRampToValueAtTime(90, t + 0.28 * size)
      const g = gain(v); env(g.gain, t, 0.002, 0.13 * size, 0.32 * size)
      n.connect(lp).connect(g).connect(v.out)
      const th = osc(v, 'sine', 120); th.frequency.exponentialRampToValueAtTime(36, t + 0.22 * size)
      const tg = gain(v); env(tg.gain, t, 0.002, 0.24 * Math.min(size, 2), 0.26 * size)
      th.connect(tg).connect(v.out)
      play([th], t, t + 0.3 * size)
    },
    lockOn() {
      if (muted || !E) return
      const { voice, osc, gain, env, play, sfx } = E, t = T()
      ;([[880, 0], [1174.7, 0.07]] as const).forEach(([f, d]) => {
        const v = voice(sfx), o = osc(v, 'sine', f), g = gain(v)
        env(g.gain, t + d, 0.002, 0.045, 0.06)
        o.connect(g).connect(v.out)
        play([o], t + d, t + d + 0.08)
      })
    },
    fire() {
      if (muted || !E) return
      const { voice, osc, gain, filter, env, play, sfx } = E, t = T(), v = voice(sfx)
      const o = osc(v, 'sawtooth', 760); o.frequency.exponentialRampToValueAtTime(90, t + 0.28)
      const lp = filter(v, 'lowpass', 1800)
      const g = gain(v); env(g.gain, t, 0.004, 0.06, 0.3)
      o.connect(lp).connect(g).connect(v.out)
      play([o], t, t + 0.32)
    },
    scratch() { // getting hit: a scratch and a thud
      if (muted || !E) return
      const { voice, osc, gain, filter, env, play, noiseSrc, sfx } = E, t = T(), v = voice(sfx)
      const n = noiseSrc(v, t, 0.3)
      const bp = filter(v, 'bandpass', 3200, 2.5)
      bp.frequency.setValueAtTime(3200, t); bp.frequency.exponentialRampToValueAtTime(260, t + 0.25)
      const g = gain(v); env(g.gain, t, 0.002, 0.2, 0.27)
      n.connect(bp).connect(g).connect(v.out)
      const th = osc(v, 'sine', 90); th.frequency.exponentialRampToValueAtTime(30, t + 0.3)
      const tg = gain(v); env(tg.gain, t, 0.002, 0.36, 0.34)
      th.connect(tg).connect(v.out)
      play([th], t, t + 0.36)
    },
    clank() {
      if (muted || !E) return
      const { voice, osc, gain, env, play, sfx } = E, t = T(), v = voice(sfx)
      const a = osc(v, 'sine', 1420), b = osc(v, 'sine', 2093)
      const g = gain(v); env(g.gain, t, 0.001, 0.06, 0.18)
      a.connect(g); b.connect(g); g.connect(v.out)
      play([a, b], t, t + 0.2)
    },
  }
  /* musical moments, on the grid */
  const MUS = {
    kill(elite: boolean) { // a crash (the skill plays its own sound too); an elite gets a fill first
      if (!M.on || muted) return
      const { D } = eng(), t = q16(ac.currentTime + 0.012)
      if (elite) { for (let i = 0; i < 4; i++) D.snare(t + i * SIX, 0.45 + i * 0.15); D.crash(t + BEAT, 1); D.kick(t + BEAT) } else D.crash(t, 0.7)
    },
    clear() { // wave clear: the chord you're on, as a bell run
      if (!M.on || muted) return
      const t = q16(ac.currentTime + 0.012), list = inChord(eng().chordAt(t), 74, 90)
      list.slice(0, 5).forEach((m, i) => eng().I.bell(hz(m), t + i * SIX, 0.6))
    },
    hurt() { // the track dips and the drums skip two beats
      if (!M.on) return
      const { glitch } = eng(), t = ac.currentTime
      glitch.frequency.cancelScheduledValues(t)
      glitch.frequency.setValueAtTime(18000, t)
      glitch.frequency.exponentialRampToValueAtTime(320, t + 0.08)
      glitch.frequency.setValueAtTime(320, t + BEAT)
      glitch.frequency.exponentialRampToValueAtTime(18000, t + BEAT + 0.45)
      M.muteUntil = q16(t) + 2 * BEAT
    },
    tapeStop() { // game over: the track winds down
      if (!M.on) return
      const { glitch, mbus, voice, osc, filter, gain, env, play, sfx } = eng(), t = ac.currentTime
      glitch.frequency.cancelScheduledValues(t)
      glitch.frequency.setValueAtTime(18000, t)
      glitch.frequency.exponentialRampToValueAtTime(140, t + 1.2)
      mbus.gain.cancelScheduledValues(t)
      mbus.gain.setValueAtTime(mbus.gain.value, t)
      mbus.gain.linearRampToValueAtTime(0, t + 1.4)
      M.muteUntil = t + 10
      if (!muted) {
        const v = voice(sfx), o = osc(v, 'sawtooth', 220), lp = filter(v, 'lowpass', 900), g = gain(v)
        o.frequency.exponentialRampToValueAtTime(30, t + 1.2)
        env(g.gain, t, 0.01, 0.07, 1.25)
        o.connect(lp).connect(g).connect(v.out)
        play([o], t, t + 1.3)
      }
    },
    riser(t0: number, t1: number) { eng().D.riser(t0, t1) },
  }

  /* one track at a time: the site's music pauses while the game plays and comes back after; pressing play on the
     site's player mid-game pauses the game */
  let pausedSite = false
  function handOff() { if (site?.isPlaying()) { site.pause(); pausedSite = true } }
  function handBack() { if (pausedSite) { pausedSite = false; site?.play() } }
  const offSite = site?.onChange((on) => { if (on && playing()) { pausedSite = false; pause('Paused · the music player is on') } })

  /* ---------- one screen: the arena (T9) ---------- */
  const armArena = (k: Key): Moved | undefined => { void k; return undefined }
  const arenaOff = () => {}
  const restage = (wave: number) => { void wave }
  /** the sticky nav's height: lit skills stay clear of it */
  let barH = 0
  function measureBar() {
    const bar = document.querySelector('nav[aria-label="Main navigation"]')?.closest('header')
    barH = bar && getComputedStyle(bar).position === 'sticky' ? (bar as HTMLElement).offsetHeight : 0
  }
  function measure() {
    lean?.measure()
    measureBar()
  }
  /* the summoned Shroom Wizard stands bottom-left (a site system the mockup didn't have): no skill lights up
     under it, and while it's out the readout centres, where that clears it; where it can't (phones), the wizard
     steps aside until the readout goes (Phill's call) */
  const wizardBox = () => document.querySelector('#shroom-ui canvas')?.getBoundingClientRect() ?? null
  const under = (r: DOMRect, w: DOMRect | null) => !!w && r.left < w.right && r.right > w.left && r.top < w.bottom && r.bottom > w.top
  let wizardAside = false
  function placeHud() {
    if (!hud.classList.contains('on') || wizardAside) return
    const w = wizardBox()
    if (!w) { hud.classList.remove('bl-mid'); return }
    const s = sec(), cs = getComputedStyle(root), pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0
    if (readoutClears({ left: s.left + pl, inner: s.width - pl - pr, width: hud.offsetWidth, wizardRight: w.right, viewport: innerWidth })) {
      hud.classList.add('bl-mid')
    } else {
      hud.classList.remove('bl-mid')
      wizardAside = true
      setWizardAside(true)
    }
  }

  /* ---------- the effect layers ---------- */
  const layer = document.createElement('div') // in the section: letters, rings, sparks, points
  layer.className = 'bl-layer'
  layer.setAttribute('aria-hidden', 'true')
  root.appendChild(layer)
  const screen = document.createElement('div') // on the screen: beams, enemy shots, cracks, banners
  screen.className = 'bl-screen'
  screen.setAttribute('aria-hidden', 'true')
  document.body.appendChild(screen)
  const vig = document.createElement('div')
  vig.className = 'bl-vig'
  screen.appendChild(vig)
  root.style.setProperty('--reticle', `url("data:image/svg+xml,${encodeURIComponent(RETICLE)}") 16 16, crosshair`)

  const sec = () => root.getBoundingClientRect()
  const centerOf = (el: Element): Pt => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }
  const glowCss = (c: string, m = 1) => `0 0 ${6 * m}px hsl(${c}), 0 0 ${18 * m}px hsl(${c} / .8)`
  function fx(cls: string, parent: HTMLElement, css: string) {
    const el = document.createElement('i')
    el.className = cls
    el.style.cssText = css
    parent.appendChild(el)
    return el
  }
  const done = (a: Animation, el: HTMLElement) => { // remove the element with its animation (and a timer as a backstop)
    a.onfinish = () => el.remove()
    a.oncancel = () => el.remove()
    setTimeout(() => el.remove(), Number(a.effect?.getComputedTiming().endTime ?? 0) + 300)
  }
  function sparks(x: number, y: number, n: number, colors: string[], reach = 1) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.3, 0.3), r0 = rand(3, 9), r1 = rand(36, 88) * reach
      const s = fx('bl-spark', layer, `--c:${colors[i % colors.length]};--t:${R(rand(380, 640))}ms;--x0:${(x + Math.cos(a) * r0).toFixed(1)}px;--y0:${(y + Math.sin(a) * r0).toFixed(1)}px;--x1:${(x + Math.cos(a) * r1).toFixed(1)}px;--y1:${(y + Math.sin(a) * r1 * 0.8).toFixed(1)}px`)
      setTimeout(() => s.remove(), 700)
    }
  }
  function pulse(cls: string, x: number, y: number, c: string, to: number, ms: number, parent = layer) {
    const el = fx(cls, parent, `--c:${c};left:${x.toFixed(1)}px;top:${y.toFixed(1)}px`)
    done(el.animate([{ transform: 'scale(.15)', opacity: 1 }, { transform: `scale(${to})`, opacity: 0 }], { duration: ms, easing: 'cubic-bezier(.2,.7,.3,1)' }), el)
  }
  function floatPoints(x: number, y: number, text: string, mult: number, c: string, big: boolean) {
    const el = document.createElement('span')
    el.className = 'bl-pts' + (big ? ' big' : '')
    el.innerHTML = `${text}${mult > 1 ? `<i>×${mult}</i>` : ''}`
    el.style.cssText = `--c:${c};--x:${x.toFixed(1)}px;--y:${(y - 16).toFixed(1)}px`
    layer.appendChild(el)
    setTimeout(() => el.remove(), 1000)
  }
  function shake(amp: number) {
    if (rm || !amp) return
    const f: Keyframe[] = []
    for (let i = 0; i < 7; i++) { const a = amp * (1 - i / 7); f.push({ transform: `translate(${rand(-a, a).toFixed(1)}px, ${rand(-a, a).toFixed(1)}px)` }) }
    f.push({ transform: 'none' })
    root.animate(f, { duration: 320 })
    screen.animate(f, { duration: 320 })
  }
  /* the shot: a laser from the bottom of the screen to where you clicked */
  function shotFx(p: Pt) {
    const fl = fx('bl-flash', screen, `left:${p.x}px;top:${p.y}px`)
    done(fl.animate(rm ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 200, easing: 'ease-out' }), fl)
    SFX.zap()
    if (rm || !IN.beam) return
    const ox = innerWidth / 2, oy = innerHeight + 6
    const dx = p.x - ox, dy = p.y - oy, a = (Math.atan2(dy, dx) * 180) / Math.PI
    const el = fx('bl-beam', screen, `left:${ox}px;top:${oy}px;width:${Math.hypot(dx, dy).toFixed(0)}px`)
    done(el.animate([
      { transform: `rotate(${a}deg) scaleX(0)`, opacity: 1 },
      { transform: `rotate(${a}deg) scaleX(1)`, opacity: 1, offset: 0.35 },
      { transform: `rotate(${a}deg) scaleX(1)`, opacity: 0 },
    ], { duration: 160, easing: 'ease-out' }), el)
  }
  /* a word bursts into its letters, which fly, then snap back into place like magnets */
  function explode(k: Key, ix: number, iy: number, force: number, color: string, shadow: string, from: Moved = { dx: 0, dy: 0 }) {
    land(k, true)
    const tn = [...k.label.childNodes].find((n): n is Text => n.nodeType === 3 && !!n.textContent?.trim())
    if (!tn) return
    const s = sec(), cs = getComputedStyle(k.label)
    const box = document.createElement('span')
    box.className = 'bl-word'
    box.style.cssText = `font:${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily};letter-spacing:${cs.letterSpacing};color:${color};text-shadow:${shadow}`
    const range = document.createRange(), text = tn.textContent ?? ''
    const anims: Animation[] = []
    let longest = 0
    for (let i = 0; i < text.length; i++) {
      if (!text[i].trim()) continue
      range.setStart(tn, i); range.setEnd(tn, i + 1)
      const r = range.getBoundingClientRect()
      if (!r.width) continue
      const x = r.left - s.left, y = r.top - s.top
      const sp = document.createElement('span')
      sp.className = 'bl-letter'
      sp.textContent = text[i]
      sp.style.cssText = `left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;height:${r.height}px;line-height:${r.height}px`
      box.appendChild(sp)
      let dx = x + from.dx + r.width / 2 - ix, dy = y + from.dy + r.height / 2 - iy
      const d = Math.hypot(dx, dy) || 1
      dx /= d; dy /= d
      const near = Math.max(0.4, 1 - d / 260) // the letters by the hit fly hardest
      const speed = rand(320, 580) * force * near
      let vx = dx * speed + rand(-90, 90) * force, vy = dy * speed * 0.6 - rand(240, 440) * force
      const spin = rand(-760, 760) * force
      const T1 = rand(0.4, 0.56), Dur = T1 + 0.62, N = 6, h = T1 / N
      let px = from.dx, py = from.dy, pa = 0
      const frames: Keyframe[] = [{ offset: 0, transform: `translate(${px.toFixed(1)}px,${py.toFixed(1)}px) rotate(0deg) scale(1)`, easing: 'linear' }]
      for (let j = 1; j <= N; j++) {
        for (let q = 0; q < 4; q++) { const dt = h / 4; vx *= 1 - 2.2 * dt; vy += 1500 * dt; vy *= 1 - 1.2 * dt; px += vx * dt; py += vy * dt; pa += spin * dt }
        frames.push({ offset: (j * h) / Dur, transform: `translate(${px.toFixed(1)}px,${py.toFixed(1)}px) rotate(${pa.toFixed(0)}deg) scale(1.12)`, easing: j === N ? 'cubic-bezier(.55,0,.25,1.18)' : 'linear' })
      }
      frames.push({ offset: 1, transform: `translate(0px,0px) rotate(${Math.round(pa / 360) * 360}deg) scale(1)` }) // home the short way round
      anims.push(sp.animate(frames, { duration: Dur * 1000, fill: 'both' }))
      longest = Math.max(longest, Dur)
    }
    layer.appendChild(box)
    k.label.classList.add('bl-gone')
    k.fly = { box, anims, timer: window.setTimeout(() => land(k), longest * 1000 + 30) }
  }
  function land(k: Key, snap = false) {
    const f = k.fly
    if (!f) return
    clearTimeout(f.timer)
    f.anims.forEach((a) => a.cancel())
    f.box.remove()
    k.fly = null
    k.label.style.transition = 'none' // back in one frame, no fade (the letters were just there)
    k.label.classList.remove('bl-gone')
    void k.label.offsetWidth
    k.label.style.transition = ''
    if (!snap) {
      const c = PARTS[k.group].c
      k.label.animate([{ textShadow: '0 0 0 transparent' }, { textShadow: `0 0 14px hsl(${c}), 0 0 2px #fff`, offset: 0.3 }, { textShadow: '0 0 0 transparent' }], { duration: 500, easing: 'ease-out' })
    }
  }

  const colorOf = (k: Key, kind: Kind) => KIND[kind].c || PARTS[k.group].c
  /* a hit: the explosion, sized by what it was */
  function blast(k: Key, p: Pt, kind: Kind, from?: Moved) {
    const s = sec()
    const x = p.x - s.left, y = p.y - s.top
    const c = colorOf(k, kind), big = isFoe(kind)
    if (rm) { // nothing flies: the word flashes where it is
      k.label.animate([{ color: '#fff', textShadow: glowCss(c, 1.4) }, { color: '#fff', textShadow: glowCss(c, 1.4), offset: 0.5 }, {}], { duration: 700 })
      return { x, y, c }
    }
    const letter = big ? 'hsl(355 100% 92%)' : kind === 'gold' ? 'hsl(48 100% 90%)' : '#fff'
    explode(k, x, y, IN.force * (big ? 1.35 : 1), letter, glowCss(c), from)
    sparks(x, y, R(KIND[kind].sparks * IN.sparks), [`hsl(${c})`, '#fff', big ? 'hsl(25 100% 65%)' : 'hsl(190 100% 80%)'], big ? 1.4 : 1)
    pulse('bl-shock', x, y, c, (big ? 3.2 : 1.9) * IN.wave, big ? 520 : 420)
    if (IN.bloom && big) pulse('bl-bloom', x, y, c, 1.8, 320)
    if (big) shake(IN.shake * (kind === 'elite' ? 1.4 : 1))
    return { x, y, c }
  }
  /* an enemy's shot: a red bolt that grows toward you; then a crack, a red flash and a shake */
  function bolt(k: Key, after: (x: number, y: number) => void) {
    const r = k.label.getBoundingClientRect()
    const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2
    const x1 = x0 + (innerWidth / 2 - x0) * 0.3, y1 = y0 + (innerHeight / 2 - y0) * 0.3
    if (rm) return after(x1, y1)
    const el = fx('bl-bolt', screen, '')
    const a = el.animate([{ transform: `translate(${x0}px, ${y0}px) scale(.5)` }, { transform: `translate(${x1}px, ${y1}px) scale(8)`, opacity: 0.9 }], { duration: 300, easing: 'cubic-bezier(.5,0,.9,.6)' })
    a.onfinish = () => { el.remove(); after(x1, y1) }
    a.oncancel = () => el.remove()
  }
  function crack(x: number, y: number) {
    const c = 130
    let rays = '', ring = ''
    const n = 7 + ((Math.random() * 3) | 0), mids: [number, number][] = []
    for (let i = 0; i < n; i++) {
      let a = (i / n) * Math.PI * 2 + rand(-0.25, 0.25), r = 0
      rays += `M${c} ${c}`
      for (let s = 0; s < 3 + ((Math.random() * 2) | 0); s++) {
        r += rand(20, 40); a += rand(-0.3, 0.3)
        rays += `L${(c + Math.cos(a) * r).toFixed(1)} ${(c + Math.sin(a) * r).toFixed(1)}`
        if (s === 1) mids.push([c + Math.cos(a) * r, c + Math.sin(a) * r])
      }
    }
    mids.forEach(([mx, my], i) => { if (Math.random() < 0.7) { const [nx, ny] = mids[(i + 1) % mids.length]; ring += `M${mx.toFixed(1)} ${my.toFixed(1)}L${nx.toFixed(1)} ${ny.toFixed(1)}` } })
    const el = document.createElement('div')
    el.className = 'bl-crack'
    el.style.cssText = `left:${x}px;top:${y}px`
    el.innerHTML = `<svg viewBox="0 0 260 260" width="260" height="260"><path d="${rays}" fill="none" stroke="hsl(0 0% 100% / .85)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="${ring}" fill="none" stroke="hsl(0 0% 100% / .5)" stroke-width="1"/><circle cx="${c}" cy="${c}" r="4.5" fill="hsl(355 100% 72% / .9)"/></svg>`
    screen.appendChild(el)
    done(el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.04 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: 1600 }), el)
  }
  function banner(big: string, small: string, c: string) {
    if (!IN.banner) return
    const el = document.createElement('div')
    el.className = 'bl-banner'
    el.style.setProperty('--c', c)
    el.innerHTML = `<b>${big}</b>${small ? `<span>${small}</span>` : ''}`
    screen.appendChild(el)
    const C = 'translate(-50%, -50%)'
    done(el.animate(rm
      ? [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }]
      : [{ opacity: 0, transform: `${C} scale(.92)` }, { opacity: 1, transform: `${C} scale(1)`, offset: 0.15 }, { opacity: 1, transform: `${C} scale(1.02)`, offset: 0.75 }, { opacity: 0, transform: `${C} scale(1.06)` }],
    { duration: 1300, easing: 'ease-out' }), el)
  }

  /* ---------- the game ---------- */
  const loadBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 } }
  const saveBest = () => { try { localStorage.setItem(BEST_KEY, String(G.best)) } catch { /* private mode */ } }

  const G = {
    state: 'rest' as State,
    score: 0, best: loadBest(), wave: -1, cfg: null as WaveCfg | null, plan: [] as Kind[], spawned: 0, active: new Set<Target>(),
    hp: MAX_HP, hpOn: false, lastShot: 0, kb: false, pendingSpawn: false, watch: 0, blind: 0, resumeTo: 'wave' as 'wave' | 'first' | 'next', eliteSeen: false,
  }
  const cfgOf = () => G.cfg!
  const playing = () => G.state === 'intro' || G.state === 'wave' || G.state === 'between'
  const timers = new Set<number>()
  function later(ms: number, fn: () => void) { const id = window.setTimeout(() => { timers.delete(id); fn() }, Math.max(0, ms)); timers.add(id); return id }
  function cancel(id: number) { clearTimeout(id); timers.delete(id) }
  function clearLater() { timers.forEach(clearTimeout); timers.clear(); G.pendingSpawn = false }
  const untilBar = (bar: number) => (barTime(bar) - ac.currentTime) * 1000

  function shootSkill(k: Key, shot: Shot) {
    init()
    const kb = shot.keyboard
    const p = kb ? centerOf(k.label) : { x: shot.x, y: shot.y }
    shotFx(p)
    G.lastShot = now()
    if (G.state === 'rest' || G.state === 'over') return begin(k, p, kb)
    if (kb) G.kb = true
    if (G.state === 'paused') { const from = armArena(k); resume(); freeHit(k, p, from); return }
    if (k.t) return hitTarget(k.t, p)
    graze(k)
  }
  function shootAir(shot: Shot) {
    init()
    shotFx({ x: shot.x, y: shot.y })
    G.lastShot = now()
  }

  /* the first shot: the discovery. The beat starts with it; the first wave comes in on the next bar */
  function begin(k: Key, p: Pt, kb: boolean) {
    resetRun()
    G.kb = kb
    handOff() // one track at a time
    root.classList.add('bl-on')
    hudOn()
    const from = armArena(k)
    musicStart(0)
    freeHit(k, p, from)
    G.state = 'intro'
    status('<span class="good">Nice shot</span> · hit the lit skills')
    tell(`Skill blaster. A beat starts; hit the skills that light up to play over it. Escape stops.${kb ? ' Press L to jump to a lit skill.' : ''}`, true)
    G.resumeTo = 'first'
    later(untilBar(1), () => startWave(0))
    watchOn()
  }
  function freeHit(k: Key, p: Pt, from?: Moved) { // a hit with nothing lit: the discovery shot, or the shot that resumes
    const b = blast(k, p, 'mole', from)
    partHit(k)
    addScore(100, b, { c: b.c })
    k.cool = now() + 1200
  }
  function graze(k: Key) { // a skill that isn't lit: its part plays softly, nothing else
    partHit(k, 0.45, false)
    if (!rm) k.label.animate([{ transform: 'none' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'none' }], { duration: 180 })
  }

  function startWave(i: number) {
    G.wave = i
    G.cfg = waveCfg(i)
    G.plan = planFor(G.cfg, i)
    G.spawned = 0
    G.state = 'wave'
    G.resumeTo = 'wave'
    G.lastShot = now()
    waveB.textContent = String(i + 1)
    if (root.classList.contains('bl-staged')) restage(i)
    if (G.cfg.foes && !G.hpOn) {
      G.hpOn = true
      hpEl.hidden = false
      drawHp()
      banner(`Wave ${i + 1}`, 'They shoot back', RED)
      status('<span class="foe">Red ones shoot back</span> · get them before the ring closes')
      tell(`Wave ${i + 1}, the drop. Red skills shoot back: hit them before their ring closes.`, true)
    } else if (i > 0) {
      banner(`Wave ${i + 1}`, BEATS[levelFor(i)].name, G.cfg.foes ? RED : '190 100% 70%')
      status(`Wave ${i + 1} · ${BEATS[levelFor(i)].name}`)
      tell(`Wave ${i + 1}.`)
    }
    queueSpawn(i > 0 && IN.banner ? 0.9 : 0.3)
  }
  function queueSpawn(s: number) {
    if (G.pendingSpawn) return
    G.pendingSpawn = true
    later(onGrid(s, 2) * 1000, () => { G.pendingSpawn = false; spawn() })
  }
  function spawn() {
    if (G.state !== 'wave') return
    const cfg = cfgOf()
    if (G.spawned >= cfg.n || G.active.size >= cfg.at) return
    const k = pickTarget()
    if (!k) {
      if (++G.blind > 8) return pause('Paused · scroll back to the skills')
      return queueSpawn(0.4)
    }
    G.blind = 0
    light(k, G.plan[G.spawned++])
    if (G.spawned < cfg.n && G.active.size < cfg.at) queueSpawn(cfg.gap * rand(0.7, 1.3))
  }
  /* only skills fully on screen light up (clear of the nav on top and the readout below), spread out,
     and weighted by what the music needs next (the conductor) */
  function pickTarget() {
    const hb = hud.classList.contains('on') ? hud.getBoundingClientRect().top - 4 : innerHeight - 110
    const top = barH + 12, bottom = Math.min(innerHeight - 8, hb), W = innerWidth, t = now()
    const lit = [...G.active].map((a) => a.at).filter((a): a is Pt => !!a)
    const seen: { k: Key; x: number; y: number }[] = []
    const wz = wizardBox()
    for (const k of keys) {
      if (k.t || k.fly || k.cool > t) continue
      const r = k.label.getBoundingClientRect()
      if (r.width && r.top > top && r.bottom < bottom && r.left > 4 && r.right < W - 4 && !under(r, wz)) seen.push({ k, x: r.left + r.width / 2, y: r.top + r.height / 2 })
    }
    if (!seen.length) return null
    const far = seen.filter((c) => lit.every((l) => Math.hypot(l.x - c.x, l.y - c.y) > 150))
    const pool = far.length ? far : seen
    const ms = musicState()
    const c = pool[pickWeighted(pool.map((x) => need(x.k.group, ms)))]
    c.k.at = { x: c.x, y: c.y }
    return c.k
  }
  function light(k: Key, kind: Kind) {
    const cfg = cfgOf(), foe = isFoe(kind)
    let life = lifeFor(kind, cfg, G.kb)
    if (foe) life = onGrid(life, 1) // enemies fire on a beat
    const s = sec(), r = k.label.getBoundingClientRect()
    const c = colorOf(k, kind)
    const pad = k.ai ? 10 : 9
    const ring = fx('bl-ring' + (kind === 'elite' ? ' elite' : ''), layer, `--c:${c};left:${(r.left - s.left - pad).toFixed(1)}px;top:${(r.top - s.top - 5).toFixed(1)}px;width:${(r.width + pad * 2).toFixed(1)}px;height:${(r.height + 10).toFixed(1)}px`)
    const anim = ring.animate(rm
      ? [{ opacity: 1 }, { opacity: 0.3 }] // reduced motion: the ring dims instead of closing
      : [{ transform: 'scale(1.6)', opacity: 0 }, { transform: 'scale(1.45)', opacity: 1, offset: 0.08 }, { transform: 'scale(1)', opacity: 1 }],
    { duration: life * 1000, fill: 'forwards' })
    const t: Target = { k, kind, foe, hp: kind === 'elite' ? 3 : 1, at: k.at, ring, anim, ids: [] }
    k.t = t
    k.label.classList.add(KIND[kind].cls)
    G.active.add(t)
    if (foe) {
      SFX.lockOn()
      t.ids.push(later(life * 700, () => { k.label.classList.add('bl-hot'); ring.classList.add('hot') }))
      t.ids.push(later(life * 1000, () => fire(t)))
      if (kind === 'elite' && !G.eliteSeen) { G.eliteSeen = true; status('<span class="foe">Elite</span> · takes 3 hits'); tell('An elite: it takes three hits.') }
    } else t.ids.push(later(life * 1000, () => expire(t)))
  }
  function endTarget(t: Target, how: 'hit' | 'miss' | 'fired' | 'quiet') {
    t.ids.forEach(cancel)
    G.active.delete(t)
    const k = t.k
    k.t = null
    k.cool = now() + 1400
    k.label.classList.remove('bl-lit', 'bl-gold', 'bl-foe', 'bl-hot')
    const ring = t.ring, cs = getComputedStyle(ring) // carry on from where the closing ring is
    const tf = cs.transform === 'none' ? '' : cs.transform, op = Number(cs.opacity) || 0
    t.anim.cancel()
    const a = how === 'hit' && !rm
      ? ring.animate([{ transform: tf || 'none', opacity: op }, { transform: `${tf} scale(1.3)`, opacity: 0 }], { duration: 160, easing: 'ease-out' })
      : ring.animate([{ transform: tf || 'none', opacity: op * 0.8 }, { transform: tf || 'none', opacity: 0 }], { duration: 220 })
    done(a, ring)
  }
  function resolved() {
    if (G.state !== 'wave') return
    if (G.spawned >= cfgOf().n && !G.active.size) waveClear()
    else queueSpawn(cfgOf().gap * rand(0.4, 0.9))
  }
  function hitTarget(t: Target, p: Pt) {
    const k = t.k
    if (t.kind === 'elite' && t.hp > 1) { // a shield goes
      t.hp--
      partHit(k, 0.7)
      SFX.clank()
      if (!rm) {
        const s = sec()
        sparks(p.x - s.left, p.y - s.top, 8, ['hsl(355 100% 70%)', '#fff'], 0.7)
        k.label.animate([{ transform: 'none' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 160 })
      }
      t.ring.animate([{ borderColor: '#fff' }, { borderColor: `hsl(${KIND.elite.c})` }], { duration: 220 })
      addScore(SHIELD_PTS, toSec(p), { c: KIND.elite.c })
      status(`<span class="foe">Elite</span> · ${t.hp} more`)
      return
    }
    endTarget(t, 'hit')
    const b = blast(k, p, t.kind)
    partHit(k) // the part joins (or stays) before the points are counted
    const band = Math.max(1, bandSize())
    const pts = KIND[t.kind].pts * band
    if (t.foe) { SFX.boom(t.kind === 'elite' ? 2.2 : 1.8); MUS.kill(t.kind === 'elite') }
    else if (t.kind === 'gold') { SFX.boom(0.8); MUS.clear() }
    addScore(pts, b, { c: b.c, mult: band, big: t.foe || t.kind === 'gold' })
    tell(`${k.name}${t.foe ? ', down' : ''}. ${fmt(G.score)} points.`)
    resolved()
  }
  function expire(t: Target) {
    endTarget(t, 'miss')
    resolved()
  }
  function fire(t: Target) {
    const r = t.k.label.getBoundingClientRect()
    endTarget(t, 'fired')
    if (r.bottom < 0 || r.top > innerHeight) { resolved(); return } // off screen: it holds its fire
    SFX.fire()
    bolt(t.k, (x, y) => {
      if (playing()) damage(x, y)
      resolved()
    })
  }
  function damage(x: number, y: number) {
    G.hp--
    drawHp()
    hud.classList.add('hurt')
    later(450, () => hud.classList.remove('hurt'))
    vig.animate([{ opacity: 0 }, { opacity: IN.crack ? 1 : 0.6, offset: 0.15 }, { opacity: 0 }], { duration: 520 })
    if (IN.crack && !rm) crack(x, y)
    shake(IN.shake * 1.2)
    SFX.scratch()
    if (G.hp <= 0) return gameOver()
    MUS.hurt()
    status(`<span class="foe">Hit</span> · health ${G.hp} of ${MAX_HP}`)
    tell(`You're hit. Health ${G.hp} of ${MAX_HP}.`, true)
  }
  /* a wave clear: the next wave comes in on a bar, after a fill (or a riser and a drop into wave 3) */
  function waveClear() {
    G.state = 'between'
    G.resumeTo = 'next'
    const bonus = clearBonus(G.wave)
    addScore(bonus)
    let healed = false
    if (G.hpOn && G.hp < MAX_HP) { G.hp++; healed = true; drawHp() }
    status(`<span class="good">Wave ${G.wave + 1} clear</span> · +${fmt(bonus)}${healed ? ' · +1 health' : ''}`)
    tell(`Wave ${G.wave + 1} clear. ${fmt(G.score)} points.`)
    MUS.clear()
    toWave(G.wave + 1)
  }
  function toWave(next: number) {
    const level = levelFor(next), drop = level === 2 && M.level < 2
    const startBar = nextBar(ac.currentTime + 0.05) + (drop ? 2 : 1)
    if (drop) { M.dropBar = startBar; MUS.riser(barTime(startBar - 2), barTime(startBar)) } else M.fills.add(startBar - 1)
    M.next = { t: barTime(startBar), level }
    later(untilBar(startBar), () => startWave(next))
  }
  function gameOver() {
    clearLater()
    watchOff()
    ;[...G.active].forEach((t) => endTarget(t, 'quiet'))
    G.state = 'over'
    const best = G.score > G.best
    if (best) { G.best = G.score; saveBest() }
    root.classList.remove('bl-on')
    MUS.tapeStop()
    later(1500, () => { musicStop(0.05); handBack() })
    later(12000, () => { if (G.state === 'over') { G.state = 'rest'; hudOff(); arenaOff() } }) // no second go: back to the list
    banner('Game over', best ? 'New best' : `Best ${fmt(G.best)}`, RED)
    status(`<span class="foe">Game over</span> · <b>${fmt(G.score)}</b> · ${best ? '<span class="good">new best</span>' : `best ${fmt(G.best)}`} · shoot any skill to play again <a href="https://numberslayers.com" target="_blank" rel="noopener">Want more? Number Slayers ↗</a>`)
    tell(`Game over. ${fmt(G.score)} points${best ? ', a new best' : ''}. Shoot any skill to play again.`, true)
  }
  function pause(msg: string) {
    if (!playing()) return
    const n = G.active.size
    clearLater()
    ;[...G.active].forEach((t) => endTarget(t, 'quiet'))
    if (G.state === 'wave') G.spawned = Math.max(0, G.spawned - n) // they come back on resume
    G.state = 'paused'
    watchOff()
    musicStop(0.6)
    root.classList.remove('bl-on')
    status(msg)
    tell(msg.replace(' ·', '.'))
    later(6000, () => { if (G.state === 'paused') { hudOff(); arenaOff() } }) // still reading? the readout and the arena get out of the way
  }
  function resume() { // the beat starts again with the shot that resumes; waves pick up on the next bar
    clearLater()
    root.classList.add('bl-on')
    hudOn()
    musicStart(levelFor(Math.max(0, G.wave)))
    if (G.resumeTo === 'next' || G.resumeTo === 'first') {
      const next = G.resumeTo === 'first' ? 0 : G.wave + 1
      G.state = 'between'
      M.next = { t: barTime(1), level: levelFor(next) }
      later(untilBar(1), () => startWave(next))
    } else { G.state = 'wave'; status(''); queueSpawn(0.6) }
    G.lastShot = now()
    watchOn()
  }
  function stop() {
    clearLater()
    watchOff()
    ;[...G.active].forEach((t) => endTarget(t, 'quiet'))
    if (G.score > G.best) { G.best = G.score; saveBest() }
    G.state = 'rest'
    root.classList.remove('bl-on')
    musicStop(0.3)
    hudOff()
    arenaOff()
    handBack()
    tell(`Stopped. ${fmt(G.score)} points.`, true)
  }
  function resetRun() {
    clearLater()
    G.score = 0; G.wave = -1; G.hp = MAX_HP; G.hpOn = false; G.spawned = 0; G.blind = 0; G.eliteSeen = false
    joinedOnce = false
    hpEl.hidden = true
    scoreB.textContent = '0'
    waveB.textContent = '1'
    setMult(1)
  }
  /* nobody gets dragged in: a few seconds without a shot and the game (and the beat) pauses */
  function watchOn() {
    if (G.watch) return
    G.watch = window.setInterval(() => {
      if (playing() && now() - G.lastShot > (G.kb ? 9000 : 5000)) pause('Paused · shoot any skill to go on')
      else placeHud() // the wizard may have walked in (or off)
    }, 500)
  }
  function watchOff() { clearInterval(G.watch); G.watch = 0 }

  /* ---------- the readout ---------- */
  const hud = document.createElement('div')
  hud.className = 'bl-hud'
  hud.setAttribute('role', 'group')
  hud.setAttribute('aria-label', 'Skill blaster')
  hud.innerHTML = `
    <div class="r1">
      <button type="button" class="hbtn-ico bl-mute" aria-pressed="false" aria-label="Mute the game and its beat">
        <svg class="on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>
        <svg class="off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>
      </button>
      <span class="bl-score" aria-hidden="true"><b>0</b><span class="bl-mult"></span></span>
      <span class="sep" aria-hidden="true"></span>
      <span class="bl-wave" aria-hidden="true"><span class="lbl">Wave </span><b>1</b></span>
      <span class="bl-hp" aria-hidden="true" hidden><span class="lbl">Health</span><span class="bar">${'<i></i>'.repeat(MAX_HP)}</span></span>
      <button type="button" class="hbtn-ico bl-stop" aria-label="Stop the game"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    </div>
    <div class="r2"></div>`
  root.appendChild(hud)
  const $ = <T extends HTMLElement>(s: string) => hud.querySelector<T>(s)!
  const muteBtn = $<HTMLButtonElement>('.bl-mute'), stopBtn = $<HTMLButtonElement>('.bl-stop'), scoreB = $('.bl-score b'), multEl = $('.bl-mult'), waveB = $('.bl-wave b'), hpEl = $('.bl-hp'), r2 = $('.r2')
  const hpBars = [...hpEl.querySelectorAll('i')]
  const bandEl = document.createElement('span')
  bandEl.className = 'bl-band'
  bandEl.setAttribute('aria-hidden', 'true')
  bandEl.innerHTML = `Band <span class="pips">${ORDER.map((g) => `<i style="--c:${PARTS[g].c}" title="${PARTS[g].label}"></i>`).join('')}</span>`
  const pips = Object.fromEntries(ORDER.map((g, i) => [g, bandEl.querySelectorAll('i')[i]])) as Record<SkillGroupId, HTMLElement>
  const statusEl = document.createElement('span')
  let statusText = '', holdUntil = 0
  function status(html: string, important = true) { // the band's joins and drops never cover a hit, a wave or a pause
    if (!important && now() < holdUntil) return
    if (important && html) holdUntil = now() + 1800
    statusText = html
    renderR2()
  }
  function renderR2() {
    statusEl.innerHTML = statusText
    r2.replaceChildren(...[G.state !== 'rest' && bandEl, statusText && statusEl].filter((x): x is HTMLSpanElement => !!x))
  }
  function hudOn() { hud.classList.add('on'); placeHud() }
  function hudOff() {
    hud.classList.remove('on', 'bl-mid')
    if (wizardAside) { wizardAside = false; setWizardAside(false) }
  }
  const toSec = (p: Pt) => { const s = sec(); return { x: p.x - s.left, y: p.y - s.top } }
  function addScore(pts: number, at?: Pt, { c = '130 90% 60%', mult = 1, big = false } = {}) {
    G.score += pts
    scoreB.textContent = fmt(G.score)
    scoreB.classList.remove('bump'); void scoreB.offsetWidth; scoreB.classList.add('bump')
    if (at) floatPoints(at.x, at.y, `+${fmt(pts)}`, mult, c, big)
  }
  function setMult(m: number) { multEl.textContent = m > 1 ? `×${m}` : '' }
  /* the band (the parts heard in the last two bars), as lights in the readout and lit headings */
  function drawBand() {
    const on = new Set(M.on ? inBand(part, ac.currentTime + 0.01) : [])
    for (const g of ORDER) {
      pips[g].classList.toggle('on', on.has(g))
      headings[g]?.classList.toggle('bl-live', on.has(g))
    }
    setMult(on.size)
  }
  function drawHp() {
    hpBars.forEach((b, i) => b.classList.toggle('out', i >= G.hp))
    hpEl.classList.toggle('low', G.hp <= 2)
  }
  /* the live region, throttled so a fast run reads as a few updates, not a stream */
  let sayT = 0, sayLast = 0
  const say = (text: string) => {
    if (!live) return
    live.textContent = ''
    window.setTimeout(() => { live.textContent = text }, 30)
  }
  function tell(text: string, urgent = false) {
    clearTimeout(sayT)
    const wait = urgent ? 0 : Math.max(0, 1300 - (now() - sayLast))
    sayT = window.setTimeout(() => { sayLast = now(); say(text) }, wait)
  }
  muteBtn.addEventListener('click', () => {
    muted = !muted
    muteBtn.setAttribute('aria-pressed', String(muted))
    E?.setMuted(muted)
  })
  stopBtn.addEventListener('click', stop)

  /* ---------- input ---------- */
  function shoot(shot: Shot) {
    const k = shot.skill && keyByEl.get(shot.skill)
    if (k) return shootSkill(k, shot)
    if (!playing() || shot.target.closest('.bl-hud, a, button, input, select')) return
    shootAir(shot) // a shot at nothing, inside the section, while the game runs
  }
  // Esc stops the game and nothing behind it: the wizard and shroom mode listen on window, after this
  // (an open wizard chat or the 3D resume catch Esc first, in the capture phase, and close themselves)
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && G.state !== 'rest') { e.stopPropagation(); stop(); return }
    if ((e.key === 'l' || e.key === 'L') && G.state === 'wave' && root.contains(document.activeElement)) {
      const t = [...G.active][0] // the oldest lit skill
      if (!t) return
      e.preventDefault()
      t.k.el.focus({ preventScroll: true })
      say(`${t.k.name}${t.foe ? ', shoots back' : ''}`)
    }
  }
  document.addEventListener('keydown', onKey)

  /* off screen: the game (and its beat) pauses */
  const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting) pause('Paused · shoot any skill to go on') })
  io.observe(root)
  /* a reflow moves the words: re-measure, and lit rings go (they come back on fresh skills) */
  let rT = 0, rw = 0
  const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(([entry]) => {
    const w = entry.contentRect.width
    if (Math.abs(w - rw) < 1) return
    rw = w
    clearTimeout(rT)
    rT = window.setTimeout(() => {
      measure()
      if (G.state === 'wave' && G.active.size) {
        const n = G.active.size
        ;[...G.active].forEach((t) => endTarget(t, 'quiet'))
        G.spawned = Math.max(0, G.spawned - n)
        queueSpawn(0.4)
      }
    }, 150)
  })
  ro?.observe(root)
  const onResize = () => placeHud()
  window.addEventListener('resize', onResize)
  const onMotion = () => {
    rm = rmQuery.matches
    if (rm) keys.forEach((k) => land(k, true))
  }
  rmQuery.addEventListener?.('change', onMotion)
  measureBar()

  /* dev handle for checks (stripped from production builds) */
  if (process.env.NODE_ENV !== 'production') {
    ;(window as unknown as { __skills: unknown }).__skills = {
      G, M, keys, part, get ac() { return ac }, get E() { return E }, bandSize,
      chordAt: (t?: number) => E?.chordAt(t ?? ac.currentTime),
      active: () => (E ? E.active : 0), made: () => (E ? E.made : 0),
      /** checks only: solo the synths */
      drums: (on: boolean) => { if (E) E.dbus.gain.value = on ? E.P.drums.bus : 0 },
      startWave, stop,
      /** the riser into the drop, as the mockup's "Jump to wave 3" */
      jumpToDrop() {
        if (playing() || G.state === 'paused') stop()
        resetRun()
        handOff()
        G.state = 'between'
        G.resumeTo = 'next'
        G.wave = FIRST_FOE_WAVE - 1
        root.classList.add('bl-on')
        hudOn()
        init()
        status('Skipping ahead · the riser into the drop')
        musicStart(1)
        toWave(FIRST_FOE_WAVE)
        G.lastShot = now() + 3000
        watchOn()
      },
      /** RMS and peak of the last 2048 samples at the output */
      meter() {
        if (!E) return null
        const a = new Float32Array(E.meter.fftSize)
        E.meter.getFloatTimeDomainData(a)
        let sq = 0, pk = 0
        for (const x of a) { sq += x * x; pk = Math.max(pk, Math.abs(x)) }
        return { rms: +Math.sqrt(sq / a.length).toFixed(4), peak: +pk.toFixed(3) }
      },
    }
  }

  return {
    shoot,
    dispose() {
      stop()
      clearTimeout(sayT); clearTimeout(rT)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
      offSite?.()
      rmQuery.removeEventListener?.('change', onMotion)
      io.disconnect()
      ro?.disconnect()
      keys.forEach((k) => land(k, true))
      layer.remove()
      screen.remove()
      hud.remove()
      root.classList.remove('bl-on')
    },
  }
}

