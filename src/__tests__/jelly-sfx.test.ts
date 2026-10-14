/**
 * The 3D resume's sound effects (synthesized, no files): Play mode's jump, land, smash, coin
 * and finish make sound only while Sound is on. Web Audio isn't in jsdom, so a small fake
 * AudioContext records which sources get started.
 */

import { createSfx } from '@/lib/jelly/sfx'

const started: string[] = []
const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {} })
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
