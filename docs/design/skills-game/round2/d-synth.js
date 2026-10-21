/*
 * Round 2 · D · Skill synth. Every skill is a key: a click plays a note and the word's string
 * vibrates. Each group is an instrument on E minor pentatonic (nothing can clash), ascending in
 * reading order. Playing the Music line left to right is a guitar lick; it unlocks a riff, and
 * then one of Phill's tracks starts in the site's one music player.
 *
 * Audio rules (as on the site): nothing sounds before the first click; the synth has one
 * AudioContext, made on that click; Phill's tracks only play through the site player (here a
 * stand-in, SITE_MUSIC, with the page's single <audio>), never a second <audio> or
 * createMediaElementSource. All timing is on the AudioContext clock; no rAF, no idle loops.
 */
(() => {
  const { mount, say, reducedMotion, onReducedMotion, esc } = SECTION2
  const S = mount({ title: 'Round 2 · D · Skill synth' })
  const root = S.root

  /* ---------- the scale and the instruments ---------- */
  const PENTA = [0, 3, 5, 7, 10] // E minor pentatonic: E G A B D
  const midiOf = (base, step) => base + 12 * Math.floor(step / 5) + PENTA[step % 5]
  const hz = (m) => 440 * 2 ** ((m - 69) / 12)
  const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
  const noteName = (m) => NAMES[m % 12] + (Math.floor(m / 12) - 1)

  // base = an E (MIDI), from = the first scale step; glow = the string's color
  const VOICES = {
    ai: { inst: 'bell', label: 'Bell', base: 52, from: 2, glow: '290 100% 80%', ring: 1500, cycles: 13 },
    frontend: { inst: 'keys', label: 'Keys', base: 52, from: 0, glow: '190 100% 74%', ring: 1100, cycles: 11 },
    backend: { inst: 'bass', label: 'Bass', base: 28, from: 5, glow: '150 90% 62%', ring: 950, cycles: 7 },
    cloud: { inst: 'pad', label: 'Pad', base: 52, from: 0, glow: '260 100% 82%', ring: 1800, cycles: 9 },
    quality: { inst: 'pluck', label: 'Pluck', base: 64, from: 0, glow: '186 100% 72%', ring: 600, cycles: 8 },
    product: { inst: 'mallet', label: 'Mallet', base: 64, from: 0, glow: '45 100% 70%', ring: 700, cycles: 9 },
    music: { inst: 'guitar', label: 'Guitar', base: 52, from: 0, glow: '300 100% 82%', ring: 1500, cycles: 14 },
  }

  /* each word: its note, and a string to vibrate (aria-hidden, no text) */
  const H = '<svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="M0 5 Q50 -4 100 5" fill="none" stroke="currentColor" stroke-width="1.75" vector-effect="non-scaling-stroke"/></svg>'
  const V = '<svg viewBox="0 0 14 100" preserveAspectRatio="none" aria-hidden="true"><path d="M7 0 Q-5 50 7 100" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>'
  const perGroup = {}
  const keys = S.words.map((w) => {
    const i = (perGroup[w.group] = (perGroup[w.group] ?? -1) + 1)
    const v = VOICES[w.group]
    const midi = midiOf(v.base, v.from + i)
    const str = document.createElement('span')
    str.className = 'syn-str'
    str.setAttribute('aria-hidden', 'true')
    str.innerHTML = w.ai ? V : H
    str.style.setProperty('--g', v.glow)
    w.el.appendChild(str)
    w.el.style.setProperty('--g', v.glow)
    return { ...w, i, v, midi, str, label: w.ai ? w.el.querySelector('.sk-name') : w.el }
  })
  const music = keys.filter((k) => k.group === 'music')

  /* ---------- the audio graph: one context, made on the first click ---------- */
  let ac = null, bus = null, master = null
  let muted = false
  let active = 0, made = 0
  const ksCache = new Map()

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return }
    const AC = window.AudioContext || window.webkitAudioContext
    ac = new AC()
    master = ac.createGain()
    master.gain.value = 0.6
    const comp = ac.createDynamicsCompressor()
    comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.25
    master.connect(comp).connect(ac.destination)
    bus = ac.createGain()
    const verb = ac.createConvolver()
    verb.buffer = impulse(2.6, 3)
    const wet = ac.createGain()
    wet.gain.value = 0.26
    bus.connect(master)
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
  function voice() {
    const out = ac.createGain()
    out.connect(bus)
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
  /* a percussive envelope: up to `peak` in `a` seconds, down to silence by `d` */
  function env(p, t, a, peak, d) {
    p.setValueAtTime(0.0001, t)
    p.linearRampToValueAtTime(peak, t + a)
    p.exponentialRampToValueAtTime(0.0001, t + d)
  }
  const play = (srcs, t, end) => srcs.forEach((s) => { s.start(t); s.stop(end) })

  const INSTRUMENTS = {
    /* AI: an FM bell (carrier : modulator = 1 : 3.5, the index decays) */
    bell(f, t, vel) {
      const v = voice()
      const car = osc(v, 'sine', f), mod = osc(v, 'sine', f * 3.5)
      const idx = gain(v); idx.gain.setValueAtTime(f * 2.2, t); idx.gain.exponentialRampToValueAtTime(f * 0.04, t + 1.4)
      mod.connect(idx).connect(car.frequency)
      const amp = gain(v); env(amp.gain, t, 0.004, 0.2 * vel, 2.3)
      car.connect(amp).connect(v.out)
      play([car, mod], t, t + 2.35)
    },
    /* Frontend: electric-piano keys (FM 1 : 1 with a quick tine) */
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
    /* Backend: a round bass (saw + sub through a closing low-pass) */
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
    /* Cloud: a soft pad (two detuned saws and a triangle an octave up, slow attack) */
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
    /* Quality & security: a synth pluck (a square through a snapping low-pass) */
    pluck(f, t, vel) {
      const v = voice()
      const sq = osc(v, 'square', f)
      const lp = v.node(ac.createBiquadFilter()); lp.type = 'lowpass'; lp.Q.value = 6
      lp.frequency.setValueAtTime(5200, t); lp.frequency.exponentialRampToValueAtTime(380, t + 0.2)
      const amp = gain(v); env(amp.gain, t, 0.002, 0.09 * vel, 0.5)
      sq.connect(lp).connect(amp).connect(v.out)
      play([sq], t, t + 0.55)
    },
    /* Product: a marimba-ish mallet (fundamental plus two quick overtones) */
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
    /* Music & more: a plucked guitar string (Karplus–Strong); `bend` = semitones bent up into the note */
    guitar(f, t, vel, bend = 0) {
      const v = voice()
      const s = v.src(ac.createBufferSource())
      s.buffer = ksBuffer(f)
      if (bend) {
        s.playbackRate.setValueAtTime(2 ** (-bend / 12), t)
        s.playbackRate.setValueAtTime(2 ** (-bend / 12), t + 0.04)
        s.playbackRate.linearRampToValueAtTime(1, t + 0.16)
      }
      const lp = v.node(ac.createBiquadFilter()); lp.type = 'lowpass'; lp.frequency.value = 3600
      const amp = gain(v, 0.42 * vel)
      s.connect(lp).connect(amp).connect(v.out)
      s.start(t)
    },
  }

  /* Karplus–Strong: a softened noise burst circulating in a delay line with an averaging filter */
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
    const loss = 0.9965
    for (let i = 0; i < len; i++) {
      const a = ring[at], b = ring[(at + 1) % N]
      d[i] = a
      ring[at] = loss * 0.5 * (a + b)
      at = (at + 1) % N
    }
    const fade = Math.floor(sr * 0.12) // no click at the end
    for (let i = 0; i < fade; i++) d[len - 1 - i] *= i / fade
    ksCache.set(key, buf)
    return buf
  }

  function sound(k, { at = 0, vel = 1, bend = 0 } = {}) {
    if (muted) return
    init()
    INSTRUMENTS[k.v.inst](hz(k.midi), ac.currentTime + 0.01 + at, vel, bend)
  }

  /* the hum while a mouse rests on a word (only once sound is on; very quiet) */
  let hum = null
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
  function humStart(k) {
    humStop()
    if (!ac || muted || !finePointer.matches) return
    const t = ac.currentTime
    const v = voice()
    const o = osc(v, 'sine', hz(k.midi) / (k.midi > 60 ? 2 : 1))
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

  /* ---------- the look: a vibrating string and a glow ---------- */
  let rm = reducedMotion()
  document.documentElement.classList.toggle('rmx', rm)
  onReducedMotion((on) => { rm = on; document.documentElement.classList.toggle('rmx', on) })

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
  function strike(k, { amp = 1, delay = 0, ring } = {}) {
    const dur = ring ?? k.v.ring
    // a fresh click restarts the word; scheduled strikes (the riff's) just layer on top
    if (!delay) k.label.getAnimations().forEach((a) => a.id === 'glow' && a.cancel())
    const hot = `0 0 6px hsl(${k.v.glow}), 0 0 16px hsl(${k.v.glow}), 0 0 32px hsl(${k.v.glow} / .55)`
    const g = k.label.animate(
      [{ offset: 0, color: '#fff', textShadow: hot }, { offset: 0.3, color: '#fff', textShadow: hot, easing: 'ease-out' }],
      { duration: dur, delay },
    )
    g.id = 'glow'
    if (rm) return
    if (!delay) k.str.getAnimations().forEach((a) => a.cancel())
    k.str.animate(stringFrames(k.v.cycles, amp, k.ai ? 'X' : 'Y'), { duration: dur, delay, fill: 'none' })
    // the word itself gives a little under the pluck
    const nudge = k.ai ? 'translateX(2px)' : 'translateY(1.5px)'
    k.label.animate([{ transform: 'none' }, { transform: nudge, offset: 0.25 }, { transform: 'none' }], { duration: 220, delay, easing: 'ease-out' })
  }

  /* ---------- the readout: instrument, note, instruments found, mute ---------- */
  const hud = document.createElement('div')
  hud.className = 'syn-hud'
  hud.setAttribute('role', 'group')
  hud.setAttribute('aria-label', 'Skill synth')
  hud.innerHTML = `
    <button type="button" class="syn-mute" aria-pressed="false" aria-label="Mute the skill sounds">
      <svg class="on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>
      <svg class="off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>
    </button>
    <span class="now" aria-hidden="true"><b></b><i></i></span>
    <span class="sep" aria-hidden="true"></span>
    <span class="count" aria-hidden="true"></span>`
  root.appendChild(hud)
  const muteBtn = hud.querySelector('.syn-mute')
  const nowB = hud.querySelector('.now b'), nowI = hud.querySelector('.now i'), countEl = hud.querySelector('.count')
  const heard = new Set()
  let unlocked = false
  function readout(k) {
    hud.classList.add('on')
    hud.style.setProperty('--g', k.v.glow)
    nowB.textContent = k.v.label
    nowI.textContent = noteName(k.midi)
    heard.add(k.group)
    countEl.textContent = unlocked ? 'Riff unlocked ♫' : `${heard.size} of 7 instruments`
  }
  muteBtn.addEventListener('click', () => {
    muted = !muted
    muteBtn.setAttribute('aria-pressed', String(muted))
    if (muted) humStop()
    if (ac) master.gain.setTargetAtTime(muted ? 0 : 0.6, ac.currentTime, 0.05)
  })

  /* ---------- the hint and the hidden phrase: the Music line, left to right ---------- */
  const musicGroup = root.querySelector('.sk-group.music')
  const hint = document.createElement('p')
  hint.className = 'syn-hint'
  hint.textContent = 'Psst: this line is a guitar. Play it left to right.'
  hint.hidden = true
  musicGroup.querySelector('.sk-h').after(hint)

  let notes = 0, step = 0, lastMusicAt = 0
  function markProgress() {
    music.forEach((m, i) => {
      m.el.classList.toggle('lit', unlocked || i < step)
      m.el.classList.toggle('next', !unlocked && step > 0 && i === step)
    })
    if (!unlocked && step > 0 && step < music.length && !rm) {
      // the next string shimmers, inviting the next note
      const n = music[step]
      setTimeout(() => { if (music[step] === n && !n.str.getAnimations().length) n.str.animate(stringFrames(3, 0.35, 'Y'), { duration: 900, iterations: 2, delay: 200 }) }, 350)
    }
  }
  function onMusic(k) {
    const now = performance.now()
    if (now - lastMusicAt > 4000) step = 0
    lastMusicAt = now
    if (k.i === step) step++
    else step = k.i === 0 ? 1 : 0
    if (step === music.length) { step = 0; riff() }
    markProgress()
  }

  /* the riff: a pentatonic lick with a whole-step bend, then an E minor strum; then the song */
  const RIFF = [
    [64, 0], [67, 0.16], [69, 0.32], [71, 0.48, 2], [69, 0.8], [67, 0.96], [64, 1.12], [62, 1.28], [64, 1.44, 0, 1.2],
  ]
  const STRUM = [40, 47, 52, 55, 59, 64] // E minor, low to high
  const SONG = 'micro-clown'
  let card = null
  function riff() {
    const first = !unlocked
    unlocked = true
    if (!muted) {
      init()
      const t0 = ac.currentTime + 0.35
      RIFF.forEach(([m, at, bend = 0, vel = 1]) => INSTRUMENTS.guitar(hz(m), t0 + at, vel, bend))
      STRUM.forEach((m, i) => INSTRUMENTS.guitar(hz(m), t0 + 1.95 + i * 0.028, 0.75))
    }
    // the Music line's strings move with the lick, then the whole section rings once
    RIFF.forEach(([, at], i) => strike(music[i % music.length], { delay: 350 + at * 1000, amp: 0.8, ring: 700 }))
    music.forEach((m) => strike(m, { delay: 2300, amp: 1, ring: 1800 }))
    if (!rm) keys.forEach((k, i) => strike(k, { delay: 2350 + i * 14, amp: 0.5, ring: 1100 }))
    setTimeout(() => {
      // muted means quiet: the song waits for the card's button
      if (!muted) SITE_MUSIC.play(SONG) // production: getSiteMusic()?.play(trackId), an API site-music.ts doesn't have yet
      showCard()
      countEl.textContent = 'Riff unlocked ♫'
      if (first) say(muted ? 'Riff unlocked: Micro Clown, Phill’s song with The Funky Knuckles. Use Play the song to hear it.' : 'Riff unlocked. Micro Clown, Phill’s song with The Funky Knuckles, is playing in the music player.')
    }, 2500)
    hint.classList.remove('on')
    hint.hidden = true
  }
  function showCard() {
    if (card) { syncCard(); return }
    card = document.createElement('div')
    card.className = 'syn-card'
    card.innerHTML = `
      <p class="k">Riff unlocked</p>
      <p class="t">That was the lick. Here’s the real thing: <strong>Micro Clown</strong>, my song with The Funky Knuckles, in the music player.</p>
      <div class="row"><button type="button" class="hbtn small" data-t="pause">Pause the song</button></div>`
    musicGroup.appendChild(card)
    card.querySelector('[data-t="pause"]').addEventListener('click', () => (SITE_MUSIC.isPlaying() ? SITE_MUSIC.toggle() : SITE_MUSIC.play(SONG)))
    syncCard()
  }
  function syncCard() {
    if (card) card.querySelector('[data-t="pause"]').textContent = SITE_MUSIC.isPlaying() ? 'Pause the song' : 'Play the song'
  }

  /* ---------- input ---------- */
  keys.forEach((k) => {
    k.el.addEventListener('click', () => {
      humStop()
      sound(k)
      strike(k)
      readout(k)
      notes++
      if (k.group === 'music') onMusic(k)
      if (notes >= 5 && !unlocked && hint.hidden) { hint.hidden = false; requestAnimationFrame(() => hint.classList.add('on')) }
    })
    k.el.addEventListener('keydown', (e) => { if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault() })
    k.el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') humStart(k) })
    k.el.addEventListener('pointerleave', humStop)
  })

  /* ---------- mockup only: the stand-in for the site's one music player ---------- */
  const SITE_MUSIC = (() => {
    const audio = document.getElementById('sp-audio') // the page's only <audio>
    const wrap = document.getElementById('sp'), fab = document.getElementById('sp-fab'), title = document.getElementById('sp-title')
    let tracks = [{ id: 'micro-clown', title: 'Micro Clown', audioUrl: '/audio/micro-clown.mp3' }]
    fetch('/src/data/tracks.json').then((r) => r.json()).then((t) => { tracks = t }).catch(() => {})
    let current = null
    const calls = []
    audio.volume = 0.55
    const sync = () => {
      const on = !audio.paused
      wrap.classList.toggle('playing', on)
      fab.setAttribute('aria-label', on ? `Pause ${current?.title ?? 'music'}` : 'Play music')
      title.textContent = current ? `♫ ${current.title}` : ''
      syncCard()
    }
    audio.addEventListener('play', sync)
    audio.addEventListener('pause', sync)
    const api = {
      play(id) {
        calls.push(['play', id])
        const t = tracks.find((x) => x.id === id) ?? tracks[0]
        if (current?.id !== t.id) { current = t; audio.src = '/public' + t.audioUrl }
        audio.play().catch(() => sync())
        sync()
      },
      toggle() {
        calls.push(['toggle'])
        if (!current) return api.play(tracks[0].id)
        audio.paused ? audio.play() : audio.pause()
      },
      isPlaying: () => !audio.paused,
      open() { calls.push(['open']); fab.focus() },
      calls,
    }
    fab.addEventListener('click', () => api.toggle())
    return api
  })()

  /* dev handle for checks: the context, live voices, voices made, the stand-in's calls */
  window.__synth = { get ac() { return ac }, active: () => active, made: () => made, ks: () => ksCache.size, keys, SITE_MUSIC, get unlocked() { return unlocked } }
})()
