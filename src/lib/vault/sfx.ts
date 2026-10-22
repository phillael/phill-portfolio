/**
 * The Relic Vault's sound effects, ported from the mockup: a set powering on (the relay thunk, the degauss hum, a
 * static crackle, the flyback whine) and off, the hologram lifting out and going back. Synthesized, soft, and silent
 * until `arm(ac)`: the first click in the section hands over the site player's AudioContext (`contextFromClick`),
 * so browsing by scroll stays quiet. It never touches a media element (no createMediaElementSource: the player owns
 * the song's).
 */

import { getSiteMusic } from '@/lib/site-music'

export type Sfx = {
  /** start sounding through this context (made and resumed inside a click) */
  arm(ac: AudioContext): void
  armed(): boolean
  on(): void
  off(): void
  holo(): void
  holoClose(): void
  dispose(): void
}

/** the site player's AudioContext (made on its first call), or one of our own without a player; call it in a click */
export function contextFromClick(): { ac: AudioContext; own: boolean } | null {
  let ac = getSiteMusic()?.context() ?? null
  let own = false
  if (!ac && typeof AudioContext !== 'undefined') {
    ac = new AudioContext()
    own = true
  }
  if (!ac) return null
  if (ac.state === 'suspended') void ac.resume()
  return { ac, own }
}

export function createSfx(): Sfx {
  let ac: AudioContext | null = null
  let out: GainNode | null = null
  let noiseBuf: AudioBuffer | null = null

  const env = (g: GainNode, t: number, a: number, peak: number, d: number) => {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + a)
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d)
  }
  function osc(type: OscillatorType, f0: number, f1: number, t: number, dur: number, peak: number, a = 0.005) {
    const o = ac!.createOscillator()
    const g = ac!.createGain()
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur)
    env(g, t, a, peak, dur)
    o.connect(g).connect(out!)
    o.start(t)
    o.stop(t + a + dur + 0.05)
    return o
  }
  function noise(t: number, dur: number, peak: number, type: BiquadFilterType, f: number, q = 0.7, a = 0.004) {
    const s = ac!.createBufferSource()
    const fl = ac!.createBiquadFilter()
    const g = ac!.createGain()
    s.buffer = noiseBuf
    s.loop = true
    fl.type = type
    fl.frequency.value = f
    fl.Q.value = q
    env(g, t, a, peak, dur)
    s.connect(fl).connect(g).connect(out!)
    s.start(t)
    s.stop(t + a + dur + 0.05)
    return fl
  }
  /** the context's time now, or null while silent */
  const now = () => {
    if (!ac || !out) return null
    if (ac.state === 'suspended') void ac.resume()
    return ac.currentTime
  }

  return {
    arm(context) {
      if (ac) return
      ac = context
      out = ac.createGain()
      out.gain.value = 0.6
      out.connect(ac.destination)
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
      const d = noiseBuf.getChannelData(0)
      for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1
    },
    armed: () => ac !== null,
    on() {
      const t = now()
      if (t === null) return
      osc('sine', 95, 36, t, 0.3, 0.5) // the relay thunk
      const lp = ac!.createBiquadFilter()
      const g = ac!.createGain()
      const o = ac!.createOscillator()
      const lfo = ac!.createOscillator()
      const lg = ac!.createGain()
      o.type = 'sawtooth'
      o.frequency.value = 60
      lp.type = 'lowpass'
      lp.frequency.value = 320
      lfo.frequency.value = 7
      lg.gain.value = 0.04
      lfo.connect(lg).connect(g.gain)
      env(g, t + 0.04, 0.05, 0.09, 0.75)
      o.connect(lp).connect(g).connect(out!)
      o.start(t)
      o.stop(t + 1)
      lfo.start(t)
      lfo.stop(t + 1) // the degauss
      noise(t + 0.02, 0.4, 0.07, 'highpass', 2500) // static crackle
      osc('sine', 12500, 0, t + 0.1, 1.4, 0.006, 0.2) // the flyback whine
    },
    off() {
      const t = now()
      if (t === null) return
      osc('sine', 420, 70, t, 0.14, 0.12)
      noise(t, 0.1, 0.05, 'bandpass', 3200)
    },
    holo() {
      const t = now()
      if (t === null) return
      osc('sine', 330, 990, t, 0.7, 0.07, 0.05)
      osc('triangle', 332, 1000, t + 0.02, 0.7, 0.04, 0.05)
      const f = noise(t, 0.75, 0.05, 'bandpass', 600, 2.5, 0.08)
      f.frequency.exponentialRampToValueAtTime(7000, t + 0.75)
    },
    holoClose() {
      const t = now()
      if (t === null) return
      osc('sine', 990, 260, t, 0.45, 0.06, 0.02)
      noise(t, 0.35, 0.04, 'bandpass', 4000, 2)
    },
    dispose() {
      out?.disconnect()
      ac = out = noiseBuf = null
    },
  }
}
