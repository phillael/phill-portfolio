/*
 * The Sound lab: tune every sound in the Skill blaster and the Jelly resume.
 *
 *   Two banks, each an engine plus its SCHEMA (every setting, its range, its default):
 *     Skill blaster · ../skills-game/round6/synth.js, the game's own engine (the beat, autoplay, the chord)
 *     Jelly resume  · jelly-sfx.js, a port of src/lib/jelly/sfx.ts with its numbers as settings
 *   The controls are drawn from the schema. Every change is saved in this browser as what differs from the
 *   defaults (localStorage 'skill-synth-patch' and 'jelly-sfx-patch'); the Skill blaster mockup picks its
 *   patch up live, in another tab. Copy patch puts both on the clipboard, to hand back for the build.
 *
 *   One AudioContext, made on the first click. The scheduler (25 ms look-ahead) runs only while the beat
 *   is on; the scope draws only while something sounds, never with reduced motion, never in a hidden tab.
 */
(() => {
  const R = Math.round
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  const $ = (s, el = document) => el.querySelector(s)
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const rnd = (a) => a[(Math.random() * a.length) | 0]
  const rmQ = matchMedia('(prefers-reduced-motion: reduce)')
  const rm = () => rmQ.matches || document.documentElement.classList.contains('rm')
  const store = {
    get(k) { try { return localStorage.getItem(k) } catch { return null } },
    set(k, v) { try { localStorage.setItem(k, v) } catch { /* private mode */ } },
  }
  const liveEl = $('#live')
  const say = (t) => { liveEl.textContent = ''; setTimeout(() => { liveEl.textContent = t }, 30) }
  const lab = $('#lab'), panel = $('#panel'), parts = $('#parts')

  const rmBox = $('.mock-bar [data-t="rm"]')
  rmBox.checked = rm()
  rmBox.addEventListener('change', (e) => { document.documentElement.classList.toggle('rm', e.target.checked); if (rm()) stopScope() })

  /* ---------- the two banks ---------- */
  const SS = SKILL_SYNTH, JS = JELLY_SFX
  const { BEAT, SIX, BAR, PARTS, CHORDS, ON_8TH, BEATS } = SS
  const ORDER = Object.keys(PARTS) // Bass, Chords, Arp, Lead, Bleeps, Bells, Vox: keys 1–7
  const GROUPS = Object.fromEntries(SKILL_GROUPS.map((g) => [g.id, g]))
  const SKILLS = {} // group → [{ name, gi, frac }]: the same place-in-group the game uses
  ORDER.forEach((id) => { const s = GROUPS[id].skills; SKILLS[id] = s.map((x, gi) => ({ name: x.name, gi, frac: gi / Math.max(1, s.length - 1) })) })
  const DRUMS = [
    ['Kick', (D, t) => D.kick(t)], ['Snare', (D, t) => D.snare(t)], ['Ghost', (D, t, E) => D.snare(t, E.P.drums.ghost)],
    ['Hat', (D, t) => D.hat(t, 0.6)], ['Open hat', (D, t) => D.hat(t, 0.5, true)], ['Shaker', (D, t) => D.shaker(t, 0.6)],
    ['Ride', (D, t) => D.ride(t, 1)], ['Ride, soft', (D, t) => D.ride(t, 0.6)], ['Crash', (D, t) => D.crash(t, 1)], ['Crash, soft', (D, t) => D.crash(t, 0.7)],
    ['Boom', (D, t) => D.impact(t)], ['The drop (crash + boom)', (D, t) => { D.crash(t, 1); D.impact(t) }],
    ['Riser into the drop', (D, t) => { D.riser(t, t + 2 * BAR); D.crash(t + 2 * BAR, 1); D.impact(t + 2 * BAR) }],
  ]
  const BANKS = {
    skills: { id: 'skills', label: 'Skill blaster', S: SS, first: 'backend' },
    jelly: { id: 'jelly', label: 'Jelly resume', S: JS, first: 'moves' },
  }
  function fill(b, diff) { const d = b.S.defaults(), c = b.S.clean(diff); for (const id in d) Object.assign(b.cur[id], d[id], c[id] || {}); return c }
  for (const b of Object.values(BANKS)) {
    b.cur = b.S.defaults()
    fill(b, b.S.load())
    b.sel = store.get(`sound-lab-part-${b.id}`)
    if (!b.S.SPEC[b.sel]) b.sel = b.first
    b.E = null
    b.lastPad = {}
  }
  let bank = BANKS[store.get('sound-lab-bank')] || BANKS.skills
  const panelOf = (b = bank, id = b.sel) => b.S.SCHEMA.find((p) => p.id === id)
  const count = (d) => Object.values(d).reduce((n, o) => n + Object.keys(o).length, 0)

  /* ---------- audio ---------- */
  let ac = null, compare = false
  function ensure(b = bank) {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' })
    if (ac.state === 'suspended') ac.resume()
    if (!b.E) {
      b.E = b.S.create(ac, compare ? {} : b.S.diffOf(b.cur))
      if (b.id === 'skills') b.E.mbus.gain.value = 1 // the game fades this in with the beat; here it's always up
    }
    return b.E
  }
  /* the patch changed: the engine follows at once, the save waits a moment */
  function push(b) {
    const diff = b.S.diffOf(b.cur)
    if (b.E && !compare) b.E.setPatch(diff)
    clearTimeout(b.saveT)
    b.saveT = setTimeout(() => b.S.save(diff), 150)
    drawCounts()
  }
  function setCompare(on) {
    compare = on
    for (const b of Object.values(BANKS)) if (b.E) b.E.setPatch(on ? {} : b.S.diffOf(b.cur))
    const btn = $('#compare')
    btn.setAttribute('aria-pressed', String(on))
    lab.classList.toggle('comparing', on)
    status(on ? 'Hearing the original · your changes are kept' : 'Back to your sound')
  }

  /* ---------- the beat and autoplay (Skill blaster) ---------- */
  const L = { on: false, zero: 0, cursor: 0, timer: 0, level: 2, next: null, auto: false, busy: 0.5 }
  const pending = new Set()
  function at(t, fn) { const id = setTimeout(() => { pending.delete(id); fn() }, Math.max(0, (t - ac.currentTime) * 1000)); pending.add(id) }
  const q = (t, unit) => L.zero + Math.ceil((t - L.zero) / unit - 1e-6) * unit
  const mute = new Set(), solo = new Set()
  const audible = (g) => (solo.size ? solo.has(g) : !mute.has(g))
  const lastHit = {}
  function beatOn() {
    const E = ensure(BANKS.skills), t = ac.currentTime
    L.zero = t + 0.08; L.cursor = t; L.on = true
    clearInterval(L.timer)
    L.timer = setInterval(tick, 25)
    drawTransport()
    kickScope()
    E.mbus.gain.value = 1
  }
  function beatOff() {
    if (!L.on) return
    L.on = false; L.auto = false
    clearInterval(L.timer); L.timer = 0
    pending.forEach(clearTimeout); pending.clear()
    BANKS.skills.E.releaseAll(ac.currentTime + 0.25)
    drawTransport()
    beatLight(-1)
  }
  function tick() {
    const t0 = ac.currentTime, until = t0 + 0.12
    if (L.cursor < t0) L.cursor = t0
    for (let s = Math.ceil((L.cursor - L.zero) / SIX - 1e-6); ; s++) {
      const t = L.zero + s * SIX
      if (t >= until) break
      if (t >= L.cursor - 1e-6) step(s, t)
    }
    L.cursor = until
  }
  function step(s, t) {
    const E = BANKS.skills.E, bar = Math.floor(s / 16), pos = s % 16
    if (pos === 0 && L.next !== null) { L.level = L.next; L.next = null }
    if (audible('drums')) E.beat(L.level, bar, pos, t)
    if (L.auto && pos % 2 === 0) auto(bar, pos, t)
    if (pos % 4 === 0) at(t, () => beatLight(pos / 4))
  }
  /* autoplay: plays skills like a player would. A chord every two bars (silently, if Chords is muted, so
     the harmony still moves), the bass mostly on the beat when it's been quiet, the lead often, and the
     part you're looking at more than the rest */
  function auto(bar, pos, t) {
    const E = BANKS.skills.E
    if (pos === 0 && bar % 2 === 0) {
      const k = rnd(SKILLS.cloud)
      if (audible('cloud')) playSkill('cloud', k, t, 1)
      else { const ch = CHORDS[k.gi % CHORDS.length]; E.setChord(ch, t); at(t, () => showChord(ch)) }
      return
    }
    if (Math.random() > 0.1 + 0.55 * L.busy) return
    const pool = ORDER.filter((g) => g !== 'cloud' && audible(g))
    if (!pool.length) return
    const w = pool.map((g) => {
      let x = g === 'ai' ? 2.5 : g === 'backend' ? (t - (lastHit[g] ?? -1e9) > BAR ? 4 : 1.2) * (pos % 4 === 0 ? 1.6 : 0.4) : 1.2
      if (g === bank.sel && bank.id === 'skills') x *= 2.5
      return x
    })
    let r = Math.random() * w.reduce((a, b) => a + b, 0), g = pool[0]
    for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) { g = pool[i]; break } }
    playSkill(g, rnd(SKILLS[g]), ON_8TH[g] || Math.random() < 0.7 ? t : t + SIX, Math.random() < 0.8 ? 1 : 0.45)
  }
  function playSkill(g, k, t, v) {
    const ch = BANKS.skills.E.hit(g, k, t, v)
    lastHit[g] = t
    at(t, () => { flashSkill(g, k); if (ch) showChord(ch) })
    kickScope()
  }
  /* a click on a skill: on the grid while the beat plays (like the game), at once when it doesn't */
  function hitSkill(g, k, v) {
    ensure(BANKS.skills)
    const t0 = ac.currentTime + 0.012
    playSkill(g, k, L.on ? q(t0, ON_8TH[g] ? 2 * SIX : SIX) : t0, v)
  }

  /* ---------- the pads: what you can play in each panel ---------- */
  let pads = [], padVel = 1, preview = store.get('sound-lab-preview') !== '0'
  function padsFor(b, id) {
    if (b.id === 'skills') {
      if (PARTS[id]) return SKILLS[id].map((k) => ({ label: k.name, sub: id === 'cloud' ? CHORDS[k.gi % CHORDS.length].name : '', g: id, k }))
      if (id === 'drums') return DRUMS.map(([label, fn]) => ({ label, drum: fn }))
      if (id === 'laser') return [['Shot', 1], ['Rapid fire', 4], ['Machine gun', 10]].map(([label, n]) => ({ label, laser: n }))
      return ORDER.map((g) => ({ label: PARTS[g].label, g, any: true })) // Space: one of each part
    }
    return panelOf(b, id).pads.map(([label, cue, arg]) => ({ label, cue, arg }))
  }
  function playPad(p) {
    bank.lastPad[bank.sel] = p
    if (bank.id === 'jelly') {
      const E = ensure()
      if (p.cue === 'grow') growHole(E)
      else E.cue(p.cue, p.arg)
      flashPad(p)
      kickScope()
      return
    }
    if (p.laser) { // shots as fast as a mouse fires them
      const E = ensure(), t0 = ac.currentTime + 0.012
      for (let i = 0; i < p.laser; i++) E.laser(t0 + i * 0.11)
      flashPad(p)
      kickScope()
      return
    }
    if (p.drum) {
      const E = ensure(), t0 = ac.currentTime + 0.012, t = L.on ? q(t0, SIX) : t0
      p.drum(E.D, t, E)
      at(t, () => flashPad(p))
      kickScope()
      return
    }
    hitSkill(p.g, p.any ? rnd(SKILLS[p.g]) : p.k, padVel)
  }
  /* the black hole: its drone grows for three seconds (three gulps on the way), then collapses into the boom */
  let growT = 0
  function growHole(E) {
    clearInterval(growT)
    const t0 = performance.now()
    let gulps = 0
    growT = setInterval(() => {
      const s = (performance.now() - t0) / 3000
      if (s < 1) {
        E.hole(s)
        if (s > 0.2 + gulps * 0.25 && gulps < 3) { gulps++; E.cue('gulp') }
      } else { clearInterval(growT); E.hole(0); E.cue('boom') }
      kickScope()
    }, 50)
  }
  function flash(el) {
    if (!el) return
    el.classList.add('hot')
    setTimeout(() => el.classList.remove('hot'), 160)
  }
  function flashPad(p) { const i = pads.indexOf(p); if (i >= 0) flash(panel.querySelector(`.pad[data-i="${i}"]`)) }
  function flashSkill(g, k) {
    flash(parts.querySelector(`.prow[data-id="${g}"] .ptab`))
    if (bank.id !== 'skills') return
    if (bank.sel === g) flash(panel.querySelector(`.pad[data-i="${k.gi}"]`))
    else if (bank.sel === 'space') flash(panel.querySelector(`.pad[data-i="${ORDER.indexOf(g)}"]`))
  }
  /* let go of a slider: hear it again. A section that is one sound (a Jelly cue, a drum) plays that sound;
     otherwise the part's last pad */
  const DRUM_OF = { Kick: 'Kick', Snare: 'Snare', 'Hats and cymbals': 'Hat', Crash: 'Crash', Ride: 'Ride', Riser: 'Riser into the drop', Boom: 'Boom', 'The bus': 'Kick' }
  function replay(secEl) {
    if (bank.id === 'skills' && L.auto) return
    const sec = secEl && panelOf().sections[+secEl.dataset.sec]
    const own = sec && (sec.cue ? pads.find((p) => p.cue === sec.cue) : bank.sel === 'drums' ? pads.find((p) => p.label === DRUM_OF[sec.title]) : null)
    playPad(own || bank.lastPad[bank.sel] || pads[0])
  }

  /* ---------- values: how each setting reads, and its slider ---------- */
  const isLog = (p) => p.unit === 'hz' || !!p.log
  const toPos = (p, v) => (isLog(p) ? R((1000 * Math.log(v / p.min)) / Math.log(p.max / p.min)) : v)
  const dp = (step) => (String(step).split('.')[1] || '').length
  const fromPos = (p, x) => (isLog(p) ? +(p.min * (p.max / p.min) ** (x / 1000)).toPrecision(3) : +(+x).toFixed(dp(p.step || 0.001)))
  const frac = (p, v) => (isLog(p) ? Math.log(v / p.min) / Math.log(p.max / p.min) : (v - p.min) / (p.max - p.min))
  const same = (p, v) => (typeof p.def === 'number' ? Math.abs(v - p.def) < 1e-9 : v === p.def)
  const optLabel = (p, v) => (p.opts.find(([o]) => o === v) || [v, String(v)])[1]
  function fmtv(p, v) {
    if (p.opts) return optLabel(p, v)
    const sign = (x) => (x > 0 ? '+' : x < 0 ? '−' : '')
    switch (p.unit) {
      case 'hz': case 'hzl': return v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 1 : 2)} kHz` : `${v >= 100 ? R(v) : v.toFixed(1)} Hz`
      case 's': return v < 1 ? `${v < 0.01 ? (v * 1000).toFixed(1) : R(v * 1000)} ms` : `${v.toFixed(2)} s`
      case 'x': return `${v.toFixed(2)}×`
      case 'c': return `${R(v)}¢`
      case 'st': return `${sign(v)}${Math.abs(v).toFixed(Number.isInteger(v) ? 0 : 1)} st`
      case 'q': return v.toFixed(1)
      case 'pct': return `${R(v * 100)}%`
      case 'beats': return `${v} beat${v === 1 ? '' : 's'}`
      case 'bars': return `${v} bar${v === 1 ? '' : 's'}`
      case 'oct': return v === 0 ? '0' : `${sign(v)}${Math.abs(v)} oct`
      case 'stpm': return v === 0 ? 'None' : `±${v} st`
      case 'octpm': return v === 0 ? 'None' : `±${v} oct`
      case 'pan': return Math.abs(v) < 0.005 ? 'Center' : `${R(Math.abs(v) * 100)}% ${v < 0 ? 'L' : 'R'}`
      case 'db': return `${v} dB`
      case 'six': return v === 0 ? 'Off' : `${v} × 16th`
      case 'ratio': return `${v.toFixed(v >= 10 ? 1 : 2)}`
      case 'ratioSt': return `${sign(12 * Math.log2(v))}${Math.abs(12 * Math.log2(v)).toFixed(1)} st`
      case 'gain': return v.toFixed(3)
      case 'n': return p.min < 0 ? `${sign(v)}${Math.abs(v)}` : String(v)
      default: return v.toFixed(2)
    }
  }
  const RST = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 6.2A5 5 0 1 1 3 9.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M2.6 2.8v3.6h3.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  function ctlHTML(b, id, p) {
    const v = b.cur[id][p.k], uid = `c-${b.id}-${id}-${p.k.replace('.', '-')}`, ch = same(p, v) ? '' : ' changed'
    const rst = `<button type="button" class="rst" data-rst aria-label="Reset ${esc(p.label)} to ${esc(fmtv(p, p.def))}" title="Back to ${esc(fmtv(p, p.def))}">${RST}</button>`
    if (p.opts) {
      return `<fieldset class="seg${ch}" data-k="${p.k}"><legend><span>${esc(p.label)}</span>${rst}</legend><div class="opts">${p.opts.map(([o, lab]) =>
        `<label><input type="radio" name="${uid}" value="${esc(o)}"${o === v ? ' checked' : ''}><span>${esc(lab)}</span></label>`).join('')}</div></fieldset>`
    }
    const lg = isLog(p)
    return `<div class="ctl${ch}" data-k="${p.k}" style="--dn:${frac(p, p.def).toFixed(4)};--pn:${frac(p, v).toFixed(4)}">
      <div class="cl"><label for="${uid}">${esc(p.label)}</label><output for="${uid}">${esc(fmtv(p, v))}</output>${rst}</div>
      <div class="trk"><input type="range" id="${uid}" min="${lg ? 0 : p.min}" max="${lg ? 1000 : p.max}" step="${lg ? 1 : p.step || 'any'}" value="${toPos(p, v)}" aria-valuetext="${esc(fmtv(p, v))}"></div>
    </div>`
  }
  function paint(ctl) {
    const k = ctl.dataset.k, p = bank.S.SPEC[bank.sel][k], v = bank.cur[bank.sel][k]
    ctl.classList.toggle('changed', !same(p, v))
    if (p.opts) { ctl.querySelectorAll('input').forEach((i) => { i.checked = i.value === String(v) }); return }
    ctl.style.setProperty('--pn', frac(p, v).toFixed(4))
    ctl.querySelector('output').textContent = fmtv(p, v)
    const input = ctl.querySelector('input')
    input.setAttribute('aria-valuetext', fmtv(p, v))
    if (+input.value !== toPos(p, v)) input.value = toPos(p, v)
  }
  function setVal(ctl, v) {
    bank.cur[bank.sel][ctl.dataset.k] = v
    if (compare) setCompare(false)
    paint(ctl)
    push(bank)
  }

  /* ---------- drawing ---------- */
  function renderBank() {
    lab.dataset.bank = bank.id
    document.querySelectorAll('input[name="bank"]').forEach((i) => { i.checked = i.value === bank.id })
    parts.innerHTML = bank.S.SCHEMA.map((pn) => {
      const ms = bank.id === 'skills' && pn.id !== 'space' && pn.id !== 'laser'
      return `<div class="prow" data-id="${pn.id}" style="--c:${pn.c}">
        <button type="button" class="ptab" data-id="${pn.id}"><i class="dot" aria-hidden="true"></i><span class="pn">${esc(pn.label)}</span><span class="pg">${esc(pn.group)}</span><span class="pc"></span></button>
        ${ms ? msHTML(pn) : bank.id === 'skills' ? '<span class="ms gap" aria-hidden="true"></span><span class="ms gap" aria-hidden="true"></span>' : ''}
      </div>`
    }).join('')
    renderPanel()
    drawMS()
    drawTransport()
  }
  const msHTML = (pn) => `<button type="button" class="ms m" data-ms="m" data-g="${pn.id}" aria-pressed="false" aria-label="Mute ${esc(pn.label)}" title="Mute">M</button><button type="button" class="ms s" data-ms="s" data-g="${pn.id}" aria-pressed="false" aria-label="Solo ${esc(pn.label)}" title="Solo">S</button>`
  function renderPanel() {
    const b = bank, pn = panelOf()
    panel.style.setProperty('--c', pn.c)
    pads = padsFor(b, pn.id)
    parts.querySelectorAll('.ptab').forEach((el) => el.setAttribute('aria-current', String(el.dataset.id === pn.id)))
    const synthPart = b.id === 'skills' && PARTS[pn.id]
    const vel = synthPart ? `<div class="opts" role="radiogroup" aria-label="How hard">${[[1, 'Hit'], [0.45, 'Graze']].map(([v, l]) => `<label><input type="radio" name="vel" value="${v}"${padVel === v ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div>` : ''
    const hint = b.id === 'skills'
      ? (synthPart ? 'A hit is a lit skill; a graze is a shot at an unlit one (softer). ' : '') + 'Keys: 1–7 play a part · B the beat · A autoplay · O the original.'
      : 'Each one is what the 3D resume plays at that moment. O hears the original.'
    panel.innerHTML = `
      <div class="ph"><h2 class="pt" id="panel-h">${esc(pn.label)}</h2><span class="pg">${esc(pn.group)}</span>
        <div class="pact"><span class="nchg" id="nchg"></span>${b.id === 'skills' && pn.id !== 'space' && pn.id !== 'laser' ? msHTML(pn) : ''}<button type="button" class="tbtn" data-act="reset-part">Reset ${esc(pn.label)}</button></div>
      </div>
      <p class="about">${esc(pn.about)}</p>
      <div class="pads-box">
        <div class="pads-bar"><span>${synthPart ? 'Play a skill' : 'Play'}</span>${vel}<label class="chk"><input type="checkbox" id="preview"${preview ? ' checked' : ''}> Replay when I let go of a slider</label></div>
        <ul class="pads">${pads.map((p, i) => `<li><button type="button" class="pad" data-i="${i}">${esc(p.label)}${p.sub ? `<small>${esc(p.sub)}</small>` : ''}</button></li>`).join('')}</ul>
        <p class="hint">${hint}</p>
      </div>
      <div class="secs">${pn.sections.map((s, i) => `<div class="sec" data-sec="${i}" role="group" aria-labelledby="sec-${i}"><h3 id="sec-${i}">${esc(s.title)}</h3>${s.params.map((p) => ctlHTML(b, pn.id, p)).join('')}</div>`).join('')}</div>`
    lineEnds()
    drawCounts()
    drawMS()
  }
  /* the pads read like the site's lines: a dot between skills, none at the end of a line (layout reads, on render and resize only) */
  function lineEnds() {
    const items = [...panel.querySelectorAll('.pads li')]
    items.forEach((li) => li.classList.remove('eol'))
    items.forEach((li, i) => { const next = items[i + 1]; li.classList.toggle('eol', !!next && next.offsetTop > li.offsetTop + 4) })
  }
  let leT = 0
  addEventListener('resize', () => { clearTimeout(leT); leT = setTimeout(lineEnds, 120) })
  document.fonts.ready.then(lineEnds)
  function drawCounts() {
    const d = bank.S.diffOf(bank.cur)
    parts.querySelectorAll('.prow').forEach((row) => {
      const n = d[row.dataset.id] ? Object.keys(d[row.dataset.id]).length : 0
      row.querySelector('.pc').textContent = n || ''
      row.querySelector('.pc').setAttribute('aria-label', n ? `${n} changed` : '')
    })
    const n = d[bank.sel] ? Object.keys(d[bank.sel]).length : 0, nc = $('#nchg')
    if (nc) nc.textContent = n ? `${n} change${n === 1 ? '' : 's'}` : ''
    idle()
  }
  function drawMS() {
    document.querySelectorAll('.ms[data-ms]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.ms === 'm' ? mute : solo).has(b.dataset.g))))
    if (bank.id === 'skills') parts.querySelectorAll('.prow').forEach((row) => row.classList.toggle('off', row.dataset.id !== 'space' && row.dataset.id !== 'laser' && !audible(row.dataset.id)))
  }
  function drawTransport() {
    $('#beat').setAttribute('aria-pressed', String(L.on))
    $('#auto').setAttribute('aria-pressed', String(L.auto))
    $('#level').value = String(L.next ?? L.level)
  }
  const dots = [...document.querySelectorAll('.beats4 i')]
  function beatLight(i) { dots.forEach((d, j) => d.classList.toggle('on', j === i)) }
  function showChord(ch) { $('#chord').textContent = ch.name }

  /* the status line: what just happened, then how much you've changed */
  const st = $('#tstatus')
  let stT = 0, stHold = 0
  function status(text, kind = 'flash') {
    st.textContent = text
    st.className = `tstatus ${kind}`
    stHold = performance.now() + 2600
    clearTimeout(stT)
    stT = setTimeout(() => { stHold = 0; idle() }, 2600)
    say(text)
  }
  function idle() {
    if (performance.now() < stHold) return
    const n = Object.values(BANKS).map((b) => [b.label, count(b.S.diffOf(b.cur))])
    const total = n.reduce((a, [, c]) => a + c, 0)
    st.className = 'tstatus'
    st.textContent = total ? `Saved in this browser · ${n.filter(([, c]) => c).map(([l, c]) => `${l} ${c} change${c === 1 ? '' : 's'}`).join(' · ')}` : 'Nothing changed yet: this is the sound as it ships'
  }

  /* ---------- events ---------- */
  document.querySelectorAll('input[name="bank"]').forEach((i) => i.addEventListener('change', () => {
    if (!i.checked) return
    if (bank.id === 'skills' && L.on) beatOff()
    bank = BANKS[i.value]
    store.set('sound-lab-bank', bank.id)
    renderBank()
  }))
  parts.addEventListener('click', (e) => {
    const ms = e.target.closest('.ms[data-ms]')
    if (ms) return toggleMS(ms.dataset.ms, ms.dataset.g)
    const tab = e.target.closest('.ptab')
    if (!tab) return
    bank.sel = tab.dataset.id
    store.set(`sound-lab-part-${bank.id}`, bank.sel)
    renderPanel()
  })
  function toggleMS(kind, g) {
    const set = kind === 'm' ? mute : solo
    if (set.has(g)) set.delete(g); else set.add(g)
    drawMS()
    say(`${g === 'drums' ? 'Drums' : PARTS[g].label} ${kind === 'm' ? 'muted' : 'solo'} ${set.has(g) ? 'on' : 'off'}`)
  }
  panel.addEventListener('click', (e) => {
    const pad = e.target.closest('.pad')
    if (pad) return playPad(pads[+pad.dataset.i])
    const ms = e.target.closest('.ms[data-ms]')
    if (ms) return toggleMS(ms.dataset.ms, ms.dataset.g)
    const rst = e.target.closest('[data-rst]')
    if (rst) {
      const ctl = rst.closest('[data-k]'), p = bank.S.SPEC[bank.sel][ctl.dataset.k]
      setVal(ctl, p.def)
      ;(ctl.querySelector('input:checked') || ctl.querySelector('input')).focus()
      return
    }
    const act = e.target.closest('[data-act="reset-part"]')
    if (act) sure(act, `Sure? Reset ${panelOf().label}`, () => {
      Object.assign(bank.cur[bank.sel], bank.S.defaults()[bank.sel])
      push(bank)
      renderPanel()
      status(`${panelOf().label} is back to how it shipped`)
      $('[data-act="reset-part"]', panel).focus()
    })
  })
  panel.addEventListener('input', (e) => {
    const el = e.target
    if (el.type !== 'range') return
    const ctl = el.closest('.ctl')
    setVal(ctl, fromPos(bank.S.SPEC[bank.sel][ctl.dataset.k], +el.value))
  })
  panel.addEventListener('change', (e) => {
    const el = e.target
    if (el.id === 'preview') { preview = el.checked; store.set('sound-lab-preview', preview ? '1' : '0'); return }
    if (el.name === 'vel') { padVel = +el.value; return }
    const ctl = el.closest('[data-k]')
    if (!ctl) return
    if (el.type === 'radio') {
      const p = bank.S.SPEC[bank.sel][ctl.dataset.k]
      setVal(ctl, typeof p.def === 'number' ? +el.value : el.value)
    }
    if (preview) replay(el.closest('.sec')) // a slider let go (or a choice made): hear it
  })
  /* a destructive button asks once: the first press arms it for three seconds */
  function sure(btn, label, fn) {
    if (btn.classList.contains('sure')) { clearTimeout(btn._t); btn.classList.remove('sure'); btn.textContent = btn._label; fn(); return }
    btn._label = btn.textContent
    btn.classList.add('sure')
    btn.textContent = label
    btn._t = setTimeout(() => { btn.classList.remove('sure'); btn.textContent = btn._label }, 3000)
  }

  /* the transport */
  $('#level').innerHTML = BEATS.map((b, i) => `<option value="${i}">Wave ${i + 1}${i === BEATS.length - 1 ? '+' : ''} · ${esc(b.name)}</option>`).join('')
  $('#level').addEventListener('change', (e) => { const v = +e.target.value; if (L.on) L.next = v; else L.level = v })
  const toggleBeat = () => { if (L.on) beatOff(); else beatOn() }
  function toggleAuto() {
    L.auto = !L.auto
    if (L.auto && !L.on) beatOn()
    drawTransport()
    status(L.auto ? 'Autoplay on: it plays skills for you · the part you’re looking at plays most' : 'Autoplay off')
  }
  $('#beat').addEventListener('click', toggleBeat)
  $('#auto').addEventListener('click', toggleAuto)
  $('#busy').addEventListener('input', (e) => { L.busy = +e.target.value })
  $('#compare').addEventListener('click', () => { ensure(); setCompare(!compare) })
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
    const t = e.target
    if (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || (t.tagName === 'INPUT' && t.type === 'text')) return
    const key = e.key.toLowerCase()
    if (key === 'o') { ensure(); setCompare(!compare); return }
    if (bank.id !== 'skills') return
    if (key === 'b') toggleBeat()
    else if (key === 'a') toggleAuto()
    else if (/^[1-7]$/.test(key)) { const g = ORDER[+key - 1]; hitSkill(g, rnd(SKILLS[g]), padVel) }
  })

  /* copy, paste, reset */
  $('#copy').addEventListener('click', async () => {
    const all = {}
    for (const b of Object.values(BANKS)) { const d = b.S.diffOf(b.cur); if (count(d)) all[b.id] = d }
    const n = Object.values(all).reduce((a, d) => a + count(d), 0)
    const text = JSON.stringify(all, null, 2)
    try {
      await navigator.clipboard.writeText(text)
      status(n ? `Copied ${n} change${n === 1 ? '' : 's'} · paste them to Claude` : 'Copied · nothing’s changed yet, so it’s empty')
    } catch {
      openPaste(text)
      status('The clipboard is blocked here: copy the patch from the box', 'err')
    }
  })
  const pasteBox = $('#paste'), pasteT = $('#paste-t')
  function openPaste(text = '') {
    pasteBox.hidden = false
    $('#paste-open').setAttribute('aria-expanded', 'true')
    pasteT.value = text
    pasteT.focus()
    if (text) pasteT.select()
  }
  function closePaste() { pasteBox.hidden = true; $('#paste-open').setAttribute('aria-expanded', 'false'); $('#paste-open').focus() }
  $('#paste-open').addEventListener('click', () => (pasteBox.hidden ? openPaste() : closePaste()))
  $('#paste-cancel').addEventListener('click', closePaste)
  $('#paste-apply').addEventListener('click', () => {
    let d
    try { d = JSON.parse(pasteT.value || '{}') } catch { return status('That isn’t a patch (it has to be the JSON from Copy patch)', 'err') }
    let n = 0
    const wrapped = d && typeof d === 'object' && (d.skills || d.jelly)
    for (const b of wrapped ? Object.values(BANKS) : [bank]) {
      const part = wrapped ? d[b.id] : d
      if (wrapped && !part) continue
      n += count(fill(b, part))
      push(b)
    }
    if (!n) return status('Nothing in it matches a setting here', 'err')
    renderPanel()
    closePaste()
    status(`Applied ${n} change${n === 1 ? '' : 's'}`)
  })
  $('#reset-all').addEventListener('click', (e) => sure(e.currentTarget, `Sure? Reset every ${bank.label} sound`, () => {
    fill(bank, {})
    push(bank)
    renderPanel()
    status(`Every ${bank.label} sound is back to how it shipped`)
  }))
  /* another tab (another lab, or a paste there) changed a patch */
  addEventListener('storage', (e) => {
    const b = Object.values(BANKS).find((x) => x.S.KEY === e.key)
    if (!b) return
    fill(b, b.S.load())
    if (b.E && !compare) b.E.setPatch(b.S.diffOf(b.cur))
    if (b === bank) renderPanel()
    else drawCounts()
  })

  /* ---------- the scope: the output's waveform, while something sounds ---------- */
  const cv = $('#scope'), cx = cv.getContext('2d'), scopeEl = cv.parentElement
  let cw = 0, sraf = 0, quiet = 0, clipUntil = 0
  const buf = new Float32Array(2048)
  new ResizeObserver(([en]) => { cw = en.contentRect.width; cv.width = R(cw * devicePixelRatio); cv.height = R(en.contentRect.height * devicePixelRatio) }).observe(cv)
  function kickScope() { if (!sraf && cw && !rm() && !document.hidden) sraf = requestAnimationFrame(drawScope) }
  function stopScope() { if (sraf) cancelAnimationFrame(sraf); sraf = 0; cx.clearRect(0, 0, cv.width, cv.height) }
  function drawScope(ts) {
    sraf = 0
    const E = bank.E
    if (!E) return
    E.meter.getFloatTimeDomainData(buf)
    const W = cv.width, H = cv.height, dpr = devicePixelRatio
    let s0 = 0, peak = 0
    for (let i = 1; i < 1024; i++) if (buf[i - 1] < 0 && buf[i] >= 0) { s0 = i; break } // a rising zero crossing: the wave stands still
    for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]))
    cx.clearRect(0, 0, W, H)
    cx.beginPath()
    for (let i = 0; i <= 1000; i += 4) { const x = (i / 1000) * W, y = H / 2 - (buf[s0 + i] || 0) * (H / 2) * 0.92; if (i) cx.lineTo(x, y); else cx.moveTo(x, y) }
    const c = panelOf().c
    cx.lineWidth = 1.5 * dpr
    cx.strokeStyle = `hsl(${c})`
    cx.shadowColor = `hsl(${c} / .8)`
    cx.shadowBlur = 6 * dpr
    cx.stroke()
    if (peak > 0.98) clipUntil = ts + 900
    scopeEl.classList.toggle('clipping', ts < clipUntil)
    const busy = (bank.id === 'skills' && L.on) || E.active > 0
    if (busy) quiet = ts
    if (busy || ts - quiet < 400) sraf = requestAnimationFrame(drawScope)
    else cx.clearRect(0, 0, W, H)
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopScope(); else kickScope() })

  renderBank()
  idle()
  window.__lab = { BANKS, L, get bank() { return bank }, get ac() { return ac }, ensure, playPad, get pads() { return pads }, mute, solo, beatOn, beatOff, setCompare }
})()
