/**
 * Sound effects, all synthesized with Web Audio (no files): the black hole's drone,
 * gulps and boom, the entrance whoosh, and Play mode's jump, land, smash, coin and finish,
 * the shrimp, the UFO and its mushroom, the trip, and the lasagna's.
 * Clicks are silent (Phill: no musical notes); Play mode's sounds only come from playing.
 * Every number they're made of is in SFX_CONFIG (config.ts), tuned by ear in the Sound lab, and the cues
 * in SFX_CONFIG.rec play a recording instead (CC0 8-bit sounds, public/resume/sfx/, fetched once Sound is on).
 */

import type { PlayEvent } from './play'
import { SFX_CONFIG, type ChordShape, type RecCue, type SfxConfig } from './config'

const SFX_DIR = '/resume/sfx/'

export interface Sfx {
  /** the audio graph and the whoosh (on a gesture, or as the resume opens) */
  init(): void
  /** the reverb's and the boom's buffers: the slow part, run as a step of its own */
  prepare(): void
  setVolume(): void
  intro(lead: number): void
  hole(amt: number): void
  gulp(): void
  boom(): void
  /** Play mode: a jump, a landing (fall speed, units/s), a smash, a coin collected, the finish */
  jump(): void
  land(speed: number): void
  smash(): void
  coin(): void
  finish(): void
  /** Play mode round 2: a shrimp eaten, a UFO hit and then its beam, the beam alone (`delay` s from now), its mushroom appearing */
  shrimp(): void
  ufo(): void
  ufoHit(): void
  beam(delay?: number): void
  mushroomAppear(): void
  /** the trip starting and wearing off */
  powerUp(): void
  powerDown(): void
  /** the lasagna: its "!", stomped, his kick taken, a TINK off the giant, and the giant's steps (`near` 0…1: quieter further off) */
  enemyAlert(): void
  stomp(): void
  kicked(): void
  tink(): void
  giantStep(near: number): void
  dispose(): void
}

interface Drone {
  lp: BiquadFilterNode
  g: GainNode
  os: OscillatorNode[]
}

/** the notes sfx.ts always played for 'major' (as they were typed), and the other shapes in semitones */
const SHIPPED = { shrimp: [659.25, 830.61, 987.77, 1318.5], finish: [523.25, 659.25, 783.99, 1046.5], mushroom: [392, 523.25, 659.25, 783.99, 1046.5] }
const SHAPES: Record<Exclude<ChordShape, 'major'>, number[]> = { minor: [0, 3, 7, 12], sus: [0, 5, 7, 12], add9: [0, 4, 7, 14], fifths: [0, 7, 12, 19] }
const ratios = (cue: keyof typeof SHIPPED, shape: ChordShape = 'major') =>
  shape === 'major' ? SHIPPED[cue].map((f) => f / SHIPPED[cue][0]) : SHAPES[shape].map((st) => 2 ** (st / 12))

export function createSfx(settings: () => { soundOn: boolean; volume: number }, C: SfxConfig = SFX_CONFIG): Sfx {
  let ac: AudioContext | null = null
  let out: GainNode, mix: GainNode, verb: ConvolverNode, noiseBuf: AudioBuffer | null = null, swellBuf: AudioBuffer
  let drone: Drone | null = null
  const recs: Partial<Record<RecCue, AudioBuffer>> = {}
  let recsAsked = false
  const live = () => !!ac && ac.state === 'running' && settings().soundOn && settings().volume > 0
  const level = () => (settings().soundOn ? settings().volume * C.space.master : 0)
  const render = (len: number, fn: (d: Float32Array, sr: number, c: number) => void, ch = 1) => {
    const b = ac!.createBuffer(ch, Math.floor(ac!.sampleRate * len), ac!.sampleRate)
    for (let c = 0; c < ch; c++) fn(b.getChannelData(c), ac!.sampleRate, c)
    return b
  }

  function init() {
    if (ac) {
      if (ac.state !== 'running') ac.resume().catch(() => {})
      return
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ac = new AC({ latencyHint: 'interactive' })
    const comp = ac.createDynamicsCompressor()
    comp.threshold.value = C.space.threshold
    comp.ratio.value = C.space.ratio
    out = ac.createGain()
    out.gain.value = level()
    out.connect(comp)
    comp.connect(ac.destination)
    mix = ac.createGain()
    mix.connect(out)
    verb = ac.createConvolver() // silent until prepare() gives it its tail
    const wet = ac.createGain()
    wet.gain.value = C.space.wet
    mix.connect(wet)
    wet.connect(verb)
    verb.connect(out)
    // a rising whoosh: band-limited noise that swells and cuts off
    const w = C.whoosh
    swellBuf = render(w.wLen, (d) => {
      let lp = 0, hp = 0, pv = 0
      for (let i = 0; i < d.length; i++) {
        const t = i / d.length, n = Math.random() * 2 - 1
        lp += (0.05 + w.wBright * t * t) * (n - lp)
        hp = 0.95 * (hp + lp - pv)
        pv = lp
        d[i] = hp * t ** w.wCurve * 1.6
      }
    })
  }

  /** the recordings: fetched and decoded once there's an audio context and Sound is on (about 160 KB in all) */
  function loadRecs() {
    if (!ac || recsAsked || !settings().soundOn || typeof fetch !== 'function') return
    recsAsked = true
    const ctx = ac
    for (const [cue, r] of Object.entries(C.rec) as [RecCue, { file: string }][]) {
      fetch(SFX_DIR + r.file)
        .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(r.file))))
        .then((b) => ctx.decodeAudioData(b))
        .then((buf) => { if (ac === ctx) recs[cue] = buf })
        .catch(() => { /* the synth keeps playing it */ })
    }
  }
  /** a cue's recording, if it has one and it's in: true when it played (k scales it: a softer landing, a farther step) */
  function playRec(cue: RecCue, delay = 0, k = 1) {
    const r = C.rec[cue], buf = recs[cue]
    if (!r || !buf) return false
    const s = ac!.createBufferSource(), g = ac!.createGain()
    s.buffer = buf
    s.playbackRate.value = r.rate
    g.gain.value = r.gain * k
    s.connect(g)
    g.connect(mix)
    s.start(ac!.currentTime + delay)
    return true
  }

  function prepare() {
    loadRecs()
    if (!ac || noiseBuf) return
    const r = C.space
    verb.buffer = render(r.rLen, (d, sr) => {
      let lp = 0
      for (let i = 0; i < d.length; i++) {
        const t = i / sr
        lp += r.rBright * (Math.random() * 2 - 1 - lp)
        d[i] = lp * Math.exp(-t * r.rDecay)
      }
    }, 2)
    noiseBuf = render(1, (d) => {
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    })
  }

  function setVolume() {
    if (ac) out.gain.setTargetAtTime(level(), ac.currentTime, 0.05)
    loadRecs()
  }

  /** The whoosh, timed to peak as the entrance lands `lead` seconds from now. */
  function intro(lead: number) {
    if (!live()) return
    const s = ac!.createBufferSource(), g = ac!.createGain(), len = C.whoosh.wLen
    s.buffer = swellBuf
    g.gain.value = C.whoosh.wLevel
    s.connect(g)
    g.connect(mix)
    s.start(ac!.currentTime + Math.max(0, lead - len), Math.max(0, len - lead))
  }

  /** Black hole: a growling drone that drops in pitch as it grows. */
  function hole(amt: number) {
    if (!ac) return
    const now = ac.currentTime, c = C.grow
    if (!drone && amt > 0.01 && live()) {
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.Q.value = c.dRes
      lp.frequency.value = 120
      const g = ac.createGain()
      g.gain.value = 0
      lp.connect(g)
      g.connect(mix)
      const os = [-c.dDetune, c.dDetune].map((d) => {
        const o = ac!.createOscillator()
        o.type = c.dWave
        o.frequency.value = c.dBase
        o.detune.value = d
        o.connect(lp)
        o.start()
        return o
      })
      const sub = ac.createOscillator(), sg = ac.createGain()
      sub.frequency.value = c.dBase / 2
      sg.gain.value = c.dSub
      sub.connect(sg)
      sg.connect(g)
      sub.start()
      os.push(sub)
      drone = { lp, g, os }
    }
    if (!drone) return
    drone.g.gain.setTargetAtTime(live() ? amt * c.dLevel : 0, now, 0.08)
    drone.lp.frequency.setTargetAtTime(c.dCut + amt * amt * c.dOpen, now, 0.08)
    drone.os.forEach((o, i) => o.frequency.setTargetAtTime((i === 2 ? c.dBase / 2 : c.dBase) * 2 ** ((-amt * c.dDrop) / 12), now, 0.1))
    if (amt <= 0.01) {
      const d = drone
      drone = null
      d.g.gain.setTargetAtTime(0, now, 0.05)
      d.os.forEach((o) => o.stop(now + 0.4))
    }
  }

  function gulp() {
    if (!live() || playRec('gulp')) return
    const c = C.gulp, t = ac!.currentTime, o = ac!.createOscillator(), g = ac!.createGain()
    o.type = c.gWave
    o.frequency.setValueAtTime(c.gFrom + Math.random() * c.gSpread, t)
    o.frequency.exponentialRampToValueAtTime(c.gTo, t + c.gSweep)
    g.gain.setValueAtTime(c.gLevel, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + c.gDecay)
    o.connect(g)
    g.connect(mix)
    o.start(t)
    o.stop(t + c.gDecay + 0.02)
  }

  function boom() {
    if (!live()) return
    prepare()
    if (playRec('boom')) return
    const c = C.boom, t = ac!.currentTime, o = ac!.createOscillator(), g = ac!.createGain()
    o.frequency.setValueAtTime(c.bFrom, t)
    o.frequency.exponentialRampToValueAtTime(c.bTo, t + c.bSweep)
    g.gain.setValueAtTime(c.bLevel, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + c.bDecay)
    o.connect(g)
    g.connect(mix)
    o.start(t)
    o.stop(t + c.bDecay + 0.1)
    const s = ac!.createBufferSource(), bp = ac!.createBiquadFilter(), ng = ac!.createGain()
    s.buffer = noiseBuf
    bp.type = 'lowpass'
    bp.frequency.value = c.bNTone
    ng.gain.setValueAtTime(c.bNoise, t)
    ng.gain.setTargetAtTime(0, t, c.bNDecay)
    s.connect(bp)
    bp.connect(ng)
    ng.connect(mix)
    s.start(t)
    s.stop(t + Math.max(1, 5 * c.bNDecay))
  }

  /** a tone: an oscillator from f0 to f1 over len s, gain g, starting at t */
  function tone(type: OscillatorType, f0: number, f1: number, len: number, g: number, t = ac!.currentTime) {
    const o = ac!.createOscillator(), a = ac!.createGain()
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + len)
    a.gain.setValueAtTime(0.0001, t)
    a.gain.exponentialRampToValueAtTime(Math.max(0.0002, g), t + 0.008)
    a.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(len, 0.01))
    o.connect(a)
    a.connect(mix)
    o.start(t)
    o.stop(t + len + 0.05)
  }

  /** a short noise burst through a filter */
  function crunch(type: BiquadFilterType, f: number, len: number, g: number, t = ac!.currentTime) {
    prepare()
    const s = ac!.createBufferSource(), bp = ac!.createBiquadFilter(), a = ac!.createGain()
    s.buffer = noiseBuf
    bp.type = type
    bp.frequency.setValueAtTime(f, t)
    bp.frequency.exponentialRampToValueAtTime(f * 0.3, t + len)
    a.gain.setValueAtTime(Math.max(0.0002, g), t)
    a.gain.exponentialRampToValueAtTime(0.0001, t + len)
    s.connect(bp)
    bp.connect(a)
    a.connect(mix)
    s.start(t, Math.random() * 0.5)
    s.stop(t + len + 0.05)
  }

  /** the shapes everything's built from: a tone over a crunch, two notes, a ladder of notes */
  const toneCrunch = (c: SfxConfig['land'], k = 1) => { tone(c.wave, c.from, c.to, c.len, c.level * k); crunch(c.nType, c.nTone, c.nLen, c.noise * k) }
  const twoNotes = (c: SfxConfig['coin']) => {
    const t = ac!.currentTime
    tone(c.wave, c.note1, c.note1, c.len1, c.level, t)
    tone(c.wave, c.note2, c.note2, c.len2, c.level, t + c.gap)
  }
  const ladder = (c: SfxConfig['powerUp']) => {
    const t = ac!.currentTime
    for (let i = 0; i < c.count; i++) tone(c.wave, c.root * 2 ** ((i * c.interval) / 12), c.root * 2 ** ((i * c.interval + c.bend) / 12), c.len, c.level, t + i * c.step)
  }

  /** a quick sweep up */
  function jump() {
    const c = C.jump
    if (live() && !playRec('jump')) tone(c.wave, c.from, c.to, c.len, c.level)
  }

  /** a soft thud, louder the faster he fell (a gentle step makes none) */
  function land(speed: number) {
    const k = Math.min(1, (speed - 1.5) / 7)
    if (!live() || k <= 0 || playRec('land', 0, k)) return
    toneCrunch(C.land, k)
  }

  /** a smash: a burst of noise and a falling sweep */
  function smash() {
    if (!live() || playRec('smash')) return
    const c = C.smash
    crunch(c.nType, c.nTone, c.nLen, c.noise)
    tone(c.wave, c.from, c.to, c.len, c.level)
  }

  /** a bright two-note chime */
  function coin() {
    if (live() && !playRec('coin')) twoNotes(C.coin)
  }

  /** a short flourish up a chord, and a shimmer on its top note */
  function finish() {
    if (!live() || playRec('finish')) return
    const c = C.finish, t = ac!.currentTime, r = ratios('finish', c.shape), top = c.root * r[r.length - 1]
    r.forEach((m, i) => { const f = c.root * m; tone(c.wave, f, f, i === r.length - 1 ? c.lastLen : c.len, c.level, t + i * c.step) })
    tone('sine', top, top, c.shLen, c.shimmer, t + (r.length - 1) * c.step)
  }

  // ---- Play mode round 2 ----

  /** a bubbly run up: the shrimp */
  function shrimp() {
    if (!live() || playRec('shrimp')) return
    const c = C.shrimp, t = ac!.currentTime
    ratios('shrimp', c.shape).forEach((m, i) => { const f = c.root * m; tone(c.wave, f, f * c.bend, c.len, c.level, t + i * c.step) })
  }

  /** a UFO hit: a clang that falls, a ring over it, a hiss */
  function ufoHit() {
    if (!live() || playRec('ufoHit')) return
    const c = C.ufoHit, t = ac!.currentTime
    tone(c.wave1, c.from1, c.to1, c.len1, c.level1, t)
    tone(c.wave2, c.from2, c.to2, c.len2, c.level2, t)
    crunch('highpass', c.nTone, c.nLen, c.noise, t)
  }

  /** a rising sci-fi sweep: the beam */
  function beam(delay = 0) {
    if (!live() || playRec('beam', delay)) return
    const c = C.beam, t = ac!.currentTime + delay
    tone(c.wave, c.from, c.to, c.len, c.level, t)
    tone(c.wave, c.from * c.harm, c.to * c.harm, c.len, c.level2, t + c.offset)
  }

  /** the UFO event: the hit, and its beam opening a moment later */
  function ufo() {
    ufoHit()
    beam(C.beam.after)
  }

  /** a ladder up: the mushroom appearing */
  function mushroomAppear() {
    if (!live() || playRec('mushroom')) return
    const c = C.mushroom, t = ac!.currentTime
    ratios('mushroom').forEach((m, i) => { const f = c.root * m; tone(c.wave, f, f, c.len, c.level, t + i * c.step) })
  }

  /** a fast warbling rise: the trip starts */
  function powerUp() {
    if (live() && !playRec('powerUp')) ladder(C.powerUp)
  }

  /** the same, falling: the trip wears off */
  function powerDown() {
    if (live() && !playRec('powerDown')) ladder(C.powerDown)
  }

  /** two sharp beeps: "!" */
  function enemyAlert() {
    if (live() && !playRec('alert')) twoNotes(C.alert)
  }

  /** a squishy thump: a stomp */
  function stomp() {
    if (live() && !playRec('stomp')) toneCrunch(C.stomp)
  }

  /** a falling buzz: kicked */
  function kicked() {
    if (live() && !playRec('kicked')) toneCrunch(C.kicked)
  }

  /** a bright ping: TINK */
  function tink() {
    if (!live() || playRec('tink')) return
    const c = C.tink, t = ac!.currentTime
    tone(c.wave, c.note, c.note * c.droop, c.len, c.level, t)
    tone('sine', c.note * c.over, c.note * c.over * c.droop2, c.len2, c.level2, t)
  }

  /** a low, quiet thud: the giant's step (nothing when it's far) */
  function giantStep(near: number) {
    const k = Math.max(0, Math.min(1, near))
    if (!live() || k < 0.05 || playRec('giantStep', 0, k)) return
    toneCrunch(C.giantStep, k)
  }

  function dispose() {
    drone = null
    for (const k of Object.keys(recs) as RecCue[]) delete recs[k]
    recsAsked = false
    if (ac) ac.close().catch(() => {})
    ac = null
    noiseBuf = null
  }

  return {
    init, prepare, setVolume, intro, hole, gulp, boom, jump, land, smash, coin, finish,
    shrimp, ufo, ufoHit, beam, mushroomAppear, powerUp, powerDown, enemyAlert, stomp, kicked, tink, giantStep, dispose,
  }
}

/** Play mode's events → their sounds (each silent unless Sound is on; Play is the only source) */
export function playEventSound(sfx: Sfx, e: PlayEvent) {
  switch (e.type) {
    case 'jump': return sfx.jump()
    case 'land': return sfx.land(e.speed)
    case 'smash': if (e.bodies.length) sfx.smash(); return
    case 'coin': return sfx.coin()
    case 'finish': return sfx.finish()
    case 'shrimp': return sfx.shrimp()
    case 'ufo': return sfx.ufo()
    case 'mushroom': return sfx.mushroomAppear()
    case 'trip': return sfx.powerUp()
    case 'tripEnd': return sfx.powerDown()
    case 'giantStep': return sfx.giantStep(e.near)
    case 'enemy':
      if (e.what === 'alert' || e.what === 'huge') sfx.enemyAlert()
      else if (e.what === 'stomped') sfx.stomp()
      else if (e.what === 'smashed') sfx.smash()
      else if (e.what === 'hurt') sfx.kicked()
      else if (e.what === 'tink' || e.what === 'bounce') sfx.tink()
  }
}
