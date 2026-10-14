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
  /** the smash's hit-stop (s) and camera shake (units, ~0.2 s decay) */
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
  hitStop: 0.06, shake: 0.04, pxDesktop: 90, pxPhone: 60, lookAhead: 0.6, tilt: 0.08, lean: 0.06,
  squash: 0.12, weight: 0.6, wake: 1.2, face: 0.35, idleDance: 1.5, runRate: 1.6,
})
