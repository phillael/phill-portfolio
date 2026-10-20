/**
 * The 3D resume's sound effects (synthesized, no files): Play mode's jump, land, smash, coin
 * and finish make sound only while Sound is on, and every number comes from SFX_CONFIG.
 * Web Audio isn't in jsdom, so a small fake AudioContext records which sources get started.
 */

import { createSfx, playEventSound } from '@/lib/jelly/sfx'
import { SFX_CONFIG } from '@/lib/jelly/config'
import type { PlayEvent } from '@/lib/jelly/play'

const started: string[] = []
const param = () => ({ value: 0, set: [] as number[], setValueAtTime(v: number) { this.set.push(v) }, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {} })
const node = (kind: string) => ({
  kind, type: '', buffer: null as unknown, frequency: param(), detune: param(), Q: param(), gain: param(), threshold: param(), ratio: param(),
  connect() {}, disconnect() {},
  start() { started.push(kind) },
  stop() {},
})
class FakeAudioContext {
  state = 'running'
  currentTime = 0
  sampleRate = 8000
  destination = node('destination')
  createGain() { return node('gain') }
  createDynamicsCompressor() { return node('compressor') }
  createConvolver() { return node('convolver') }
  createBiquadFilter() { return node('filter') }
  createOscillator() { return node('osc') }
  createBufferSource() { return node('noise') }
  createBuffer(ch: number, len: number) { return { getChannelData: () => new Float32Array(len) } }
  resume() { return Promise.resolve() }
  close() { return Promise.resolve() }
}

beforeAll(() => {
  ;(window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext
})
beforeEach(() => { started.length = 0 })

describe("Play mode's sounds", () => {
  const play = (sfx: ReturnType<typeof createSfx>) => {
    sfx.jump()
    sfx.land(6)
    sfx.smash()
    sfx.coin()
    sfx.finish()
  }

  it('each one makes a sound with Sound on', () => {
    const sfx = createSfx(() => ({ soundOn: true, volume: 0.7 }))
    sfx.init()
    sfx.prepare()
    for (const f of [() => sfx.jump(), () => sfx.land(6), () => sfx.smash(), () => sfx.coin(), () => sfx.finish()]) {
      started.length = 0
      f()
      expect(started.length).toBeGreaterThan(0)
    }
  })

  it('a harder landing is louder; a gentle step makes none', () => {
    const sfx = createSfx(() => ({ soundOn: true, volume: 0.7 }))
    sfx.init()
    sfx.land(0.5)
    expect(started).toHaveLength(0)
    sfx.land(8)
    expect(started.length).toBeGreaterThan(0)
  })

  it('none with Sound off, and none before a gesture has made the audio context', () => {
    const off = createSfx(() => ({ soundOn: false, volume: 0.7 }))
    off.init()
    off.prepare()
    play(off)
    expect(started).toHaveLength(0)
    const early = createSfx(() => ({ soundOn: true, volume: 0.7 }))
    play(early) // (no init yet)
    expect(started).toHaveLength(0)
  })
})

describe('the sounds come from SFX_CONFIG', () => {
  const oscs: ReturnType<typeof node>[] = []
  let spy: jest.SpyInstance
  beforeEach(() => {
    oscs.length = 0
    spy = jest.spyOn(FakeAudioContext.prototype, 'createOscillator').mockImplementation(() => { const o = node('osc'); oscs.push(o); return o })
  })
  afterEach(() => spy.mockRestore())

  it('the jump is the tuned one: its wave and where it starts', () => {
    const sfx = createSfx(() => ({ soundOn: true, volume: 0.7 }))
    sfx.init()
    sfx.jump()
    expect(oscs).toHaveLength(1)
    expect(oscs[0].type).toBe(SFX_CONFIG.jump.wave)
    expect(oscs[0].frequency.set[0]).toBe(SFX_CONFIG.jump.from)
  })

  it('a config of its own changes the sound', () => {
    const sfx = createSfx(() => ({ soundOn: true, volume: 0.7 }), { ...SFX_CONFIG, jump: { ...SFX_CONFIG.jump, wave: 'square', from: 300 } })
    sfx.init()
    sfx.jump()
    expect(oscs[0].type).toBe('square')
    expect(oscs[0].frequency.set[0]).toBe(300)
  })

  it('the finish climbs the chord its shape names (fifths: four notes, then the shimmer on the top one)', () => {
    const sfx = createSfx(() => ({ soundOn: true, volume: 0.7 }))
    sfx.init()
    sfx.finish()
    const f = oscs.map((o) => o.frequency.set[0]), root = SFX_CONFIG.finish.root
    expect(SFX_CONFIG.finish.shape).toBe('fifths')
    expect(f).toHaveLength(5)
    ;[0, 7, 12, 19].forEach((st, i) => expect(f[i]).toBeCloseTo(root * 2 ** (st / 12), 6))
    expect(f[4]).toBeCloseTo(f[3], 6)
  })
})

describe("round 2's sounds", () => {
  const at: [number, number, number] = [0, 0, 0]
  /** every new event, and the cue it plays */
  const EVENTS: [string, PlayEvent][] = [
    ['shrimp pickup', { type: 'shrimp', index: 0, at, shrimp: 1, total: 5 }],
    ['UFO hit (and its beam)', { type: 'ufo', index: 0, at }],
    ['mushroom appears', { type: 'mushroom', at }],
    ['power-up (the trip)', { type: 'trip', at }],
    ['power-down (the trip over)', { type: 'tripEnd' }],
    ['enemy alert', { type: 'enemy', what: 'alert', at }],
    ['the giant grew', { type: 'enemy', what: 'huge', at }],
    ['stomp', { type: 'enemy', what: 'stomped', at }],
    ['lasagna smashed', { type: 'enemy', what: 'smashed', at }],
    ['kicked', { type: 'enemy', what: 'hurt', at }],
    ['TINK', { type: 'enemy', what: 'tink', at }],
    ['a bounce off its head', { type: 'enemy', what: 'bounce', at }],
    ["the giant's steps", { type: 'giantStep', near: 1 }],
  ]

  it.each(EVENTS)('%s: a sound with Sound on', (_, e) => {
    const sfx = createSfx(() => ({ soundOn: true, volume: 0.7 }))
    sfx.init()
    sfx.prepare()
    started.length = 0
    playEventSound(sfx, e)
    expect(started.length).toBeGreaterThan(0)
  })

  it('none with Sound off, or before a gesture', () => {
    const off = createSfx(() => ({ soundOn: false, volume: 0.7 }))
    off.init()
    off.prepare()
    for (const [, e] of EVENTS) playEventSound(off, e)
    const early = createSfx(() => ({ soundOn: true, volume: 0.7 }))
    for (const [, e] of EVENTS) playEventSound(early, e)
    expect(started).toHaveLength(0)
  })

  it("the giant's steps are quiet, and silent when it's far", () => {
    const gains: number[] = []
    const sfx = createSfx(() => ({ soundOn: true, volume: 0.7 }))
    sfx.init()
    sfx.prepare()
    const spy = jest.spyOn(FakeAudioContext.prototype, 'createGain').mockImplementation(function (this: FakeAudioContext) {
      const g = node('gain')
      Object.assign(g.gain, { exponentialRampToValueAtTime: (v: number) => { gains.push(v) } })
      return g
    })
    started.length = 0
    playEventSound(sfx, { type: 'giantStep', near: 0 })
    expect(started).toHaveLength(0)
    playEventSound(sfx, { type: 'giantStep', near: 1 })
    expect(started.length).toBeGreaterThan(0)
    expect(Math.max(...gains)).toBeLessThanOrEqual(0.15)
    spy.mockRestore()
  })

  it('the old events still play theirs (jump, land, smash with words, coin, finish)', () => {
    const sfx = createSfx(() => ({ soundOn: true, volume: 0.7 }))
    sfx.init()
    sfx.prepare()
    for (const e of [{ type: 'jump' }, { type: 'land', line: 0, speed: 6 }, { type: 'smash', bodies: [1], coins: [], pound: false }, { type: 'coin', body: 1, at, coins: 1, total: 27 }] as PlayEvent[]) {
      started.length = 0
      playEventSound(sfx, e)
      expect(started.length).toBeGreaterThan(0)
    }
    started.length = 0
    playEventSound(sfx, { type: 'smash', bodies: [], coins: [], pound: false })
    expect(started).toHaveLength(0) // (a smash at nothing: silent)
  })
})
