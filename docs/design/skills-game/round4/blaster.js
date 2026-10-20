/*
 * Round 4 · Skill blaster: whack-a-mole that turns into a light-gun shooter.
 *
 *   At rest it's the section, unchanged; on a mouse, words lean toward the pointer a little (the
 *   magnets, round 2's C), the only hint. Click any skill and it takes a laser hit: it bursts into
 *   letters, plays its synth note (round 3's voices and scales, D minor) and its letters snap back
 *   home, so the list always reads again. Then a couple of other skills light up:
 *
 *   Waves 1–2 · whack-a-mole: hit lit skills before their ring closes, for points and a combo.
 *   Wave 3+   · Area 51: some lit skills are red. When a red one's ring closes it shoots at the
 *               screen (a red flash, a crack, a shake) and you lose health. Kill them first.
 *               Elites take three hits. Health comes back one bar per wave cleared.
 *   Game over · the readout shows the score and your best; any skill starts again.
 *
 *   Nobody gets dragged in: ignore the lit skills for a few seconds and the game pauses (the
 *   readout fades soon after), scrolling away pauses it, ✕ or Esc stops it. Sound only starts
 *   on a click and goes through the site player's AudioContext (here the stand-in's). While
 *   Number Slayers plays in the player, targets light up on its beat.
 *
 *   Perf: no rAF but the lean (only while the pointer moves over the section); explosions are
 *   Web Animations and CSS keyframes; layout is read only in click handlers and timers.
 */
(() => {
  const { mount, say, reducedMotion, onReducedMotion } = SECTION2
  const S = mount({ title: 'Round 4 · Skill blaster' })
  const root = S.root
  const back = document.querySelector('.mock-bar a')
  back.href = '../round3/synth-jam.html'
  back.textContent = '← Round 3'

  const rand = (a, b) => a + Math.random() * (b - a)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  const fmt = (n) => n.toLocaleString('en-US')
  const now = () => performance.now()
  let rm = reducedMotion()

  /* ---------- the song, the scales and the voices (round 3's) ---------- */
  const SONG = { id: 'number-slayers', title: 'Number Slayers', audioUrl: '/audio/number-slayers.mp3', key: 'D minor', bpm: 130, firstBeat: 0.005 }
  const BEAT = 60 / SONG.bpm
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const midi = (n) => {
    const [, l, acc, o] = /^([A-G])(♭|♯)?(-?\d)$/.exec(n)
    return 12 * (+o + 1) + PC[l] + (acc === '♭' ? -1 : acc === '♯' ? 1 : 0)
  }
  const hz = (m) => 440 * 2 ** ((m - 69) / 12)
  const PENTA = { steps: [0, 3, 5, 7, 10] }
  const CHORDS = [
    'D3 F3 A3 C4 E4', 'G3 B♭3 D4 F4 A4', 'B♭3 D4 F4 A4', 'A3 C♯4 F4 G4 B♭4', 'F3 A3 C4 E4 G4', 'C3 E3 B♭3 D4 G4',
    'E3 G3 B♭3 D4', 'D3 F3 A3 C♯4', 'B♭2 F3 G3 C4 D4', 'G3 B♭3 D4 E4', 'A3 D4 E4 G4', 'D3 G3 C4 F4 A4',
  ].map((v) => v.split(' ').map(midi))
  const GROUPS = {
    ai: { inst: 'bell', ...PENTA, root: 'D3', from: 3 },
    frontend: { inst: 'keys', steps: [0, 2, 3, 5, 7, 9, 10], root: 'D3', from: 0 },
    backend: { inst: 'bass', ...PENTA, root: 'D1', from: 3 },
    cloud: { inst: 'pad', chords: true },
    quality: { inst: 'pluck', steps: [0, 2, 3, 5, 7, 8, 11], root: 'D4', from: 0 },
    product: { inst: 'mallet', steps: [0, 1, 3, 4, 6, 8, 10], root: 'A4', from: 0 },
    music: { inst: 'guitar', steps: [0, 3, 5, 6, 7, 10], root: 'D3', from: 0 },
  }
  const MOLE_C = { ai: '290 100% 80%', other: '190 100% 75%' }
  const per = {}
  const keys = S.words.map((w, idx) => {
    const i = (per[w.group] = (per[w.group] ?? -1) + 1)
    const g = GROUPS[w.group]
    let notes
    if (g.chords) notes = CHORDS[i % CHORDS.length]
    else {
      const d = g.from + i, L = g.steps.length
      notes = [midi(g.root) + 12 * Math.floor(d / L) + g.steps[d % L]]
    }
    const label = w.ai ? w.el.querySelector('.sk-name') : w.el
    w.el.style.setProperty('--c', w.ai ? MOLE_C.ai : MOLE_C.other)
    return { ...w, idx, g, notes, label, t: null, fly: null, cool: 0, cx: 0, cy: 0, lx: 0, ly: 0, lr: 0, ls: 0 }
  })
  const keyByEl = new Map(keys.map((k) => [k.el, k]))

  let ac = null, bus = null, master = null, dry = null, noise = null
  let muted = false, active = 0, made = 0
  const ksCache = new Map()
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return }
    ac = SITE_MUSIC.context()
    master = ac.createGain()
    master.gain.value = 0.6
    const comp = ac.createDynamicsCompressor()
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.25
    master.connect(comp).connect(ac.destination)
    bus = ac.createGain()
    dry = ac.createGain()
    const verb = ac.createConvolver()
    verb.buffer = impulse(2.4, 3)
    const wet = ac.createGain()
    wet.gain.value = 0.24
    bus.connect(master)
    dry.connect(master)
    bus.connect(verb).connect(wet).connect(master)
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
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
  /* one sound's nodes, all disconnected when its last source ends (no leak per shot) */
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
    p.linearRampToValueAtTime(Math.max(0.0002, peak), t + a)
    p.exponentialRampToValueAtTime(0.0001, t + d)
  }
  const play = (srcs, t, end) => srcs.forEach((s) => { s.start(t); s.stop(end) })
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
  const T = () => ac.currentTime + 0.005
  function note(k, vel = 1) {
    if (muted) return
    const t = T()
    if (k.notes.length > 1) k.notes.forEach((n) => INSTRUMENTS[k.g.inst](hz(n), t, vel * 0.42))
    else INSTRUMENTS[k.g.inst](hz(k.notes[0]), t, vel)
  }

  /* the game's own sounds: a laser zip, a boom (bigger for enemies), the enemy's lock-on and shot,
     getting hit, a shield clank, bell arpeggios; loudness follows the intensity setting */
  const SFX = {
    zap() {
      if (muted) return
      const t = T(), v = voice(dry)
      const o = osc(v, 'triangle', 2600); o.frequency.exponentialRampToValueAtTime(320, t + 0.08)
      const g = gain(v); env(g.gain, t, 0.002, 0.06, 0.1)
      o.connect(g).connect(v.out)
      play([o], t, t + 0.11)
    },
    boom(size = 1) {
      if (muted) return
      const t = T(), v = voice(), L = INT[intensity].loud
      const n = v.src(ac.createBufferSource()); n.buffer = noise
      const lp = v.node(ac.createBiquadFilter()); lp.type = 'lowpass'; lp.Q.value = 0.7
      lp.frequency.setValueAtTime(2200 + 1600 * size, t); lp.frequency.exponentialRampToValueAtTime(90, t + 0.28 * size)
      const g = gain(v); env(g.gain, t, 0.002, 0.15 * size * L, 0.32 * size)
      n.connect(lp).connect(g).connect(v.out)
      const th = osc(v, 'sine', 120); th.frequency.exponentialRampToValueAtTime(36, t + 0.22 * size)
      const tg = gain(v); env(tg.gain, t, 0.002, 0.28 * Math.min(size, 2) * L, 0.26 * size)
      th.connect(tg).connect(v.out)
      n.start(t); n.stop(t + 0.4 * size); th.start(t); th.stop(t + 0.3 * size)
    },
    lockOn() {
      if (muted) return
      const t = T()
      ;[[880, 0], [1174.7, 0.07]].forEach(([f, d]) => {
        const v = voice(dry), o = osc(v, 'sine', f), g = gain(v)
        env(g.gain, t + d, 0.002, 0.05, 0.06)
        o.connect(g).connect(v.out)
        play([o], t + d, t + d + 0.08)
      })
    },
    fire() {
      if (muted) return
      const t = T(), v = voice()
      const o = osc(v, 'sawtooth', 760); o.frequency.exponentialRampToValueAtTime(90, t + 0.28)
      const lp = v.node(ac.createBiquadFilter()); lp.type = 'lowpass'; lp.frequency.value = 1800
      const g = gain(v); env(g.gain, t, 0.004, 0.07, 0.3)
      o.connect(lp).connect(g).connect(v.out)
      play([o], t, t + 0.32)
    },
    hurt() {
      if (muted) return
      const t = T(), v = voice(dry), L = INT[intensity].loud
      const n = v.src(ac.createBufferSource()); n.buffer = noise
      const hp = v.node(ac.createBiquadFilter()); hp.type = 'bandpass'; hp.frequency.value = 1400; hp.Q.value = 0.9
      const g = gain(v); env(g.gain, t, 0.001, 0.22 * L, 0.14)
      n.connect(hp).connect(g).connect(v.out)
      const th = osc(v, 'sine', 90); th.frequency.exponentialRampToValueAtTime(30, t + 0.3)
      const tg = gain(v); env(tg.gain, t, 0.002, 0.4 * L, 0.34)
      th.connect(tg).connect(v.out)
      n.start(t); n.stop(t + 0.16); th.start(t); th.stop(t + 0.36)
    },
    clank() {
      if (muted) return
      const t = T(), v = voice()
      const a = osc(v, 'sine', 1420), b = osc(v, 'sine', 2093)
      const g = gain(v); env(g.gain, t, 0.001, 0.07, 0.18)
      a.connect(g); b.connect(g); g.connect(v.out)
      play([a, b], t, t + 0.2)
    },
    arp(list, step, vel = 0.8) {
      if (muted) return
      const t = T()
      list.forEach((n, i) => INSTRUMENTS.bell(hz(midi(n)), t + i * step, vel))
    },
    chord(i, vel = 0.32) {
      if (muted) return
      const t = T()
      CHORDS[i].forEach((m) => INSTRUMENTS.pad(hz(m), t, vel))
    },
  }

  /* ---------- the intensity setting (the mock bar): how big the explosions and the shake are ---------- */
  const INT = {
    calm: { force: 0.6, sparks: 0.5, beam: 0, bloom: 0, shake: 0, crack: false, banner: false, wave: 0.75, loud: 0.6 },
    arcade: { force: 1, sparks: 1, beam: 1, bloom: 1, shake: 5, crack: true, banner: true, wave: 1, loud: 1 },
    max: { force: 1.5, sparks: 1.8, beam: 2, bloom: 2, shake: 11, crack: true, banner: true, wave: 1.4, loud: 1.25 },
  }
  let intensity = 'arcade'

  /* ---------- the effect layers ---------- */
  const layer = document.createElement('div') // in the section: letters, rings, sparks, points
  layer.className = 'bl-layer'
  layer.setAttribute('aria-hidden', 'true')
  root.appendChild(layer)
  const screen = document.createElement('div') // on the screen: beams, enemy shots, cracks, banners
  screen.className = 'bl-screen'
  screen.setAttribute('aria-hidden', 'true')
  document.body.appendChild(screen)
  const vig = document.createElement('div')
  vig.className = 'bl-vig'
  screen.appendChild(vig)
  const R = Math.round
  const reticle = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g fill="none" stroke-linecap="round"><g stroke="#00131a" stroke-width="3.6"><circle cx="16" cy="16" r="8.5"/><path d="M16 2.5v6M16 23.5v6M2.5 16h6M23.5 16h6"/></g><g stroke="#80eaff" stroke-width="1.6"><circle cx="16" cy="16" r="8.5"/><path d="M16 2.5v6M16 23.5v6M2.5 16h6M23.5 16h6"/></g></g><circle cx="16" cy="16" r="1.7" fill="#fff"/></svg>`
  root.style.setProperty('--reticle', `url("data:image/svg+xml,${encodeURIComponent(reticle)}") 16 16, crosshair`)

  const sec = () => root.getBoundingClientRect()
  const centerOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }
  const glow = (c, m = 1) => `0 0 ${6 * m}px hsl(${c}), 0 0 ${18 * m}px hsl(${c} / .8)`
  function fx(cls, parent, css) {
    const el = document.createElement('i')
    el.className = cls
    el.style.cssText = css
    parent.appendChild(el)
    return el
  }
  const done = (a, el) => { // remove the element with its animation (and a timer as a backstop)
    a.onfinish = () => el.remove()
    a.oncancel = () => el.remove()
    setTimeout(() => el.remove(), a.effect.getComputedTiming().endTime + 300)
  }

  function sparks(x, y, n, colors, reach = 1) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.3, 0.3), r0 = rand(3, 9), r1 = rand(36, 88) * reach
      const s = fx('bl-spark', layer, `--c:${colors[i % colors.length]};--t:${R(rand(380, 640))}ms;--x0:${(x + Math.cos(a) * r0).toFixed(1)}px;--y0:${(y + Math.sin(a) * r0).toFixed(1)}px;--x1:${(x + Math.cos(a) * r1).toFixed(1)}px;--y1:${(y + Math.sin(a) * r1 * 0.8).toFixed(1)}px`)
      setTimeout(() => s.remove(), 700)
    }
  }
  function pulse(cls, x, y, c, to, ms, parent = layer) {
    const el = fx(cls, parent, `--c:${c};left:${x.toFixed(1)}px;top:${y.toFixed(1)}px`)
    done(el.animate([{ transform: 'scale(.15)', opacity: 1 }, { transform: `scale(${to})`, opacity: 0 }], { duration: ms, easing: 'cubic-bezier(.2,.7,.3,1)' }), el)
  }
  function floatPoints(x, y, text, mult, c, big) {
    const el = document.createElement('span')
    el.className = 'bl-pts' + (big ? ' big' : '')
    el.innerHTML = `${text}${mult > 1 ? `<i>×${mult}</i>` : ''}`
    el.style.cssText = `--c:${c};--x:${x.toFixed(1)}px;--y:${(y - 16).toFixed(1)}px`
    layer.appendChild(el)
    setTimeout(() => el.remove(), 1000)
  }
  function shake(amp) {
    if (rm || !amp) return
    const f = []
    for (let i = 0; i < 7; i++) { const a = amp * (1 - i / 7); f.push({ transform: `translate(${rand(-a, a).toFixed(1)}px, ${rand(-a, a).toFixed(1)}px)` }) }
    f.push({ transform: 'none' })
    root.animate(f, { duration: 320 })
    screen.animate(f, { duration: 320 })
  }

  /* the shot: a laser from the bottom of the screen to where you clicked (none in Calm) */
  function shotFx(p) {
    const I = INT[intensity]
    const fl = fx('bl-flash', screen, `left:${p.x}px;top:${p.y}px`)
    done(fl.animate(rm ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 200, easing: 'ease-out' }), fl)
    SFX.zap()
    if (rm || !I.beam) return
    const W = innerWidth, H = innerHeight
    const from = I.beam === 2 ? [[W * 0.2, H + 6], [W * 0.8, H + 6]] : [[W / 2, H + 6]]
    for (const [ox, oy] of from) {
      const dx = p.x - ox, dy = p.y - oy, a = (Math.atan2(dy, dx) * 180) / Math.PI
      const el = fx('bl-beam' + (I.beam === 2 ? ' max' : ''), screen, `left:${ox}px;top:${oy}px;width:${Math.hypot(dx, dy).toFixed(0)}px`)
      done(el.animate([
        { transform: `rotate(${a}deg) scaleX(0)`, opacity: 1 },
        { transform: `rotate(${a}deg) scaleX(1)`, opacity: 1, offset: 0.35 },
        { transform: `rotate(${a}deg) scaleX(1)`, opacity: 0 },
      ], { duration: 160, easing: 'ease-out' }), el)
    }
  }

  /* a word bursts into its letters, which fly, then snap back into place like magnets */
  function explode(k, ix, iy, force, color, shadow) {
    land(k, true)
    const tn = [...k.label.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim())
    if (!tn) return
    const s = sec(), cs = getComputedStyle(k.label)
    const box = document.createElement('span')
    box.className = 'bl-word'
    box.style.cssText = `font:${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily};letter-spacing:${cs.letterSpacing};color:${color};text-shadow:${shadow}`
    const range = document.createRange(), text = tn.textContent
    const anims = []
    let longest = 0
    for (let i = 0; i < text.length; i++) {
      if (!text[i].trim()) continue
      range.setStart(tn, i); range.setEnd(tn, i + 1)
      const r = range.getBoundingClientRect()
      if (!r.width) continue
      const x = r.left - s.left, y = r.top - s.top
      const sp = document.createElement('span')
      sp.className = 'bl-letter'
      sp.textContent = text[i]
      sp.style.cssText = `left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;height:${r.height}px;line-height:${r.height}px`
      box.appendChild(sp)
      let dx = x + r.width / 2 - ix, dy = y + r.height / 2 - iy
      const d = Math.hypot(dx, dy) || 1
      dx /= d; dy /= d
      const near = Math.max(0.4, 1 - d / 260) // the letters by the hit fly hardest
      const speed = rand(320, 580) * force * near
      let vx = dx * speed + rand(-90, 90) * force, vy = dy * speed * 0.6 - rand(240, 440) * force
      const spin = rand(-760, 760) * force
      const T1 = rand(0.4, 0.56), D = T1 + 0.62, N = 6, h = T1 / N
      const frames = [{ offset: 0, transform: 'translate(0px,0px) rotate(0deg) scale(1)', easing: 'linear' }]
      let px = 0, py = 0, pa = 0
      for (let j = 1; j <= N; j++) {
        for (let q = 0; q < 4; q++) { const dt = h / 4; vx *= 1 - 2.2 * dt; vy += 1500 * dt; vy *= 1 - 1.2 * dt; px += vx * dt; py += vy * dt; pa += spin * dt }
        frames.push({ offset: (j * h) / D, transform: `translate(${px.toFixed(1)}px,${py.toFixed(1)}px) rotate(${pa.toFixed(0)}deg) scale(1.12)`, easing: j === N ? 'cubic-bezier(.55,0,.25,1.18)' : 'linear' })
      }
      frames.push({ offset: 1, transform: `translate(0px,0px) rotate(${Math.round(pa / 360) * 360}deg) scale(1)` }) // home the short way round
      anims.push(sp.animate(frames, { duration: D * 1000, fill: 'both' }))
      longest = Math.max(longest, D)
    }
    layer.appendChild(box)
    k.label.classList.add('bl-gone')
    k.fly = { box, anims, timer: setTimeout(() => land(k), longest * 1000 + 30) }
  }
  function land(k, snap) {
    const f = k.fly
    if (!f) return
    clearTimeout(f.timer)
    f.anims.forEach((a) => a.cancel())
    f.box.remove()
    k.fly = null
    k.label.style.transition = 'none' // back in one frame, no fade (the letters were just there)
    k.label.classList.remove('bl-gone')
    void k.label.offsetWidth
    k.label.style.transition = ''
    if (!snap) {
      const c = getComputedStyle(k.el).getPropertyValue('--c').trim()
      k.label.animate([{ textShadow: '0 0 0 transparent' }, { textShadow: `0 0 14px hsl(${c}), 0 0 2px #fff`, offset: 0.3 }, { textShadow: '0 0 0 transparent' }], { duration: 500, easing: 'ease-out' })
    }
  }

  const KIND = {
    mole: { pts: 100, sparks: 10, cls: 'bl-lit' },
    gold: { pts: 500, sparks: 16, cls: 'bl-gold', c: '45 100% 62%' },
    foe: { pts: 300, sparks: 22, cls: 'bl-foe', c: '355 100% 64%' },
    elite: { pts: 1000, sparks: 30, cls: 'bl-foe', c: '355 100% 64%' },
  }
  const colorOf = (k, kind) => KIND[kind].c || (k.ai ? MOLE_C.ai : MOLE_C.other)
  const isFoe = (kind) => kind === 'foe' || kind === 'elite'

  /* a hit: the explosion, sized by what it was and the intensity */
  function blast(k, p, kind) {
    const I = INT[intensity], s = sec()
    const x = p.x - s.left, y = p.y - s.top
    const c = colorOf(k, kind), big = isFoe(kind)
    if (rm) { // nothing flies: the word flashes where it is
      k.label.animate([{ color: '#fff', textShadow: glow(c, 1.4) }, { color: '#fff', textShadow: glow(c, 1.4), offset: 0.5 }, {}], { duration: 700 })
      return { x, y, c }
    }
    const letter = big ? 'hsl(355 100% 92%)' : kind === 'gold' ? 'hsl(48 100% 90%)' : '#fff'
    explode(k, x, y, I.force * (big ? 1.35 : 1), letter, glow(c))
    sparks(x, y, R(KIND[kind].sparks * I.sparks), [`hsl(${c})`, '#fff', big ? 'hsl(25 100% 65%)' : 'hsl(190 100% 80%)'], big ? 1.4 : 1)
    pulse('bl-shock', x, y, c, (big ? 3.2 : 1.9) * I.wave, big ? 520 : 420)
    if (I.bloom === 2 || (I.bloom && big)) pulse('bl-bloom', x, y, c, big ? 1.8 : 1.15, 320)
    if (big) shake(I.shake * (kind === 'elite' ? 1.4 : 1))
    else if (I.bloom === 2) shake(2.5)
    return { x, y, c }
  }

  /* an enemy's shot: a red bolt that grows toward you; then a crack, a red flash and a shake */
  function bolt(k, after) {
    const r = k.label.getBoundingClientRect()
    const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2
    const x1 = x0 + (innerWidth / 2 - x0) * 0.3, y1 = y0 + (innerHeight / 2 - y0) * 0.3
    if (rm) return after(x1, y1)
    const el = fx('bl-bolt', screen, '')
    const a = el.animate([{ transform: `translate(${x0}px, ${y0}px) scale(.5)` }, { transform: `translate(${x1}px, ${y1}px) scale(8)`, opacity: 0.9 }], { duration: 300, easing: 'cubic-bezier(.5,0,.9,.6)' })
    a.onfinish = () => { el.remove(); after(x1, y1) }
  }
  function crack(x, y) {
    const c = 130
    let rays = '', ring = ''
    const n = 7 + ((Math.random() * 3) | 0), mids = []
    for (let i = 0; i < n; i++) {
      let a = (i / n) * Math.PI * 2 + rand(-0.25, 0.25), r = 0
      rays += `M${c} ${c}`
      for (let s = 0; s < 3 + ((Math.random() * 2) | 0); s++) {
        r += rand(20, 40); a += rand(-0.3, 0.3)
        rays += `L${(c + Math.cos(a) * r).toFixed(1)} ${(c + Math.sin(a) * r).toFixed(1)}`
        if (s === 1) mids.push([c + Math.cos(a) * r, c + Math.sin(a) * r])
      }
    }
    mids.forEach(([mx, my], i) => { if (Math.random() < 0.7) { const [nx, ny] = mids[(i + 1) % mids.length]; ring += `M${mx.toFixed(1)} ${my.toFixed(1)}L${nx.toFixed(1)} ${ny.toFixed(1)}` } })
    const el = document.createElement('div')
    el.className = 'bl-crack'
    el.style.cssText = `left:${x}px;top:${y}px`
    el.innerHTML = `<svg viewBox="0 0 260 260" width="260" height="260"><path d="${rays}" fill="none" stroke="hsl(0 0% 100% / .85)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="${ring}" fill="none" stroke="hsl(0 0% 100% / .5)" stroke-width="1"/><circle cx="${c}" cy="${c}" r="4.5" fill="hsl(355 100% 72% / .9)"/></svg>`
    screen.appendChild(el)
    done(el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.04 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: 1600 }), el)
  }
  function banner(big, small, c) {
    if (!INT[intensity].banner) return
    const el = document.createElement('div')
    el.className = 'bl-banner'
    el.style.setProperty('--c', c)
    el.innerHTML = `<b>${big}</b>${small ? `<span>${small}</span>` : ''}`
    screen.appendChild(el)
    const C = 'translate(-50%, -50%)'
    done(el.animate(rm
      ? [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }]
      : [{ opacity: 0, transform: `${C} scale(.92)` }, { opacity: 1, transform: `${C} scale(1)`, offset: 0.15 }, { opacity: 1, transform: `${C} scale(1.02)`, offset: 0.75 }, { opacity: 0, transform: `${C} scale(1.06)` }],
    { duration: 1300, easing: 'ease-out' }), el)
  }

  /* ---------- the game ---------- */
  const MAX_HP = 5
  const FIRST_FOE_WAVE = 2
  const WAVES = [
    { n: 8, at: 2, life: 2.3, gap: 0.8, foes: 0, gold: 0 },
    { n: 10, at: 2, life: 2.0, gap: 0.7, foes: 0, gold: 1 },
    { n: 12, at: 3, life: 1.9, gap: 0.65, foes: 4, gold: 1, aim: 2.5 },
    { n: 14, at: 3, life: 1.7, gap: 0.6, foes: 6, gold: 1, aim: 2.2, elite: 1 },
    { n: 16, at: 4, life: 1.6, gap: 0.55, foes: 8, gold: 2, aim: 2.0, elite: 2 },
  ]
  function waveCfg(i) {
    if (i < WAVES.length) return WAVES[i]
    const e = i - WAVES.length + 1, b = WAVES[WAVES.length - 1], n = b.n + 2 * e
    return { n, at: Math.min(6, b.at + Math.floor(e / 2)), life: Math.max(1.05, b.life * 0.94 ** e), gap: Math.max(0.35, b.gap * 0.95 ** e), foes: R(n * 0.55), gold: 2, aim: Math.max(1.35, b.aim * 0.94 ** e), elite: b.elite + e }
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]] } return a }
  function planFor(cfg, i) {
    const elites = Math.min(cfg.elite || 0, cfg.foes)
    const kinds = [...Array(cfg.foes - elites).fill('foe'), ...Array(elites).fill('elite'), ...Array(cfg.gold || 0).fill('gold')]
    while (kinds.length < cfg.n) kinds.push('mole')
    shuffle(kinds)
    if (i === FIRST_FOE_WAVE) { // the very first enemy comes third, after two moles
      const rest = kinds.filter((x) => x !== 'foe')
      const foes = kinds.filter((x) => x === 'foe')
      return ['mole', 'mole', foes.pop(), ...shuffle([...rest.slice(2), ...foes])]
    }
    return kinds
  }
  const multFor = (combo) => Math.min(8, 1 + Math.floor(combo / 4))
  const loadBest = () => { try { return +localStorage.getItem('skill-blaster-best') || 0 } catch { return 0 } }
  const saveBest = () => { try { localStorage.setItem('skill-blaster-best', String(G.best)) } catch { /* private mode */ } }

  const G = {
    state: 'rest', // rest · intro · wave · between · paused · over
    score: 0, best: loadBest(), combo: 0, mult: 1, wave: -1, cfg: null, plan: [], spawned: 0, active: new Set(),
    hp: MAX_HP, hpOn: false, lastShot: 0, kb: false, startedSong: false, pendingSpawn: false, watch: 0, blind: 0, resumeTo: 'wave', eliteSeen: false,
  }
  const playing = () => ['intro', 'wave', 'between'].includes(G.state)
  const timers = new Set()
  function later(ms, fn) { const id = setTimeout(() => { timers.delete(id); fn() }, Math.max(0, ms)); timers.add(id); return id }
  function cancel(id) { clearTimeout(id); timers.delete(id) }
  function clearLater() { timers.forEach(clearTimeout); timers.clear(); G.pendingSpawn = false }

  /* the beat: while the song plays, spawns land on its 8th notes and enemies fire on a beat */
  let songZero = null
  function onGrid(sec, div = 2) {
    if (songZero == null || !ac) return sec
    const z = songZero + SONG.firstBeat, t0 = ac.currentTime, unit = BEAT / div
    return z + Math.ceil((t0 + sec - z) / unit) * unit - t0
  }

  function shootSkill(k, e) {
    init()
    const kb = e.detail === 0 // Enter or Space
    const p = kb ? centerOf(k.label) : { x: e.clientX, y: e.clientY }
    shotFx(p)
    G.lastShot = now()
    if (G.state === 'rest' || G.state === 'over') return begin(k, p, kb)
    if (kb) G.kb = true
    if (G.state === 'paused') { freeHit(k, p); resume(); return }
    if (k.t) return hitTarget(k.t, p)
    graze(k, p)
  }
  function shootAir(e) {
    init()
    shotFx({ x: e.clientX, y: e.clientY })
    G.lastShot = now()
    breakCombo()
  }

  /* the first shot: the discovery. The word blows up, and a moment later the first wave starts */
  function begin(k, p, kb) {
    resetRun()
    G.kb = kb
    root.classList.add('bl-on')
    hudOn()
    freeHit(k, p)
    G.state = 'intro'
    status('<span class="good">Nice shot</span> · hit the lit skills')
    tell(`Skill blaster. Hit the skills that light up, for points. Escape stops.${kb ? ' Press L to jump to a lit skill.' : ''}`, true)
    G.resumeTo = 'first'
    later(1100, () => startWave(0))
    watchOn()
  }
  function freeHit(k, p) {
    const b = blast(k, p, 'mole')
    note(k); SFX.boom(1)
    addScore(100, b, { c: b.c })
    k.cool = now() + 1200
  }
  function graze(k, p) { // a skill that isn't lit: a soft note, a few sparks, and the combo is gone
    note(k, 0.45)
    if (!rm) {
      const s = sec()
      sparks(p.x - s.left, p.y - s.top, 4, ['hsl(190 100% 80%)', '#fff'], 0.5)
      k.label.animate([{ transform: 'none' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'none' }], { duration: 180 })
    }
    breakCombo()
  }
  function breakCombo() {
    if (G.combo >= 4) status('Combo lost')
    G.combo = 0
    setMult(1)
  }

  function startWave(i) {
    G.wave = i
    G.cfg = waveCfg(i)
    G.plan = planFor(G.cfg, i)
    G.spawned = 0
    G.state = 'wave'
    G.resumeTo = 'wave'
    G.lastShot = now()
    waveB.textContent = i + 1
    const red = '355 100% 64%'
    let delay = 0.3
    if (G.cfg.foes && !G.hpOn) {
      G.hpOn = true
      hpEl.hidden = false
      drawHp()
      banner(`Wave ${i + 1}`, 'They shoot back', red)
      status('<span class="foe">Red ones shoot back</span> · get them before the ring closes')
      tell(`Wave ${i + 1}. Red skills shoot back: hit them before their ring closes.`, true)
      maybeSong()
      delay = 1.1
    } else if (i > 0) {
      banner(`Wave ${i + 1}`, '', G.cfg.foes ? red : '190 100% 70%')
      status(`Wave ${i + 1}`)
      tell(`Wave ${i + 1}.`)
      delay = INT[intensity].banner ? 1 : 0.5
    }
    queueSpawn(delay)
  }
  function queueSpawn(sec) {
    if (G.pendingSpawn) return
    G.pendingSpawn = true
    later(onGrid(sec, 2) * 1000, () => { G.pendingSpawn = false; spawn() })
  }
  function spawn() {
    if (G.state !== 'wave') return
    const cfg = G.cfg
    if (G.spawned >= cfg.n || G.active.size >= cfg.at) return
    const k = pickTarget()
    if (!k) {
      if (++G.blind > 8) return pause('Paused · scroll back to the skills')
      return queueSpawn(0.4)
    }
    G.blind = 0
    light(k, G.plan[G.spawned++])
    if (G.spawned < cfg.n && G.active.size < cfg.at) queueSpawn(cfg.gap * rand(0.7, 1.3))
  }
  /* only skills fully on screen light up (clear of the bar on top and the readout below), spread out */
  let barH = 0
  function pickTarget() {
    const top = barH + 12, bottom = innerHeight - Math.max(110, hud.offsetHeight + 30), W = innerWidth, t = now() // clear of the readout
    const lit = [...G.active].map((a) => a.at).filter(Boolean)
    const seen = []
    for (const k of keys) {
      if (k.t || k.fly || k.cool > t) continue
      const r = k.label.getBoundingClientRect()
      if (r.width && r.top > top && r.bottom < bottom && r.left > 4 && r.right < W - 4) seen.push({ k, x: r.left + r.width / 2, y: r.top + r.height / 2 })
    }
    if (!seen.length) return null
    const far = seen.filter((c) => lit.every((l) => Math.hypot(l.x - c.x, l.y - c.y) > 150))
    const pool = far.length ? far : seen
    const c = pool[(Math.random() * pool.length) | 0]
    c.k.at = { x: c.x, y: c.y }
    return c.k
  }
  function light(k, kind) {
    const cfg = G.cfg, slow = G.kb ? 1.6 : 1, foe = isFoe(kind)
    let life = (foe ? cfg.aim * (kind === 'elite' ? 1.5 : 1) : kind === 'gold' ? cfg.life * 0.6 : cfg.life) * slow
    if (foe) life = onGrid(life, 1) // enemies fire on a beat
    const s = sec(), r = k.label.getBoundingClientRect()
    const c = colorOf(k, kind)
    const pad = k.ai ? 10 : 9
    const ring = fx('bl-ring' + (kind === 'elite' ? ' elite' : ''), layer, `--c:${c};left:${(r.left - s.left - pad).toFixed(1)}px;top:${(r.top - s.top - 5).toFixed(1)}px;width:${(r.width + pad * 2).toFixed(1)}px;height:${(r.height + 10).toFixed(1)}px`)
    const t = { k, kind, foe, hp: kind === 'elite' ? 3 : 1, at: k.at, ring, ids: [] }
    t.anim = ring.animate(rm
      ? [{ opacity: 1 }, { opacity: 0.3 }] // reduced motion: the ring dims instead of closing
      : [{ transform: 'scale(1.6)', opacity: 0 }, { transform: 'scale(1.45)', opacity: 1, offset: 0.08 }, { transform: 'scale(1)', opacity: 1 }],
    { duration: life * 1000, fill: 'forwards' })
    k.t = t
    k.label.classList.add(KIND[kind].cls)
    G.active.add(t)
    if (foe) {
      SFX.lockOn()
      t.ids.push(later(life * 700, () => { k.label.classList.add('bl-hot'); ring.classList.add('hot') }))
      t.ids.push(later(life * 1000, () => fire(t)))
      if (kind === 'elite' && !G.eliteSeen) { G.eliteSeen = true; status('<span class="foe">Elite</span> · takes 3 hits'); tell('An elite: it takes three hits.') }
    } else t.ids.push(later(life * 1000, () => expire(t)))
  }
  function endTarget(t, how) {
    t.ids.forEach(cancel)
    G.active.delete(t)
    const k = t.k
    k.t = null
    k.cool = now() + 1400
    k.label.classList.remove('bl-lit', 'bl-gold', 'bl-foe', 'bl-hot')
    const ring = t.ring, cs = getComputedStyle(ring) // carry on from where the closing ring is
    const tf = cs.transform === 'none' ? '' : cs.transform, op = +cs.opacity
    t.anim.cancel()
    const a = how === 'hit' && !rm
      ? ring.animate([{ transform: tf || 'none', opacity: op }, { transform: `${tf} scale(1.3)`, opacity: 0 }], { duration: 160, easing: 'ease-out' })
      : ring.animate([{ transform: tf || 'none', opacity: op * 0.8 }, { transform: tf || 'none', opacity: 0 }], { duration: 220 })
    done(a, ring)
  }
  function resolved() {
    if (G.state !== 'wave') return
    if (G.spawned >= G.cfg.n && !G.active.size) waveClear()
    else queueSpawn(G.cfg.gap * rand(0.4, 0.9))
  }
  function hitTarget(t, p) {
    const k = t.k
    if (t.kind === 'elite' && t.hp > 1) { // a shield goes
      t.hp--
      note(k, 0.7); SFX.clank()
      if (!rm) {
        const s = sec()
        sparks(p.x - s.left, p.y - s.top, 8, ['hsl(355 100% 70%)', '#fff'], 0.7)
        k.label.animate([{ transform: 'none' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 160 })
      }
      t.ring.animate([{ borderColor: '#fff' }, { borderColor: `hsl(${KIND.elite.c})` }], { duration: 220, composite: 'replace' })
      addScore(50, toSec(p), { c: KIND.elite.c })
      status(`<span class="foe">Elite</span> · ${t.hp} more`)
      return
    }
    endTarget(t, 'hit')
    G.combo++
    const m = multFor(G.combo)
    if (m > G.mult) { setMult(m); status(`<span class="good">Combo ×${m}</span>`); SFX.arp(['A5', 'D6'], 0.06, 0.5) }
    const pts = KIND[t.kind].pts * G.mult
    const b = blast(k, p, t.kind)
    note(k)
    if (t.foe) { SFX.boom(t.kind === 'elite' ? 2.4 : 2); SFX.chord(t.kind === 'elite' ? 11 : 0) }
    else if (t.kind === 'gold') { SFX.boom(1.3); SFX.arp(['D6', 'A6'], 0.07, 0.6) }
    else SFX.boom(1)
    addScore(pts, b, { c: b.c, mult: G.mult, big: t.foe || t.kind === 'gold' })
    tell(`${k.name}${t.foe ? ', down' : ''}. ${fmt(G.score)} points.`)
    resolved()
  }
  function expire(t) {
    endTarget(t, 'miss')
    breakCombo()
    resolved()
  }
  function fire(t) {
    const r = t.k.label.getBoundingClientRect()
    endTarget(t, 'fired')
    if (r.bottom < 0 || r.top > innerHeight) { resolved(); return } // off screen: it holds its fire
    SFX.fire()
    bolt(t.k, (x, y) => {
      if (playing()) damage(x, y)
      resolved()
    })
  }
  function damage(x, y) {
    const I = INT[intensity]
    G.hp--
    G.combo = 0
    setMult(1)
    drawHp()
    hud.classList.add('hurt')
    setTimeout(() => hud.classList.remove('hurt'), 450)
    vig.animate([{ opacity: 0 }, { opacity: I.crack ? 1 : 0.6, offset: 0.15 }, { opacity: 0 }], { duration: 520 })
    if (I.crack && !rm) crack(x, y)
    shake(I.shake * 1.2)
    SFX.hurt()
    if (G.hp <= 0) return gameOver()
    status(`<span class="foe">Hit</span> · health ${G.hp} of ${MAX_HP}`)
    tell(`You're hit. Health ${G.hp} of ${MAX_HP}.`, true)
  }
  function waveClear() {
    G.state = 'between'
    G.resumeTo = 'next'
    const bonus = 250 * (G.wave + 1)
    addScore(bonus)
    let healed = false
    if (G.hpOn && G.hp < MAX_HP) { G.hp++; healed = true; drawHp() }
    status(`<span class="good">Wave ${G.wave + 1} clear</span> · +${fmt(bonus)}${healed ? ' · +1 health' : ''}`)
    tell(`Wave ${G.wave + 1} clear. ${fmt(G.score)} points.`)
    SFX.arp(['D5', 'F5', 'A5', 'D6'], 0.09)
    later(1800, () => startWave(G.wave + 1))
  }
  function gameOver() {
    clearLater()
    watchOff()
    ;[...G.active].forEach((t) => endTarget(t, 'quiet'))
    G.state = 'over'
    const best = G.score > G.best
    if (best) { G.best = G.score; saveBest() }
    root.classList.remove('bl-on')
    banner('Game over', best ? 'New best' : `Best ${fmt(G.best)}`, '355 100% 64%')
    SFX.arp(['D5', 'C5', 'A4', 'F4', 'D4'], 0.17, 0.7)
    status(`<span class="foe">Game over</span> · <b>${fmt(G.score)}</b> · ${best ? '<span class="good">new best</span>' : `best ${fmt(G.best)}`} · shoot any skill to play again <a href="https://numberslayers.com" target="_blank" rel="noopener">Want more? Number Slayers ↗</a>`)
    tell(`Game over. ${fmt(G.score)} points${best ? ', a new best' : ''}. Shoot any skill to play again.`, true)
    later(1500, fadeSong)
  }
  function pause(msg) {
    if (!playing()) return
    const n = G.active.size
    clearLater()
    ;[...G.active].forEach((t) => endTarget(t, 'quiet'))
    if (G.state === 'wave') G.spawned = Math.max(0, G.spawned - n) // they come back on resume
    G.state = 'paused'
    watchOff()
    root.classList.remove('bl-on')
    status(msg)
    tell(msg.replace(' ·', '.'))
    later(6000, () => { if (G.state === 'paused') hudOff() }) // still reading? the readout gets out of the way
  }
  function resume() {
    clearLater()
    root.classList.add('bl-on')
    hudOn()
    if (G.resumeTo === 'next') startWave(G.wave + 1)
    else if (G.resumeTo === 'first') startWave(0)
    else { G.state = 'wave'; status(''); queueSpawn(0.6) }
    G.lastShot = now()
    watchOn()
  }
  function stop() {
    clearLater()
    watchOff()
    ;[...G.active].forEach((t) => endTarget(t, 'quiet'))
    if (G.score > G.best) { G.best = G.score; saveBest() }
    G.state = 'rest'
    root.classList.remove('bl-on')
    hudOff()
    fadeSong()
    tell(`Stopped. ${fmt(G.score)} points.`, true)
  }
  function resetRun() {
    clearLater()
    G.score = 0; G.combo = 0; G.wave = -1; G.hp = MAX_HP; G.hpOn = false; G.spawned = 0; G.blind = 0; G.eliteSeen = false
    setMult(1)
    hpEl.hidden = true
    scoreB.textContent = '0'
    waveB.textContent = '1'
  }
  /* nobody gets dragged in: a few seconds without a shot and the game pauses */
  function watchOn() {
    if (G.watch) return
    G.watch = setInterval(() => { if (playing() && now() - G.lastShot > (G.kb ? 9000 : 5000)) pause('Paused · shoot any skill to go on') }, 500)
  }
  function watchOff() { clearInterval(G.watch); G.watch = 0 }

  /* the soundtrack: Number Slayers comes in with the enemies (the mock bar can turn this off) */
  let songAtWave3 = true
  function maybeSong() {
    if (!songAtWave3 || muted || SITE_MUSIC.isPlaying()) return
    SITE_MUSIC.play(SONG.id)
    G.startedSong = true
  }
  function fadeSong() {
    if (!G.startedSong || !SITE_MUSIC.isPlaying()) { G.startedSong = false; return }
    G.startedSong = false
    const a = SITE_MUSIC.audio, v0 = a.volume
    for (let i = 1; i <= 10; i++) setTimeout(() => { a.volume = v0 * (1 - i / 10); if (i === 10) { a.pause(); a.volume = v0 } }, i * 100)
  }

  /* ---------- the readout ---------- */
  const hud = document.createElement('div')
  hud.className = 'bl-hud'
  hud.setAttribute('role', 'group')
  hud.setAttribute('aria-label', 'Skill blaster')
  hud.innerHTML = `
    <div class="r1">
      <button type="button" class="hbtn-ico bl-mute" aria-pressed="false" aria-label="Mute the game sounds">
        <svg class="on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>
        <svg class="off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>
      </button>
      <span class="bl-score" aria-hidden="true"><b>0</b><span class="bl-mult"></span></span>
      <span class="sep" aria-hidden="true"></span>
      <span class="bl-wave" aria-hidden="true"><span class="lbl">Wave </span><b>1</b></span>
      <span class="bl-hp" aria-hidden="true" hidden><span class="lbl">Health</span><span class="bar">${'<i></i>'.repeat(MAX_HP)}</span></span>
      <button type="button" class="hbtn-ico bl-stop" aria-label="Stop the game"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    </div>
    <div class="r2"></div>`
  root.appendChild(hud)
  const $ = (s) => hud.querySelector(s)
  const muteBtn = $('.bl-mute'), stopBtn = $('.bl-stop'), scoreB = $('.bl-score b'), multEl = $('.bl-mult'), waveB = $('.bl-wave b'), hpEl = $('.bl-hp'), r2 = $('.r2')
  const hpBars = [...hpEl.querySelectorAll('i')]
  const statusEl = document.createElement('span')
  const lockEl = document.createElement('span')
  lockEl.className = 'lock'
  lockEl.textContent = `On the beat · ${SONG.title}`
  lockEl.hidden = true
  let statusText = ''
  function status(html) { statusText = html; renderR2() }
  function renderR2() {
    statusEl.innerHTML = statusText
    r2.replaceChildren(...[statusText && statusEl, !lockEl.hidden && playing() && lockEl].filter(Boolean)) // the beat chip only while playing
  }
  function hudOn() { hud.classList.add('on') }
  function hudOff() { hud.classList.remove('on') }
  const toSec = (p) => { const s = sec(); return { x: p.x - s.left, y: p.y - s.top } }
  function addScore(pts, at, { c = '130 90% 60%', mult = 1, big = false } = {}) {
    G.score += pts
    scoreB.textContent = fmt(G.score)
    scoreB.classList.remove('bump'); void scoreB.offsetWidth; scoreB.classList.add('bump')
    if (at) floatPoints(at.x, at.y, `+${fmt(pts)}`, mult, c, big)
  }
  function setMult(m) { G.mult = m; multEl.textContent = m > 1 ? `×${m}` : '' }
  function drawHp() {
    hpBars.forEach((b, i) => b.classList.toggle('out', i >= G.hp))
    hpEl.classList.toggle('low', G.hp <= 2)
  }
  /* the live region, throttled so a fast run reads as a few updates, not a stream */
  let sayT = 0, sayLast = 0
  function tell(text, urgent) {
    clearTimeout(sayT)
    const wait = urgent ? 0 : Math.max(0, 1300 - (now() - sayLast))
    sayT = setTimeout(() => { sayLast = now(); say(text) }, wait)
  }
  muteBtn.addEventListener('click', () => {
    muted = !muted
    muteBtn.setAttribute('aria-pressed', String(muted))
    if (ac) master.gain.setTargetAtTime(muted ? 0 : 0.6, ac.currentTime, 0.05)
  })
  stopBtn.addEventListener('click', stop)

  /* ---------- input ---------- */
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-skill]')
    if (btn) return shootSkill(keyByEl.get(btn), e)
    if (!playing() || e.target.closest('.bl-hud, a, button, input, select')) return
    shootAir(e) // a shot at nothing, inside the section, while the game runs
  })
  keys.forEach((k) => k.el.addEventListener('keydown', (e) => { if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault() }))
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && G.state !== 'rest') { stop(); return }
    if ((e.key === 'l' || e.key === 'L') && G.state === 'wave' && root.contains(document.activeElement)) {
      const t = [...G.active][0] // the oldest lit skill
      if (!t) return
      e.preventDefault()
      t.k.el.focus({ preventScroll: true })
      say(`${t.k.name}${t.foe ? ', shoots back' : ''}`)
    }
  })

  /* ---------- the magnets: words lean toward the pointer (fine pointers, never with reduced motion) ---------- */
  const LEAN_R = 120, LEAN_PX = 4.5, LEAN_DEG = 7
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
  const ptr = { on: false, cx: 0, cy: 0, x: 0, y: 0 }
  let raf = 0, last = 0, visible = true
  function measure() { // layout reads, never in rAF
    keys.forEach((k) => { k.label.style.transform = ''; k.lx = k.ly = k.lr = k.ls = 0 })
    keys.forEach((k) => { const r = k.label.getBoundingClientRect(); k.cx = r.left + scrollX + r.width / 2; k.cy = r.top + scrollY + r.height / 2 })
    const bar = document.querySelector('.mock-bar') // the site's nav, in production
    barH = bar && getComputedStyle(bar).position === 'sticky' ? bar.offsetHeight : 0
  }
  function kick() { if (!raf && visible && !rm) { last = performance.now(); raf = requestAnimationFrame(frame) } }
  function frame(t) {
    raf = 0
    const dt = Math.min(0.033, Math.max(0.001, (t - last) / 1000))
    last = t
    const k1 = 1 - Math.exp(-dt * 14)
    let busy = false
    for (const k of keys) {
      let tx = 0, ty = 0, tr = 0, ts = 0
      if (ptr.on) {
        const dx = ptr.x - k.cx, dy = ptr.y - k.cy, d = Math.hypot(dx, dy)
        if (d < LEAN_R && d > 0.5) {
          const s = (1 - d / LEAN_R) ** 2
          tx = (dx / d) * LEAN_PX * s
          ty = (dy / d) * LEAN_PX * s
          let a = (Math.atan2(dy, dx) * 180) / Math.PI // a filing has no head or tail
          if (a > 90) a -= 180
          if (a < -90) a += 180
          tr = clamp(a * 0.2, -LEAN_DEG, LEAN_DEG) * s
          ts = 0.05 * s
        }
      }
      const nx = k.lx + (tx - k.lx) * k1, ny = k.ly + (ty - k.ly) * k1, nr = k.lr + (tr - k.lr) * k1, ns = k.ls + (ts - k.ls) * k1
      const settled = Math.abs(nx - tx) < 0.02 && Math.abs(ny - ty) < 0.02 && Math.abs(nr - tr) < 0.02 && Math.abs(ns - ts) < 0.0005
      const fx2 = settled ? tx : nx, fy = settled ? ty : ny, fr = settled ? tr : nr, fs = settled ? ts : ns
      if (fx2 !== k.lx || fy !== k.ly || fr !== k.lr || fs !== k.ls) {
        k.lx = fx2; k.ly = fy; k.lr = fr; k.ls = fs
        k.label.style.transform = fx2 || fy || fr || fs ? `translate3d(${fx2.toFixed(2)}px, ${fy.toFixed(2)}px, 0) rotate(${fr.toFixed(2)}deg) scale(${(1 + fs).toFixed(4)})` : ''
      }
      if (!settled) busy = true
    }
    if (busy && visible) raf = requestAnimationFrame(frame)
  }
  root.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !fine.matches || rm) return
    ptr.on = true; ptr.cx = e.clientX; ptr.cy = e.clientY; ptr.x = e.pageX; ptr.y = e.pageY
    kick()
  }, { passive: true })
  root.addEventListener('pointerleave', () => { ptr.on = false; kick() })
  addEventListener('scroll', () => { if (ptr.on) { ptr.x = ptr.cx + scrollX; ptr.y = ptr.cy + scrollY; kick() } }, { passive: true })

  /* off screen: the lean stops and the game pauses */
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting
    if (!visible) {
      if (raf) { cancelAnimationFrame(raf); raf = 0 }
      pause('Paused · shoot any skill to go on')
    }
  }).observe(root)
  /* a reflow moves the words: re-measure, and lit rings go (they come back on fresh skills) */
  let rT = 0, rw = 0
  new ResizeObserver(([entry]) => {
    const w = entry.contentRect.width
    if (Math.abs(w - rw) < 1) return
    rw = w
    clearTimeout(rT)
    rT = setTimeout(() => {
      measure()
      if (G.state === 'wave' && G.active.size) {
        const n = G.active.size
        ;[...G.active].forEach((t) => endTarget(t, 'quiet'))
        G.spawned = Math.max(0, G.spawned - n)
        queueSpawn(0.4)
      }
    }, 150)
  }).observe(root)
  document.fonts.ready.then(measure)
  measure()
  onReducedMotion((on) => {
    rm = on
    if (on) { ptr.on = false; keys.forEach((k) => { k.label.style.transform = ''; k.lx = k.ly = k.lr = k.ls = 0; land(k, true) }) }
  })

  /* ---------- the song: lock spawns to its beat while it plays (round 3's lock, simplified) ---------- */
  let resync = 0
  function lock() {
    init()
    songZero = ac.currentTime - SITE_MUSIC.audio.currentTime
    clearInterval(resync)
    resync = setInterval(() => { songZero = ac.currentTime - SITE_MUSIC.audio.currentTime }, 1000)
    lockEl.hidden = false
    renderR2()
  }
  function unlock() {
    songZero = null
    clearInterval(resync)
    lockEl.hidden = true
    renderR2()
  }

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
    const context = () => { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx }
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
      toggle() { calls.push(['toggle']); if (audio.paused) api.play(SONG.id); else { G.startedSong = false; audio.pause() } },
      isPlaying: () => !audio.paused,
      calls,
    }
    fab.addEventListener('click', () => api.toggle())
    return api
  })()

  /* ---------- mockup only: intensity, the soundtrack, and a skip to the enemies ---------- */
  const bar = document.querySelector('.mock-bar')
  const rmLabel = bar.querySelector('label')
  const extra = document.createElement('span')
  extra.style.cssText = 'display:inline-flex;align-items:center;gap:.25rem 1rem;flex-wrap:wrap'
  extra.innerHTML = `
    <label class="int">Intensity <select data-t="int"><option value="calm">Calm</option><option value="arcade" selected>Arcade</option><option value="max">Max</option></select></label>
    <label><input type="checkbox" data-t="song" checked> Song at wave 3</label>
    <button type="button" class="mb" data-t="w3">Jump to wave 3</button>`
  rmLabel.before(extra)
  extra.querySelector('[data-t="int"]').addEventListener('change', (e) => { intensity = e.target.value })
  extra.querySelector('[data-t="song"]').addEventListener('change', (e) => { songAtWave3 = e.target.checked })
  extra.querySelector('[data-t="w3"]').addEventListener('click', () => {
    init()
    resetRun()
    G.state = 'intro'
    root.classList.add('bl-on')
    hudOn()
    status('Skipped to the enemies')
    root.scrollIntoView({ block: 'start' })
    later(600, () => startWave(FIRST_FOE_WAVE))
    G.lastShot = now() + 600
    watchOn()
  })

  /* dev handle for checks */
  window.__bl = {
    G, keys, INT,
    get ac() { return ac }, active: () => active, made: () => made,
    set intensity(v) { intensity = v },
    light: (name, kind = 'mole') => { const k = keys.find((x) => x.name === name); G.state = 'wave'; G.cfg = G.cfg || waveCfg(2); light(k, kind); return k },
    startWave, stop, SITE_MUSIC,
    get songZero() { return songZero },
  }
})()
