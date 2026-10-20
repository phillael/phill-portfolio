/**
 * The Skill blaster's sound engine. Every pitched note is synthesized live with Web Audio (oscillators,
 * filtered noise, envelopes, one FM bell, a ping-pong delay and a reverb whose room is generated noise), and
 * so are most of the drums; the ride, the crash, the drop's boom and its riser are CC0 recordings
 * (public/skills/sfx/, credits there), each with its synth version while it loads or if it can't.
 *
 * A port of the Sound lab's engine (docs/design/skills-game/round6/synth.js, create()): the same graph,
 * instruments, drums, harmony and hits. Every setting comes from SKILL_SYNTH_CONFIG (synthConfig.ts), which is
 * generated from synth.js's defaults by docs/design/sound-lab/tools/bake-skills-config.mjs; the lab's schema
 * (labels, ranges) and its live patching stay in the lab.
 *
 *   createSynth(ac, config?) → an engine on that AudioContext (the site player's, in the game)
 *     .I / .D              the instruments and the drum kit
 *     .hit(group, k, t, v) a skill's sound: k = { gi, frac } (its place in its group); returns the chord when a
 *                          Cloud skill changes the harmony
 *     .beat(level, bar, pos, t, { drop, fill })  one 16th of the drums at BEATS[level]
 *     .laser(t)            the shot
 *     .chordAt(t) · .setChord(ch, t) · .resetHarmony() · .mono (bass, lead, pad)
 *     .mbus · .glitch · .sfx · .master · .meter · .dbus   the buses the game drives
 */

import type { SkillGroupId } from '@/data/skills'
import { SKILL_SYNTH_CONFIG, type SkillSynthConfig } from './synthConfig'

export const BPM = 172
export const BEAT = 60 / BPM
export const SIX = BEAT / 4
export const BAR = 4 * BEAT

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const acc = (a?: string) => (a === '♭' ? -1 : a === '♯' ? 1 : 0)
export const midi = (n: string) => {
  const m = /^([A-G])(♭|♯)?(-?\d)$/.exec(n)
  if (!m) throw new Error(`not a note: ${n}`)
  return 12 * (+m[3] + 1) + PC[m[1]] + acc(m[2])
}
export const hz = (m: number) => 440 * 2 ** ((m - 69) / 12)
const R = Math.round
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export interface Chord {
  name: string
  /** MIDI notes, root first */
  notes: number[]
  root: number
  /** its pitch classes (0 = C) */
  pcs: number[]
}

// one chord per Cloud skill, all from D minor and none with a leading tone (no cadences, nothing jazzy)
export const CHORDS: Chord[] = [
  ['Dm9', 'D3 A3 C4 E4 F4'], ['B♭maj9', 'B♭2 F3 A3 C4 D4'], ['Gm9', 'G2 F3 A3 B♭3 D4'], ['Am11', 'A2 G3 C4 D4 E4'],
  ['Fmaj9', 'F2 E3 G3 A3 C4'], ['Cadd9', 'C3 G3 D4 E4'], ['Dm11', 'D3 G3 C4 F4 A4'], ['B♭add9', 'B♭2 F3 C4 D4'],
  ['Gm11', 'G2 F3 B♭3 C4 D4'], ['Am7', 'A2 E3 G3 C4'], ['Fadd9', 'F2 C3 G3 A3'], ['Dm(add9)', 'D3 A3 E4 F4'],
].map(([name, v]) => {
  const notes = v.split(' ').map(midi)
  return { name, notes, root: notes[0], pcs: [...new Set(notes.map((m) => m % 12))] }
})
/** the chord's notes from lo to hi (MIDI) */
export const inChord = (ch: Chord, lo: number, hi: number) => {
  const out: number[] = []
  for (let m = lo; m <= hi; m++) if (ch.pcs.includes(m % 12)) out.push(m)
  return out
}
/** a place 0…1 in a list, as an index */
export const at01 = (list: readonly unknown[], f: number) => R(clamp(f, 0, 1) * (list.length - 1))

export interface Part {
  label: string
  /** its colour (HSL components): the ring, its light in the readout, its heading */
  c: string
}
/** every group is a part of the band (in the band's order) */
export const PARTS: Record<SkillGroupId, Part> = {
  backend: { label: 'Bass', c: '150 90% 62%' },
  cloud: { label: 'Chords', c: '260 100% 82%' },
  frontend: { label: 'Arp', c: '190 100% 74%' },
  ai: { label: 'Lead', c: '290 100% 80%' },
  quality: { label: 'Bleeps', c: '210 100% 78%' },
  product: { label: 'Bells', c: '45 100% 68%' },
  music: { label: 'Vox', c: '320 100% 82%' },
}
/** these land on the next 8th, the rest on the next 16th */
export const ON_8TH: Partial<Record<SkillGroupId, boolean>> = { cloud: true, backend: true, music: true }

/** one wave's beat: 16 steps a bar; positions (kick, snare, ghosts, open hats) or velocities (hats, shaker) */
export interface Beat {
  name: string
  k: number[]
  /** extra kicks on odd bars */
  k2?: number[]
  s?: number[]
  g?: number[]
  h: number[]
  sh?: number[]
  /** open hats on odd bars */
  o?: number[]
  ride?: boolean
  /** a snare roll every n bars */
  fills?: number
}
const H8 = [0.35, 0, 0.6, 0, 0.35, 0, 0.6, 0, 0.35, 0, 0.6, 0, 0.35, 0, 0.6, 0]
const H16 = [0.4, 0.15, 0.55, 0.2, 0.4, 0.15, 0.55, 0.2, 0.4, 0.15, 0.55, 0.2, 0.4, 0.15, 0.55, 0.25]
const SH = [0.6, 0.25, 0.4, 0.25, 0.6, 0.25, 0.4, 0.3, 0.6, 0.25, 0.4, 0.25, 0.6, 0.25, 0.4, 0.35]
/** the beat, wave by wave */
export const BEATS: Beat[] = [
  { name: 'kick and hats', k: [0, 10], h: H8 }, // wave 1 (half-time)
  { name: 'the snare comes in', k: [0, 10], s: [8], g: [6, 15], h: H8, sh: SH }, // wave 2 (half-time)
  { name: 'the drop', k: [0, 10], s: [4, 12], g: [7, 9, 15], h: H8, sh: SH, o: [14] }, // wave 3: full-time two-step
  { name: 'busier', k: [0, 10], k2: [0, 6, 10], s: [4, 12], g: [2, 7, 9, 14, 15], h: H16, ride: true, o: [14], fills: 4 }, // wave 4
  { name: 'the break', k: [0, 2, 10, 11], s: [4, 12], g: [7, 9, 14], h: H16, ride: true, sh: SH, o: [6, 14], fills: 2 }, // wave 5+
]

/* the recorded drums Phill picked (CC0, from Freesound; public/skills/sfx/CREDITS.md). A set can have a soft and a
   hard layer (the hit's velocity picks one) with a few takes each that alternate, so no two hits are alike. A
   riser's file ends where it arrives (on the drop). Each set is matched in loudness over `norm` (seconds from the
   start; a negative start counts from the end). A drums setting that names no set here plays the synth. */
type Kind = 'ride' | 'crash' | 'impact' | 'riser'
interface RecSet {
  soft?: string[]
  hard: string[]
}
const SETS: Record<Kind, { norm: [number, number]; sets: Record<string, RecSet> }> = {
  ride: { norm: [0, 0.4], sets: { k: { hard: ['ride-k'] } } },
  crash: { norm: [0, 0.5], sets: { meinl18: { soft: ['crash-meinl18-1', 'crash-meinl18-2'], hard: ['crash-meinl18-3', 'crash-meinl18-4'] } } },
  impact: { norm: [0, 1], sets: { bassdrop: { hard: ['boom-bassdrop'] } } },
  riser: { norm: [-1, 0], sets: { perc: { hard: ['riser-perc'] } } },
}
const RIDE_G = 0.055, CRASH_G = 0.3, BOOM_G = 0.48, RISER_G = 0.12 // each kind's level, its sets matched: measured to sit where round 6's synth ones did
export const SFX_DIR = '/skills/sfx/'

type Vowel = 'ah' | 'oh' | 'eh' | 'oo'
const VOWELS: Record<Vowel, [number, number, number][]> = {
  ah: [[800, 7, 1], [1150, 8, 0.55], [2900, 10, 0.3]],
  oh: [[450, 7, 1], [800, 8, 0.5], [2830, 10, 0.18]],
  eh: [[400, 7, 1], [1700, 9, 0.45], [2600, 10, 0.3]],
  oo: [[325, 7, 1], [700, 8, 0.35], [2530, 10, 0.12]],
}

/** a skill's place in its group: its index, and 0…1 across the group */
export interface HitKey {
  gi: number
  frac: number
}

/** one sound's nodes, all disconnected when its last source ends */
export interface Voice {
  out: GainNode
  node<T extends AudioNode>(n: T): T
  src<T extends AudioScheduledSourceNode>(n: T): T
}

/** a monophonic part's sounding note */
export interface MonoNote {
  g: GainNode[]
  srcs: AudioScheduledSourceNode[]
  end: number
  f?: number
  t?: number
}

export interface Instruments {
  bell(f: number, t: number, vel: number): void
  lead(f: number, t: number, vel: number, len: number, from: number): MonoNote
  bass(f: number, t: number, vel: number, len: number, from: number): MonoNote
  stab(notes: number[], t: number, vel: number): void
  pad(notes: number[], t: number, vel: number): MonoNote
  arp(notes: number[], t: number, vel: number): void
  bleep(f: number, t: number, vel: number): void
  vox(f: number, t: number, vel: number, vowel: Vowel): void
}

export interface Drums {
  kick(t: number, v?: number): void
  snare(t: number, v?: number): void
  hat(t: number, v?: number, open?: boolean): void
  shaker(t: number, v?: number): void
  ride(t: number, v?: number): void
  crash(t: number, v?: number): void
  /** the drop: a boom under the crash */
  impact(t: number): void
  /** into the drop: arrives on t1 */
  riser(t0: number, t1: number): void
}

export interface SkillSynth {
  ac: BaseAudioContext
  P: Readonly<SkillSynthConfig>
  master: GainNode
  comp: DynamicsCompressorNode
  meter: AnalyserNode
  /** the track's fader (the game fades it in and out) */
  mbus: GainNode
  /** a lowpass over the track (the dip when you're hit, the tape stop) */
  glitch: BiquadFilterNode
  syn: GainNode
  dbus: GainNode
  /** the game's own sounds: straight to the master */
  sfx: GainNode
  noise: AudioBuffer
  I: Instruments
  D: Drums
  beat(level: number, bar: number, pos: number, t: number, opts?: { drop?: boolean; fill?: boolean }): void
  pump(t: number): void
  /** the shot (the Sound lab's Laser part) */
  laser(t: number, v?: number): void
  voice(to?: AudioNode, d?: number, r?: number, level?: number, pan?: number): Voice
  osc(v: Voice, type: OscillatorType, f: number): OscillatorNode
  gain(v: Voice, g?: number): GainNode
  filter(v: Voice, type: BiquadFilterType, f: number, q?: number): BiquadFilterNode
  env(p: AudioParam, t: number, a: number, peak: number, d: number): void
  play(srcs: AudioScheduledSourceNode[], t: number, end: number): void
  noiseSrc(v: Voice, t: number, dur: number): AudioBufferSourceNode
  release(m: MonoNote | undefined, t: number): void
  mono: Partial<Record<'bass' | 'lead' | 'pad', MonoNote>>
  chordAt(t: number): Chord
  setChord(ch: Chord, t: number): void
  resetHarmony(): void
  hit(group: SkillGroupId, k: HitKey, t: number, v?: number): Chord | void
  releaseAll(t: number): void
  setMuted(on: boolean): void
  /** voices still sounding, and made in all */
  readonly active: number
  readonly made: number
  rideReady(): boolean
  samplesReady(): boolean
}

interface LoadedSet {
  soft: AudioBuffer[]
  hard: AudioBuffer[]
  gain: number
}

/* ---------- an engine on one AudioContext ---------- */
export function createSynth(ac: BaseAudioContext, config: Readonly<SkillSynthConfig> = SKILL_SYNTH_CONFIG): SkillSynth {
  const P = config
  const S = P.space

  /* the graph: synths → dry, plus sends to a ping-pong delay and a reverb; all three → syn, which pumps
     on the kick. drums → dbus. syn and dbus → the glitch filter → the track's fader (mbus) → master.
     Game sounds (sfx) skip all of it */
  let active = 0, made = 0
  const master = ac.createGain()
  master.gain.value = S.master
  const comp = ac.createDynamicsCompressor()
  comp.threshold.value = S.threshold; comp.knee.value = 10; comp.ratio.value = S.ratio; comp.attack.value = 0.003; comp.release.value = 0.2
  master.connect(comp).connect(ac.destination)
  const meter = ac.createAnalyser()
  meter.fftSize = 2048
  comp.connect(meter)
  const mbus = ac.createGain()
  mbus.gain.value = 0
  const glitch = ac.createBiquadFilter()
  glitch.type = 'lowpass'; glitch.frequency.value = 18000; glitch.Q.value = 0.7
  glitch.connect(mbus).connect(master)
  const syn = ac.createGain()
  syn.gain.value = S.synths
  syn.connect(glitch)
  const dry = ac.createGain()
  dry.connect(syn)
  // the delay: a dotted 8th (by default) that ping-pongs left and right, a little darker on every repeat
  const dlyIn = ac.createGain()
  const dhp = ac.createBiquadFilter(); dhp.type = 'highpass'; dhp.frequency.value = S.dLowcut
  const dl = ac.createDelay(1), dr = ac.createDelay(1) // up to a dotted quarter (0.52 s); createDelay(2) wasn't transparent
  dl.delayTime.value = dr.delayTime.value = S.dTime * SIX
  const fb = ac.createGain(); fb.gain.value = S.dFeedback
  const dlp = ac.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = S.dTone
  const merge = ac.createChannelMerger(2)
  const dret = ac.createGain(); dret.gain.value = S.dReturn
  dlyIn.connect(dhp).connect(dl)
  dl.connect(merge, 0, 0); dr.connect(merge, 0, 1)
  dl.connect(dr)
  dr.connect(dlp).connect(fb).connect(dl)
  merge.connect(dret).connect(syn)
  // the room: long and soft; the echoes go into it too
  const verbIn = ac.createGain()
  const verb = ac.createConvolver()
  verb.buffer = impulse(S.rSize, S.rDecay, S.rBright)
  const vret = ac.createGain(); vret.gain.value = S.rReturn
  if (S.rPre > 0) { // only in the path when it's set: a 0 s delay isn't quite a wire
    const pre = ac.createDelay(0.5); pre.delayTime.value = S.rPre
    verbIn.connect(pre).connect(verb)
  } else verbIn.connect(verb)
  verb.connect(vret).connect(syn)
  const d2v = ac.createGain(); d2v.gain.value = S.dToVerb
  merge.connect(d2v).connect(verbIn)
  const dbus = ac.createGain()
  dbus.gain.value = P.drums.bus
  dbus.connect(glitch)
  const dsend = ac.createGain(); dsend.gain.value = P.drums.verb
  dbus.connect(dsend).connect(verbIn)
  const sfx = ac.createGain()
  sfx.gain.value = 0.8
  sfx.connect(master)
  const noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
  const nd = noise.getChannelData(0)
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
  function impulse(seconds: number, decay: number, bright: number) { // the room: noise, darker and quieter as it goes
    const sr = ac.sampleRate, len = Math.floor(sr * seconds)
    const buf = ac.createBuffer(2, len, sr)
    const fall = (bright * 6) / 7 // at the default brightness: 0.35 → 0.05 over the tail
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c)
      let lp = 0
      for (let i = 0; i < len; i++) {
        const t = i / len
        lp += (bright - fall * t) * ((Math.random() * 2 - 1) - lp)
        d[i] = lp * (1 - t) ** decay
      }
    }
    return buf
  }

  /* one sound's nodes (d, r = how much goes to the delay and the reverb), all disconnected when its
     last source ends: no leak per note */
  function voice(to: AudioNode = dry, d = 0, r = 0, level = 1, pan = 0): Voice {
    const out = ac.createGain()
    out.gain.value = level
    const nodes: AudioNode[] = [out]
    if (pan) { const pn = ac.createStereoPanner(); pn.pan.value = pan; out.connect(pn).connect(to); nodes.push(pn) } else out.connect(to)
    if (d) { const s = ac.createGain(); s.gain.value = d; out.connect(s).connect(dlyIn); nodes.push(s) }
    if (r) { const s = ac.createGain(); s.gain.value = r; out.connect(s).connect(verbIn); nodes.push(s) }
    let left = 0
    active++; made++
    return {
      out,
      node(n) { nodes.push(n); return n },
      src(n) {
        nodes.push(n); left++
        n.onended = () => { if (--left === 0) { nodes.forEach((x) => x.disconnect()); active-- } }
        return n
      },
    }
  }
  const pv = (p: { delay: number; verb: number; level: number; pan: number }) => voice(dry, p.delay, p.verb, p.level, p.pan) // a part's voice, with its mix settings
  const osc = (v: Voice, type: OscillatorType, f: number) => { const o = v.src(ac.createOscillator()); o.type = type; o.frequency.value = f; return o }
  const gain = (v: Voice, g = 0) => { const n = v.node(ac.createGain()); n.gain.value = g; return n }
  const filter = (v: Voice, type: BiquadFilterType, f: number, q = 0.7) => { const n = v.node(ac.createBiquadFilter()); n.type = type; n.frequency.value = f; n.Q.value = q; return n }
  function env(p: AudioParam, t: number, a: number, peak: number, d: number) {
    p.setValueAtTime(0.0001, t)
    p.linearRampToValueAtTime(Math.max(0.0002, peak), t + a)
    p.exponentialRampToValueAtTime(0.0001, t + Math.max(d, a + 0.005))
  }
  const play = (srcs: AudioScheduledSourceNode[], t: number, end: number) => srcs.forEach((s) => { s.start(t); s.stop(end) })
  function noiseSrc(v: Voice, t: number, dur: number) { const n = v.src(ac.createBufferSource()); n.buffer = noise; n.loop = true; n.start(t, Math.random() * 0.5); n.stop(t + dur); return n }
  /* detuned copies of one oscillator, spread evenly across ±cents; any number of copies is as loud as two */
  function unison(v: Voice, type: OscillatorType, f: number, n: number, cents: number, to: AudioNode) {
    const mixG = gain(v, Math.sqrt(2 / n)), list: OscillatorNode[] = []
    for (let i = 0; i < n; i++) { const o = osc(v, type, f); o.detune.value = n === 1 ? 0 : -cents + (2 * cents * i) / (n - 1); o.connect(mixG); list.push(o) }
    mixG.connect(to)
    return list
  }
  function shaper(v: Voice, amt: number) { // soft clipping, for the bass's drive
    const ws = v.node(ac.createWaveShaper()), k = amt * 40, c = new Float32Array(1024)
    for (let i = 0; i < c.length; i++) { const x = (i / (c.length - 1)) * 2 - 1; c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)) / (1 + amt * 0.6) }
    ws.curve = c; ws.oversample = '2x'
    return ws
  }
  /* the bass, the lead and the chord's tail are monophonic: a new note lets the last one go */
  function release(m: MonoNote | undefined, t: number) {
    if (!m) return
    for (const g of m.g) { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0.0001, t, 0.03) }
    if (t + 0.3 < m.end) { m.srcs.forEach((s) => { try { s.stop(t + 0.3) } catch { /* already done */ } }); m.end = t + 0.3 }
  }
  const glideFrom = (pairs: [OscillatorNode, number][], from: number, f: number, t: number, glide: number) => {
    for (const [o, m] of pairs) { o.frequency.setValueAtTime(from * m, t); o.frequency.exponentialRampToValueAtTime(f * m, t + glide) }
  }

  /* the synths: all wet. The bell is round 3's FM bell; the rest are new in round 6 */
  const I: Instruments = {
    bell(f, t, vel) {
      const p = P.product, v = pv(p)
      const car = osc(v, p.carrier, f), mod = osc(v, 'sine', f * p.ratio)
      const idx = gain(v); idx.gain.setValueAtTime(Math.max(0.01, f * p.index), t); idx.gain.exponentialRampToValueAtTime(f * p.indexEnd, t + p.bright)
      mod.connect(idx).connect(car.frequency)
      const amp = gain(v); env(amp.gain, t, p.attack, 0.13 * vel, p.decay)
      car.connect(amp).connect(v.out)
      play([car, mod], t, t + p.decay + 0.05)
    },
    lead(f, t, vel, len, from) { // detuned oscillators and a sub, a filter envelope, vibrato, a glide from the last note
      const p = P.ai, v = pv(p)
      const lp = filter(v, 'lowpass', p.cutoff, p.res)
      const saws = unison(v, p.wave, f, p.unison, p.detune, lp)
      const so = 2 ** p.subOct, sq = osc(v, p.subWave, f * so)
      if (from && p.glide > 0) glideFrom([...saws.map((o): [OscillatorNode, number] => [o, 1]), [sq, so]], from, f, t, p.glide)
      const lfo = osc(v, 'sine', p.vibRate), depth = gain(v)
      depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(p.vibDepth, t + Math.max(0.005, p.vibDelay)) // cents, after the note settles
      lfo.connect(depth); saws.forEach((o) => depth.connect(o.detune))
      lp.frequency.setValueAtTime(p.cutoff, t); lp.frequency.exponentialRampToValueAtTime(p.peak, t + p.fAttack); lp.frequency.exponentialRampToValueAtTime(p.sustainCut, t + Math.max(p.fDecay, p.fAttack + 0.01))
      const sg = gain(v, p.sub)
      const amp = gain(v)
      amp.gain.setValueAtTime(0.0001, t)
      amp.gain.linearRampToValueAtTime(0.12 * vel, t + p.attack)
      amp.gain.setTargetAtTime(0.12 * vel * p.sustain, t + Math.max(0.05, p.attack + 0.005), p.decay)
      amp.gain.setTargetAtTime(0.0001, t + len, p.release)
      sq.connect(sg).connect(lp)
      lp.connect(amp).connect(v.out)
      const end = t + len + Math.max(0.9, 7.5 * p.release)
      const srcs = [...saws, sq, lfo]
      play(srcs, t, end)
      return { g: [amp], srcs, end, f, t }
    },
    bass(f, t, vel, len, from) { // detuned oscillators an octave up (optionally driven) through a filter, over a sub
      const p = P.backend, v = pv(p)
      const lp = filter(v, 'lowpass', p.cutoff, p.res)
      const pre = p.drive > 0 ? shaper(v, p.drive) : null
      if (pre) pre.connect(lp)
      const saws = unison(v, p.wave, f * 2, p.unison, p.detune, pre || lp), sub = osc(v, p.subWave, f)
      if (from && p.glide > 0) glideFrom([...saws.map((o): [OscillatorNode, number] => [o, 2]), [sub, 1]], from, f, t, p.glide)
      lp.frequency.setValueAtTime(p.cutoff, t); lp.frequency.exponentialRampToValueAtTime(p.cutEnd, t + p.sweep)
      const srcs = [...saws, sub]
      if (p.wobble > 0) { const w = osc(v, 'sine', p.wobbleRate), wg = gain(v, p.wobble * 2400); w.connect(wg).connect(lp.detune); srcs.push(w) }
      const mg = gain(v), sg = gain(v)
      for (const [g, peak] of [[mg, 0.05 * vel * p.reese], [sg, 0.07 * vel * p.sub]] as const) {
        g.gain.setValueAtTime(0.0001, t)
        g.gain.linearRampToValueAtTime(Math.max(0.0002, peak), t + p.attack)
        g.gain.setValueAtTime(Math.max(0.0002, peak), t + Math.max(len, p.attack + 0.005))
        g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(len, p.attack + 0.005) + p.release)
      }
      lp.connect(mg).connect(v.out)
      sub.connect(sg).connect(v.out)
      const end = t + Math.max(len, p.attack + 0.005) + p.release + 0.05
      play(srcs, t, end)
      return { g: [mg, sg], srcs, end, f, t }
    },
    stab(notes, t, vel) { // the chord, as a stab: detuned saws per note through a filter that closes
      const p = P.cloud, v = voice(dry, p.stabDelay, p.stabVerb, p.level * p.stabLevel, p.pan)
      const lp = filter(v, 'lowpass', p.stabCut, p.stabRes)
      lp.frequency.setValueAtTime(p.stabCut, t); lp.frequency.exponentialRampToValueAtTime(p.stabCutEnd, t + p.stabSweep)
      const amp = gain(v); env(amp.gain, t, p.stabAttack, 0.06 * vel, p.stabDecay)
      const srcs: OscillatorNode[] = []
      for (const m of notes) srcs.push(...unison(v, p.stabWave, hz(m), p.unison, p.stabDetune, lp))
      lp.connect(amp).connect(v.out)
      play(srcs, t, t + Math.max(p.stabDecay, p.stabAttack + 0.005) + 0.05)
    },
    pad(notes, t, vel) { // ...and its soft tail, held until the next chord (or four bars)
      const p = P.cloud, v = voice(dry, p.padDelay, p.padVerb, p.level * p.padLevel, p.pan)
      const lp = filter(v, 'lowpass', p.padCut, p.padRes)
      const amp = gain(v)
      amp.gain.setValueAtTime(0.0001, t)
      amp.gain.linearRampToValueAtTime(0.03 * vel, t + p.padAttack)
      amp.gain.setTargetAtTime(0.0001, t + p.padHold * BAR, p.padRelease)
      const wave = p.padWave
      const srcs = notes.map((m, i) => {
        const o = osc(v, wave === 'sawtri' ? (i % 2 ? 'triangle' : 'sawtooth') : wave, hz(m))
        o.detune.value = i % 2 ? p.padDetune : -p.padDetune
        o.connect(lp)
        return o
      })
      lp.connect(amp).connect(v.out)
      const end = t + p.padHold * BAR + Math.max(2.5, 4 * p.padRelease)
      play(srcs, t, end)
      return { g: [amp], srcs, end }
    },
    arp(notes, t, vel) { // a run up the chord: a resonant pluck per note, very wet
      const p = P.frontend
      notes.forEach((m, i) => {
        const tt = t + i * p.rate * SIX, v = pv(p)
        const o = osc(v, p.wave, hz(m))
        const lp = filter(v, 'lowpass', p.cutoff, p.res)
        lp.frequency.setValueAtTime(p.cutoff, tt); lp.frequency.exponentialRampToValueAtTime(p.cutEnd, tt + p.sweep)
        const g = gain(v); env(g.gain, tt, p.attack, Math.max(0.002, 0.042 * (1 - i * p.fade)) * vel, p.decay)
        o.connect(lp).connect(g).connect(v.out)
        play([o], tt, tt + Math.max(p.decay, p.attack + 0.005) + 0.02)
      })
    },
    bleep(f, t, vel) { // two sci-fi bleeps an octave apart, mostly echo
      const p = P.quality
      const notes: [number, number, number][] = [[f, 0, vel]]
      if (p.echoAt > 0) notes.push([f * 2 ** (p.echoNote / 12), p.echoAt * SIX, vel * p.echoVel])
      notes.forEach(([fr, d, vv]) => {
        const tt = t + d, v = pv(p)
        const o = osc(v, p.wave, fr), o2 = osc(v, p.wave2, fr)
        o.frequency.setValueAtTime(fr * p.drop, tt); o.frequency.exponentialRampToValueAtTime(fr, tt + p.dropTime)
        const g = gain(v); env(g.gain, tt, p.attack, 0.22 * vv, p.decay)
        const lp = filter(v, 'lowpass', p.tone), g2 = gain(v, p.mix)
        o.connect(g); o2.connect(lp).connect(g2).connect(g)
        g.connect(v.out)
        play([o, o2], tt, tt + Math.max(p.decay, p.attack + 0.005) + 0.02)
      })
    },
    vox(f, t, vel, vowel) { // a vocal chop: an oscillator (and breath) through three formant filters, with a scoop up
      const p = P.music, v = pv(p)
      const s = osc(v, p.wave, f)
      s.frequency.setValueAtTime(f * p.scoop, t); s.frequency.exponentialRampToValueAtTime(f, t + p.scoopTime)
      const amp = gain(v)
      amp.gain.setValueAtTime(0.0001, t)
      amp.gain.linearRampToValueAtTime(0.55 * vel, t + p.attack)
      amp.gain.setTargetAtTime(0.0001, t + Math.max(p.hold, p.attack + 0.005), p.release)
      const end = t + Math.max(0.8, p.hold + 5 * p.release)
      const n = p.breath > 0 ? noiseSrc(v, t, end - t) : null
      const ng = n ? gain(v, p.breath * 0.35) : null
      if (n && ng) n.connect(ng)
      for (const [fr, q, g] of VOWELS[vowel]) {
        const bp = filter(v, 'bandpass', fr * p.formant, q * p.q), bg = gain(v, g)
        s.connect(bp); if (ng) ng.connect(bp)
        bp.connect(bg).connect(amp)
      }
      amp.connect(v.out)
      play([s], t, end)
    },
  }

  /* the drum kit: synthesized, but for the recordings */
  const K = P.drums
  /* the recordings: fetched and decoded a moment after the engine starts, then kept. A hit before its set is in
     waits for it; a set that can't load leaves the synth */
  const files = new Map<string, Promise<AudioBuffer>>()
  const loaded = new Map<string, LoadedSet | null>() // 'kind:set' → the set (null while loading)
  const waiters: Partial<Record<Kind, (() => void) | null>> = {}
  const takes: Partial<Record<Kind, number>> = {}
  const TYPE = { ride: 'rideType', crash: 'crashType', impact: 'impactType', riser: 'riserType' } as const
  const typeOf = (kind: Kind): string => K[TYPE[kind]]
  const file = (name: string) => {
    if (!files.has(name)) {
      files.set(name, fetch(SFX_DIR + name + '.mp3')
        .then((r) => { if (!r.ok) throw new Error(name); return r.arrayBuffer() })
        .then((b) => ac.decodeAudioData(b)))
    }
    return files.get(name)!
  }
  function load(kind: Kind, id: string) {
    const set = SETS[kind].sets[id], key = kind + ':' + id
    if (!set || loaded.has(key) || typeof fetch !== 'function') return
    loaded.set(key, null)
    const wake = () => { const w = waiters[kind]; waiters[kind] = null; if (w && id === typeOf(kind)) w() }
    Promise.all([...(set.soft || []), ...set.hard].map(file)).then((bufs) => {
      const soft = bufs.slice(0, (set.soft || []).length), hard = bufs.slice(soft.length), b = hard[0], [a, z] = SETS[kind].norm, sr = b.sampleRate
      const from = a < 0 ? Math.max(0, b.length + a * sr) : a * sr, to = z <= 0 ? b.length : Math.min(b.length, z * sr)
      let e = 0, n = 0
      for (let c = 0; c < b.numberOfChannels; c++) { const d = b.getChannelData(c); for (let i = Math.floor(from); i < to; i++) { e += d[i] * d[i]; n++ } }
      loaded.set(key, { soft: soft.length ? soft : hard, hard, gain: e ? 0.2 / Math.sqrt(e / n) : 1 })
      wake()
    }).catch(() => { loaded.delete(key); wake() }) // offline or blocked: the synth plays it
  }
  const wantSamples = () => { for (const kind of Object.keys(SETS) as Kind[]) load(kind, typeOf(kind)) }
  setTimeout(wantSamples, 400) // not on the first shot's frame: nothing recorded plays before the drop
  /* the set this kind should play now: null → play the synth; false → still loading (`again` runs once it's in) */
  function recorded(kind: Kind, again: () => void): LoadedSet | null | false {
    const key = kind + ':' + typeOf(kind)
    if (!SETS[kind].sets[typeOf(kind)] || !loaded.has(key)) return null
    const set = loaded.get(key)
    if (!set) { waiters[kind] = again; return false }
    return set
  }
  /* a recorded hit: soft or hard by velocity, takes alternating, a little pitch drift, darker when softer */
  function recHit(set: LoadedSet, kind: Kind, t: number, v: number, { len, tone, pitch, level }: { len: number; tone: number; pitch: number; level: number }) {
    const list = v >= 0.8 ? set.hard : set.soft, buf = list[(takes[kind] = (takes[kind] || 0) + 1) % list.length]
    const vo = voice(dbus), s = vo.src(ac.createBufferSource())
    s.buffer = buf
    s.playbackRate.value = pitch * (1 + (Math.random() - 0.5) * 0.008)
    const lp = filter(vo, 'lowpass', Math.min(20000, 4000 + 15000 * v), 0.5)
    const shelf = filter(vo, 'highshelf', 6000), g = gain(vo, level * v * set.gain)
    shelf.gain.value = 40 * Math.log10(tone) // brightness: ±8 dB above 6 kHz
    const l = Math.min(len, buf.duration / s.playbackRate.value)
    g.gain.setValueAtTime(g.gain.value, t + l * 0.6)
    g.gain.linearRampToValueAtTime(0.0001, t + l)
    s.connect(lp).connect(shelf).connect(g).connect(vo.out)
    s.start(t)
    s.stop(t + l + 0.02)
  }
  const D: Drums = {
    kick(t, v = 1) {
      const vo = voice(dbus)
      const o = osc(vo, 'sine', K.kickPitch)
      o.frequency.setValueAtTime(K.kickPitch, t); o.frequency.exponentialRampToValueAtTime(K.kickLow, t + K.kickSweep)
      const g = gain(vo); env(g.gain, t, 0.002, 0.95 * v * K.kick, K.kickDecay)
      const c = osc(vo, 'triangle', 2400)
      const cg = gain(vo); env(cg.gain, t, 0.0005, 0.1 * v * K.kick * K.kickClick, 0.014)
      o.connect(g).connect(vo.out); c.connect(cg).connect(vo.out)
      play([o, c], t, t + K.kickDecay + 0.03)
      pump(t)
    },
    snare(t, v = 1) {
      const vo = voice(dbus)
      const n = noiseSrc(vo, t, K.snareDecay + 0.04)
      const bp = filter(vo, 'bandpass', K.snareTone, 0.7), hp = filter(vo, 'highpass', K.snareSnap)
      const g = gain(vo); env(g.gain, t, 0.001, 0.5 * v * K.snare, K.snareDecay)
      n.connect(bp).connect(hp).connect(g).connect(vo.out)
      const b = osc(vo, 'triangle', K.snareBody)
      b.frequency.setValueAtTime(K.snareBody, t); b.frequency.exponentialRampToValueAtTime(Math.max(30, K.snareBody - 60), t + 0.08)
      const bg = gain(vo); env(bg.gain, t, 0.001, 0.3 * v * K.snare * K.snareBodyLvl, 0.11)
      b.connect(bg).connect(vo.out)
      play([b], t, t + 0.13)
    },
    hat(t, v = 1, open = false) {
      const vo = voice(dbus), dec = open ? K.openDecay : K.hatDecay
      const n = noiseSrc(vo, t, dec + (open ? 0.04 : 0.015))
      const hp = filter(vo, 'highpass', K.hatTone)
      const g = gain(vo); env(g.gain, t, 0.0005, 0.2 * v * K.hats, dec)
      n.connect(hp).connect(g).connect(vo.out)
    },
    shaker(t, v = 1) {
      const vo = voice(dbus)
      const n = noiseSrc(vo, t, 0.08)
      const bp = filter(vo, 'bandpass', 5600, 1.4)
      const g = gain(vo); env(g.gain, t, 0.008, 0.09 * v * K.shaker, 0.065)
      n.connect(bp).connect(g).connect(vo.out)
    },
    ride(t, v = 1) {
      const set = recorded('ride', () => D.ride(Math.max(t, ac.currentTime + 0.005), v))
      if (set !== null) { if (set) recHit(set, 'ride', t, v, { len: K.rideLen, tone: K.rideTone, pitch: K.ridePitch, level: RIDE_G * K.ride }); return }
      const vo = voice(dbus) // round 6's 808 ride
      const hp = filter(vo, 'bandpass', 8600, 0.6)
      const g = gain(vo); env(g.gain, t, 0.001, 0.045 * v * K.ride, 0.5)
      const srcs = [372, 541, 813, 1231].map((f) => { const o = osc(vo, 'square', f); o.connect(hp); return o })
      hp.connect(g).connect(vo.out)
      play(srcs, t, t + 0.52)
    },
    crash(t, v = 1) {
      const set = recorded('crash', () => D.crash(Math.max(t, ac.currentTime + 0.005), v))
      if (set !== null) { if (set) recHit(set, 'crash', t, v, { len: K.crashLen, tone: K.crashTone, pitch: K.crashPitch, level: CRASH_G * K.crash }); return }
      const vo = voice(dbus)
      const n = noiseSrc(vo, t, 2)
      const hp = filter(vo, 'highpass', 3800)
      const g = gain(vo); env(g.gain, t, 0.001, 0.3 * v * K.crash, 1.9)
      n.connect(hp).connect(g).connect(vo.out)
    },
    impact(t) {
      const set = recorded('impact', () => D.impact(Math.max(t, ac.currentTime + 0.005)))
      if (set !== null) { if (set) recHit(set, 'impact', t, 1, { len: 3.5, tone: 1, pitch: K.impactPitch, level: BOOM_G * K.impact }); return }
      const vo = voice(dbus)
      const o = osc(vo, 'sine', 72)
      o.frequency.setValueAtTime(72, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.9)
      const g = gain(vo); env(g.gain, t, 0.004, 0.6 * K.impact, 1.1)
      o.connect(g).connect(vo.out)
      play([o], t, t + 1.15)
    },
    riser(t0, t1) { // noise opening up and a tone sweeping up, into the drop
      const set = recorded('riser', () => { const late = Math.max(0, ac.currentTime + 0.005 - t0); D.riser(t0 + late, t1 + late) })
      if (set !== null) { // a recording: it arrives on the drop (its end on t1), starting as late as it needs to
        if (!set) return
        const buf = set.hard[0], span = t1 - t0, skip = Math.max(0, buf.duration - span), at = t1 - (buf.duration - skip)
        const vo = voice(dbus), s = vo.src(ac.createBufferSource()), G = RISER_G * K.riser * set.gain, g = gain(vo, G)
        s.buffer = buf
        if (skip > 0) { g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(G, at + 0.3) } // cut into a longer one: fade it in
        s.connect(g).connect(vo.out)
        s.start(at, skip)
        s.stop(t1 + 0.03)
        return
      }
      const vo = voice(dbus), L = Math.max(0.001, K.riser)
      const n = noiseSrc(vo, t0, t1 - t0 + 0.05)
      const bp = filter(vo, 'bandpass', 400, 3)
      bp.frequency.setValueAtTime(400, t0); bp.frequency.exponentialRampToValueAtTime(7000, t1)
      const g = gain(vo)
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.22 * L, t1 - 0.02); g.gain.linearRampToValueAtTime(0.0001, t1 + 0.02)
      n.connect(bp).connect(g).connect(vo.out)
      const o = osc(vo, 'sawtooth', 110)
      o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(880, t1)
      const lp = filter(vo, 'lowpass', 1200)
      const og = gain(vo)
      og.gain.setValueAtTime(0.0001, t0); og.gain.exponentialRampToValueAtTime(0.05 * L, t1 - 0.02); og.gain.linearRampToValueAtTime(0.0001, t1 + 0.02)
      o.connect(lp).connect(og).connect(vo.out)
      play([o], t0, t1 + 0.05)
    },
  }
  /* the pump: the synths (and their echoes) duck a little on every kick */
  function pump(t: number) {
    syn.gain.setTargetAtTime(S.synths * (1 - S.pump), t, 0.004)
    syn.gain.setTargetAtTime(S.synths, t + 0.05, S.pumpRelease)
  }
  /* the shot (a game sound: straight to the master, past the track's fader; its echo and room go with the track) */
  function laser(t: number, v = 1) {
    const p = P.laser
    if (p.kind === 'round6') { // round 6's blip
      const vo = voice(sfx), o = osc(vo, 'triangle', 2600); o.frequency.exponentialRampToValueAtTime(320, t + 0.08)
      const g = gain(vo); env(g.gain, t, 0.002, 0.03 * v, 0.09)
      o.connect(g).connect(vo.out)
      play([o], t, t + 0.1)
      return
    }
    // variety: each shot dives for its own time, a little higher or lower, a little brighter or darker
    const dive = p.sweep + Math.random() * Math.max(0, p.sweepMax - p.sweep)
    const k = 2 ** (((Math.random() * 2 - 1) * p.pitchVar) / 12), from = p.from * k, to = p.to * k
    const bright = Math.min(20000, p.bright * 2 ** ((Math.random() * 2 - 1) * p.filterVar))
    const vo = voice(sfx, p.delay, p.verb, p.level)
    const lp = filter(vo, 'lowpass', bright, p.res)
    lp.frequency.setValueAtTime(bright, t); lp.frequency.exponentialRampToValueAtTime(Math.max(60, to * 3), t + dive)
    const zs = unison(vo, p.wave, from, p.unison, p.detune, lp)
    zs.forEach((o) => { o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + dive) })
    const g = gain(vo); env(g.gain, t, 0.001, 0.09 * v, p.decay)
    if (p.drive > 0) lp.connect(shaper(vo, p.drive)).connect(g); else lp.connect(g)
    g.connect(vo.out)
    const srcs: AudioScheduledSourceNode[] = [...zs]
    if (p.thump > 0) {
      const th = osc(vo, 'sine', p.thumpPitch); th.frequency.setValueAtTime(p.thumpPitch, t); th.frequency.exponentialRampToValueAtTime(40, t + 0.08)
      const tg = gain(vo); env(tg.gain, t, 0.001, 0.28 * p.thump * v, 0.1)
      th.connect(tg).connect(vo.out)
      srcs.push(th)
    }
    play(srcs, t, t + Math.max(p.decay, 0.1) + 0.03)
    if (p.crackle > 0) {
      const n = noiseSrc(vo, t, 0.05), hp = filter(vo, 'highpass', p.crackleTone)
      const ng = gain(vo); env(ng.gain, t, 0.0005, 0.12 * p.crackle * v, 0.035)
      n.connect(hp).connect(ng).connect(vo.out)
    }
  }
  /* one 16th of the beat */
  function beat(level: number, bar: number, pos: number, t: number, { drop = false, fill = false } = {}) {
    const B = BEATS[level], odd = bar % 2 === 1
    if (drop && pos === 0) { D.crash(t, 1); D.impact(t) }
    if ((fill || (B.fills && bar % B.fills === B.fills - 1)) && pos >= 12) { // a snare roll over the last beat
      D.snare(t, 0.3 + (pos - 12) * 0.2)
      if (pos === 12) D.kick(t, 0.8)
      return
    }
    if (B.k.includes(pos) || (odd && B.k2 && B.k2.includes(pos))) D.kick(t)
    if (B.s && B.s.includes(pos)) D.snare(t)
    if (B.g && B.g.includes(pos)) D.snare(t, K.ghost)
    if (B.h[pos]) D.hat(t, B.h[pos])
    if (B.o && odd && B.o.includes(pos)) D.hat(t, 0.5, true)
    if (B.ride && pos % 2 === 0) D.ride(t, pos % 4 === 2 ? 1 : 0.6)
    if (B.sh && B.sh[pos]) D.shaker(t, B.sh[pos])
  }

  /* the harmony is whatever chord you hit last (Dm9 until then) */
  let chordLog: { t: number; ch: Chord }[] = []
  const chordAt = (t: number) => { let c = CHORDS[0]; for (const e of chordLog) if (e.t <= t + 1e-4) c = e.ch; return c }
  function setChord(ch: Chord, t: number) { chordLog = [...chordLog.filter((e) => e.t < t - 1e-4).slice(-6), { t, ch }] }
  const mono: SkillSynth['mono'] = {} // bass · lead · pad: the voice now sounding

  /* what a hit plays: the skill's place in its group picks the note, and every note is moved into the chord */
  const HIT: Record<SkillGroupId, (k: HitKey, t: number, v: number) => Chord | void> = {
    cloud(k, t, v) { // a new chord: the harmony changes here
      const p = P.cloud, ch = CHORDS[k.gi % CHORDS.length], o = 12 * p.octave
      setChord(ch, t)
      I.stab(ch.notes.map((m) => m + o), t, v)
      release(mono.pad, t)
      mono.pad = I.pad(ch.notes.map((m) => m + o + 12 * p.padOctave), t, v)
      return ch
    },
    backend(k, t, v) {
      const p = P.backend, ch = chordAt(t)
      let r = ch.root
      while (r > 45) r -= 12
      r += 12 * p.octave
      const list = inChord(ch, r, r + 12), f = hz(list[at01(list, k.frac * 0.5)])
      const from = mono.bass && t - mono.bass.t! < p.length * BEAT + 0.05 ? mono.bass.f! : 0
      release(mono.bass, t)
      mono.bass = I.bass(f, t, v, p.length * BEAT - 0.04, from)
    },
    ai(k, t, v) {
      const p = P.ai, o = 12 * p.octave, list = inChord(chordAt(t), 67 + o, 86 + o), f = hz(list[at01(list, k.frac)])
      const from = mono.lead && t - mono.lead.t! < p.glideWindow * BEAT ? mono.lead.f! : 0 // close notes glide
      release(mono.lead, t)
      mono.lead = I.lead(f, t, v, p.length * BEAT, from)
    },
    frontend(k, t, v) {
      const p = P.frontend, o = 12 * p.octave, list = inChord(chordAt(t), 62 + o, 88 + o), b = at01(list, k.frac * 0.6), n = p.steps, h = Math.ceil(n / 2)
      const step = { up: (i: number) => i, down: (i: number) => n - 1 - i, updown: (i: number) => (i <= h ? i : 2 * h - i), skip: (i: number) => 2 * i }[p.pattern]
      I.arp([...Array(n).keys()].map((i) => list[clamp(b + step(i), 0, list.length - 1)]), t, v)
    },
    quality(k, t, v) { const o = 12 * P.quality.octave, list = inChord(chordAt(t), 79 + o, 96 + o); I.bleep(hz(list[at01(list, k.frac)]), t, v) },
    product(k, t, v) {
      const p = P.product, o = 12 * p.octave, list = inChord(chordAt(t), 74 + o, 91 + o), b = at01(list, k.frac)
      I.bell(hz(list[b]), t, v)
      if (p.secondAt > 0) I.bell(hz(list[clamp(b + p.second, 0, list.length - 1)]), t + p.secondAt * SIX, p.secondVel * v)
    },
    music(k, t, v) {
      const p = P.music, o = 12 * p.octave, list = inChord(chordAt(t), 57 + o, 72 + o)
      I.vox(hz(list[at01(list, k.frac)]), t, v, p.vowel === 'cycle' ? (['ah', 'oh', 'eh', 'oo'] as const)[k.gi % 4] : p.vowel)
    },
  }

  return {
    ac, P, master, comp, meter, mbus, glitch, syn, dbus, sfx, noise,
    I, D, beat, pump, laser, voice, osc, gain, filter, env, play, noiseSrc, release, mono,
    chordAt, setChord, resetHarmony() { chordLog = [] },
    hit: (group, k, t, v = 1) => HIT[group](k, t, v),
    releaseAll(t) { for (const key of Object.keys(mono) as (keyof typeof mono)[]) { release(mono[key], t); delete mono[key] } },
    setMuted(on) { master.gain.setTargetAtTime(on ? 0 : S.master, ac.currentTime, 0.05) },
    get active() { return active },
    get made() { return made },
    rideReady: () => !SETS.ride.sets[K.rideType] || !!loaded.get('ride:' + K.rideType),
    samplesReady: () => (Object.keys(SETS) as Kind[]).every((kind) => !SETS[kind].sets[typeOf(kind)] || !!loaded.get(kind + ':' + typeOf(kind))),
  }
}
