/**
 * The Skill blaster's sound engine (src/lib/skills/synth.ts): a port of the Sound lab's engine
 * (docs/design/skills-game/round6/synth.js). Its settings are generated from the lab's defaults, so the
 * parity test below fails until `node docs/design/sound-lab/tools/bake-skills-config.mjs` has been run.
 * Web Audio isn't in jsdom: a fake AudioContext records what gets made.
 */

import { BEATS, CHORDS, ON_8TH, PARTS, at01, createSynth, hz, inChord, type HitKey } from '@/lib/skills/synth'
import { SKILL_SYNTH_CONFIG } from '@/lib/skills/synthConfig'
import { FakeAudioContext, fakeBuffer, flush, type FakeNode } from './helpers/fakeAudio'

interface LabEngine {
  defaults(): unknown
  CHORDS: unknown
  PARTS: unknown
  BEATS: unknown
  ON_8TH: unknown
  BPM: number
}
require('../../docs/design/skills-game/round6/synth.js')
const LAB = (window as unknown as { SKILL_SYNTH: LabEngine }).SKILL_SYNTH

const make = () => {
  const ac = new FakeAudioContext()
  return { ac, E: createSynth(ac as unknown as AudioContext) }
}
const k = (gi: number, n: number): HitKey => ({ gi, frac: gi / Math.max(1, n - 1) })
const freqs = (nodes: FakeNode[]) => nodes.map((n) => n.frequency.value)

describe('the sound is the Sound lab’s', () => {
  it('the config is synth.js’s defaults, exactly (regenerate it with bake-skills-config.mjs)', () => {
    expect(SKILL_SYNTH_CONFIG).toEqual(LAB.defaults())
  })

  it('the config is frozen', () => {
    expect(Object.isFrozen(SKILL_SYNTH_CONFIG)).toBe(true)
    for (const part of Object.values(SKILL_SYNTH_CONFIG)) expect(Object.isFrozen(part)).toBe(true)
  })

  it('the chords, parts, beats and grid are the lab’s', () => {
    expect(CHORDS).toEqual(LAB.CHORDS)
    expect(PARTS).toEqual(LAB.PARTS)
    expect(BEATS).toEqual(LAB.BEATS)
    expect(ON_8TH).toEqual(LAB.ON_8TH)
    expect(LAB.BPM).toBe(172)
  })
})

describe('notes in the chord', () => {
  it('inChord lists the chord’s notes in a range', () => {
    // Dm9: D A C E F
    expect(inChord(CHORDS[0], 60, 72)).toEqual([60, 62, 64, 65, 69, 72])
    expect(inChord(CHORDS[0], 66, 68)).toEqual([])
  })

  it('at01 picks a place in a list, clamped', () => {
    const list = [1, 2, 3, 4, 5, 6]
    expect(at01(list, 0)).toBe(0)
    expect(at01(list, 1)).toBe(5)
    expect(at01(list, 0.5)).toBe(3)
    expect(at01(list, -1)).toBe(0)
    expect(at01(list, 2)).toBe(5)
  })
})

describe('the harmony', () => {
  it('is Dm9 until a chord is set, then the last chord set at or before a time', () => {
    const { E } = make()
    expect(E.chordAt(0).name).toBe('Dm9')
    E.setChord(CHORDS[2], 1)
    expect(E.chordAt(0.99).name).toBe('Dm9')
    expect(E.chordAt(1).name).toBe('Gm9')
    E.setChord(CHORDS[4], 2)
    expect(E.chordAt(1.5).name).toBe('Gm9')
    expect(E.chordAt(2.5).name).toBe('Fmaj9')
    E.setChord(CHORDS[5], 1.5) // a chord set earlier replaces the ones after it
    expect(E.chordAt(2.5).name).toBe('Cadd9')
    E.resetHarmony()
    expect(E.chordAt(2.5).name).toBe('Dm9')
  })

  it('a Cloud hit plays a chord and changes the harmony there (its place in the group picks it)', () => {
    const { E } = make()
    expect(E.hit('cloud', k(5, 12), 0.5)).toBe(CHORDS[5])
    expect(E.chordAt(0.6).name).toBe('Cadd9')
    expect(E.hit('cloud', { gi: 13, frac: 1 }, 1)).toBe(CHORDS[1]) // past 12: round again
    expect(E.mono.pad).toBeDefined() // the chord's tail holds
  })

  // what each group plays at its place 0 (or 1), as MIDI notes, under Dm9 (D A C E F) and Cadd9 (C G D E)
  const CASES = [
    { group: 'ai', frac: 0, dm9: [69], cadd9: [67] },
    { group: 'quality', frac: 0, dm9: [81], cadd9: [79] },
    { group: 'product', frac: 1, dm9: [89], cadd9: [91] },
    { group: 'music', frac: 0, dm9: [57], cadd9: [60] },
    { group: 'backend', frac: 0, dm9: [26], cadd9: [24] }, // the chord's root, an octave down
    { group: 'frontend', frac: 0, dm9: [62, 64, 65, 69, 72, 74], cadd9: [62, 64, 67, 72, 74, 76] }, // a run up the chord
  ] as const

  it.each(CASES)('$group snaps its note to the harmony', ({ group, frac, dm9, cadd9 }) => {
    for (const [chord, want] of [[null, dm9], [5, cadd9]] as const) {
      const { ac, E } = make()
      if (chord !== null) E.hit('cloud', k(chord, 12), 0.5)
      const from = ac.nodes.length
      E.hit(group, { gi: 0, frac }, 1)
      const made = freqs(ac.since(from, 'osc'))
      for (const m of want) expect(made.some((f) => Math.abs(f - hz(m)) < 1e-6)).toBe(true)
    }
  })

  it('the bass, the lead and the chord tail are one note at a time', () => {
    const { E } = make()
    E.hit('backend', k(0, 14), 0)
    const first = E.mono.bass!
    E.hit('backend', k(9, 14), 0.5)
    expect(E.mono.bass).not.toBe(first)
    expect(first.end).toBeCloseTo(0.8) // the old note lets go 0.3 s after the new one
  })
})

describe('the shot', () => {
  it('a laser: detuned saws diving from 1.6 kHz to 120 Hz, a thump under them and a crackle, on the game’s bus', () => {
    const { ac, E } = make()
    const from = ac.nodes.length
    E.laser(1)
    const oscs = ac.since(from, 'osc')
    const saws = oscs.filter((o) => o.type === 'sawtooth')
    expect(saws).toHaveLength(SKILL_SYNTH_CONFIG.laser.unison)
    for (const o of saws) {
      expect(o.frequency.calls).toContainEqual(['set', 1600, 1])
      expect(o.frequency.calls).toContainEqual(['exp', 120, 1 + SKILL_SYNTH_CONFIG.laser.sweep])
    }
    expect(oscs.some((o) => o.type === 'sine' && o.frequency.value === 140)).toBe(true) // the thump
    expect(ac.since(from, 'source')).toHaveLength(1) // the crackle
    expect(ac.since(from, 'shaper')).toHaveLength(1) // the drive
  })

  it('Zap (round 6) is the old blip', () => {
    const { ac } = make()
    const E = createSynth(ac as unknown as AudioContext, { ...SKILL_SYNTH_CONFIG, laser: { ...SKILL_SYNTH_CONFIG.laser, kind: 'round6' } })
    const from = ac.nodes.length
    E.laser(1)
    expect(ac.since(from, 'osc').map((o) => [o.type, o.frequency.value])).toEqual([['triangle', 2600]])
  })
})

describe('the recorded drums', () => {
  const realFetch = (global as { fetch?: unknown }).fetch
  afterEach(() => {
    ;(global as { fetch?: unknown }).fetch = realFetch
    jest.useRealTimers()
  })

  const withFetch = (ok: boolean) => {
    const fetch = jest.fn((url: string) =>
      ok ? Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)), url }) : Promise.reject(new Error('offline'))
    )
    ;(global as { fetch?: unknown }).fetch = fetch
    return fetch
  }

  it('are fetched 400 ms after the engine starts, never on the first shot’s frame', async () => {
    jest.useFakeTimers()
    const fetch = withFetch(true)
    const { ac, E } = make()
    ac.decoded = fakeBuffer(1, 16000, 8000, 0.1)
    E.D.crash(0.1)
    expect(fetch).not.toHaveBeenCalled()
    jest.advanceTimersByTime(400)
    expect(fetch.mock.calls.map(([url]) => url).sort()).toEqual([
      '/skills/sfx/boom-bassdrop.mp3',
      '/skills/sfx/crash-meinl18-1.mp3',
      '/skills/sfx/crash-meinl18-2.mp3',
      '/skills/sfx/crash-meinl18-3.mp3',
      '/skills/sfx/crash-meinl18-4.mp3',
      '/skills/sfx/ride-k.mp3',
      '/skills/sfx/riser-perc.mp3',
    ])
    await flush()
    expect(E.samplesReady()).toBe(true)
    expect(E.rideReady()).toBe(true)
  })

  it('play the recording once it’s in', async () => {
    jest.useFakeTimers()
    withFetch(true)
    const { ac, E } = make()
    ac.decoded = fakeBuffer(1, 16000, 8000, 0.1)
    jest.advanceTimersByTime(400)
    await flush()
    const from = ac.nodes.length
    E.D.crash(1, 1)
    const [src] = ac.since(from, 'source')
    expect(src.buffer).toBe(ac.decoded)
    expect(src.loop).toBe(false)
  })

  it('fall back to the synth when they can’t load', async () => {
    jest.useFakeTimers()
    withFetch(false)
    const { ac, E } = make()
    jest.advanceTimersByTime(400)
    await flush()
    let from = ac.nodes.length
    E.D.crash(1, 1) // the synth crash: looped noise through a high-pass
    const [src] = ac.since(from, 'source')
    expect(src.buffer).toBe(E.noise)
    expect(src.loop).toBe(true)
    expect(ac.since(from, 'filter').some((f) => f.type === 'highpass' && f.frequency.value === 3800)).toBe(true)
    from = ac.nodes.length
    E.D.ride(2) // the 808 ride: four square waves
    expect(freqs(ac.since(from, 'osc'))).toEqual([372, 541, 813, 1231])
    expect(E.samplesReady()).toBe(false)
  })

  it('no fetch at all (tests, old browsers): the synth plays, nothing throws', () => {
    jest.useFakeTimers()
    delete (global as { fetch?: unknown }).fetch
    const { ac, E } = make()
    expect(() => jest.advanceTimersByTime(400)).not.toThrow()
    const from = ac.nodes.length
    E.D.impact(1)
    expect(freqs(ac.since(from, 'osc'))).toEqual([72])
  })
})
