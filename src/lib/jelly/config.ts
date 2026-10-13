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
