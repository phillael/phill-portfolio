/**
 * The Relic Vault's sound effects (src/lib/vault/sfx.ts): silent until armed with a context from a click, then each
 * of the four cues schedules its nodes; it borrows the site player's AudioContext and never a media element.
 */

import fs from 'fs'
import path from 'path'
import { registerSiteMusic, type SiteMusic } from '@/lib/site-music'
import { contextFromClick, createSfx } from '@/lib/vault/sfx'
import { FakeAudioContext } from './helpers/fakeAudio'

const fake = () => {
  const ac = new FakeAudioContext()
  ac.currentTime = 3
  return ac
}
const asAc = (ac: FakeAudioContext) => ac as unknown as AudioContext

afterEach(() => registerSiteMusic(null))

describe('createSfx', () => {
  it('schedules nothing before arm()', () => {
    const sfx = createSfx()
    expect(sfx.armed()).toBe(false)
    sfx.on()
    sfx.off()
    sfx.holo()
    sfx.holoClose()
    const ac = fake()
    sfx.arm(asAc(ac))
    // arming makes only its output (at the mockup's 0.6) on the destination
    expect(ac.nodes.filter((n) => n.kind !== 'destination').map((n) => n.kind)).toEqual(['gain'])
    expect(ac.nodes.find((n) => n.kind === 'gain')!.gain.value).toBe(0.6)
    expect(ac.nodes.some((n) => n.started !== null)).toBe(false)
  })

  it.each([
    ['on', 4, 1],
    ['off', 1, 1],
    ['holo', 2, 1],
    ['holoClose', 1, 1],
  ] as const)('%s schedules %i oscillators and %i noise burst from now, and stops them', (cue, oscs, sources) => {
    const sfx = createSfx()
    const ac = fake()
    sfx.arm(asAc(ac))
    const from = ac.nodes.length
    sfx[cue]()
    const o = ac.since(from, 'osc')
    const s = ac.since(from, 'source')
    expect(o).toHaveLength(oscs)
    expect(s).toHaveLength(sources)
    for (const n of [...o, ...s]) {
      expect(n.started).toBeGreaterThanOrEqual(3)
      expect(n.stopped).toBeGreaterThan(n.started!)
      expect(n.stopped! - 3).toBeLessThan(2)
    }
  })

  it('is quiet again after dispose()', () => {
    const sfx = createSfx()
    const ac = fake()
    sfx.arm(asAc(ac))
    sfx.dispose()
    const from = ac.nodes.length
    sfx.on()
    expect(ac.nodes.length).toBe(from)
  })
})

describe('contextFromClick', () => {
  it('borrows the site player’s context and resumes it', () => {
    const ac = fake()
    ac.state = 'suspended'
    const resume = jest.spyOn(ac, 'resume')
    const context = jest.fn(() => asAc(ac))
    registerSiteMusic({ context } as unknown as SiteMusic)
    const c = contextFromClick()
    expect(context).toHaveBeenCalledTimes(1)
    expect(c).toEqual({ ac, own: false })
    expect(resume).toHaveBeenCalled()
  })

  it('makes its own only without a player, and nothing without Web Audio', () => {
    expect(typeof AudioContext).toBe('undefined')
    expect(contextFromClick()).toBeNull()
    const Own = jest.fn(() => fake())
    Object.assign(window, { AudioContext: Own })
    try {
      expect(contextFromClick()?.own).toBe(true)
      expect(Own).toHaveBeenCalledTimes(1)
    } finally {
      delete (window as { AudioContext?: unknown }).AudioContext
    }
  })
})

describe('the vault’s audio', () => {
  it('never calls createMediaElementSource (the player owns the song’s)', () => {
    const dir = path.join(process.cwd(), 'src/lib/vault')
    for (const f of fs.readdirSync(dir)) expect(fs.readFileSync(path.join(dir, f), 'utf8')).not.toMatch(/createMediaElementSource\s*\(/)
  })
})
