/**
 * Sound effects, all synthesized with Web Audio (no files): the black hole's drone,
 * gulps and boom, and the entrance whoosh. Clicks are silent (Phill: no musical notes).
 */

export interface Sfx {
  init(): void
  setVolume(): void
  intro(lead: number): void
  hole(amt: number): void
  gulp(): void
  boom(): void
  dispose(): void
}

interface Drone {
  lp: BiquadFilterNode
  g: GainNode
  os: OscillatorNode[]
}

export function createSfx(settings: () => { soundOn: boolean; volume: number }): Sfx {
  let ac: AudioContext | null = null
  let out: GainNode, mix: GainNode, noiseBuf: AudioBuffer, swellBuf: AudioBuffer
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
    const verb = ac.createConvolver()
    verb.buffer = render(2.2, (d, sr) => {
      let lp = 0
      for (let i = 0; i < d.length; i++) {
        const t = i / sr
        lp += 0.4 * (Math.random() * 2 - 1 - lp)
        d[i] = lp * Math.exp(-t * 3)
      }
    }, 2)
    const wet = ac.createGain()
    wet.gain.value = 0.25
    mix.connect(wet)
    wet.connect(verb)
    verb.connect(out)
    noiseBuf = render(1, (d) => {
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    })
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

  function dispose() {
    drone = null
    if (ac) ac.close().catch(() => {})
    ac = null
  }

  return { init, setVolume, intro, hole, gulp, boom, dispose }
}
