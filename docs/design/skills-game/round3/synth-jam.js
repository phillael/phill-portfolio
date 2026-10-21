/*
 * Round 3 · Skill synth: loop it, trade fours, jam. Round 2's D (every skill a key, every group
 * an instrument; same voices) moved into Number Slayers' world: D minor, 4/4, 130 BPM.
 *
 *   1 · The loop pedal: after a few notes the readout grows a footswitch. Tap it: a count-in,
 *       2 bars recorded (notes snap to 16ths), then they loop back, lighting their words; keep
 *       playing to add layers (undo takes the last one off, ✕ clears).
 *   2 · Trading fours: stop for a moment after a few notes and the bells answer with a phrase on
 *       the AI skills. Play it back; each round is longer; get the whole hook and the band comes in
 *       (Number Slayers starts in the site's player). The hook here is a placeholder phrase.
 *   3 · Jam with the band: while Number Slayers plays in the site player, the synth locks to its
 *       beat grid (the loop restarts on the song's next bar and stays on it).
 *
 * Audio rules (as on the site): nothing sounds before the first click; one AudioContext, the
 * site player's (here the stand-in's, which routes its single <audio> through it once, the way
 * useAudioPlayer does), so the synth and the song share one clock and one output. Timing is on
 * the AudioContext clock: a 25 ms look-ahead scheduler runs only while something keeps time.
 */
(() => {
  const { mount, say, reducedMotion, onReducedMotion } = SECTION2
  const S = mount({ title: 'Round 3 · Skill synth: loop, trade fours, jam' })
  const root = S.root
  const back = document.querySelector('.mock-bar a')
  back.href = '../round2/index.html'
  back.textContent = '← Round 2'

  /* ---------- the song the synth lives in ---------- */
  // firstBeat: the first downbeat, measured from the MP3 (onset comb at exactly 130.00 BPM)
  const SONG = { id: 'number-slayers', title: 'Number Slayers', audioUrl: '/audio/number-slayers.mp3', key: 'D minor', bpm: 130, firstBeat: 0.005 }
  const BEAT = 60 / SONG.bpm, BAR = 4 * BEAT, SIX = BEAT / 4
  const LOOP_BARS = 2, LOOP = LOOP_BARS * BAR, STEPS = LOOP_BARS * 16

  /* ---------- the scales: one per group, all in D minor's world ---------- */
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const midi = (n) => {
    const [, l, acc, o] = /^([A-G])(♭|♯)?(-?\d)$/.exec(n)
    return 12 * (+o + 1) + PC[l] + (acc === '♭' ? -1 : acc === '♯' ? 1 : 0)
  }
  const hz = (m) => 440 * 2 ** ((m - 69) / 12)
  const PENTA = { steps: [0, 3, 5, 7, 10], spell: ['D', 'F', 'G', 'A', 'C'] }
  const CHORDS = [
    ['Dm9', 'D3 F3 A3 C4 E4'], ['Gm9', 'G3 B♭3 D4 F4 A4'], ['B♭maj7', 'B♭3 D4 F4 A4'], ['A7alt', 'A3 C♯4 F4 G4 B♭4'],
    ['Fmaj9', 'F3 A3 C4 E4 G4'], ['C9', 'C3 E3 B♭3 D4 G4'], ['Em7♭5', 'E3 G3 B♭3 D4'], ['Dm(maj7)', 'D3 F3 A3 C♯4'],
    ['B♭6/9', 'B♭2 F3 G3 C4 D4'], ['Gm6', 'G3 B♭3 D4 E4'], ['A7sus4', 'A3 D4 E4 G4'], ['Dm11', 'D3 G3 C4 F4 A4'],
  ]
  // root + from = the first word's note; glow/ring/cycles = the string (round 2's values)
  const GROUPS = {
    ai: { inst: 'bell', label: 'Bell', scale: 'D minor pentatonic', ...PENTA, root: 'D3', from: 3, glow: '290 100% 80%', ring: 1500, cycles: 13 },
    frontend: { inst: 'keys', label: 'Keys', scale: 'D Dorian', steps: [0, 2, 3, 5, 7, 9, 10], spell: ['D', 'E', 'F', 'G', 'A', 'B', 'C'], root: 'D3', from: 0, glow: '190 100% 74%', ring: 1100, cycles: 11 },
    backend: { inst: 'bass', label: 'Bass', scale: 'D minor pentatonic', ...PENTA, root: 'D1', from: 3, glow: '150 90% 62%', ring: 950, cycles: 7 },
    cloud: { inst: 'pad', label: 'Pad', scale: 'chords in D minor', chords: CHORDS, glow: '260 100% 82%', ring: 1800, cycles: 9 },
    quality: { inst: 'pluck', label: 'Pluck', scale: 'D harmonic minor', steps: [0, 2, 3, 5, 7, 8, 11], spell: ['D', 'E', 'F', 'G', 'A', 'B♭', 'C♯'], root: 'D4', from: 0, glow: '186 100% 72%', ring: 600, cycles: 8 },
    product: { inst: 'mallet', label: 'Mallet', scale: 'A altered', steps: [0, 1, 3, 4, 6, 8, 10], spell: ['A', 'B♭', 'C', 'D♭', 'E♭', 'F', 'G'], root: 'A4', from: 0, glow: '45 100% 70%', ring: 700, cycles: 9 },
    music: { inst: 'guitar', label: 'Guitar', scale: 'D minor blues', steps: [0, 3, 5, 6, 7, 10], spell: ['D', 'F', 'G', 'A♭', 'A', 'C'], root: 'D3', from: 0, glow: '300 100% 82%', ring: 1500, cycles: 14 },
  }

  /* each word: its note (or chord), and a string to vibrate (aria-hidden, no text) */
  const H = '<svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="M0 5 Q50 -4 100 5" fill="none" stroke="currentColor" stroke-width="1.75" vector-effect="non-scaling-stroke"/></svg>'
  const V = '<svg viewBox="0 0 14 100" preserveAspectRatio="none" aria-hidden="true"><path d="M7 0 Q-5 50 7 100" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>'
  const per = {}
  const keys = S.words.map((w, idx) => {
    const i = (per[w.group] = (per[w.group] ?? -1) + 1)
    const g = GROUPS[w.group]
    let notes, name
    if (g.chords) {
      const [n, voicing] = g.chords[i % g.chords.length]
      notes = voicing.split(' ').map(midi)
      name = n
    } else {
      const d = g.from + i, L = g.steps.length
      const m = midi(g.root) + 12 * Math.floor(d / L) + g.steps[d % L]
      notes = [m]
      name = g.spell[d % L] + (Math.floor(m / 12) - 1)
    }
    const str = document.createElement('span')
    str.className = 'syn-str'
    str.setAttribute('aria-hidden', 'true')
    str.innerHTML = w.ai ? V : H
    str.style.setProperty('--g', g.glow)
    w.el.appendChild(str)
    w.el.style.setProperty('--g', g.glow)
    return { ...w, idx, i, g, notes, name, str, label: w.ai ? w.el.querySelector('.sk-name') : w.el }
  })
  const ai = keys.filter((k) => k.ai)

  /* ---------- the audio graph: the site player's context, used from the first click ---------- */
  let ac = null, bus = null, master = null, dry = null
  let muted = false
  let active = 0, made = 0
  const ksCache = new Map()

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return }
    ac = SITE_MUSIC.context()
    master = ac.createGain()
    master.gain.value = 0.6
    const comp = ac.createDynamicsCompressor()
    comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.25
    master.connect(comp).connect(ac.destination)
    bus = ac.createGain()
    dry = ac.createGain() // the count-in and the metronome skip the room
    const verb = ac.createConvolver()
    verb.buffer = impulse(2.6, 3)
    const wet = ac.createGain()
    wet.gain.value = 0.26
    bus.connect(master)
    dry.connect(master)
    bus.connect(verb).connect(wet).connect(master)
  }

  /* a generated room: stereo noise with an exponential tail, darker as it decays */
  function impulse(seconds, decay) {
    const sr = ac.sampleRate, len = Math.floor(sr * seconds)
    const buf = ac.createBuffer(2, len, sr)
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c)
      let lp = 0
      for (let i = 0; i < len; i++) {
        const t = i / len
        lp += (0.35 - 0.3 * t) * ((Math.random() * 2 - 1) - lp)
        d[i] = lp * (1 - t) ** decay
      }
    }
    return buf
  }

  /* one note's nodes: everything is disconnected when its last source ends (no leak per note) */
  function voice(to = bus) {
    const out = ac.createGain()
    out.connect(to)
    const nodes = [out]
    let left = 0
    active++; made++
    return {
      out,
      node(n) { nodes.push(n); return n },
      src(n) {
        nodes.push(n); left++
        n.onended = () => { if (--left === 0) { nodes.forEach((x) => x.disconnect()); active-- } }
        return n
      },
    }
  }
  const osc = (v, type, f) => { const o = v.src(ac.createOscillator()); o.type = type; o.frequency.value = f; return o }
  const gain = (v, g = 0) => { const n = v.node(ac.createGain()); n.gain.value = g; return n }
  function env(p, t, a, peak, d) {
    p.setValueAtTime(0.0001, t)
    p.linearRampToValueAtTime(peak, t + a)
    p.exponentialRampToValueAtTime(0.0001, t + d)
  }
  const play = (srcs, t, end) => srcs.forEach((s) => { s.start(t); s.stop(end) })

  /* the voices are round 2's, unchanged */
  const INSTRUMENTS = {
    bell(f, t, vel) {
      const v = voice()
      const car = osc(v, 'sine', f), mod = osc(v, 'sine', f * 3.5)
      const idx = gain(v); idx.gain.setValueAtTime(f * 2.2, t); idx.gain.exponentialRampToValueAtTime(f * 0.04, t + 1.4)
      mod.connect(idx).connect(car.frequency)
      const amp = gain(v); env(amp.gain, t, 0.004, 0.2 * vel, 2.3)
      car.connect(amp).connect(v.out)
      play([car, mod], t, t + 2.35)
    },
    keys(f, t, vel) {
      const v = voice()
      const car = osc(v, 'sine', f), mod = osc(v, 'sine', f), tine = osc(v, 'sine', f * 7)
      const idx = gain(v); idx.gain.setValueAtTime(f * 1.4, t); idx.gain.exponentialRampToValueAtTime(f * 0.08, t + 0.7)
      mod.connect(idx).connect(car.frequency)
      const amp = gain(v); env(amp.gain, t, 0.003, 0.2 * vel, 1.5)
      const ta = gain(v); env(ta.gain, t, 0.001, 0.025 * vel, 0.09)
      car.connect(amp).connect(v.out)
      tine.connect(ta).connect(v.out)
      play([car, mod, tine], t, t + 1.55)
    },
    bass(f, t, vel) {
      const v = voice()
      const saw = osc(v, 'sawtooth', f), sub = osc(v, 'sine', f)
      const lp = v.node(ac.createBiquadFilter()); lp.type = 'lowpass'; lp.Q.value = 4
      lp.frequency.setValueAtTime(Math.min(900 + f * 3, 4000), t); lp.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.35)
      const sg = gain(v, 0.5)
      const amp = gain(v); env(amp.gain, t, 0.006, 0.3 * vel, 0.85)
      saw.connect(lp).connect(amp)
      sub.connect(sg).connect(amp)
      amp.connect(v.out)
      play([saw, sub], t, t + 0.9)
    },
    pad(f, t, vel) {
      const v = voice()
      const a = osc(v, 'sawtooth', f * 2 ** (7 / 1200)), b = osc(v, 'sawtooth', f * 2 ** (-7 / 1200)), c = osc(v, 'triangle', f * 2)
      const lp = v.node(ac.createBiquadFilter()); lp.type = 'lowpass'; lp.frequency.value = 1500; lp.Q.value = 0.6
      const cg = gain(v, 0.35)
      const amp = gain(v)
      amp.gain.setValueAtTime(0.0001, t)
      amp.gain.linearRampToValueAtTime(0.075 * vel, t + 0.18)
      amp.gain.setTargetAtTime(0.0001, t + 0.5, 0.45)
      a.connect(lp); b.connect(lp); c.connect(cg).connect(lp)
      lp.connect(amp).connect(v.out)
      play([a, b, c], t, t + 2.6)
    },
    pluck(f, t, vel) {
      const v = voice()
      const sq = osc(v, 'square', f)
      const lp = v.node(ac.createBiquadFilter()); lp.type = 'lowpass'; lp.Q.value = 6
      lp.frequency.setValueAtTime(5200, t); lp.frequency.exponentialRampToValueAtTime(380, t + 0.2)
      const amp = gain(v); env(amp.gain, t, 0.002, 0.09 * vel, 0.5)
      sq.connect(lp).connect(amp).connect(v.out)
      play([sq], t, t + 0.55)
    },
    mallet(f, t, vel) {
      const v = voice()
      const s1 = osc(v, 'sine', f), s2 = osc(v, 'sine', f * 4), s3 = osc(v, 'sine', f * 9.9)
      const g1 = gain(v), g2 = gain(v), g3 = gain(v)
      env(g1.gain, t, 0.002, 0.28 * vel, 0.95)
      env(g2.gain, t, 0.001, 0.07 * vel, 0.14)
      env(g3.gain, t, 0.001, 0.025 * vel, 0.05)
      s1.connect(g1).connect(v.out); s2.connect(g2).connect(v.out); s3.connect(g3).connect(v.out)
      play([s1, s2, s3], t, t + 1)
    },
    guitar(f, t, vel) {
      const v = voice()
      const s = v.src(ac.createBufferSource())
      s.buffer = ksBuffer(f)
      const lp = v.node(ac.createBiquadFilter()); lp.type = 'lowpass'; lp.frequency.value = 3600
      const amp = gain(v, 0.42 * vel)
      s.connect(lp).connect(amp).connect(v.out)
      s.start(t)
    },
  }
  function ksBuffer(f, seconds = 2.4) {
    const key = Math.round(f * 10)
    if (ksCache.has(key)) return ksCache.get(key)
    const sr = ac.sampleRate, len = Math.floor(sr * seconds)
    const buf = ac.createBuffer(1, len, sr), d = buf.getChannelData(0)
    const N = Math.max(2, Math.round(sr / f - 0.5))
    const ring = new Float32Array(N)
    let lp = 0
    for (let i = 0; i < N; i++) { lp += 0.55 * ((Math.random() * 2 - 1) - lp); ring[i] = lp }
    let at = 0
    for (let i = 0; i < len; i++) {
      const a = ring[at], b = ring[(at + 1) % N]
      d[i] = a
      ring[at] = 0.9965 * 0.5 * (a + b)
      at = (at + 1) % N
    }
    const fade = Math.floor(sr * 0.12)
    for (let i = 0; i < fade; i++) d[len - 1 - i] *= i / fade
    ksCache.set(key, buf)
    return buf
  }
  /* the count-in and the metronome: a short dry blip, higher on the one */
  function click(t, one) {
    const v = voice(dry)
    const o = osc(v, 'sine', one ? 1760 : 1320)
    const g = gain(v); env(g.gain, t, 0.001, one ? 0.16 : 0.09, 0.05)
    o.connect(g).connect(v.out)
    play([o], t, t + 0.06)
  }

  function sound(k, t, vel = 1) {
    if (muted) return
    if (k.notes.length > 1) k.notes.forEach((n) => INSTRUMENTS[k.g.inst](hz(n), t, vel * 0.42))
    else INSTRUMENTS[k.g.inst](hz(k.notes[0]), t, vel)
  }

  /* the hum while a mouse rests on a word (only once sound is on; very quiet) */
  let hum = null
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
  function humStart(k) {
    humStop()
    if (!ac || muted || !finePointer.matches) return
    const t = ac.currentTime
    const v = voice()
    const n = k.notes[0]
    const o = osc(v, 'sine', hz(n) / (n > 60 ? 2 : 1))
    const g = gain(v)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.setTargetAtTime(0.014, t, 0.12)
    o.connect(g).connect(v.out)
    o.start(t)
    hum = { o, g }
  }
  function humStop() {
    if (!hum || !ac) return
    const t = ac.currentTime
    hum.g.gain.cancelScheduledValues(t)
    hum.g.gain.setTargetAtTime(0.0001, t, 0.08)
    hum.o.stop(t + 0.5)
    hum = null
  }

  /* ---------- the look: a vibrating string and a glow (round 2's) ---------- */
  let rm = reducedMotion()
  onReducedMotion((on) => { rm = on })
  function stringFrames(cycles, amp, axis) {
    const f = []
    const n = cycles * 2
    for (let i = 0; i <= n; i++) {
      const p = i / n
      const a = (i % 2 ? -1 : 1) * amp * (1 - p) ** 1.5
      f.push({ offset: p, transform: `scale${axis}(${a.toFixed(3)})`, opacity: p < 0.7 ? 1 : (1 - p) / 0.3, easing: 'ease-in-out' })
    }
    return f
  }
  function strike(k, { amp = 1, ring } = {}) {
    const dur = ring ?? k.g.ring
    k.label.getAnimations().forEach((a) => a.id === 'glow' && a.cancel())
    const hot = `0 0 6px hsl(${k.g.glow}), 0 0 16px hsl(${k.g.glow}), 0 0 32px hsl(${k.g.glow} / .55)`
    const g = k.label.animate([{ offset: 0, color: '#fff', textShadow: hot }, { offset: 0.3, color: '#fff', textShadow: hot, easing: 'ease-out' }], { duration: dur })
    g.id = 'glow'
    if (rm) return
    k.str.getAnimations().forEach((a) => a.cancel())
    k.str.animate(stringFrames(k.g.cycles, amp, k.ai ? 'X' : 'Y'), { duration: dur, fill: 'none' })
    const nudge = k.ai ? 'translateX(2px)' : 'translateY(1.5px)'
    k.label.animate([{ transform: 'none' }, { transform: nudge, offset: 0.25 }, { transform: 'none' }], { duration: 220, easing: 'ease-out' })
  }
  /* visuals for notes scheduled ahead: a timeout to the note's moment (cancelled on clear) */
  const pending = new Set()
  function at(t, fn) {
    const id = setTimeout(() => { pending.delete(id); fn() }, Math.max(0, (t - ac.currentTime) * 1000))
    pending.add(id)
    return id
  }

  /* ---------- the clock: the song's grid while it plays, else the loop's own ---------- */
  let songZero = null // AudioContext time of the song's 0:00 while it plays
  let freeZero = null // a downbeat on the free grid
  const zero = () => (songZero != null ? songZero + SONG.firstBeat : freeZero)
  const nextBar = (t) => { const z = zero(); return z + Math.ceil((t - z) / BAR - 1e-6) * BAR }
  const nextBeat = (t) => { const z = zero(); return z + Math.ceil((t - z) / BEAT - 1e-6) * BEAT }

  let metro = false // mockup only: a click on every beat, to check the grid against the song
  let away = false // the section is off screen: the loop rests
  let timer = 0, cursor = 0
  const keepsTime = () => ['count', 'rec', 'play'].includes(loop.state) || songZero != null || (metro && zero() != null)
  function wake() {
    if (timer || !ac || !keepsTime()) return
    cursor = ac.currentTime
    timer = setInterval(tick, 25)
  }
  function rest() { if (timer && !keepsTime()) { clearInterval(timer); timer = 0; showBeat(-1) } }
  function tick() {
    const now = ac.currentTime, until = now + 0.12
    if (cursor < now) cursor = now // after a stall, skip the backlog rather than play it late
    if (!away && loop.state === 'play' && loop.events.length) {
      for (let p = Math.max(0, Math.floor((cursor - loop.start) / LOOP)); loop.start + p * LOOP < until; p++) {
        const ps = loop.start + p * LOOP
        for (const e of loop.events) {
          const t = ps + e.pos * SIX
          if (t >= cursor && t < until && Math.abs(t - e.skipAt) > 1e-4) fire(e, t)
        }
      }
    }
    if (zero() != null) for (let b = nextBeat(cursor); b < until; b += BEAT) onBeat(b)
    cursor = until
    rest()
  }
  function fire(e, t) {
    const k = keys[e.k]
    sound(k, t, 0.85)
    at(t, () => strike(k, { amp: 0.7 }))
  }
  function onBeat(b) {
    const looping = ['count', 'rec', 'play'].includes(loop.state)
    const n = Math.round(((b - (looping ? loop.start : zero())) / BEAT)) // beats from the loop's (or the grid's) one
    const dot = ((n % 8) + 8) % 8
    if (metro && !muted) click(b, dot % 4 === 0)
    at(b, () => showBeat(loop.state === 'count' ? -1 : dot))
  }

  /* ---------- 1 · the loop pedal ---------- */
  const loop = { state: 'idle', start: 0, events: [] } // idle · count · rec · play · stopped
  function pedal() {
    init()
    const now = ac.currentTime
    if (loop.state === 'idle') {
      if (zero() == null) freeZero = now + 0.08
      loop.start = nextBar(now + BEAT * 3.5) // room for a four-beat count-in
      loop.events = []
      setLoop('count')
      for (let i = 4; i >= 1; i--) {
        const t = loop.start - i * BEAT
        if (t < now - 0.01) continue
        if (songZero == null && !muted && !metro) click(t, i === 4)
        at(t, () => status(`Count-in · ${5 - i}`))
      }
      at(loop.start, () => { if (loop.state === 'count') setLoop('rec') })
      at(loop.start + LOOP - 0.25, () => { if (loop.state === 'rec' && loop.events.length) setLoop('play') })
      at(loop.start + LOOP, () => {
        if (loop.state !== 'rec') return
        if (loop.events.length) setLoop('play')
        else { setLoop('idle'); status('Nothing recorded · tap ● to try again'); say('Nothing recorded.') }
      })
      if (songZero == null) for (let i = 0; i < 8; i++) { const t = loop.start + i * BEAT; if (!muted && !metro) click(t, i % 4 === 0) } // a click under the take
      wake()
    } else if (loop.state === 'count' || loop.state === 'rec') {
      clearPending()
      loop.events = []
      setLoop('idle')
      status('Loop cancelled')
    } else if (loop.state === 'play') {
      clearPending()
      setLoop('stopped')
    } else if (loop.state === 'stopped') {
      loop.start = nextBar(now + 0.05)
      loop.events.forEach((e) => { e.skipAt = -1 })
      setLoop('play')
      wake()
    }
  }
  /* a live note goes into the loop at the nearest 16th; it won't replay on the pass it was played in */
  function record(k, t) {
    if (loop.state !== 'rec' && loop.state !== 'play') return
    if (tf.state !== 'idle') return // playing the phrase back isn't a take
    let s = Math.round((t - loop.start) / SIX)
    if (s < 0) { if (loop.state === 'rec' && s >= -1) s = 0; else return }
    const pass = Math.floor(s / STEPS)
    loop.events.push({ k: k.idx, pos: s % STEPS, layer: loop.state === 'rec' ? 0 : pass, skipAt: loop.start + s * SIX })
    syncLoopButtons()
  }
  function undo() {
    if (!loop.events.length) return
    const top = Math.max(...loop.events.map((e) => e.layer))
    loop.events = loop.events.filter((e) => e.layer !== top)
    if (!loop.events.length) { clearLoop(); return }
    status('Took the last layer off')
    say('Undid the last layer.')
    syncLoopButtons()
  }
  function clearLoop() {
    clearPending()
    loop.events = []
    setLoop('idle')
    status('Cleared · tap ● to record again')
    say('Loop cleared.')
  }
  function clearPending() { pending.forEach(clearTimeout); pending.clear() }

  /* ---------- 2 · trading fours ---------- */
  // A placeholder phrase in D minor pentatonic, as [note, beat]. Phill's real Number Slayers hook
  // drops in here; every note must be one of the AI panel's (A3 to A6, D minor pentatonic).
  const HOOK = [['D5', 0], ['C5', 0.5], ['A4', 1], ['G4', 2], ['A4', 2.5], ['C5', 3], ['A4', 3.5], ['D5', 4]]
  const ROUNDS = [3, 5, 8] // how much of the hook each round plays
  const hook = HOOK.map(([n, beat]) => {
    const k = ai.find((x) => x.notes[0] === midi(n))
    if (!k) throw new Error(`the hook's ${n} isn't on the AI panel`)
    return { k, beat }
  })
  const tf = { state: 'idle', round: 0, got: 0, misses: 0, done: false, wait: 0, quiet: 0, notesAtStart: 0 }
  const phrase = () => hook.slice(0, ROUNDS[tf.round])
  function maybeTrade() {
    clearTimeout(tf.wait)
    if (tf.state !== 'idle' || tf.done || notes < tf.notesAtStart + 8 || ['count', 'rec'].includes(loop.state)) return
    tf.wait = setTimeout(() => { if (tf.state === 'idle' && !['count', 'rec'].includes(loop.state)) call() }, 1500)
  }
  function call() {
    init()
    tf.state = 'call'
    tf.got = 0
    clearHint()
    const p = phrase()
    tfStatus(`<span class="tf">Trading fours</span> · listen`)
    if (tf.round === 0) say('Trading fours. The bells play a phrase on the AI skills; play it back.')
    const now = ac.currentTime
    const t0 = zero() != null ? nextBeat(now + 0.35) : now + 0.35
    p.forEach(({ k, beat }) => {
      const t = t0 + beat * BEAT
      sound(k, t, 0.95)
      at(t, () => strike(k, { amp: 0.8 }))
    })
    const end = t0 + (p[p.length - 1].beat + 1) * BEAT
    at(end, () => {
      if (tf.state !== 'call') return
      tf.state = 'turn'
      progress()
      if (tf.misses >= 2) hintNext() // after two misses, the next word is marked
      say(`Your turn: ${p.map((x) => x.k.el.dataset.skill).join(', ')}.`)
      armQuiet()
    })
  }
  function progress() {
    const n = phrase().length
    tfStatus(`<span class="tf">Your turn</span> · ${'●'.repeat(tf.got)}${'○'.repeat(n - tf.got)} · play it back on the AI panel`)
  }
  function armQuiet() {
    clearTimeout(tf.quiet)
    tf.quiet = setTimeout(() => {
      if (tf.state !== 'turn') return
      tf.state = 'idle'
      tf.round = 0
      tf.notesAtStart = notes // try again after a few more notes
      clearHint()
      tfStatus('The bells will wait')
      setTimeout(() => { if (tf.state === 'idle') tfStatus('') }, 2500)
    }, 12000)
  }
  function answer(k) {
    if (tf.state !== 'turn' || !k.ai) return
    armQuiet()
    const p = phrase()
    if (k === p[tf.got].k) {
      tf.got++
      clearHint()
      if (tf.got < p.length) { progress(); if (tf.misses >= 2) hintNext(); return }
      tf.misses = 0
      if (tf.round < ROUNDS.length - 1) {
        tf.round++
        tf.state = 'between'
        tfStatus(`<span class="tf">Nice</span> · again, a little longer`)
        say('Nice. Again, a little longer.')
        setTimeout(call, 1100)
      } else finale()
      return
    }
    tf.misses++
    tf.state = 'between'
    tfStatus(`<span class="tf">Not quite</span> · listen again`)
    setTimeout(call, 1100)
  }
  function hintNext() { const p = phrase(); if (p[tf.got]) p[tf.got].k.el.classList.add('tf-next') }
  function clearHint() { ai.forEach((k) => k.el.classList.remove('tf-next')) }
  function finale() {
    tf.state = 'idle'
    tf.done = true
    tfStatus(`<span class="tf">You’ve got it</span> · here comes the band`)
    say('You’ve got it. Here comes the band: Number Slayers, in the music player.')
    setTimeout(() => tfStatus(''), 5000)
    // the band comes in a beat after your last note
    setTimeout(() => { if (!SITE_MUSIC.isPlaying()) SITE_MUSIC.play(SONG.id) }, BEAT * 1000)
  }

  /* ---------- 3 · jam with the band: lock to the song while it plays ---------- */
  let resyncTimer = 0
  function lock() {
    init()
    songZero = ac.currentTime - SITE_MUSIC.audio.currentTime
    if (loop.state === 'play') { loop.start = nextBar(ac.currentTime + 0.05); loop.events.forEach((e) => { e.skipAt = -1 }) }
    clearInterval(resyncTimer)
    resyncTimer = setInterval(() => {
      const z = ac.currentTime - SITE_MUSIC.audio.currentTime
      const d = z - songZero
      if (Math.abs(d) > 0.015) { songZero = z; if (loop.state === 'play' || loop.state === 'rec') loop.start += d }
    }, 1000)
    lockEl.hidden = false
    if (!hud.classList.contains('on')) { nowB.textContent = 'Synth'; nowEm.textContent = 'click any skill to play along' }
    hud.classList.add('on')
    say('Locked to Number Slayers: D minor, 130 BPM. Everything you play fits the song.')
    renderR2()
    wake()
  }
  function unlock() {
    if (songZero == null) return
    freeZero = songZero + SONG.firstBeat // the free clock carries on in phase
    songZero = null
    clearInterval(resyncTimer)
    lockEl.hidden = true
    renderR2()
  }

  /* ---------- the readout ---------- */
  const hud = document.createElement('div')
  hud.className = 'syn-hud'
  hud.setAttribute('role', 'group')
  hud.setAttribute('aria-label', 'Skill synth')
  hud.innerHTML = `
    <div class="r1">
      <button type="button" class="hbtn-ico syn-mute" aria-pressed="false" aria-label="Mute the skill sounds">
        <svg class="on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>
        <svg class="off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>
      </button>
      <span class="now" aria-hidden="true"><b></b><i></i><em></em></span>
      <span class="sep" aria-hidden="true"></span>
      <span class="loop" hidden>
        <button type="button" class="hbtn-ico ped" data-s="idle" aria-label="Record a 2-bar loop"><span class="dot" aria-hidden="true"></span></button>
        <span class="beats" aria-hidden="true">${'<i></i>'.repeat(8)}</span>
        <button type="button" class="hbtn-ico small undo" aria-label="Undo the last layer" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg></button>
        <button type="button" class="hbtn-ico small clear" aria-label="Clear the loop" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      </span>
    </div>
    <div class="r2"></div>`
  root.appendChild(hud)
  const $ = (s) => hud.querySelector(s)
  const muteBtn = $('.syn-mute'), loopEl = $('.loop'), pedBtn = $('.ped'), beatsEl = $('.beats'), undoBtn = $('.undo'), clearBtn = $('.clear'), r2 = $('.r2')
  const nowB = $('.now b'), nowI = $('.now i'), nowEm = $('.now em')
  const dots = [...beatsEl.children]
  const statusEl = document.createElement('span')
  statusEl.className = 'status'
  const lockEl = document.createElement('span')
  lockEl.className = 'lock'
  lockEl.textContent = `Locked to ${SONG.title} · ${SONG.key} · ${SONG.bpm}`
  lockEl.hidden = true
  let statusText = '', tfText = ''
  function status(html) { statusText = html; renderR2() } // the loop's (and the pedal's hint)
  function tfStatus(html) { tfText = html; renderR2() } // trading fours, shown over the loop's
  function renderR2() {
    const text = tfText || statusText
    statusEl.innerHTML = text
    r2.replaceChildren(...[text && statusEl, !lockEl.hidden && lockEl].filter(Boolean))
  }
  function readout(k) {
    hud.classList.add('on')
    hud.style.setProperty('--g', k.g.glow)
    nowB.textContent = k.g.label
    nowI.textContent = k.name
    nowEm.textContent = k.g.scale
  }
  function showBeat(i) { dots.forEach((d, j) => d.classList.toggle('on', j === i || (loop.state === 'rec' && j < i))) }
  const LOOP_SAY = { count: 'Count-in.', rec: 'Recording 2 bars.', play: 'Looping. Play more to add a layer.', stopped: 'Loop stopped.' }
  const PED_LABEL = { idle: 'Record a 2-bar loop', count: 'Cancel the loop', rec: 'Cancel the loop', play: 'Stop the loop', stopped: 'Play the loop' }
  function setLoop(s) {
    loop.state = s
    pedBtn.dataset.s = s
    beatsEl.dataset.s = s
    pedBtn.setAttribute('aria-label', PED_LABEL[s])
    if (s === 'rec') status('<span style="color:hsl(355 100% 72%)">Recording</span> · 2 bars')
    if (s === 'play') status('Looping · play to add a layer')
    if (s === 'stopped') status('Loop stopped · ● plays it again')
    if (LOOP_SAY[s]) say(LOOP_SAY[s])
    syncLoopButtons()
    if (s === 'idle' || s === 'stopped') { showBeat(-1); rest() }
  }
  function syncLoopButtons() {
    const has = loop.events.length > 0 && ['play', 'stopped'].includes(loop.state)
    clearBtn.hidden = !has
    undoBtn.hidden = !has || new Set(loop.events.map((e) => e.layer)).size < 2
  }
  muteBtn.addEventListener('click', () => {
    muted = !muted
    muteBtn.setAttribute('aria-pressed', String(muted))
    if (muted) humStop()
    if (ac) master.gain.setTargetAtTime(muted ? 0 : 0.6, ac.currentTime, 0.05)
  })
  pedBtn.addEventListener('click', pedal)
  undoBtn.addEventListener('click', undo)
  clearBtn.addEventListener('click', clearLoop)

  /* ---------- input ---------- */
  let notes = 0
  keys.forEach((k) => {
    k.el.addEventListener('click', () => {
      init()
      humStop()
      const t = ac.currentTime + 0.01
      sound(k, t)
      strike(k)
      readout(k)
      notes++
      record(k, t)
      answer(k)
      if (notes === 4) {
        loopEl.hidden = false
        hud.classList.add('has-loop')
        if (loop.state === 'idle' && !statusText) status('New · tap ● to loop 2 bars')
        say('A loop pedal appeared in the synth readout.')
      }
      maybeTrade()
    })
    k.el.addEventListener('keydown', (e) => { if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault() })
    k.el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') humStart(k) })
    k.el.addEventListener('pointerleave', humStop)
  })

  /* the loop rests while the section is off screen (the song, in the site player, plays on) */
  new IntersectionObserver(([e]) => {
    away = !e.isIntersecting
    if (away && tf.state !== 'idle') { tf.state = 'idle'; tf.round = 0; tf.notesAtStart = notes; clearHint(); tfStatus('') }
  }).observe(root)

  /* ---------- mockup only: the stand-in for the site's one music player ---------- */
  const SITE_MUSIC = (() => {
    const audio = document.getElementById('sp-audio') // the page's only <audio>
    const wrap = document.getElementById('sp'), fab = document.getElementById('sp-fab'), title = document.getElementById('sp-title')
    let ctx = null, source = null
    audio.volume = 0.6
    const calls = []
    const sync = () => {
      const on = !audio.paused
      wrap.classList.toggle('playing', on)
      fab.setAttribute('aria-label', on ? `Pause ${SONG.title}` : `Play ${SONG.title}`)
      title.textContent = on ? `♫ ${SONG.title}` : ''
    }
    // the player owns the one AudioContext and routes its <audio> through it once (as useAudioPlayer)
    const context = () => {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
      return ctx
    }
    const route = () => { if (!source) { source = context().createMediaElementSource(audio); source.connect(context().destination) } }
    audio.addEventListener('playing', () => { sync(); lock() })
    audio.addEventListener('pause', () => { sync(); unlock() })
    audio.addEventListener('ended', () => { sync(); unlock() })
    audio.addEventListener('seeked', () => { if (!audio.paused) lock() })
    const api = {
      audio,
      context,
      play(id) {
        calls.push(['play', id])
        route()
        if (!audio.src) audio.src = '/public' + SONG.audioUrl
        context().resume()
        audio.play().catch(sync)
      },
      toggle() { calls.push(['toggle']); audio.paused ? api.play(SONG.id) : audio.pause() },
      isPlaying: () => !audio.paused,
      calls,
    }
    fab.addEventListener('click', () => api.toggle())
    return api
  })()

  /* mockup only: a metronome on every beat, to check the beat grid against the song */
  const bar = document.querySelector('.mock-bar')
  const ml = document.createElement('label')
  ml.className = 'metro'
  ml.innerHTML = '<input type="checkbox"> Metronome'
  bar.querySelector('label').before(ml)
  ml.querySelector('input').addEventListener('change', (e) => {
    metro = e.target.checked
    if (metro) { init(); if (zero() == null) freeZero = ac.currentTime + 0.1; wake() } else rest()
  })

  /* dev handle for checks */
  window.__jam = { get ac() { return ac }, active: () => active, made: () => made, keys, loop, tf, SITE_MUSIC, hook, get songZero() { return songZero }, pedal, call: () => call() }
})()
