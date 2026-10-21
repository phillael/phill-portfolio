/**
 * The Skill blaster's rules (src/lib/skills/rules.ts), ported from the round 6 mockup
 * (docs/design/skills-game/round6/blaster-synth.js): the waves, what lights up (the conductor),
 * the band and the phone staging order. Pure functions; the RNG is injected.
 */

import {
  FIRST_FOE_WAVE,
  KIND,
  MAX_HP,
  WAVES,
  bandSize,
  inBand,
  lifeFor,
  levelFor,
  need,
  pickWeighted,
  planFor,
  readoutClears,
  stageOrder,
  waveCfg,
  type Kind,
  type MusicState,
} from '@/lib/skills/rules'
import type { SkillGroupId } from '@/data/skills'
import { BAR, BEATS } from '@/lib/skills/synth'

/** a seeded RNG (mulberry32), so a plan is the same every run */
const seeded = (s: number) => {
  let a = s >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const count = (list: Kind[], kind: Kind) => list.filter((x) => x === kind).length

describe('the waves', () => {
  it('are the mockup’s first five', () => {
    expect(WAVES).toEqual([
      { n: 8, at: 2, life: 2.3, gap: 0.8, foes: 0, gold: 0 },
      { n: 10, at: 2, life: 2.0, gap: 0.7, foes: 0, gold: 1 },
      { n: 12, at: 3, life: 1.9, gap: 0.65, foes: 4, gold: 1, aim: 2.5 },
      { n: 14, at: 3, life: 1.7, gap: 0.6, foes: 6, gold: 1, aim: 2.2, elite: 1 },
      { n: 16, at: 4, life: 1.6, gap: 0.55, foes: 8, gold: 2, aim: 2.0, elite: 2 },
    ])
    for (let i = 0; i < WAVES.length; i++) expect(waveCfg(i)).toBe(WAVES[i])
    expect(FIRST_FOE_WAVE).toBe(2) // the third wave, the drop
    expect(MAX_HP).toBe(5)
  })

  it('carry on past wave 5: two more skills a wave, faster, more enemies', () => {
    const w6 = waveCfg(5), w7 = waveCfg(6)
    expect(w6).toEqual({ n: 18, at: 4, life: expect.closeTo(1.504), gap: expect.closeTo(0.5225), foes: 10, gold: 2, aim: expect.closeTo(1.88), elite: 3 })
    expect(w7).toEqual({ n: 20, at: 5, life: expect.closeTo(1.41376), gap: expect.closeTo(0.496375), foes: 11, gold: 2, aim: expect.closeTo(1.7672), elite: 4 })
  })

  it('never get faster than the floors', () => {
    const far = waveCfg(60)
    expect(far.at).toBe(6)
    expect(far.life).toBe(1.05)
    expect(far.gap).toBe(0.35)
    expect(far.aim).toBe(1.35)
  })
})

describe('a wave’s plan', () => {
  it('holds every kind the wave asks for, the rest moles, whatever the shuffle', () => {
    for (let i = 0; i < 8; i++) {
      for (let seed = 1; seed <= 100; seed++) {
        const cfg = waveCfg(i), plan = planFor(cfg, i, seeded(seed))
        const elites = Math.min(cfg.elite ?? 0, cfg.foes)
        expect(plan).toHaveLength(cfg.n)
        expect(count(plan, 'elite')).toBe(elites)
        expect(count(plan, 'foe')).toBe(cfg.foes - elites)
        expect(count(plan, 'gold')).toBe(cfg.gold)
        expect(count(plan, 'mole')).toBe(cfg.n - cfg.foes - cfg.gold)
      }
    }
  })

  it('the very first enemy comes third in wave 3, after two moles', () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(planFor(waveCfg(FIRST_FOE_WAVE), FIRST_FOE_WAVE, seeded(seed)).slice(0, 3)).toEqual(['mole', 'mole', 'foe'])
    }
  })

  it('is shuffled by the RNG it’s given', () => {
    const a = planFor(waveCfg(4), 4, seeded(7)), b = planFor(waveCfg(4), 4, seeded(7)), c = planFor(waveCfg(4), 4, seeded(8))
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
  })
})

describe('kinds and points', () => {
  it('a mole 100, gold 500, an enemy 300, an elite 1000', () => {
    expect([KIND.mole.pts, KIND.gold.pts, KIND.foe.pts, KIND.elite.pts]).toEqual([100, 500, 300, 1000])
  })

  it('how long a lit skill lasts: enemies aim, gold is quick, keyboard play gets 1.6×', () => {
    const cfg = waveCfg(3)
    expect(lifeFor('mole', cfg, false)).toBeCloseTo(1.7)
    expect(lifeFor('gold', cfg, false)).toBeCloseTo(1.02)
    expect(lifeFor('foe', cfg, false)).toBeCloseTo(2.2)
    expect(lifeFor('elite', cfg, false)).toBeCloseTo(3.3)
    expect(lifeFor('mole', cfg, true)).toBeCloseTo(2.72)
  })
})

describe('the conductor', () => {
  const t = 100
  const at = (last: MusicState['last'] = {}, active: SkillGroupId[] = []): MusicState => ({ on: true, now: t, last, active })

  it('a chord when the harmony has sat for two bars, less often after one, rarely right after', () => {
    expect(need('cloud', at())).toBe(8)
    expect(need('cloud', at({ cloud: t - 2.5 * BAR }))).toBe(8)
    expect(need('cloud', at({ cloud: t - 1.5 * BAR }))).toBe(1.5)
    expect(need('cloud', at({ cloud: t - 0.5 * BAR }))).toBe(0.25)
    expect(need('cloud', at({}, ['cloud']))).toBe(0) // one chord lit at a time
  })

  it('the bass when it’s been quiet for a bar', () => {
    expect(need('backend', at())).toBe(4)
    expect(need('backend', at({ backend: t - 0.5 * BAR }))).toBe(1.5)
    expect(need('backend', at({}, ['backend']))).toBe(0.5)
  })

  it('the lead often, the rest in between', () => {
    expect(need('ai', at())).toBe(2.5)
    for (const g of ['frontend', 'quality', 'product', 'music'] as const) expect(need(g, at())).toBe(1.2)
  })

  it('no music, no preference', () => {
    expect(need('cloud', { on: false, now: t, last: {}, active: [] })).toBe(1)
  })

  it('picks by weight with the RNG it’s given', () => {
    const rolls = (...r: number[]) => { let i = 0; return () => r[i++] }
    expect(pickWeighted([1, 8, 1], rolls(0.05, 0))).toBe(0) // 0.5 of 10 lands in the first
    expect(pickWeighted([1, 8, 1], rolls(0.5, 0))).toBe(1)
    expect(pickWeighted([1, 8, 1], rolls(0.95, 0))).toBe(2)
  })
})

describe('the band', () => {
  it('is the parts heard until later than now', () => {
    const until = { backend: 5, cloud: 12, ai: 9.995, frontend: 0, quality: 0, product: 0, music: 0 }
    expect(inBand(until, 10)).toEqual(['cloud'])
    expect(inBand(until, 9)).toEqual(['cloud', 'ai'])
    expect(bandSize(until, 4)).toBe(3)
    expect(bandSize(until, 20)).toBe(0)
  })
})

describe('the beat for a wave', () => {
  it('follows the wave, from half-time to the break', () => {
    expect([-1, 0, 1, 2, 3, 4, 5, 9].map(levelFor)).toEqual([0, 0, 1, 2, 3, 4, 4, 4])
    expect(BEATS[levelFor(2)].name).toBe('the drop')
  })
})

describe('phone staging', () => {
  it('opens a core part first each wave (the chords on the drop), the others taking turns', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(stageOrder)).toEqual([
      ['cloud', 'ai', 'backend', 'frontend', 'quality', 'product', 'music'],
      ['backend', 'frontend', 'quality', 'product', 'music', 'cloud', 'ai'],
      ['cloud', 'product', 'music', 'ai', 'backend', 'frontend', 'quality'], // wave 3, the drop
      ['ai', 'cloud', 'backend', 'frontend', 'quality', 'product', 'music'],
      ['backend', 'frontend', 'quality', 'product', 'music', 'cloud', 'ai'],
      ['ai', 'product', 'music', 'cloud', 'backend', 'frontend', 'quality'],
      ['cloud', 'ai', 'backend', 'frontend', 'quality', 'product', 'music'],
    ])
  })
})

describe('the readout beside the Shroom Wizard', () => {
  // the wizard's box ends at x 311 on desktop, 151 on a phone; the music and summon buttons take the right 76 px
  it('centres where that clears the wizard (1280 wide)', () => {
    expect(readoutClears({ left: 112, inner: 1056, width: 382, wizardRight: 311, viewport: 1280 })).toBe(true)
  })
  it('can’t on a phone (375 wide): the wizard steps aside instead', () => {
    expect(readoutClears({ left: 16, inner: 343, width: 283, wizardRight: 151, viewport: 375 })).toBe(false)
  })
})
