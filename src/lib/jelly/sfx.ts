/**
 * Sound effects, all synthesized with Web Audio (no files): the black hole's drone,
 * gulps and boom, the entrance whoosh, and Play mode's jump, land, smash, coin and finish.
 * Clicks are silent (Phill: no musical notes); Play mode's sounds only come from playing.
 */

export interface Sfx {
  /** the audio graph and the whoosh (on a gesture, or as the resume opens) */
  init(): void
  /** the reverb's and the boom's buffers: the slow part, run as a step of its own */
  prepare(): void
  setVolume(): void
  intro(lead: number): void
  hole(amt: number): void
  gulp(): void
  boom(): void
  /** Play mode: a jump, a landing (fall speed, units/s), a smash, a coin collected, the finish */
  jump(): void
  land(speed: number): void
  smash(): void
  coin(): void
  finish(): void
  dispose(): void
}

interface Drone {
  lp: BiquadFilterNode
  g: GainNode
  os: OscillatorNode[]
}

export function createSfx(settings: () => { soundOn: boolean; volume: number }): Sfx {
  let ac: AudioContext | null = null
  let out: GainNode, mix: GainNode, verb: ConvolverNode, noiseBuf: AudioBuffer | null = null, swellBuf: AudioBuffer
  let drone: Drone | null = null
  const live = () => !!ac && ac.state === 'running' && settings().soundOn && settings().volume > 0
  const render = (len: number, fn: (d: Float32Array, sr: number, c: number) => void, ch = 1) => {
    const b = ac!.createBuffer(ch, Math.floor(ac!.sampleRate * len), ac!.sampleRate)
    for (let c = 0; c < ch; c++) fn(b.getChannelData(c), ac!.sampleRate, c)
    return b
  }

  function init() {
    if (ac) {
      if (ac.state !== 'running') ac.resume().catch(() => {})
      return
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ac = new AC({ latencyHint: 'interactive' })
    const comp = ac.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 4
    out = ac.createGain()
    out.gain.value = settings().soundOn ? settings().volume : 0
    out.connect(comp)
    comp.connect(ac.destination)
    mix = ac.createGain()
    mix.connect(out)
    verb = ac.createConvolver() // silent until prepare() gives it its tail
    const wet = ac.createGain()
    wet.gain.value = 0.25
    mix.connect(wet)
    wet.connect(verb)
    verb.connect(out)
    // a rising whoosh: band-limited noise that swells and cuts off
    swellBuf = render(2, (d) => {
      let lp = 0, hp = 0, pv = 0
      for (let i = 0; i < d.length; i++) {
        const t = i / d.length, n = Math.random() * 2 - 1
        lp += (0.05 + 0.5 * t * t) * (n - lp)
        hp = 0.95 * (hp + lp - pv)
        pv = lp
        d[i] = hp * t ** 2.2 * 1.6
      }
    })
  }

  function prepare() {
    if (!ac || noiseBuf) return
    verb.buffer = render(2.2, (d, sr) => {
      let lp = 0
      for (let i = 0; i < d.length; i++) {
        const t = i / sr
        lp += 0.4 * (Math.random() * 2 - 1 - lp)
        d[i] = lp * Math.exp(-t * 3)
      }
    }, 2)
    noiseBuf = render(1, (d) => {
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    })
  }

  function setVolume() {
    if (ac) out.gain.setTargetAtTime(settings().soundOn ? settings().volume : 0, ac.currentTime, 0.05)
  }

  /** The whoosh, timed to peak as the entrance lands `lead` seconds from now. */
  function intro(lead: number) {
    if (!live()) return
    const s = ac!.createBufferSource(), g = ac!.createGain()
    s.buffer = swellBuf
    g.gain.value = 0.35
    s.connect(g)
    g.connect(mix)
    s.start(ac!.currentTime + Math.max(0, lead - 2))
  }

  /** Black hole: a growling drone that drops in pitch as it grows. */
  function hole(amt: number) {
    if (!ac) return
    const now = ac.currentTime
    if (!drone && amt > 0.01 && live()) {
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.Q.value = 6
      lp.frequency.value = 120
      const g = ac.createGain()
      g.gain.value = 0
      lp.connect(g)
      g.connect(mix)
      const os = [-8, 8].map((d) => {
        const o = ac!.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = 55
        o.detune.value = d
        o.connect(lp)
        o.start()
        return o
      })
      const sub = ac.createOscillator()
      sub.frequency.value = 27.5
      sub.connect(g)
      sub.start()
      os.push(sub)
      drone = { lp, g, os }
    }
    if (!drone) return
    drone.g.gain.setTargetAtTime(live() ? amt * 0.32 : 0, now, 0.08)
    drone.lp.frequency.setTargetAtTime(110 + amt * amt * 2400, now, 0.08)
    drone.os.forEach((o, i) => o.frequency.setTargetAtTime((i === 2 ? 27.5 : 55) * 2 ** ((-amt * 7) / 12), now, 0.1))
    if (amt <= 0.01) {
      const d = drone
      drone = null
      d.g.gain.setTargetAtTime(0, now, 0.05)
      d.os.forEach((o) => o.stop(now + 0.4))
    }
  }

  function gulp() {
    if (!live()) return
    const t = ac!.currentTime, o = ac!.createOscillator(), g = ac!.createGain()
    o.frequency.setValueAtTime(700 + Math.random() * 500, t)
    o.frequency.exponentialRampToValueAtTime(70, t + 0.16)
    g.gain.setValueAtTime(0.16, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
    o.connect(g)
    g.connect(mix)
    o.start(t)
    o.stop(t + 0.2)
  }

  function boom() {
    if (!live()) return
    prepare()
    const t = ac!.currentTime, o = ac!.createOscillator(), g = ac!.createGain()
    o.frequency.setValueAtTime(90, t)
    o.frequency.exponentialRampToValueAtTime(32, t + 0.5)
    g.gain.setValueAtTime(0.7, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9)
    o.connect(g)
    g.connect(mix)
    o.start(t)
    o.stop(t + 1)
    const s = ac!.createBufferSource(), bp = ac!.createBiquadFilter(), ng = ac!.createGain()
    s.buffer = noiseBuf
    bp.type = 'lowpass'
    bp.frequency.value = 600
    ng.gain.setValueAtTime(0.5, t)
    ng.gain.setTargetAtTime(0, t, 0.18)
    s.connect(bp)
    bp.connect(ng)
    ng.connect(mix)
    s.start(t)
    s.stop(t + 1)
  }

  /** a tone: an oscillator from f0 to f1 over len s, gain g, starting at t */
  function tone(type: OscillatorType, f0: number, f1: number, len: number, g: number, t = ac!.currentTime) {
    const o = ac!.createOscillator(), a = ac!.createGain()
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + len)
    a.gain.setValueAtTime(0.0001, t)
    a.gain.exponentialRampToValueAtTime(g, t + 0.008)
    a.gain.exponentialRampToValueAtTime(0.0001, t + len)
    o.connect(a)
    a.connect(mix)
    o.start(t)
    o.stop(t + len + 0.05)
  }

  /** a short noise burst through a filter */
  function crunch(type: BiquadFilterType, f: number, len: number, g: number, t = ac!.currentTime) {
    prepare()
    const s = ac!.createBufferSource(), bp = ac!.createBiquadFilter(), a = ac!.createGain()
    s.buffer = noiseBuf
    bp.type = type
    bp.frequency.setValueAtTime(f, t)
    bp.frequency.exponentialRampToValueAtTime(f * 0.3, t + len)
    a.gain.setValueAtTime(g, t)
    a.gain.exponentialRampToValueAtTime(0.0001, t + len)
    s.connect(bp)
    bp.connect(a)
    a.connect(mix)
    s.start(t, Math.random() * 0.5)
    s.stop(t + len + 0.05)
  }

  /** a short rising blip */
  function jump() {
    if (live()) tone('square', 310, 760, 0.1, 0.06)
  }

  /** a soft thud, louder the faster he fell (a gentle step makes none) */
  function land(speed: number) {
    const k = Math.min(1, (speed - 1.5) / 7)
    if (!live() || k <= 0) return
    tone('sine', 150, 55, 0.14, 0.28 * k)
    crunch('lowpass', 700, 0.06, 0.12 * k)
  }

  /** a crunchy pop: a filtered noise crack over a falling punch */
  function smash() {
    if (!live()) return
    crunch('bandpass', 2200, 0.13, 0.5)
    tone('square', 240, 70, 0.12, 0.12)
  }

  /** a bright two-note chime */
  function coin() {
    if (!live()) return
    const t = ac!.currentTime
    tone('triangle', 988, 988, 0.22, 0.13, t)
    tone('triangle', 1319, 1319, 0.34, 0.13, t + 0.075)
  }

  /** a short flourish up a major chord */
  function finish() {
    if (!live()) return
    const t = ac!.currentTime
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone('triangle', f, f, i === 3 ? 0.7 : 0.18, 0.12, t + i * 0.085))
    tone('sine', 1046.5, 1046.5, 0.9, 0.06, t + 0.255)
  }

  function dispose() {
    drone = null
    if (ac) ac.close().catch(() => {})
    ac = null
    noiseBuf = null
  }

  return { init, prepare, setVolume, intro, hole, gulp, boom, jump, land, smash, coin, finish, dispose }
}
