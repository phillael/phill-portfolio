/**
 * The Skill blaster's rules, pure: the waves, the kinds of lit skill and their points, what lights up next
 * (the conductor), the band, the phone staging order and the scoreboard's bounds. Ported from the round 6 mockup
 * (docs/design/skills-game/round6/blaster-synth.js); the runtime is blaster.ts. Tests: skills-rules.test.ts.
 */

import type { SkillGroupId } from '@/data/skills'
import { BAR, BEATS, PARTS } from './synth'

export type Rng = () => number

export const MAX_HP = 5
/** the third wave: the drop, and the first enemies */
export const FIRST_FOE_WAVE = 2
/** a part counts in the band for two bars after you play it */
export const HEARD_BARS = 2
/** the band's order (the readout's pips) */
export const ORDER = Object.keys(PARTS) as SkillGroupId[]

export interface WaveCfg {
  /** skills to light */
  n: number
  /** lit at once, at most */
  at: number
  /** seconds a lit skill lasts */
  life: number
  /** seconds between lights */
  gap: number
  foes: number
  gold: number
  /** seconds an enemy aims before it fires */
  aim?: number
  elite?: number
}

export const WAVES: WaveCfg[] = [
  { n: 8, at: 2, life: 2.3, gap: 0.8, foes: 0, gold: 0 },
  { n: 10, at: 2, life: 2.0, gap: 0.7, foes: 0, gold: 1 },
  { n: 12, at: 3, life: 1.9, gap: 0.65, foes: 4, gold: 1, aim: 2.5 },
  { n: 14, at: 3, life: 1.7, gap: 0.6, foes: 6, gold: 1, aim: 2.2, elite: 1 },
  { n: 16, at: 4, life: 1.6, gap: 0.55, foes: 8, gold: 2, aim: 2.0, elite: 2 },
]
/** wave i (from 0); past the table, two more skills a wave, a little faster each time */
export function waveCfg(i: number): WaveCfg {
  if (i < WAVES.length) return WAVES[i]
  const e = i - WAVES.length + 1, b = WAVES[WAVES.length - 1], n = b.n + 2 * e
  return {
    n,
    at: Math.min(6, b.at + Math.floor(e / 2)),
    life: Math.max(1.05, b.life * 0.94 ** e),
    gap: Math.max(0.35, b.gap * 0.95 ** e),
    foes: Math.round(n * 0.55),
    gold: 2,
    aim: Math.max(1.35, b.aim! * 0.94 ** e),
    elite: b.elite! + e,
  }
}

export type Kind = 'mole' | 'gold' | 'foe' | 'elite'
export const KIND: Record<Kind, { pts: number; sparks: number; cls: string; c?: string }> = {
  mole: { pts: 100, sparks: 10, cls: 'bl-lit' },
  gold: { pts: 500, sparks: 16, cls: 'bl-gold', c: '45 100% 62%' },
  foe: { pts: 300, sparks: 22, cls: 'bl-foe', c: '355 100% 64%' },
  elite: { pts: 1000, sparks: 30, cls: 'bl-foe', c: '355 100% 64%' },
}
export const isFoe = (kind: Kind) => kind === 'foe' || kind === 'elite'
/** points for a shield off an elite */
export const SHIELD_PTS = 50
/** a wave clear's bonus (wave from 0) */
export const clearBonus = (wave: number) => 250 * (wave + 1)

function shuffle<T>(a: T[], rng: Rng) {
  for (let i = a.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]] }
  return a
}
/** the order a wave lights its kinds in */
export function planFor(cfg: WaveCfg, i: number, rng: Rng = Math.random): Kind[] {
  const elites = Math.min(cfg.elite || 0, cfg.foes)
  const kinds: Kind[] = [...Array(cfg.foes - elites).fill('foe'), ...Array(elites).fill('elite'), ...Array(cfg.gold || 0).fill('gold')]
  while (kinds.length < cfg.n) kinds.push('mole')
  shuffle(kinds, rng)
  if (i === FIRST_FOE_WAVE) { // the very first enemy comes third, after two moles
    const rest = kinds.filter((x) => x !== 'foe')
    const foes = kinds.filter((x) => x === 'foe')
    for (let m = 0; m < 2; m++) rest.splice(rest.indexOf('mole'), 1) // the two leading moles come out of the rest, never the gold
    return ['mole', 'mole', foes.pop()!, ...shuffle([...rest, ...foes], rng)]
  }
  return kinds
}

/** seconds a lit skill lasts before it goes (or fires); keyboard play gets 1.6× */
export function lifeFor(kind: Kind, cfg: WaveCfg, kb: boolean) {
  const base = isFoe(kind) ? cfg.aim! * (kind === 'elite' ? 1.5 : 1) : kind === 'gold' ? cfg.life * 0.6 : cfg.life
  return base * (kb ? 1.6 : 1)
}

/** the beat a wave plays (BEATS[level]) */
export const levelFor = (wave: number) => Math.min(BEATS.length - 1, Math.max(0, wave))

/** what the conductor knows: is the music on, the audio clock, when each part last played, the parts lit now */
export interface MusicState {
  on: boolean
  now: number
  last: Partial<Record<SkillGroupId, number>>
  active: readonly SkillGroupId[]
}
/** how much the music wants this group lit next */
export function need(g: SkillGroupId, s: MusicState) {
  if (!s.on) return 1
  const since = (x: SkillGroupId) => s.now - (s.last[x] ?? -1e9)
  if (g === 'cloud') return s.active.includes('cloud') ? 0 : since('cloud') > 2 * BAR ? 8 : since('cloud') > BAR ? 1.5 : 0.25 // a chord when the harmony has sat for two bars
  if (g === 'backend') return s.active.includes('backend') ? 0.5 : since('backend') > BAR ? 4 : 1.5 // the bass when it's been quiet for a bar
  if (g === 'ai') return 2.5 // the lead, often
  return 1.2
}
/** an index picked by weight (a uniform pick if the weights don't add up) */
export function pickWeighted(weights: readonly number[], rng: Rng = Math.random) {
  let r = rng() * weights.reduce((a, b) => a + b, 0), pick = (rng() * weights.length) | 0
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) { pick = i; break } }
  return pick
}

/** the parts heard until later than t (each part's "until" is when it leaves the band) */
export const inBand = (until: Partial<Record<SkillGroupId, number>>, t: number) => ORDER.filter((g) => (until[g] ?? 0) > t)
export const bandSize = (until: Partial<Record<SkillGroupId, number>>, t: number) => inBand(until, t).length

/** phones and short windows: the order groups open in for a wave. One of chords, bass or lead first (the
    chords on the drop), then the others taking turns; the arena opens as many as fit */
const STAGE_ORDER: SkillGroupId[] = ['cloud', 'ai', 'backend', 'frontend', 'quality', 'product', 'music']
const CORE: SkillGroupId[] = ['cloud', 'backend', 'cloud', 'ai', 'backend', 'ai']
export function stageOrder(wave: number): SkillGroupId[] {
  const core = CORE[wave % CORE.length], others = STAGE_ORDER.filter((g) => g !== core)
  return [core, ...others.map((_, i) => others[(i + 2 * wave) % others.length])]
}

/** the readout centred in the section (its content box from `left`, `inner` wide) clears the Shroom Wizard's box
    (bottom-left, ending at `wizardRight`) and the music and summon buttons (the right 76 px); where it can't, the
    wizard steps aside while the game plays */
export const readoutClears = ({ left, inner, width, wizardRight, viewport }: { left: number; inner: number; width: number; wizardRight: number; viewport: number }) => {
  const x = left + (inner - width) / 2
  return x > wizardRight + 8 && x + width < viewport - 76
}

/* the scoreboard's check (the score route imports these on the server): what a real run can reach by a wave */

/** an elite's shields (blaster.ts lights an elite with 3 hits; the last one downs it) */
const ELITE_SHIELDS = 2
/** the most a run can score through the end of wave `wave` (from 0): every lit skill hit with the whole band
    playing, each elite's shields, each wave's clear bonus, and the free hit (100) of the first shot and of each resume */
export function maxScoreFor(wave: number, resumes: number) {
  let score = 100 * (1 + resumes)
  for (let i = 0; i <= wave; i++) {
    const cfg = waveCfg(i), elites = Math.min(cfg.elite || 0, cfg.foes), gold = cfg.gold || 0
    const moles = Math.max(0, cfg.n - cfg.foes - gold) // planFor's kinds: the rest are moles
    const lit = (cfg.foes - elites) * KIND.foe.pts + elites * KIND.elite.pts + gold * KIND.gold.pts + moles * KIND.mole.pts
    score += lit * ORDER.length + elites * ELITE_SHIELDS * SHIELD_PTS + clearBonus(i)
  }
  return score
}
/** the least time (seconds from the first shot) to reach wave `wave`: the first wave starts a bar after the first
    shot; a wave's first skill lights ≥ 0.3 s in and each next one ≥ 0.4 × its gap after a hit (blaster's queueSpawn
    is "at least sec away"); a clear waits ≥ a bar for the next wave, 2 into the drop */
export function minSecondsFor(wave: number) {
  let t = BAR
  for (let i = 0; i < wave; i++) {
    const { n, gap } = waveCfg(i)
    t += 0.3 + (n - 1) * 0.4 * gap + (i + 1 === FIRST_FOE_WAVE ? 2 : 1) * BAR
  }
  return t
}
