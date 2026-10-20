/**
 * The Skill blaster: the game the Skills section hides. Its own chunk, imported on the first click on a skill
 * (src/components/skills/SkillsPlay.tsx), with its engine (synth.ts), its rules (rules.ts) and its styles.
 * Ported from docs/design/skills-game/round6/blaster-synth.js; plan docs/plans/2026-10-20-skills-blaster-plan.md.
 */

import type { Lean } from './lean'

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

/** T7 ports the game here; until then a shot does nothing */
export function createBlaster(opts: BlasterOptions): Blaster {
  void opts
  return { shoot() {}, dispose() {} }
}
