/*
 * Scoreboard, round 1 · the all-time top 10 at game over. Phill's calls (2026-10-21):
 *   · one board, all time;
 *   · anyone can put a run on it and see their rank ("#212 of 413"); each player once, with their best run;
 *   · their name, then city and country, prefilled from where they are (Vercel's IP geolocation) and editable;
 *   · a profanity filter at entry (type "badword" to see it), and a removal script for anything that slips through.
 *
 * Two looks (the mock bar):
 *   A · The readout grows · the board opens out of the readout, where it sits (bottom-centre). The list stays live
 *       behind it, so a shot at any skill plays again.
 *   B · Centre stage · a dialog in the middle of the screen, the page dimmed behind it. Close it to play again.
 *
 * The backend is faked: API stands in for GET and POST /api/skills/scores (in memory, ~450 ms a call). "Your" entry
 * and the name you typed are kept in this browser, so "Game over at 3,200" after a save shows a run under your best.
 *
 *   SCOREBOARD.attach({ root, hud, onClose })   game.js, once, with the section and its readout
 *   SCOREBOARD.open({ score, wave, best, kb })   at game over (1.5 s in: the music has faded, the list is back)
 *   SCOREBOARD.close(silent?)                    ✕, Esc, a new game (silent: no onClose), the section scrolling away
 */
window.SCOREBOARD = (() => {
  const { say, esc, reducedMotion } = SECTION2
  const fmt = (n) => n.toLocaleString('en-US')
  const EASE = 'cubic-bezier(.2, .7, .2, 1)'
  const LS = { profile: 'sb-mock-profile', mine: 'sb-mock-mine', look: 'sb-mock-look' }
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null } }
  const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)) } catch {} }

  /* ---------- countries: ISO codes, named by the browser (production ships the list of codes; the server checks it) ---------- */
  const DN = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' })
  const NOT_COUNTRIES = new Set(['EU', 'EZ', 'UN', 'QO', 'XA', 'XB', 'ZZ', 'AC', 'CP', 'CQ', 'DG', 'EA', 'IC', 'TA'])
  const COUNTRIES = []
  for (let a = 65; a < 91; a++) for (let b = 65; b < 91; b++) {
    const c = String.fromCharCode(a, b)
    if (NOT_COUNTRIES.has(c) || Intl.getCanonicalLocales(`und-${c}`)[0] !== `und-${c}`) continue
    const name = DN.of(c)
    if (name && name !== c) COUNTRIES.push([c, name])
  }
  COUNTRIES.sort((x, y) => x[1].localeCompare(y[1]))
  const countryName = (c) => DN.of(c) || c
  const placeOf = (e) => (e.city ? (e.country ? `${e.city}, ${e.country}` : e.city) : e.country ? countryName(e.country) : '')

  /* ---------- where the visitor is (production: Vercel's x-vercel-ip-city / x-vercel-ip-country, read by the API) ---------- */
  const GEO = { lisbon: { city: 'Lisbon', country: 'PT' }, austin: { city: 'Austin', country: 'US' }, none: { city: '', country: '' } }
  let geo = GEO.lisbon

  /* ---------- the fake backend ---------- */
  const TOP = [
    ['Kenji', 'Osaka', 'JP', 61850], ['María José', 'Bogotá', 'CO', 48200], ['ade.codes', 'Lagos', 'NG', 41730],
    ['Lukas', 'Berlin', 'DE', 33400], ['Priya', 'Bengaluru', 'IN', 27960], ['sam', 'Toronto', 'CA', 22150],
    ['Chloé', 'Lyon', 'FR', 18640], ['tomás', 'Montevideo', 'UY', 15300], ['Hana', 'Seoul', 'KR', 12980],
    ['riffraff', 'Melbourne', 'AU', 11200],
  ]
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const entries = TOP.map(([name, city, country, score], i) => ({ id: `t${i}`, name, city, country, score, at: i }))
  for (let i = 0; i < 402; i++) entries.push({ id: `r${i}`, name: 'player', city: '', country: '', score: Math.round((300 + 10500 * rnd() ** 2.2) / 10) * 10, at: 10 + i })
  const saved = read(LS.mine)
  if (saved) entries.push({ ...saved, mine: true })
  const BAD = /badword|poop|butt/i // a stand-in for the real filter (the obscenity package, on the server)
  const NAME_OK = /^[\p{L}\p{N} ._'’-]+$/u

  const byScore = (a, b) => b.score - a.score || a.at - b.at // a tie: the earlier run stays ahead
  const mineOf = () => entries.find((e) => e.mine) || null
  /** where a score would land; `without` leaves your old entry out (a new best replaces it) */
  const rankOf = (score, without) => 1 + entries.filter((e) => e !== without && e.score >= score).length
  const API = {
    offline: false,
    wait: () => new Promise((r) => setTimeout(r, 450)),
    async board() {
      await API.wait()
      if (API.offline) throw new Error('offline')
      return { top: [...entries].sort(byScore).slice(0, 10), total: entries.length, mine: mineOf() }
    },
    async save({ score, name, city, country }) {
      await API.wait()
      if (API.offline) throw new Error('offline')
      if (BAD.test(name)) return { error: 'name' }
      const old = mineOf()
      if (old) entries.splice(entries.indexOf(old), 1)
      const e = { id: 'me', name, city, country, score, at: Date.now(), mine: true }
      entries.push(e)
      write(LS.mine, { id: e.id, name, city, country, score, at: e.at })
      return { rank: rankOf(score, e) }
    },
  }

  /* ---------- the board ---------- */
  let look = read(LS.look) === 'b' ? 'b' : 'a'
  let ctx = null // { root, hud, onClose }
  let el = null, dim = null, run = null, lastFocus = null, savedNow = false

  const X_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
  function shell() {
    const again = look === 'a' ? 'Shoot any skill to play again' : 'Close this, then shoot any skill to play again'
    return `
      <div class="sb-top">
        <span class="sb-over">Game over</span>
        <button type="button" class="hbtn-ico sb-x" aria-label="Close the scoreboard">${X_ICON}</button>
      </div>
      <div class="sb-you"><b class="sb-score">${fmt(run.score)}</b><span class="sb-rank"></span></div>
      <h3 class="sb-h" id="sb-h" tabindex="-1">Top 10 · all time</h3>
      <ol class="sb-list" role="list" aria-labelledby="sb-h"></ol>
      <p class="sb-foot"><span>${again}</span><a href="https://numberslayers.com" target="_blank" rel="noopener">Want more? Number Slayers ↗</a></p>`
  }
  const $ = (s) => el.querySelector(s)

  function open(r) {
    close(true)
    run = r
    savedNow = false
    lastFocus = document.activeElement
    el = document.createElement('div')
    el.className = `sb sb-${look}`
    el.innerHTML = shell()
    $('.sb-x').addEventListener('click', () => close())
    if (look === 'a') {
      el.setAttribute('role', 'region')
      el.setAttribute('aria-labelledby', 'sb-h')
      ctx.hud.classList.add('sb-grown')
      ctx.hud.appendChild(el)
    } else {
      el.setAttribute('role', 'dialog')
      el.setAttribute('aria-modal', 'true')
      el.setAttribute('aria-labelledby', 'sb-h')
      dim = document.createElement('div')
      dim.className = 'sb-dim'
      dim.addEventListener('click', () => close())
      document.body.append(dim, el)
      el.addEventListener('keydown', trap)
    }
    loading()
    enter()
    if (look === 'b') $('.sb-h').focus({ preventScroll: true }) // a dialog takes focus (its heading: no keyboard pops up on a phone)
    load()
  }

  function close(silent = false) {
    if (!el) return
    const gone = el, gDim = dim
    el = dim = null
    if (silent || reducedMotion()) { gone.remove(); gDim?.remove() } else {
      gone.animate([{ opacity: 1 }, { opacity: 0, transform: look === 'a' ? 'translateY(6px)' : 'scale(.98)' }], { duration: 180, easing: EASE }).onfinish = () => gone.remove()
      gDim?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180 }).addEventListener('finish', () => gDim.remove())
    }
    ctx.hud.classList.remove('sb-grown')
    if (gone.contains(document.activeElement) || look === 'b') (lastFocus?.isConnected ? lastFocus : document.getElementById('skills-h'))?.focus({ preventScroll: true })
    if (!silent) ctx.onClose()
  }

  /* the entrance: A grows out of the readout (from its pill to the board, anchored at the bottom); B rises in the middle */
  function enter() {
    const parts = el.querySelectorAll('.sb-top, .sb-you, .sb-h, .sb-list, .sb-foot')
    if (reducedMotion()) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 }); return }
    if (look === 'a') {
      const h = ctx.hud.getBoundingClientRect(), b = el.getBoundingClientRect() // layout reads once, at open
      const top = Math.max(0, b.height - h.height), side = Math.max(0, (b.width - h.width) / 2)
      el.animate([{ clipPath: `inset(${top}px ${side}px 0 round 26px)` }, { clipPath: 'inset(0 0 0 0 round 22px)' }], { duration: 420, easing: EASE })
    } else {
      dim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260 })
      el.animate([{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: EASE })
    }
    parts.forEach((n, i) => n.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 120 + i * 40, easing: EASE, fill: 'backwards' }))
  }

  function loading() {
    el.classList.add('sb-loading')
    $('.sb-list').innerHTML = Array.from({ length: 10 }, (_, i) => `<li class="sb-row sb-ghost" aria-hidden="true"><i class="gn"></i><i class="gw" style="--w:${(i * 37) % 30}%"></i><i class="gp"></i></li>`).join('')
  }

  async function load() {
    try {
      const b = await API.board()
      if (el) render(b)
    } catch {
      if (el) offline()
    }
  }

  function offline() {
    el.classList.remove('sb-loading')
    $('.sb-rank').textContent = ''
    $('.sb-list').innerHTML = `<li class="sb-off"><p>The scoreboard didn’t load.</p><p class="sub">Your best, ${fmt(Math.max(run.score, Number(localStorage.getItem('skill-blaster-best')) || 0))}, is saved on this device.</p><button type="button" class="sb-retry">Try again</button></li>`
    $('.sb-retry').addEventListener('click', () => { loading(); load() })
    say('The scoreboard didn’t load.')
  }

  const rowHtml = (e, n, me) => `
    <li class="sb-row${me ? ' sb-me' : ''}"${me ? ' tabindex="-1"' : ''}>
      <span class="sb-n">${n}</span>
      <span class="sb-who"><span class="sb-name">${esc(e.name)}</span>${me ? '<span class="sb-tag">You</span>' : ''}<span class="sb-from">${esc(placeOf(e))}</span></span>
      <span class="sb-pts">${fmt(e.score)}</span>
    </li>`
  const GAP = '<li class="sb-gap" aria-hidden="true">· · ·</li>'

  function formHtml(n) {
    const p = read(LS.profile) || {}
    const city = p.city ?? geo.city, country = p.country ?? geo.country
    const opts = COUNTRIES.map(([c, name]) => `<option value="${c}"${c === country ? ' selected' : ''}>${esc(name)}</option>`).join('')
    return `
      <li class="sb-row sb-me sb-edit">
        <form class="sb-form" novalidate>
          <span class="sb-n">${n}</span>
          <label class="sb-f sb-fname"><span class="sr">Your name</span><input name="name" maxlength="16" placeholder="Your name" autocomplete="nickname" enterkeyhint="done" spellcheck="false" value="${esc(p.name || '')}" aria-describedby="sb-err"></label>
          <span class="sb-pts">${fmt(run.score)}</span>
          <span class="sb-place">
            <label class="sb-f sb-fcity"><span class="sr">City (optional)</span><input name="city" maxlength="24" placeholder="City" autocomplete="address-level2" value="${esc(city)}"></label>
            <label class="sb-f sb-fcountry"><span class="sr">Country</span><select name="country"><option value="">Country</option>${opts}</select></label>
          </span>
          <button type="submit" class="sb-save">Save</button>
          <p class="sb-err" id="sb-err" role="alert"></p>
        </form>
      </li>`
  }

  function render(b) {
    el.classList.remove('sb-loading')
    const mine = b.mine
    const canSave = !savedNow && (!mine || run.score > mine.score)
    const total = b.total + (canSave && !mine ? 1 : 0)
    const rank = rankOf(run.score, canSave ? mine : null)
    const rankEl = $('.sb-rank')
    let html = ''
    if (canSave) {
      const others = b.top.filter((e) => e !== mine)
      const rows = others.map((e, i) => rowHtml(e, i + 1 + (i + 1 >= rank ? 1 : 0), false))
      if (rank <= 10) { rows.splice(rank - 1, 0, formHtml(rank)); html = rows.slice(0, 10).join('') } else html = rows.slice(0, 10).join('') + GAP + formHtml(rank)
      rankEl.innerHTML = rank === 1 ? `<span class="gold">A new #1</span> of ${fmt(total)}` : `#${fmt(rank)} of ${fmt(total)}${run.best ? ' · <span class="good">new best</span>' : ''}`
    } else {
      const myRank = mine ? rankOf(mine.score, mine) : 0
      const inTop = mine && myRank <= 10
      html = b.top.map((e, i) => rowHtml(e, i + 1, e === mine)).join('') + (mine && !inTop ? GAP + rowHtml(mine, fmt(myRank), true) : '')
      rankEl.innerHTML = savedNow ? `<span class="good">Saved</span> · you’re #${fmt(myRank)} of ${fmt(total)}` : `#${fmt(rank)} of ${fmt(total)} · your best, ${fmt(mine.score)}, is #${fmt(myRank)}`
    }
    const list = $('.sb-list')
    list.innerHTML = html
    list.style.setProperty('--nw', String(Math.max(2, ...[...list.querySelectorAll('.sb-n')].map((n) => n.textContent.length))))
    if (!reducedMotion()) [...list.children].forEach((li, i) => li.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: i * 18, fill: 'backwards' }))
    const form = list.querySelector('form')
    if (form) {
      form.addEventListener('submit', (e) => { e.preventDefault(); submit(form) })
      if (run.kb || look === 'b' && matchMedia('(pointer: fine)').matches) form.elements.name.focus({ preventScroll: true }) // keyboard play: straight to the name (never on touch: no keyboard pops up unasked)
      say(`Game over. ${fmt(run.score)} points: number ${rank} of ${total} on the scoreboard. Add your name to keep it.`)
    } else if (savedNow) {
      list.querySelector('.sb-me')?.focus({ preventScroll: true })
      say(`Saved. You’re number ${rankOf(mine.score, mine)} of ${total}.`)
    } else say(`Game over. ${fmt(run.score)} points: number ${rank} of ${total}. Your best is number ${rankOf(mine.score, mine)}.`)
    list.querySelector('.sb-me')?.scrollIntoView({ block: 'nearest' })
  }

  async function submit(form) {
    const err = form.querySelector('.sb-err'), btn = form.querySelector('.sb-save'), nameIn = form.elements.name
    const name = nameIn.value.trim().replace(/\s+/g, ' ')
    const city = form.elements.city.value.trim().replace(/\s+/g, ' '), country = form.elements.country.value
    const fail = (msg) => { err.textContent = msg; nameIn.setAttribute('aria-invalid', 'true'); nameIn.focus() }
    if (!name) return fail('Add a name first')
    if (!NAME_OK.test(name)) return fail('Letters, numbers, spaces and . _ \' - only')
    if (city && !NAME_OK.test(city)) { err.textContent = 'A city in letters, please'; form.elements.city.focus(); return }
    err.textContent = ''
    nameIn.removeAttribute('aria-invalid')
    btn.disabled = true
    btn.textContent = 'Saving…'
    try {
      const res = await API.save({ score: run.score, wave: run.wave, name, city, country })
      if (!el) return
      if (res.error === 'name') { btn.disabled = false; btn.textContent = 'Save'; return fail('Pick another name') }
      write(LS.profile, { name, city, country })
      savedNow = true
      render(await API.board())
    } catch {
      if (!el) return
      btn.disabled = false
      btn.textContent = 'Save'
      err.textContent = 'Couldn’t save: the scoreboard is out. Try again in a bit.'
    }
  }

  /* B is a dialog: Tab stays inside it */
  function trap(e) {
    if (e.key !== 'Tab') return
    const f = [...el.querySelectorAll('button, input, select, a[href], [tabindex="-1"]')].filter((n) => !n.disabled && n.offsetParent !== null && n.tabIndex >= 0)
    if (!f.length) return
    const first = f[0], last = f[f.length - 1]
    if (e.shiftKey && (document.activeElement === first || !el.contains(document.activeElement))) { e.preventDefault(); last.focus() } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  /* ---------- mockup only: the controls in the mock bar ---------- */
  function mockControls() {
    const bar = document.querySelector('.mock-bar')
    const box = document.createElement('span')
    box.className = 'sb-mock'
    box.innerHTML = `
      <label class="int">Look <select data-sb="look"><option value="a">A · The readout grows</option><option value="b">B · Centre stage</option></select></label>
      <label class="int">Game over at <select data-sb="score"><option value="64000,8">64,000 · a new #1</option><option value="15000,5" selected>15,000 · the top 10</option><option value="3200,2">3,200 · outside it</option></select></label>
      <button type="button" class="mb" data-sb="show">Show the board</button>
      <label class="int">From <select data-sb="geo"><option value="lisbon">Lisbon, PT</option><option value="austin">Austin, US</option><option value="none">Unknown</option></select></label>
      <label><input type="checkbox" data-sb="off"> Offline</label>
      <button type="button" class="mb" data-sb="forget">Forget me</button>`
    bar.querySelector('.spacer').before(box)
    const q = (k) => box.querySelector(`[data-sb="${k}"]`)
    q('look').value = look
    q('look').addEventListener('change', (e) => {
      look = e.target.value
      write(LS.look, look)
      if (el) { const r = run; close(true); open(r) }
    })
    q('show').addEventListener('click', () => {
      const [score, wave] = q('score').value.split(',').map(Number)
      window.__bl.fakeOver(score, wave)
    })
    q('geo').addEventListener('change', (e) => { geo = GEO[e.target.value] })
    q('off').addEventListener('change', (e) => { API.offline = e.target.checked })
    q('forget').addEventListener('click', () => {
      const m = mineOf()
      if (m) entries.splice(entries.indexOf(m), 1)
      write(LS.mine, null)
      write(LS.profile, null)
      if (el) { const r = run; close(true); open(r) }
    })
  }

  function attach(c) {
    ctx = c
    mockControls()
    new IntersectionObserver(([e]) => { if (!e.isIntersecting && el && look === 'a') close() }).observe(c.root) // A: scrolled away, it goes
  }

  return { attach, open, close, isOpen: () => !!el, API, entries }
})()
