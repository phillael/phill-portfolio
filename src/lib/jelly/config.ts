/**
 * The Jelly Resume's one fixed configuration: Phill's tuned playground defaults
 * (docs/design/jelly-resume/playground.html `DEFAULTS`, commit 2328f85). The site
 * ships no settings panel, so nothing changes these at runtime; the few things a
 * visitor can toggle (shroom mode, sound, the camera) live in the engine's state.
 */

export interface JellyConfig {
  granularity: 'word' | 'line'
  space: 'float' | 'fall' | 'fly'
  stiffness: number
  damping: number
  homePull: number
  breakDist: number
  boldSoft: number
  contagion: number
  escape: number
  airDrag: number
  gravity: number
  bounce: number
  autoBurst: boolean
  floatTime: number
  burstSpeed: number
  clickBurst: boolean
  burstForce: number
  burstTime: number
  reformTime: number
  pSize: number
  pColor: 'jelly' | 'ink' | 'rainbow' | 'neon' | 'comet'
  returnTime: number
  trail: number
  swirl: number
  flash: number
  pGlow: number
  shockwave: number
  pDensity: number
  pageFinish: 'matte' | 'paper' | 'foil' | 'metal'
  grain: number
  paperThick: number
  paperBend: number
  paperCurl: number
  inkFinish: 'flat' | 'emboss' | 'chrome' | 'foil'
  shine: number
  textDepth: number
  fingerRadius: number
  fingerForce: number
  flick: number
  smack: number
  slosh: number
  gummy: number
  jelly: 'cyan' | 'purple' | 'green' | 'electric'
  tilt: number
  yaw: number
  zoom: number
  melt: number
  drip: number
  dropRate: number
  hueSpeed: number
  backdrop: 'nebula' | 'stars' | 'void'
  nebula: 'philcodes'
  nebulaSeed: number
  nebulaBright: number
  starDensity: number
  mist: number
  fgMist: number
  mistDrift: number
  fog: number
  quality: 'auto' | 'high' | 'low'
  soundOn: boolean
  volume: number
  introTime: number
  holePull: number
  tiltForce: number
  shake: boolean
  dance: number
  danceStyle: 'groove' | 'eq' | 'wave' | 'ripples'
  mosh: number
  pulse: number
  heroPath: 'page' | 'galaxy'
  dissolveTime: number
  heroSparks: number
}

export const JELLY_CONFIG: Readonly<JellyConfig> = Object.freeze({
  granularity: 'word', space: 'fly', stiffness: 900, damping: 4, homePull: 60, breakDist: 0.45, boldSoft: 2.2,
  contagion: 0.35, escape: 0.15, airDrag: 0.35, gravity: 12, bounce: 0.5, autoBurst: true, floatTime: 3.5, burstSpeed: 7,
  clickBurst: true, burstForce: 5.4, burstTime: 2.2, reformTime: 1.1, pSize: 0.75, pColor: 'comet', returnTime: 1.0,
  trail: 1.3, swirl: 1.4, flash: 0.95, pGlow: 1.5, shockwave: 0.5, pDensity: 1.2, pageFinish: 'paper', grain: 0.5,
  paperThick: 0.08, paperBend: 0.5, paperCurl: 0.55, inkFinish: 'chrome', shine: 0.75, textDepth: 0.5,
  fingerRadius: 0.7, fingerForce: 20, flick: 0.8, smack: 5, slosh: 0.4, gummy: 0, jelly: 'purple', tilt: 0.05, yaw: 0, zoom: 1,
  melt: 0.7, drip: 0.5, dropRate: 0.3, hueSpeed: 0.12, backdrop: 'nebula', nebula: 'philcodes', nebulaSeed: 1,
  nebulaBright: 1, starDensity: 1.7, mist: 0.6, fgMist: 1, mistDrift: 1.3, fog: 0.55, quality: 'auto',
  soundOn: true, volume: 0.7, introTime: 3, holePull: 1, tiltForce: 12, shake: true, dance: 1, danceStyle: 'groove',
  mosh: 0, pulse: 0.7, heroPath: 'page', dissolveTime: 2.1, heroSparks: 1,
})

/** What a visitor can change while the resume is open (the HUD, the camera, site shroom mode). */
export interface JellyState extends JellyConfig {
  shroom: boolean
}

export const initialState = (): JellyState => ({ ...JELLY_CONFIG, shroom: false })

// phillcodes.com tokens (src/app/globals.css)
export const SITE = {
  cyan: '#80eaff',
  electric: '#00d4ff',
  purple: '#d580ff',
  violet: '#c44dff',
  green: '#00ff2b',
  muted: '#141f52',
  teal: '#0e2525',
} as const

export const JELLY_COLORS: Record<JellyConfig['jelly'], string> = {
  cyan: SITE.cyan,
  purple: SITE.purple,
  green: SITE.green,
  electric: SITE.electric,
}

/** The nebula's colors: two clouds, hot cores, thin filaments, and the haze everything sits in. */
export const NEBULA = { a: SITE.violet, b: SITE.electric, c: SITE.cyan, d: SITE.green, base: SITE.muted } as const

/** Shader indexes for the spark colors, page finish and ink finish. */
export const PCOLOR_INDEX: Record<JellyConfig['pColor'], number> = { jelly: 0, ink: 1, rainbow: 2, neon: 3, comet: 4 }
export const PAGE_FINISH_INDEX: Record<JellyConfig['pageFinish'], number> = { matte: 0, paper: 1, foil: 2, metal: 3 }
export const INK_FINISH_INDEX: Record<JellyConfig['inkFinish'], number> = { flat: 0, emboss: 1, chrome: 2, foil: 3 }

// Word states
export const HOME = 0
export const LOOSE = 1
export const RETURN = 2
export const BURST = 3
export const REFORM = 4
export const INTRO = 5
export const EATEN = 6

// Lattice geometry (page units: 1 = 1 inch = 96 CSS px)
export const CELL = 0.2
export const ROWS = 3
export const PAD_X = 0.035
export const PAD_TOP = 0.035
export const DRIP = 0.75
export const R_COL = 0.055
export const SLAB_MIN = 0.03
export const SLAB_MAX = 0.085

export const FOV = (40 * Math.PI) / 180
export const ZMIN = 0.15
export const ZMAX = 1.6

/**
 * The cast: Phill (the Number Slayers model) dancing in an orbit around the page, and
 * the odd shrimp drifting through the nebula. Sizes in page units (inches).
 */
export interface CastConfig {
  phill: boolean
  /** Phill's height */
  size: number
  /** on a phone (portrait) he dances above the page at this fraction of his size */
  phoneScale: number
  /** ...and this much higher */
  phoneLift: number
  /** how far the orbit reaches past the page's side edges */
  orbitX: number
  /** the orbit's depth: in front of the page, then behind it */
  orbitZ: number
  /** the orbit's tilt: higher behind the page, lower in front */
  tilt: number
  /** the orbit's center height */
  lift: number
  /** seconds per lap */
  lap: number
  /** 0: he faces you; 1: he faces where he's going */
  face: number
  /** his zero-g bob */
  bob: number
  danceRate: number
  /** with music on he dances, and moves on to another dance after this many seconds (at the end of a loop) */
  danceSwitch: number
  /** his bounce and glow on the beat */
  pump: number
  /** the light he gets that isn't from the page's light (Meshy textures are bright already) */
  ambient: number
  /** the nebula's neon on his edges */
  rim: number
  /** shrimp in the sky at once (phones get one fewer) */
  shrimp: number
  shrimpSize: number
  /** seconds between shrimp, on average */
  shrimpGap: number
  /** world units per second */
  shrimpSpeed: number
  /** with music on: each shrimp swells and glows with its own slice of the spectrum */
  shrimpPulse: number
  /** ...and its body bends to the live waveform */
  shrimpWiggle: number
}

export const CAST_CONFIG: Readonly<CastConfig> = Object.freeze({
  phill: true, size: 3.4, phoneScale: 0.55, phoneLift: 0, orbitX: 2.4, orbitZ: 4.2, tilt: 3.6, lift: 0.2, lap: 34, face: 0.3, bob: 0.25, danceRate: 1,
  danceSwitch: 16, pump: 1, ambient: 0.62, rim: 0.7, shrimp: 3, shrimpSize: 2.6, shrimpGap: 9, shrimpSpeed: 0.75, shrimpPulse: 1, shrimpWiggle: 1,
})

/**
 * Play mode (the Career Climb): Phill's controller, smash and camera. Starting values from the
 * plan; tune them at /resume?tune while playing (dev only) and paste the Copy output here.
 */
export interface PlayConfig {
  /** his height in Play (units; 3.4 in orbit) */
  size: number
  /** run: top speed (units/s), acceleration and deceleration (units/s²), the share of control in the air */
  runSpeed: number
  accel: number
  decel: number
  air: number
  /** a held jump's apex and a tapped one's (units), and the seconds to the apex */
  jumpHeight: number
  tapHeight: number
  apexTime: number
  /** gravity × while falling, and the terminal speed (units/s) */
  fallMul: number
  maxFall: number
  /** seconds: jump after leaving a ledge, a jump pressed early, and a drop-through's pass */
  coyote: number
  buffer: number
  dropTime: number
  /** a ground-pound's fall speed (units/s) */
  poundSpeed: number
  /** the smash: its reach ahead of him (units), the attack clip's strike window [a, b] (s) and its hit frame (s), and the cooldown (s) */
  reach: number
  strike: readonly [number, number]
  hit: number
  smashCooldown: number
  /** the smash's hit-stop (s) and camera shake (units at the camera's target, ~0.3 s decay) */
  hitStop: number
  shake: number
  /** his on-screen height (px) */
  pxDesktop: number
  pxPhone: number
  /** the camera's lead (units), tilt (rad) and yaw lean toward his run direction (rad) */
  lookAhead: number
  tilt: number
  lean: number
  /** the jelly: landing impulse per unit/s of fall, the standing push, the push on words he passes through */
  squash: number
  weight: number
  wake: number
  /** how far he turns toward the camera from side-on (rad) */
  face: number
  /** how far his soles sink into the line's tallest glyphs (units), so he walks on the text */
  sink: number
  /** seconds standing still (music on) before he dances */
  idleDance: number
  /** the walk clip's playback rate at full speed */
  runRate: number
}

export const PLAY_CONFIG: Readonly<PlayConfig> = Object.freeze({
  size: 0.5, runSpeed: 2.6, accel: 18, decel: 22, air: 0.65, jumpHeight: 1.0, tapHeight: 0.45, apexTime: 0.36, fallMul: 1.6, maxFall: 9,
  coyote: 0.1, buffer: 0.12, dropTime: 0.22, poundSpeed: 10,
  // the attack's first swing, a llama chopped overhead: raised behind him at 0.45 s, fastest at 0.6 s, landing in
  // front at chest height at 0.67 s (his hand furthest forward), followed through by 0.8 s
  reach: 0.42, strike: [0.45, 0.8] as const, hit: 0.67, smashCooldown: 0.32,
  hitStop: 0.06, shake: 0.35, pxDesktop: 90, pxPhone: 60, lookAhead: 0.6, tilt: 0.08, lean: 0.06,
  squash: 0.12, weight: 2, wake: 1.2, face: 0.35, sink: 0.012, idleDance: 1.5, runRate: 1.6,
})

/**
 * Play mode round 2's numbers (agreed with Phill on 2026-10-15; see the plan's "Round 2 addendum"): what a run
 * holds, the SCORE's awards, the shrimp's boost, and the trip (eating the mushroom).
 */
export const PLAY_R2 = Object.freeze({
  /** per run (the shrimp are re-rolled on Play again) */
  shrimp: 5, ufos: 3, lasagnas: 2,
  /** points: an Impact coin, a shrimp, a UFO smashed, the mushroom eaten, a lasagna beaten, and a kick taken */
  points: Object.freeze({ coin: 100, shrimp: 500, ufo: 200, mushroom: 1000, lasagna: 300, hurt: -250 }),
  /** the finish's time bonus: this many points a second under `par` (s) */
  bonusPerSec: 100, par: 60,
  /** a shrimp: run speed ×(1 + boost) for boostTime s; a second stacks once */
  boost: 0.35, boostTime: 8, boostStack: 2,
  /** the trip: how long, its last flickering seconds (Hz, under 3) and the look easing out (s) */
  trip: 12, tripFlicker: 2, flickerHz: 2.5, tripEaseOut: 1,
  /** moon jumps in the trip */
  moonJump: 1.5, moonGravity: 0.6,
})

export type AwardKind = keyof typeof PLAY_R2.points

/**
 * The 3D resume's sounds (sfx.ts): every number they're made of. Tuned by ear by Phill on 2026-10-20 in the Sound
 * lab (the sound design tool that lands with the Skills section); its Copy patch gives `panel: { 'cue.setting': v }`,
 * which goes here as `cue.setting` (the Space panel's settings are `space`). The cues he didn't touch keep the numbers
 * they had: the whoosh's shape, the black hole, the gulp and boom, the shrimp, the trip, the lasagna's sounds.
 */
type Wave = 'sine' | 'triangle' | 'sawtooth' | 'square'
/** a tone that sweeps from one pitch to another, over a burst of noise through a filter that closes */
interface ToneCrunch { wave: Wave; from: number; to: number; len: number; level: number; nType: 'lowpass' | 'bandpass' | 'highpass'; nTone: number; nLen: number; noise: number }
/** two notes, the second `gap` s after the first */
interface TwoNotes { wave: Wave; note1: number; note2: number; gap: number; len1: number; len2: number; level: number }
/** a run of `count` notes `interval` semitones apart, each bending `bend` semitones */
interface Ladder { wave: Wave; root: number; count: number; interval: number; bend: number; step: number; len: number; level: number }
/** a four-note chord's shape; 'major' is the notes sfx.ts always played (as typed there), the rest are equal-tempered */
export type ChordShape = 'major' | 'minor' | 'sus' | 'add9' | 'fifths'
export interface SfxConfig {
  /** the entrance: a noise swell (length s, its curve, brightness, level) */
  whoosh: { wLen: number; wCurve: number; wBright: number; wLevel: number }
  /** the black hole's drone: wave, pitch (Hz), detune (cents), sub level, resonance, filter (Hz) small and how far it opens, pitch drop at full size (semitones), level */
  grow: { dWave: Wave; dBase: number; dDetune: number; dSub: number; dRes: number; dCut: number; dOpen: number; dDrop: number; dLevel: number }
  gulp: { gWave: Wave; gFrom: number; gSpread: number; gTo: number; gSweep: number; gDecay: number; gLevel: number }
  boom: { bFrom: number; bTo: number; bSweep: number; bDecay: number; bLevel: number; bNTone: number; bNDecay: number; bNoise: number }
  jump: { wave: Wave; from: number; to: number; len: number; level: number }
  land: ToneCrunch
  smash: ToneCrunch
  coin: TwoNotes
  shrimp: { wave: Wave; root: number; shape: ChordShape; bend: number; step: number; len: number; level: number }
  mushroom: { wave: Wave; root: number; step: number; len: number; level: number }
  finish: { wave: Wave; root: number; shape: ChordShape; step: number; len: number; lastLen: number; level: number; shLen: number; shimmer: number }
  ufoHit: { wave1: Wave; from1: number; to1: number; len1: number; level1: number; wave2: Wave; from2: number; to2: number; len2: number; level2: number; nTone: number; nLen: number; noise: number }
  /** the UFO's beam: a sweep and a second voice `harm` × higher; it opens `after` s after the hit */
  beam: { wave: Wave; from: number; to: number; len: number; level: number; harm: number; offset: number; level2: number; after: number }
  powerUp: Ladder
  powerDown: Ladder
  alert: TwoNotes
  stomp: ToneCrunch
  kicked: ToneCrunch
  /** TINK: a note that droops a little, and an overtone `over` × higher */
  tink: { wave: Wave; note: number; droop: number; len: number; level: number; over: number; droop2: number; len2: number; level2: number }
  giantStep: ToneCrunch
  /** the room every sound goes through (reverb share, length s, decay, brightness) and the master (× the visitor's volume) and its compressor */
  space: { wet: number; rLen: number; rDecay: number; rBright: number; master: number; threshold: number; ratio: number }
}

export const SFX_CONFIG: Readonly<SfxConfig> = Object.freeze<SfxConfig>({
  whoosh: { wLen: 2.09, wCurve: 2.2, wBright: 0.5, wLevel: 0.35 },
  grow: { dWave: 'sawtooth', dBase: 55, dDetune: 8, dSub: 1, dRes: 6, dCut: 110, dOpen: 2400, dDrop: 7, dLevel: 0.32 },
  gulp: { gWave: 'sine', gFrom: 700, gSpread: 500, gTo: 70, gSweep: 0.16, gDecay: 0.18, gLevel: 0.16 },
  boom: { bFrom: 90, bTo: 32, bSweep: 0.5, bDecay: 0.9, bLevel: 0.7, bNTone: 600, bNDecay: 0.18, bNoise: 0.5 },
  jump: { wave: 'sine', from: 192, to: 3820, len: 0.258, level: 0.06 },
  land: { wave: 'sine', from: 142, to: 55, len: 0.14, level: 0.28, nType: 'lowpass', nTone: 2990, nLen: 0.06, noise: 0.12 },
  smash: { wave: 'sawtooth', from: 583, to: 20, len: 0.678, level: 0.12, nType: 'highpass', nTone: 127, nLen: 1, noise: 0.34 },
  coin: { wave: 'triangle', note1: 988, note2: 1319, gap: 0.0805, len1: 0.22, len2: 0.714, level: 0.13 },
  shrimp: { wave: 'sine', root: 659.25, shape: 'major', bend: 1.06, step: 0.045, len: 0.11, level: 0.11 },
  mushroom: { wave: 'square', root: 149, step: 0.09, len: 0.8, level: 0.105 },
  finish: { wave: 'square', root: 535, shape: 'fifths', step: 0.0858, len: 0.18, lastLen: 0.7, level: 0.12, shLen: 1, shimmer: 0.26 },
  ufoHit: { wave1: 'sine', from1: 909, to1: 73.5, len1: 1.07, level1: 0.07, wave2: 'triangle', from2: 2080, to2: 2010, len2: 0.528, level2: 0.055, nTone: 14000, nLen: 0.593, noise: 0.18 },
  beam: { wave: 'sawtooth', from: 220, to: 880, len: 0.9, level: 0.05, harm: 1.5, offset: 0.04, level2: 0.03, after: 0.3 },
  powerUp: { wave: 'triangle', root: 262, count: 8, interval: 2, bend: 3, step: 0.055, len: 0.09, level: 0.08 },
  powerDown: { wave: 'triangle', root: 784, count: 6, interval: -2.4, bend: -3.6, step: 0.07, len: 0.1, level: 0.07 },
  alert: { wave: 'square', note1: 1175, note2: 1568, gap: 0.08, len1: 0.06, len2: 0.08, level: 0.05 },
  stomp: { wave: 'square', from: 320, to: 90, len: 0.12, level: 0.1, nType: 'lowpass', nTone: 900, nLen: 0.1, noise: 0.3 },
  kicked: { wave: 'sawtooth', from: 420, to: 110, len: 0.28, level: 0.08, nType: 'bandpass', nTone: 1200, nLen: 0.08, noise: 0.25 },
  tink: { wave: 'triangle', note: 2637, droop: 2600 / 2637, len: 0.35, level: 0.09, over: 3951 / 2637, droop2: 3900 / 3951, len2: 0.22, level2: 0.05 },
  giantStep: { wave: 'sine', from: 70, to: 38, len: 0.18, level: 0.12, nType: 'lowpass', nTone: 300, nLen: 0.08, noise: 0.06 },
  space: { wet: 0.25, rLen: 2.2, rDecay: 3, rBright: 0.4, master: 1, threshold: -14, ratio: 4 },
})
