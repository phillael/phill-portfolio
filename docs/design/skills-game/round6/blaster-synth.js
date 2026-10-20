/*
 * Round 6 · Skill blaster, synth. Round 5's game and its drums, with every note now yours:
 *
 *   The beat  · the drums are the only thing that plays by itself (172 BPM liquid drum and bass,
 *               the same beat that builds each wave and drops at wave 3).
 *   Your notes · chords, bass, lead and the rest only sound when you hit a skill. Hitting a Cloud
 *               skill changes the chord (each one is a different chord in D minor), and everything
 *               after it is moved into that chord. Backend plays the bass, AI a synth lead (it glides
 *               between notes), Frontend an arpeggio, Quality bleeps, Product bells, Music & more
 *               vocal chops. All synths, all wet: a ping-pong delay on the dotted 8th and a long reverb.
 *   The conductor · what lights up follows the music: a chord when the harmony hasn't moved for two
 *               bars, the bass when it's been quiet for a bar, the lead often, the rest in between.
 *   One screen · when the game starts the section tightens to fit the screen (the header and the AI
 *               notes hide, the words slide into place). Where everything can't fit at a touch size
 *               (phones, short windows), groups fold to their heading for a wave and take turns.
 *               It all goes back when the game ends.
 *   The sounds · all synthesized live in synth.js (no samples). Tune them in the Sound lab
 *               (docs/design/sound-lab/); the game picks the patch up from this browser, live.
 *
 *   Audio: one AudioContext (the site player's; here the stand-in's). A 25 ms look-ahead
 *   scheduler runs only while the game plays. If the site's music is playing when the game
 *   starts, the game pauses it and hands it back when it stops.
 */
(() => {
  const { mount, say, reducedMotion, onReducedMotion } = SECTION2
  const S = mount({ title: 'Round 6 · Skill blaster, synth' })
  const root = S.root
  const back = document.querySelector('.mock-bar a')
  back.href = '../round5/blaster-band.html'
  back.textContent = '← Round 5'

  const rand = (a, b) => a + Math.random() * (b - a)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  const fmt = (n) => n.toLocaleString('en-US')
  const now = () => performance.now()
  const R = Math.round
  let rm = reducedMotion()

  /* ---------- the track: liquid drum and bass in D minor; the drums are the only part that plays by itself ---------- */
  // Every sound lives in synth.js, shared with the Sound lab (docs/design/sound-lab/): a patch tuned there is
  // saved in this browser and picked up here, live, even with the lab open in another tab
  const { BEAT, SIX, BAR, CHORDS, PARTS, BEATS, ON_8TH, hz, inChord } = SKILL_SYNTH
  const HEARD_BARS = 2 // a part counts in the band for two bars after you play it
  const ORDER = Object.keys(PARTS)
  const groupSize = {}
  S.words.forEach((w) => { groupSize[w.group] = (groupSize[w.group] || 0) + 1 })
  const per = {}
  const keys = S.words.map((w, idx) => {
    const i = (per[w.group] = (per[w.group] ?? -1) + 1)
    const label = w.ai ? w.el.querySelector('.sk-name') : w.el
    w.el.style.setProperty('--c', PARTS[w.group].c)
    return { ...w, idx, gi: i, frac: i / Math.max(1, groupSize[w.group] - 1), label, t: null, fly: null, cool: 0, cx: 0, cy: 0, lx: 0, ly: 0, lr: 0, ls: 0 }
  })
  const keyByEl = new Map(keys.map((k) => [k.el, k]))
  const headings = {}
  headings.ai = S.panel.querySelector('.sk-ai-head .sk-h')
  S.groups.forEach((g) => { headings[g.dataset.group] = g.querySelector('.sk-h') })
  ORDER.forEach((g) => headings[g].style.setProperty('--pc', PARTS[g].c))

  /* ---------- the audio: one engine (synth.js) on the site player's AudioContext ---------- */
  let E = null, ac = null, master = null, mbus = null, glitch = null, dbus = null, sfx = null, meter = null, I = null, D = null, mono = null
  let voice, osc, gain, filter, env, play, noiseSrc, release
  let muted = false
  function init() {
    if (E) { if (ac.state === 'suspended') ac.resume(); return }
    E = SKILL_SYNTH.create(SITE_MUSIC.context(), SKILL_SYNTH.load())
    ;({ ac, master, mbus, glitch, dbus, sfx, meter, I, D, mono, voice, osc, gain, filter, env, play, noiseSrc, release } = E)
    if (muted) E.setMuted(true)
  }
  addEventListener('storage', (e) => { if (e.key === SKILL_SYNTH.KEY && E) E.setPatch(SKILL_SYNTH.load()) })
  const levelFor = (wave) => Math.min(BEATS.length - 1, Math.max(0, wave))

  /* ---------- the clock: a look-ahead scheduler, only while the game plays ---------- */
  const M = { on: false, zero: 0, cursor: 0, timer: 0, level: 0, next: null, muteUntil: 0, fills: new Set(), dropBar: -1, last: {} }
  const part = {} // group → until when it counts in the band
  ORDER.forEach((g) => { part[g] = 0 })
  const barTime = (bar) => M.zero + bar * BAR
  const nextBar = (t) => Math.ceil((t - M.zero) / BAR - 1e-6)
  const q16 = (t) => M.zero + Math.ceil((t - M.zero) / SIX - 1e-6) * SIX
  const q8 = (t) => M.zero + Math.ceil((t - M.zero) / (2 * SIX) - 1e-6) * 2 * SIX
  /* the harmony is whatever chord you hit last (Dm9 until then) */
  const chordAt = (t) => E.chordAt(t)
  function onGrid(sec, div = 2) { // seconds until the first 8th (div 2) or beat (div 1) at least `sec` away
    if (!M.on) return sec
    const t0 = ac.currentTime, unit = BEAT / div
    return M.zero + Math.ceil((t0 + sec - M.zero) / unit) * unit - t0
  }
  const pending = new Set()
  function at(t, fn) { const id = setTimeout(() => { pending.delete(id); fn() }, Math.max(0, (t - ac.currentTime) * 1000)); pending.add(id) }

  function musicStart(level) {
    init()
    const t = ac.currentTime
    M.on = true; M.level = level; M.next = null; M.muteUntil = 0; M.fills.clear(); M.dropBar = -1; M.last = {}
    M.zero = t + 0.06
    M.cursor = t
    E.resetHarmony()
    ORDER.forEach((g) => { part[g] = 0 })
    for (const p of [mbus.gain, glitch.frequency]) p.cancelScheduledValues(t)
    glitch.frequency.setValueAtTime(18000, t)
    mbus.gain.setValueAtTime(0.3, t)
    mbus.gain.linearRampToValueAtTime(1, M.zero + BAR) // the first bar fades in
    clearInterval(M.timer)
    M.timer = setInterval(tick, 25)
    drawBand()
  }
  function musicStop(fade = 0.35) {
    if (!M.on) return
    M.on = false
    clearInterval(M.timer); M.timer = 0
    pending.forEach(clearTimeout); pending.clear()
    const t = ac.currentTime
    mbus.gain.cancelScheduledValues(t)
    mbus.gain.setValueAtTime(mbus.gain.value, t)
    mbus.gain.linearRampToValueAtTime(0, t + fade)
    for (const k of Object.keys(mono)) { release(mono[k], t + fade); delete mono[k] }
    ORDER.forEach((g) => { part[g] = 0 })
    drawBand()
  }
  function tick() {
    const t0 = ac.currentTime, until = t0 + 0.12
    if (M.cursor < t0) M.cursor = t0 // after a stall, skip the backlog rather than play it late
    for (let s = Math.ceil((M.cursor - M.zero) / SIX - 1e-6); ; s++) {
      const t = M.zero + s * SIX
      if (t >= until) break
      if (t >= M.cursor - 1e-6) step(s, t)
    }
    M.cursor = until
  }
  function step(s, t) {
    const bar = Math.floor(s / 16), pos = s % 16
    if (M.next && t >= M.next.t - 1e-4) { M.level = M.next.level; M.next = null }
    if (bar === M.dropBar - 1 && pos >= 12) { if (pos === 12) for (const k of Object.keys(mono)) release(mono[k], t); return } // the breath before the drop: everything stops for a beat
    if (t >= M.muteUntil - 1e-4) drums(bar, pos, t)
    if (pos % 4 === 0) at(t, drawBand) // parts leave the band on the beat
  }
  function drums(bar, pos, t) { E.beat(M.level, bar, pos, t, { drop: bar === M.dropBar, fill: M.fills.has(bar) }) }

  /* a shot at a skill plays its sound (synth.js: chords, bass and vox on the next 8th, the rest on the
     next 16th, every note moved into the chord you hit last); a lit one (`heard`) also counts in the band */
  function partHit(k, v = 1, heard = true) {
    if (!M.on || muted) { if (heard) hear(k.group); return }
    const t0 = ac.currentTime + 0.012, t = ON_8TH[k.group] ? q8(t0) : q16(t0)
    const ch = E.hit(k.group, k, t, v)
    if (ch) status(`<span style="color:hsl(${PARTS.cloud.c})">${ch.name}</span>`, false)
    glow(k.group, t)
    if (heard) hear(k.group, t)
  }
  let joinedOnce = false
  function hear(g, t = ac ? ac.currentTime : 0) {
    if (!M.on) return
    const was = part[g] > ac.currentTime
    part[g] = Math.max(part[g], t + HEARD_BARS * BAR)
    M.last[g] = t
    if (!was) {
      drawBand()
      const n = bandSize()
      if (n === 2 && !joinedOnce) { joinedOnce = true; status('Every group is its own sound · mix them for a bigger multiplier'); tell('Every group is its own sound. Mix them for a bigger multiplier.') }
    }
  }
  const bandSize = () => (ac ? ORDER.filter((g) => part[g] > ac.currentTime).length : 0)
  /* a group's heading pulses when it plays */
  function glow(g, t) {
    if (rm) return
    at(t, () => headings[g].animate([{ textShadow: `0 0 10px hsl(${PARTS[g].c}), 0 0 26px hsl(${PARTS[g].c})`, color: '#fff' }, {}], { duration: 360, easing: 'ease-out' }))
  }

  /* the game's own sounds (not in the track): the laser, booms, the enemy's lock-on and shot, a clank */
  const T = () => ac.currentTime + 0.005
  const SFX = {
    zap() {
      if (muted) return
      const t = T(), v = voice(sfx)
      const o = osc(v, 'triangle', 2600); o.frequency.exponentialRampToValueAtTime(320, t + 0.08)
      const g = gain(v); env(g.gain, t, 0.002, 0.03, 0.09)
      o.connect(g).connect(v.out)
      play([o], t, t + 0.1)
    },
    boom(size = 1) {
      if (muted) return
      const t = T(), v = voice(sfx), L = INT[intensity].loud
      const n = noiseSrc(v, t, 0.4 * size)
      const lp = filter(v, 'lowpass', 2200 + 1600 * size, 0.7)
      lp.frequency.setValueAtTime(2200 + 1600 * size, t); lp.frequency.exponentialRampToValueAtTime(90, t + 0.28 * size)
      const g = gain(v); env(g.gain, t, 0.002, 0.13 * size * L, 0.32 * size)
      n.connect(lp).connect(g).connect(v.out)
      const th = osc(v, 'sine', 120); th.frequency.exponentialRampToValueAtTime(36, t + 0.22 * size)
      const tg = gain(v); env(tg.gain, t, 0.002, 0.24 * Math.min(size, 2) * L, 0.26 * size)
      th.connect(tg).connect(v.out)
      play([th], t, t + 0.3 * size)
    },
    lockOn() {
      if (muted) return
      const t = T()
      ;[[880, 0], [1174.7, 0.07]].forEach(([f, d]) => {
        const v = voice(sfx), o = osc(v, 'sine', f), g = gain(v)
        env(g.gain, t + d, 0.002, 0.045, 0.06)
        o.connect(g).connect(v.out)
        play([o], t + d, t + d + 0.08)
      })
    },
    fire() {
      if (muted) return
      const t = T(), v = voice(sfx)
      const o = osc(v, 'sawtooth', 760); o.frequency.exponentialRampToValueAtTime(90, t + 0.28)
      const lp = filter(v, 'lowpass', 1800)
      const g = gain(v); env(g.gain, t, 0.004, 0.06, 0.3)
      o.connect(lp).connect(g).connect(v.out)
      play([o], t, t + 0.32)
    },
    scratch() { // getting hit: a scratch and a thud
      if (muted) return
      const t = T(), v = voice(sfx), L = INT[intensity].loud
      const n = noiseSrc(v, t, 0.3)
      const bp = filter(v, 'bandpass', 3200, 2.5)
      bp.frequency.setValueAtTime(3200, t); bp.frequency.exponentialRampToValueAtTime(260, t + 0.25)
      const g = gain(v); env(g.gain, t, 0.002, 0.2 * L, 0.27)
      n.connect(bp).connect(g).connect(v.out)
      const th = osc(v, 'sine', 90); th.frequency.exponentialRampToValueAtTime(30, t + 0.3)
      const tg = gain(v); env(tg.gain, t, 0.002, 0.36 * L, 0.34)
      th.connect(tg).connect(v.out)
      play([th], t, t + 0.36)
    },
    clank() {
      if (muted) return
      const t = T(), v = voice(sfx)
      const a = osc(v, 'sine', 1420), b = osc(v, 'sine', 2093)
      const g = gain(v); env(g.gain, t, 0.001, 0.06, 0.18)
      a.connect(g); b.connect(g); g.connect(v.out)
      play([a, b], t, t + 0.2)
    },
  }
  /* musical moments, on the grid */
  const MUS = {
    kill(elite) { // a crash (the skill plays its own sound too); an elite gets a fill first
      if (!M.on || muted) return
      const t = q16(ac.currentTime + 0.012)
      if (elite) { for (let i = 0; i < 4; i++) D.snare(t + i * SIX, 0.45 + i * 0.15); D.crash(t + BEAT, 1); D.kick(t + BEAT) } else D.crash(t, 0.7)
    },
    clear() { // wave clear: the chord you're on, as a bell run
      if (!M.on || muted) return
      const t = q16(ac.currentTime + 0.012), list = inChord(chordAt(t), 74, 90)
      list.slice(0, 5).forEach((m, i) => I.bell(hz(m), t + i * SIX, 0.6))
    },
    hurt() { // the track dips and the drums skip two beats
      if (!M.on) return
      const t = ac.currentTime
      glitch.frequency.cancelScheduledValues(t)
      glitch.frequency.setValueAtTime(18000, t)
      glitch.frequency.exponentialRampToValueAtTime(320, t + 0.08)
      glitch.frequency.setValueAtTime(320, t + BEAT)
      glitch.frequency.exponentialRampToValueAtTime(18000, t + BEAT + 0.45)
      M.muteUntil = q16(t) + 2 * BEAT
    },
    tapeStop() { // game over: the track winds down
      if (!M.on) return
      const t = ac.currentTime
      glitch.frequency.cancelScheduledValues(t)
      glitch.frequency.setValueAtTime(18000, t)
      glitch.frequency.exponentialRampToValueAtTime(140, t + 1.2)
      mbus.gain.cancelScheduledValues(t)
      mbus.gain.setValueAtTime(mbus.gain.value, t)
      mbus.gain.linearRampToValueAtTime(0, t + 1.4)
      M.muteUntil = t + 10
      if (!muted) {
        const v = voice(sfx), o = osc(v, 'sawtooth', 220), lp = filter(v, 'lowpass', 900), g = gain(v)
        o.frequency.exponentialRampToValueAtTime(30, t + 1.2)
        env(g.gain, t, 0.01, 0.07, 1.25)
        o.connect(lp).connect(g).connect(v.out)
        play([o], t, t + 1.3)
      }
    },
  }

  /* ---------- the intensity setting (the mock bar): how big the explosions and the shake are ---------- */
  const INT = {
    calm: { force: 0.6, sparks: 0.5, beam: 0, bloom: 0, shake: 0, crack: false, banner: false, wave: 0.75, loud: 0.6 },
    arcade: { force: 1, sparks: 1, beam: 1, bloom: 1, shake: 5, crack: true, banner: true, wave: 1, loud: 1 },
    max: { force: 1.5, sparks: 1.8, beam: 2, bloom: 2, shake: 11, crack: true, banner: true, wave: 1.4, loud: 1.25 },
  }
  let intensity = 'arcade'

  /* ---------- the effect layers (round 4's) ---------- */
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
  const reticle = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g fill="none" stroke-linecap="round"><g stroke="#00131a" stroke-width="3.6"><circle cx="16" cy="16" r="8.5"/><path d="M16 2.5v6M16 23.5v6M2.5 16h6M23.5 16h6"/></g><g stroke="#80eaff" stroke-width="1.6"><circle cx="16" cy="16" r="8.5"/><path d="M16 2.5v6M16 23.5v6M2.5 16h6M23.5 16h6"/></g></g><circle cx="16" cy="16" r="1.7" fill="#fff"/></svg>`
  root.style.setProperty('--reticle', `url("data:image/svg+xml,${encodeURIComponent(reticle)}") 16 16, crosshair`)

  const sec = () => root.getBoundingClientRect()
  const centerOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }
  const glowCss = (c, m = 1) => `0 0 ${6 * m}px hsl(${c}), 0 0 ${18 * m}px hsl(${c} / .8)`
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
    const IN = INT[intensity]
    const fl = fx('bl-flash', screen, `left:${p.x}px;top:${p.y}px`)
    done(fl.animate(rm ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 200, easing: 'ease-out' }), fl)
    SFX.zap()
    if (rm || !IN.beam) return
    const W = innerWidth, H = innerHeight
    const from = IN.beam === 2 ? [[W * 0.2, H + 6], [W * 0.8, H + 6]] : [[W / 2, H + 6]]
    for (const [ox, oy] of from) {
      const dx = p.x - ox, dy = p.y - oy, a = (Math.atan2(dy, dx) * 180) / Math.PI
      const el = fx('bl-beam' + (IN.beam === 2 ? ' max' : ''), screen, `left:${ox}px;top:${oy}px;width:${Math.hypot(dx, dy).toFixed(0)}px`)
      done(el.animate([
        { transform: `rotate(${a}deg) scaleX(0)`, opacity: 1 },
        { transform: `rotate(${a}deg) scaleX(1)`, opacity: 1, offset: 0.35 },
        { transform: `rotate(${a}deg) scaleX(1)`, opacity: 0 },
      ], { duration: 160, easing: 'ease-out' }), el)
    }
  }
  /* a word bursts into its letters, which fly, then snap back into place like magnets */
  function explode(k, ix, iy, force, color, shadow, from = { dx: 0, dy: 0 }) {
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
      let dx = x + from.dx + r.width / 2 - ix, dy = y + from.dy + r.height / 2 - iy
      const d = Math.hypot(dx, dy) || 1
      dx /= d; dy /= d
      const near = Math.max(0.4, 1 - d / 260) // the letters by the hit fly hardest
      const speed = rand(320, 580) * force * near
      let vx = dx * speed + rand(-90, 90) * force, vy = dy * speed * 0.6 - rand(240, 440) * force
      const spin = rand(-760, 760) * force
      const T1 = rand(0.4, 0.56), Dur = T1 + 0.62, N = 6, h = T1 / N
      let px = from.dx, py = from.dy, pa = 0
      const frames = [{ offset: 0, transform: `translate(${px.toFixed(1)}px,${py.toFixed(1)}px) rotate(0deg) scale(1)`, easing: 'linear' }]
      for (let j = 1; j <= N; j++) {
        for (let q = 0; q < 4; q++) { const dt = h / 4; vx *= 1 - 2.2 * dt; vy += 1500 * dt; vy *= 1 - 1.2 * dt; px += vx * dt; py += vy * dt; pa += spin * dt }
        frames.push({ offset: (j * h) / Dur, transform: `translate(${px.toFixed(1)}px,${py.toFixed(1)}px) rotate(${pa.toFixed(0)}deg) scale(1.12)`, easing: j === N ? 'cubic-bezier(.55,0,.25,1.18)' : 'linear' })
      }
      frames.push({ offset: 1, transform: `translate(0px,0px) rotate(${Math.round(pa / 360) * 360}deg) scale(1)` }) // home the short way round
      anims.push(sp.animate(frames, { duration: Dur * 1000, fill: 'both' }))
      longest = Math.max(longest, Dur)
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
      const c = PARTS[k.group].c
      k.label.animate([{ textShadow: '0 0 0 transparent' }, { textShadow: `0 0 14px hsl(${c}), 0 0 2px #fff`, offset: 0.3 }, { textShadow: '0 0 0 transparent' }], { duration: 500, easing: 'ease-out' })
    }
  }

  const KIND = {
    mole: { pts: 100, sparks: 10, cls: 'bl-lit' },
    gold: { pts: 500, sparks: 16, cls: 'bl-gold', c: '45 100% 62%' },
    foe: { pts: 300, sparks: 22, cls: 'bl-foe', c: '355 100% 64%' },
    elite: { pts: 1000, sparks: 30, cls: 'bl-foe', c: '355 100% 64%' },
  }
  const colorOf = (k, kind) => KIND[kind].c || PARTS[k.group].c
  const isFoe = (kind) => kind === 'foe' || kind === 'elite'
  /* a hit: the explosion, sized by what it was and the intensity */
  function blast(k, p, kind, from) {
    const IN = INT[intensity], s = sec()
    const x = p.x - s.left, y = p.y - s.top
    const c = colorOf(k, kind), big = isFoe(kind)
    if (rm) { // nothing flies: the word flashes where it is
      k.label.animate([{ color: '#fff', textShadow: glowCss(c, 1.4) }, { color: '#fff', textShadow: glowCss(c, 1.4), offset: 0.5 }, {}], { duration: 700 })
      return { x, y, c }
    }
    const letter = big ? 'hsl(355 100% 92%)' : kind === 'gold' ? 'hsl(48 100% 90%)' : '#fff'
    explode(k, x, y, IN.force * (big ? 1.35 : 1), letter, glowCss(c), from)
    sparks(x, y, R(KIND[kind].sparks * IN.sparks), [`hsl(${c})`, '#fff', big ? 'hsl(25 100% 65%)' : 'hsl(190 100% 80%)'], big ? 1.4 : 1)
    pulse('bl-shock', x, y, c, (big ? 3.2 : 1.9) * IN.wave, big ? 520 : 420)
    if (IN.bloom === 2 || (IN.bloom && big)) pulse('bl-bloom', x, y, c, big ? 1.8 : 1.15, 320)
    if (big) shake(IN.shake * (kind === 'elite' ? 1.4 : 1))
    else if (IN.bloom === 2) shake(2.5)
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
  const loadBest = () => { try { return +localStorage.getItem('skill-blaster-band-best') || 0 } catch { return 0 } }
  const saveBest = () => { try { localStorage.setItem('skill-blaster-band-best', String(G.best)) } catch { /* private mode */ } }

  const G = {
    state: 'rest', // rest · intro · wave · between · paused · over
    score: 0, best: loadBest(), wave: -1, cfg: null, plan: [], spawned: 0, active: new Set(),
    hp: MAX_HP, hpOn: false, lastShot: 0, kb: false, pausedSite: false, pendingSpawn: false, watch: 0, blind: 0, resumeTo: 'wave', eliteSeen: false,
  }
  const playing = () => ['intro', 'wave', 'between'].includes(G.state)
  const timers = new Set()
  function later(ms, fn) { const id = setTimeout(() => { timers.delete(id); fn() }, Math.max(0, ms)); timers.add(id); return id }
  function cancel(id) { clearTimeout(id); timers.delete(id) }
  function clearLater() { timers.forEach(clearTimeout); timers.clear(); G.pendingSpawn = false }
  const untilBar = (bar) => (barTime(bar) - ac.currentTime) * 1000

  function shootSkill(k, e) {
    init()
    const kb = e.detail === 0 // Enter or Space
    const p = kb ? centerOf(k.label) : { x: e.clientX, y: e.clientY }
    shotFx(p)
    G.lastShot = now()
    if (G.state === 'rest' || G.state === 'over') return begin(k, p, kb)
    if (kb) G.kb = true
    if (G.state === 'paused') { const from = armArena(k); resume(); freeHit(k, p, from); return }
    if (k.t) return hitTarget(k.t, p)
    graze(k)
  }
  function shootAir(e) {
    init()
    shotFx({ x: e.clientX, y: e.clientY })
    G.lastShot = now()
  }

  /* the first shot: the discovery. The beat starts with it; the first wave comes in on the next bar */
  function begin(k, p, kb) {
    resetRun()
    G.kb = kb
    if (SITE_MUSIC.isPlaying()) { SITE_MUSIC.pause(); G.pausedSite = true } // one track at a time
    root.classList.add('bl-on')
    hudOn()
    const from = armArena(k)
    musicStart(0)
    freeHit(k, p, from)
    G.state = 'intro'
    status('<span class="good">Nice shot</span> · hit the lit skills')
    tell(`Skill blaster. A beat starts; hit the skills that light up to play over it. Escape stops.${kb ? ' Press L to jump to a lit skill.' : ''}`, true)
    G.resumeTo = 'first'
    later(untilBar(1), () => startWave(0))
    watchOn()
  }
  function freeHit(k, p, from) { // a hit with nothing lit: the discovery shot, or the shot that resumes
    const b = blast(k, p, 'mole', from)
    partHit(k)
    addScore(100, b, { c: b.c })
    k.cool = now() + 1200
  }
  function graze(k) { // a skill that isn't lit: its part plays softly, nothing else
    partHit(k, 0.45, false)
    if (!rm) k.label.animate([{ transform: 'none' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'none' }], { duration: 180 })
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
    if (root.classList.contains('bl-staged')) restage(i)
    const red = '355 100% 64%'
    if (G.cfg.foes && !G.hpOn) {
      G.hpOn = true
      hpEl.hidden = false
      drawHp()
      banner(`Wave ${i + 1}`, 'They shoot back', red)
      status('<span class="foe">Red ones shoot back</span> · get them before the ring closes')
      tell(`Wave ${i + 1}, the drop. Red skills shoot back: hit them before their ring closes.`, true)
    } else if (i > 0) {
      banner(`Wave ${i + 1}`, BEATS[levelFor(i)].name, G.cfg.foes ? red : '190 100% 70%')
      status(`Wave ${i + 1} · ${BEATS[levelFor(i)].name}`)
      tell(`Wave ${i + 1}.`)
    }
    queueSpawn(i > 0 && INT[intensity].banner ? 0.9 : 0.3)
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
  /* only skills fully on screen light up (clear of the bar on top and the readout below), spread out,
     and weighted by what the music needs next (the conductor) */
  let barH = 0
  function need(g) {
    if (!M.on) return 1
    const t = ac.currentTime, since = (x) => t - (M.last[x] ?? -1e9)
    if (g === 'cloud') return [...G.active].some((a) => a.k.group === 'cloud') ? 0 : since('cloud') > 2 * BAR ? 8 : since('cloud') > BAR ? 1.5 : 0.25 // a chord when the harmony has sat for two bars
    if (g === 'backend') return [...G.active].some((a) => a.k.group === 'backend') ? 0.5 : since('backend') > BAR ? 4 : 1.5 // the bass when it's been quiet for a bar
    if (g === 'ai') return 2.5 // the lead, often
    return 1.2
  }
  function pickTarget() {
    const hb = hud.classList.contains('on') ? hud.getBoundingClientRect().top - 4 : innerHeight - 110
    const top = barH + 12, bottom = Math.min(innerHeight - 8, hb), W = innerWidth, t = now()
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
    const w = pool.map((c) => need(c.k.group))
    let r = Math.random() * w.reduce((a, b) => a + b, 0), c = pool[(Math.random() * pool.length) | 0]
    for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) { c = pool[i]; break } }
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
      partHit(k, 0.7)
      SFX.clank()
      if (!rm) {
        const s = sec()
        sparks(p.x - s.left, p.y - s.top, 8, ['hsl(355 100% 70%)', '#fff'], 0.7)
        k.label.animate([{ transform: 'none' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 160 })
      }
      t.ring.animate([{ borderColor: '#fff' }, { borderColor: `hsl(${KIND.elite.c})` }], { duration: 220 })
      addScore(50, toSec(p), { c: KIND.elite.c })
      status(`<span class="foe">Elite</span> · ${t.hp} more`)
      return
    }
    endTarget(t, 'hit')
    const b = blast(k, p, t.kind)
    partHit(k) // the part joins (or stays) before the points are counted
    const band = Math.max(1, bandSize())
    const pts = KIND[t.kind].pts * band
    if (t.foe) { SFX.boom(t.kind === 'elite' ? 2.2 : 1.8); MUS.kill(t.kind === 'elite') }
    else if (t.kind === 'gold') { SFX.boom(0.8); MUS.clear() }
    addScore(pts, b, { c: b.c, mult: band, big: t.foe || t.kind === 'gold' })
    tell(`${k.name}${t.foe ? ', down' : ''}. ${fmt(G.score)} points.`)
    resolved()
  }
  function expire(t) {
    endTarget(t, 'miss')
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
    const IN = INT[intensity]
    G.hp--
    drawHp()
    hud.classList.add('hurt')
    setTimeout(() => hud.classList.remove('hurt'), 450)
    vig.animate([{ opacity: 0 }, { opacity: IN.crack ? 1 : 0.6, offset: 0.15 }, { opacity: 0 }], { duration: 520 })
    if (IN.crack && !rm) crack(x, y)
    shake(IN.shake * 1.2)
    SFX.scratch()
    if (G.hp <= 0) return gameOver()
    MUS.hurt()
    status(`<span class="foe">Hit</span> · health ${G.hp} of ${MAX_HP}`)
    tell(`You're hit. Health ${G.hp} of ${MAX_HP}.`, true)
  }
  /* a wave clear: the next wave comes in on a bar, after a fill (or a riser and a drop into wave 3) */
  function waveClear() {
    G.state = 'between'
    G.resumeTo = 'next'
    const bonus = 250 * (G.wave + 1)
    addScore(bonus)
    let healed = false
    if (G.hpOn && G.hp < MAX_HP) { G.hp++; healed = true; drawHp() }
    status(`<span class="good">Wave ${G.wave + 1} clear</span> · +${fmt(bonus)}${healed ? ' · +1 health' : ''}`)
    tell(`Wave ${G.wave + 1} clear. ${fmt(G.score)} points.`)
    MUS.clear()
    toWave(G.wave + 1)
  }
  function toWave(next) {
    const level = levelFor(next), drop = level === 2 && M.level < 2
    const startBar = nextBar(ac.currentTime + 0.05) + (drop ? 2 : 1)
    if (drop) { M.dropBar = startBar; D.riser(barTime(startBar - 2), barTime(startBar)) } else M.fills.add(startBar - 1)
    M.next = { t: barTime(startBar), level }
    later(untilBar(startBar), () => startWave(next))
  }
  function gameOver() {
    clearLater()
    watchOff()
    ;[...G.active].forEach((t) => endTarget(t, 'quiet'))
    G.state = 'over'
    const best = G.score > G.best
    if (best) { G.best = G.score; saveBest() }
    root.classList.remove('bl-on')
    MUS.tapeStop()
    later(1500, () => { musicStop(0.05); handBack() })
    later(12000, () => { if (G.state === 'over') { G.state = 'rest'; hudOff(); arenaOff() } }) // no second go: back to the list
    banner('Game over', best ? 'New best' : `Best ${fmt(G.best)}`, '355 100% 64%')
    status(`<span class="foe">Game over</span> · <b>${fmt(G.score)}</b> · ${best ? '<span class="good">new best</span>' : `best ${fmt(G.best)}`} · shoot any skill to play again <a href="https://numberslayers.com" target="_blank" rel="noopener">Want more? Number Slayers ↗</a>`)
    tell(`Game over. ${fmt(G.score)} points${best ? ', a new best' : ''}. Shoot any skill to play again.`, true)
  }
  function pause(msg) {
    if (!playing()) return
    const n = G.active.size
    clearLater()
    ;[...G.active].forEach((t) => endTarget(t, 'quiet'))
    if (G.state === 'wave') G.spawned = Math.max(0, G.spawned - n) // they come back on resume
    G.state = 'paused'
    watchOff()
    musicStop(0.6)
    root.classList.remove('bl-on')
    status(msg)
    tell(msg.replace(' ·', '.'))
    later(6000, () => { if (G.state === 'paused') { hudOff(); arenaOff() } }) // still reading? the readout and the arena get out of the way
  }
  function resume() { // the beat starts again with the shot that resumes; waves pick up on the next bar
    clearLater()
    root.classList.add('bl-on')
    hudOn()
    musicStart(levelFor(Math.max(0, G.wave)))
    if (G.resumeTo === 'next' || G.resumeTo === 'first') {
      const next = G.resumeTo === 'first' ? 0 : G.wave + 1
      G.state = 'between'
      M.next = { t: barTime(1), level: levelFor(next) }
      later(untilBar(1), () => startWave(next))
    } else { G.state = 'wave'; status(''); queueSpawn(0.6) }
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
    musicStop(0.3)
    hudOff()
    arenaOff()
    handBack()
    tell(`Stopped. ${fmt(G.score)} points.`, true)
  }
  function handBack() { if (G.pausedSite) { G.pausedSite = false; SITE_MUSIC.resume() } } // the site's music comes back
  function resetRun() {
    clearLater()
    G.score = 0; G.wave = -1; G.hp = MAX_HP; G.hpOn = false; G.spawned = 0; G.blind = 0; G.eliteSeen = false
    joinedOnce = false
    hpEl.hidden = true
    scoreB.textContent = '0'
    waveB.textContent = '1'
    setMult(1)
  }
  /* nobody gets dragged in: a few seconds without a shot and the game (and the beat) pauses */
  function watchOn() {
    if (G.watch) return
    G.watch = setInterval(() => { if (playing() && now() - G.lastShot > (G.kb ? 9000 : 5000)) pause('Paused · shoot any skill to go on') }, 500)
  }
  function watchOff() { clearInterval(G.watch); G.watch = 0 }

  /* ---------- one screen: the arena ---------- */
  // When the game starts, the section tightens to fit the screen: the header and the AI notes hide and
  // the words slide into place (FLIP). If it still doesn't fit (phones, short windows), groups fold to
  // their heading for a wave and take turns. Everything goes back when the game ends.
  const groupEl = { ai: S.panel }
  S.groups.forEach((g) => { groupEl[g.dataset.group] = g })
  ORDER.forEach((g) => headings[g].setAttribute('data-n', groupSize[g]))
  const STAGE_ORDER = ['cloud', 'ai', 'backend', 'frontend', 'quality', 'product', 'music']
  const arenaOnNow = () => root.classList.contains('bl-arena')
  const flipEls = () => [...keys.map((k) => k.label), ...ORDER.map((g) => headings[g])]
  function snapshot() { return new Map(flipEls().map((el) => [el, el.getBoundingClientRect()])) }
  function flipFrom(before, skip) {
    if (rm) return
    for (const [el, r0] of before) {
      if (el === skip) continue
      const r1 = el.getBoundingClientRect()
      if (!r1.width) continue
      if (!r0.width) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' }); continue }
      const dx = r0.left - r1.left, dy = r0.top - r1.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
      el.animate([{ transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)` }, { transform: 'translate(0, 0)' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)', composite: 'add' })
    }
  }
  function setStage(open) {
    for (const g of ORDER) groupEl[g].classList.toggle('bl-folded', !!open && !open.includes(g))
  }
  function fitArena(wave = 0) {
    const avail = innerHeight - barH - 6
    root.classList.remove('bl-staged')
    setStage(null)
    root.style.setProperty('--fit', 1)
    if (innerWidth >= 700) { // desktop: tighten the type a little if needed
      for (const f of [1, 0.94, 0.88, 0.82, 0.76]) { root.style.setProperty('--fit', f); if (root.offsetHeight <= avail) return }
    }
    // still too tall: some groups fold to their heading for this wave, taking turns. Every wave opens
    // one of chords, bass or lead first, then as many of the others as fit
    root.classList.add('bl-staged')
    const core = ['cloud', 'backend', 'cloud', 'ai', 'backend', 'ai'][wave % 6], others = STAGE_ORDER.filter((g) => g !== core) // the drop (wave 3) gets the chords
    const order = [core, ...others.map((_, i) => others[(i + 2 * wave) % others.length])]
    const open = []
    for (const g of order) {
      setStage([...open, g])
      if (!open.length || root.offsetHeight <= avail) open.push(g)
    }
    setStage(open)
  }
  function arenaOn() {
    if (arenaOnNow()) return
    const before = snapshot()
    root.classList.add('bl-arena')
    fitArena(Math.max(0, G.wave))
    scrollTo({ top: root.getBoundingClientRect().top + scrollY - barH, behavior: 'instant' })
    measure()
    flipFrom(before)
  }
  /* the arena forms around the word you just hit: returns where that word was, so its letters fly from there */
  function armArena(k) {
    if (arenaOnNow()) return undefined
    const r0 = k.label.getBoundingClientRect(), before = snapshot()
    root.classList.add('bl-arena')
    fitArena(Math.max(0, G.wave))
    scrollTo({ top: root.getBoundingClientRect().top + scrollY - barH, behavior: 'instant' })
    measure()
    flipFrom(before, k.label)
    const r1 = k.label.getBoundingClientRect()
    return { dx: r0.left - r1.left, dy: r0.top - r1.top }
  }
  function restage(wave) { // a new wave on a phone: a quick fade to the next groups (behind the wave's banner)
    const list = root.querySelector('.sk-list')
    if (rm) { fitArena(wave); measure(); return }
    list.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' }).onfinish = (e) => {
      fitArena(wave)
      measure()
      e.target.cancel()
      list.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' })
    }
  }
  function arenaOff() {
    if (!arenaOnNow()) return
    const before = snapshot(), r0 = root.getBoundingClientRect()
    root.classList.remove('bl-arena', 'bl-staged')
    setStage(null)
    root.style.removeProperty('--fit')
    if (r0.bottom > 0 && r0.top < innerHeight) scrollBy(0, root.getBoundingClientRect().top - r0.top) // on screen: its top stays put (off screen, scroll anchoring keeps the page still)
    measure()
    flipFrom(before)
  }

  /* ---------- the readout ---------- */
  const hud = document.createElement('div')
  hud.className = 'bl-hud'
  hud.setAttribute('role', 'group')
  hud.setAttribute('aria-label', 'Skill blaster')
  hud.innerHTML = `
    <div class="r1">
      <button type="button" class="hbtn-ico bl-mute" aria-pressed="false" aria-label="Mute the game and its beat">
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
  const bandEl = document.createElement('span')
  bandEl.className = 'bl-band'
  bandEl.setAttribute('aria-hidden', 'true')
  bandEl.innerHTML = `Band <span class="pips">${ORDER.map((g) => `<i style="--c:${PARTS[g].c}" title="${PARTS[g].label}"></i>`).join('')}</span>`
  const pips = Object.fromEntries(ORDER.map((g, i) => [g, bandEl.querySelectorAll('i')[i]]))
  const statusEl = document.createElement('span')
  let statusText = '', holdUntil = 0
  function status(html, important = true) { // the band's joins and drops never cover a hit, a wave or a pause
    if (!important && now() < holdUntil) return
    if (important && html) holdUntil = now() + 1800
    statusText = html
    renderR2()
  }
  function renderR2() {
    statusEl.innerHTML = statusText
    r2.replaceChildren(...[G.state !== 'rest' && bandEl, statusText && statusEl].filter(Boolean))
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
  function setMult(m) { multEl.textContent = m > 1 ? `×${m}` : '' }
  /* the band (the parts heard in the last two bars), as lights in the readout and lit headings */
  function drawBand() {
    const t = ac ? ac.currentTime : 0
    let n = 0
    for (const g of ORDER) {
      const on = M.on && part[g] > t + 0.01
      if (on) n++
      pips[g].classList.toggle('on', on)
      headings[g].classList.toggle('bl-live', on)
    }
    setMult(n)
  }
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
    if (E) E.setMuted(muted)
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

  /* off screen: the lean stops and the game (and its beat) pauses */
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
      if (arenaOnNow()) fitArena(Math.max(0, G.wave))
      measure()
      if (G.state === 'wave' && G.active.size) {
        const n = G.active.size
        ;[...G.active].forEach((t) => endTarget(t, 'quiet'))
        G.spawned = Math.max(0, G.spawned - n)
        queueSpawn(0.4)
      }
    }, 150)
  }).observe(root)
  let hT = 0
  addEventListener('resize', () => { clearTimeout(hT); hT = setTimeout(() => { if (arenaOnNow()) { fitArena(Math.max(0, G.wave)); measure() } }, 200) })
  document.fonts.ready.then(measure)
  measure()
  onReducedMotion((on) => {
    rm = on
    if (on) { ptr.on = false; keys.forEach((k) => { k.label.style.transform = ''; k.lx = k.ly = k.lr = k.ls = 0; land(k, true) }) }
  })

  /* ---------- mockup only: the stand-in for the site's one music player ---------- */
  const SITE_MUSIC = (() => {
    const SONG = { id: 'number-slayers', title: 'Number Slayers', audioUrl: '/audio/number-slayers.mp3' }
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
    audio.addEventListener('playing', () => { sync(); if (playing()) { G.pausedSite = false; pause('Paused · the music player is on') } }) // one track at a time
    audio.addEventListener('pause', sync)
    audio.addEventListener('ended', sync)
    const api = {
      audio,
      context,
      play(id = SONG.id) {
        calls.push(['play', id])
        route()
        if (!audio.src) audio.src = '/public' + SONG.audioUrl
        context().resume()
        audio.play().catch(sync)
      },
      pause() { calls.push(['pause']); audio.pause() },
      resume() { calls.push(['resume']); api.play() },
      toggle() { calls.push(['toggle']); if (audio.paused) api.play(); else audio.pause() },
      isPlaying: () => !audio.paused,
      calls,
    }
    fab.addEventListener('click', () => api.toggle())
    return api
  })()

  /* ---------- mockup only: intensity, and a ride up the riser into wave 3 ---------- */
  const bar = document.querySelector('.mock-bar')
  const rmLabel = bar.querySelector('label')
  const extra = document.createElement('span')
  extra.style.cssText = 'display:inline-flex;align-items:center;gap:.25rem 1rem;flex-wrap:wrap'
  extra.innerHTML = `
    <label class="int">Intensity <select data-t="int"><option value="calm">Calm</option><option value="arcade" selected>Arcade</option><option value="max">Max</option></select></label>
    <button type="button" class="mb" data-t="w3">Jump to wave 3</button>
    <a class="mb" href="../../sound-lab/index.html" target="_blank" rel="noopener">Sound lab ↗</a>`
  rmLabel.before(extra)
  extra.querySelector('[data-t="int"]').addEventListener('change', (e) => { intensity = e.target.value })
  extra.querySelector('[data-t="w3"]').addEventListener('click', () => {
    init()
    if (playing() || G.state === 'paused') stop()
    resetRun()
    if (SITE_MUSIC.isPlaying()) { SITE_MUSIC.pause(); G.pausedSite = true }
    G.state = 'between'
    G.resumeTo = 'next'
    G.wave = FIRST_FOE_WAVE - 1
    root.classList.add('bl-on')
    hudOn()
    status('Skipping ahead · the riser into the drop')
    arenaOn()
    musicStart(1)
    toWave(FIRST_FOE_WAVE)
    G.lastShot = now() + 3000
    watchOn()
  })

  /* dev handle for checks */
  window.__bl = {
    G, M, keys, part, INT, CHORDS, chordAt: (t) => chordAt(t ?? ac.currentTime), get mono() { return mono }, get E() { return E },
    get ac() { return ac }, active: () => (E ? E.active : 0), made: () => (E ? E.made : 0), bandSize,
    set intensity(v) { intensity = v },
    level: (l) => { M.level = l },
    meter() { // RMS and peak of the last 2048 samples at the output
      if (!meter) return null
      const a = new Float32Array(meter.fftSize)
      meter.getFloatTimeDomainData(a)
      let s = 0, p = 0
      for (const x of a) { s += x * x; p = Math.max(p, Math.abs(x)) }
      return { rms: +Math.sqrt(s / a.length).toFixed(4), peak: +p.toFixed(3) }
    },
    startWave, stop, musicStart, musicStop, SITE_MUSIC, arenaOn, arenaOff, fitArena,
    drums: (on) => { dbus.gain.value = on ? E.P.drums.bus : 0 }, // checks only: solo the synths
    pick: () => { const k = pickTarget(); return k && k.group }, need,
  }
})()
