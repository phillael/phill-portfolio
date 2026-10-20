/*
 * Round 2 · A · Live skills: every skill does what it says, right where it sits.
 * Human-in-the-loop asks you to approve an action, Structured outputs prints itself as JSON,
 * SSE streaming re-streams the panel, Prompt caching is slow once and instant the second time,
 * Three.js spins in 3D, Docker gets boxed, Colyseus lets Player 2 in… Skills without a trick
 * answer with a small ping. Nothing runs until a click; no loop runs while idle. With reduced
 * motion, text appears at once and nothing spins, slides or travels. No number appears that
 * isn't in career.ts or resume.ts (the one used here: prompt caching's "about 90%").
 */
(function () {
  const { mount, found, say, reducedMotion, onReducedMotion, esc } = SECTION2
  const S = mount({ title: 'Round 2 · A · Live skills' })
  const root = S.root
  const rm = () => reducedMotion()
  const byName = new Map(S.words.map((w) => [w.name, w]))
  const W = (name) => byName.get(name)
  const aiItems = () => [...S.panel.querySelectorAll('.sk-ai-item')]
  const groupWords = (id) => S.words.filter((w) => w.group === id).map((w) => w.el)

  const layer = document.createElement('div')
  layer.className = 'lv-layer'
  root.appendChild(layer)
  const pop = document.createElement('div')
  pop.className = 'lv-pop'
  pop.hidden = true
  pop.setAttribute('role', 'group')
  root.appendChild(pop)

  /* ---------- runs: one per skill; a new click restarts it; stop() undoes everything ---------- */
  class Cancel extends Error {}
  const runs = new Map()
  let popOwner = null

  function stop(key) {
    const run = runs.get(key)
    if (!run) return
    run.alive = false
    run.timers.forEach(clearTimeout)
    run.cleanups.splice(0).reverse().forEach((f) => { try { f() } catch (e) { console.error(e) } })
    runs.delete(key)
  }
  const stopAll = () => [...runs.keys()].forEach(stop)

  function rel(el) {
    const r = el.getBoundingClientRect(), s = root.getBoundingClientRect()
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }
  }
  const place = (node, b, pad = 0) => {
    node.style.left = b.x - pad + 'px'
    node.style.top = b.y - pad + 'px'
    node.style.width = b.w + pad * 2 + 'px'
    node.style.height = b.h + pad * 2 + 'px'
  }
  /* the box of an element's text itself (a block's rect is its full width) */
  function textRel(el) {
    const range = document.createRange()
    range.selectNodeContents(el)
    const r = range.getBoundingClientRect(), s = root.getBoundingClientRect()
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }
  }
  const center = (el) => { const b = rel(el); return { x: b.x + b.w / 2, y: b.y + b.h / 2 } }

  function makeCtx(key, run, w) {
    const ctx = {
      w,
      hold: 3600,
      wait(ms) {
        return new Promise((res, rej) => {
          if (!run.alive) return rej(new Cancel())
          const t = setTimeout(() => { run.timers.delete(t); run.alive ? res() : rej(new Cancel()) }, ms)
          run.timers.add(t)
        })
      },
      later(ms, fn) { const t = setTimeout(() => { run.timers.delete(t); if (run.alive) fn() }, ms); run.timers.add(t) },
      cleanup(fn) { run.cleanups.push(fn) },
      async type(el, text, ms = 18) {
        if (rm()) { el.textContent = text; return }
        for (let i = 1; i <= text.length; i++) { el.textContent = text.slice(0, i); await ctx.wait(ms) }
      },
      async stream(el, text, ms = 55) {
        if (rm()) { el.textContent = text; return }
        const toks = text.split(/(\s+)/)
        el.textContent = ''
        for (const t of toks) { el.textContent += t; if (t.trim()) await ctx.wait(ms) }
      },
      cls(el, c) { el.classList.add(c); ctx.cleanup(() => el.classList.remove(c)) },
      /* the skill's own note (AI items): restored to the data on stop */
      note(item = w.el) {
        const n = item.querySelector('.sk-note')
        const orig = byName.get(item.dataset.skill).note
        n.classList.add('lv-live')
        ctx.cleanup(() => { n.classList.remove('lv-live'); n.textContent = orig })
        return n
      },
      /* a floating label above (or below) an element */
      tag(anchor, html, { cls = '', stack = 0, below = false } = {}) {
        const t = document.createElement('div')
        t.className = 'lv-tag ' + cls
        t.innerHTML = html
        layer.appendChild(t)
        const pos = () => {
          const a = rel(anchor), tw = t.offsetWidth, th = t.offsetHeight, RW = root.clientWidth
          const name = anchor.querySelector('.sk-name')
          if (name && !stack) {
            const n = textRel(name)
            if (n.x + n.w + 12 + tw <= RW - 8) {
              t.style.left = n.x + n.w + 12 + 'px'
              t.style.top = n.y + n.h / 2 - th / 2 + 'px'
              return
            }
          }
          const x = Math.max(8, Math.min(RW - tw - 8, name ? a.x + 14 : a.x + a.w / 2 - tw / 2))
          const y = below ? a.y + a.h + 6 + stack * (th + 6) : a.y - th - 6 - stack * (th + 6)
          t.style.left = x + 'px'
          t.style.top = y + 'px'
        }
        pos()
        requestAnimationFrame(() => t.classList.add('on'))
        ctx.cleanup(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 260) })
        return { el: t, set(h, c) { t.innerHTML = h; if (c !== undefined) t.className = 'lv-tag on ' + c; pos() } }
      },
      /* a positioned box in the layer around an element (pad px bigger) */
      box(anchor, cls, pad = 0) {
        const b = document.createElement('div')
        b.className = 'lv-box ' + cls
        place(b, rel(anchor), pad)
        layer.appendChild(b)
        ctx.cleanup(() => b.remove())
        return b
      },
      /* the one popover, under the skill */
      pop(html, { label } = {}) {
        if (popOwner && popOwner !== key) stop(popOwner)
        popOwner = key
        pop.innerHTML = html
        pop.setAttribute('aria-label', label || w.name)
        pop.hidden = false
        const a = rel(w.el), RW = root.clientWidth, narrow = RW < 600
        const pw = narrow ? RW - 32 : Math.min(380, RW - 32)
        pop.style.width = pw + 'px'
        pop.style.left = (narrow ? 16 : Math.max(16, Math.min(RW - pw - 16, a.x))) + 'px'
        pop.style.top = a.y + a.h + 8 + 'px'
        requestAnimationFrame(() => pop.classList.add('on'))
        ctx.later(60, () => {
          const r = pop.getBoundingClientRect()
          if (r.bottom > innerHeight - 12) window.scrollBy({ top: Math.min(r.bottom - innerHeight + 24, r.top - 80), behavior: rm() ? 'auto' : 'smooth' })
        })
        ctx.cleanup(() => {
          const hadFocus = pop.contains(document.activeElement)
          pop.classList.remove('on')
          pop.hidden = true
          pop.innerHTML = ''
          if (popOwner === key) popOwner = null
          if (hadFocus) w.el.focus({ preventScroll: true })
        })
        return pop
      },
      /* light a list of elements one after another */
      wave(els, c, step = 70, dur = 700) {
        els.forEach((el, i) => {
          ctx.later(rm() ? 0 : i * step, () => { el.classList.add(c); ctx.later(dur, () => el.classList.remove(c)) })
        })
        ctx.cleanup(() => els.forEach((el) => el.classList.remove(c)))
      },
      /* the discovery happened: count it and say what it was */
      done(sr) {
        F.add(key)
        say(`${w.name}: ${sr}. ${F.count} of ${TOTAL} found.`)
      },
    }
    return ctx
  }

  function start(w) {
    const key = w.name
    stop(key)
    const run = { alive: true, timers: new Set(), cleanups: [] }
    runs.set(key, run)
    const ctx = makeCtx(key, run, w)
    ctx.cls(w.el, 'lv-hot')
    if (DEMOS[key] && !LATE.has(key)) F.add(key) // the click is the discovery
    const demo = DEMOS[key] || fallback
    ;(async () => {
      try {
        await demo(ctx, w)
        if (ctx.hold !== Infinity) await ctx.wait(ctx.hold)
        stop(key)
      } catch (e) { if (!(e instanceof Cancel)) console.error(e) }
    })()
  }

  /* ---------- the demos ---------- */
  const DEMOS = {}
  const LATE = new Set(['Prompt caching', 'Human-in-the-loop']) // these count once you've seen the payoff
  const quips = ['shipped with it', 'daily driver', 'in the toolbox', 'no trick, just reps']
  let quip = 0
  async function fallback(c, w) {
    c.box(w.el, 'lv-ping', 4)
    c.tag(w.el, `<span class="dim">${quips[quip++ % quips.length]}</span>`)
    c.hold = 1400
  }

  /* --- AI --- */
  DEMOS['Claude Code'] = async (c) => {
    const p = c.pop('<p class="lv-k">Claude Code</p><div class="lv-term"></div>')
    const term = p.querySelector('.lv-term')
    const lines = [
      ['cmd', '❯ claude "make the skills section fun"'],
      ['', '⏺ Skill · test-driven-development'],
      ['', '⏺ Subagent · design review'],
      ['', '⏺ Worktree · feat/skills-section'],
      ['ok', '✓ Tests pass · PR ready for your review'],
    ]
    for (const [cls, text] of lines) {
      const l = document.createElement('div')
      l.className = 'ln ' + cls
      term.appendChild(l)
      await c.type(l, text, cls === 'cmd' ? 16 : 8)
      await c.wait(cls === 'cmd' ? 420 : 300)
    }
    c.done('a session ran a skill, a subagent and a worktree, and the tests passed')
    c.hold = 4200
  }

  DEMOS['MCP servers'] = async (c) => {
    const p = c.pop('<p class="lv-k">MCP · tools/list</p><div class="lv-rows"></div><p class="lv-foot"></p>')
    const rows = p.querySelector('.lv-rows')
    for (const [n, ok] of [['get_skills', 1], ['find_work', 1], ['play_music', 1], ['send_email', 0]]) {
      rows.insertAdjacentHTML('beforeend', `<div class="lv-row"><span>${n}</span>${ok ? '<b class="g">✓ allowed</b>' : '<b class="r">🔒 not on this key</b>'}</div>`)
      await c.wait(rm() ? 0 : 240)
    }
    p.querySelector('.lv-foot').textContent = 'A scoped key: agents can read, but sending needs a person.'
    c.done('a tool list where the key can read but not send')
    c.hold = 4200
  }

  DEMOS['Anthropic SDK'] = async (c) => {
    const p = c.pop('<p class="lv-k">messages.stream()</p><p class="lv-ev dim">message_start</p><p class="lv-say"></p><p class="lv-foot"></p>')
    const ev = p.querySelector('.lv-ev')
    await c.wait(350)
    ev.textContent = 'content_block_delta…'
    await c.stream(p.querySelector('.lv-say'), '“Greetings, traveler. The grove speaks through this old sage. Ask, and I shall answer in riddles.”', 70)
    ev.textContent = 'message_stop · usage logged ✓'
    p.querySelector('.lv-foot').textContent = 'The Shroom Wizard, streaming on Claude. Summon him with the mushroom.'
    c.done('the Shroom Wizard streamed a greeting')
    c.hold = 4500
  }

  DEMOS['OpenAI Agents SDK'] = async (c) => {
    const p = c.pop('<p class="lv-k">Agent · web search</p><p class="q"></p><p class="lv-say"></p><p class="lv-foot"></p>')
    p.querySelector('.q').innerHTML = '<span class="lv-spin" aria-hidden="true"></span>Searching the web for “Phill Aelony”…'
    await c.wait(1300)
    p.querySelector('.q').innerHTML = '<span class="g">✓</span> Searched the web'
    await c.stream(p.querySelector('.lv-say'), '→ phillcodes.com. You’re already here.', 60)
    p.querySelector('.lv-foot').textContent = 'Structured output, rendered from whitelisted fields.'
    c.done('an agent searched the web and found this site')
    c.hold = 4000
  }

  DEMOS['Vercel AI SDK'] = async (c) => {
    const p = c.pop('<p class="lv-k">useChat() · Next.js</p><div class="lv-bubble me">What does Phill build?</div><div class="lv-bubble ai"></div>')
    await c.wait(500)
    await c.stream(p.querySelector('.lv-bubble.ai'), 'Agents, MCP servers and streaming chat, mostly in Next.js. Like this little chat.', 60)
    c.done('a little chat streamed an answer')
    c.hold = 4000
  }

  DEMOS['Tool use'] = async (c) => {
    const n = c.note()
    await c.type(n, 'highlight({ group: "AI" }) · allowed ✓', 14)
    c.wave(aiItems(), 'lv-wave', 55, 650)
    await c.wait(rm() ? 900 : 1500)
    n.innerHTML = '<span class="r">delete_section() · not in the registry ✗</span>'
    c.done('the agent lit up the AI skills, and a tool outside its registry was refused')
  }

  DEMOS['Structured outputs'] = async (c) => {
    const w = c.w
    const p = c.pop('<p class="lv-k">Structured output</p><div class="lv-code"></div><p class="lv-foot"></p>')
    const code = p.querySelector('.lv-code')
    const kv = (k, v, comma) => `  <span class="k">"${k}"</span>: <span class="s">"${esc(v)}"</span>${comma ? ',' : ''}`
    const lines = ['{', kv('name', w.name, 1), kv('group', 'AI', 1), kv('note', w.note, 0), '}']
    for (const l of lines) { code.insertAdjacentHTML('beforeend', l + '\n'); await c.wait(rm() ? 0 : 140) }
    p.querySelector('.lv-foot').innerHTML = '<span class="g">✓ SkillSchema.parse()</span> · unknown fields dropped'
    c.done('this skill, printed as typed JSON and validated')
    c.hold = 4200
  }

  let warm = false
  DEMOS['Prompt caching'] = async (c) => {
    const n = c.note()
    if (!warm) {
      await c.type(n, 'cache miss · writing the prefix…', 16)
      await c.wait(1100)
      warm = true
      n.innerHTML = 'cached <span class="g">✓</span> · now click it again'
      say('Prompt caching: cache miss. The prefix is cached now; click it again.')
      c.hold = 7000
      return
    }
    n.innerHTML = '<span class="g">⚡ cache hit</span> · about 90% cheaper input'
    c.box(c.w.el, 'lv-ping', 2)
    c.done('cache hit, about 90% cheaper input')
    c.hold = 4000
  }

  DEMOS['Extended thinking'] = async (c) => {
    const p = c.pop('<p class="lv-k lv-think">Thinking…</p><div class="t"></div><p class="lv-say"></p>')
    const t = p.querySelector('.t')
    for (const line of ['They clicked “Extended thinking.”', 'Explain it, or show it?', 'Show it. Keep it short.']) {
      const el = document.createElement('p')
      el.className = 'lv-thought'
      t.appendChild(el)
      await c.type(el, line, 26)
      await c.wait(380)
    }
    const k = p.querySelector('.lv-k')
    k.classList.remove('lv-think')
    k.textContent = 'Thought it through'
    await c.stream(p.querySelector('.lv-say'), 'Done. That was me thinking before I answered.', 55)
    c.done('a short thinking trace, then the answer')
    c.hold = 4000
  }

  DEMOS['SSE streaming'] = async (c) => {
    const items = aiItems()
    const notes = items.map((it) => it.querySelector('.sk-note'))
    notes.forEach((n) => { n.style.minHeight = n.offsetHeight + 'px' })
    c.cleanup(() => notes.forEach((n, i) => { n.style.minHeight = ''; n.textContent = byName.get(items[i].dataset.skill).note }))
    notes.forEach((n) => { n.textContent = '' })
    await c.wait(250)
    await Promise.all(notes.map(async (n, i) => {
      await c.wait(rm() ? 0 : i * 45)
      await c.stream(n, byName.get(items[i].dataset.skill).note, 45)
    }))
    c.done('every note in the panel streamed back in, token by token')
    c.hold = 600
  }

  let sorted = false
  DEMOS['Human-in-the-loop'] = async (c) => {
    const what = sorted ? 'put the AI skills back in their order' : 'sort the AI skills A → Z'
    const p = c.pop(`<p class="lv-k">Action card · waiting for you</p><p class="lv-ask">The agent wants to <strong>${what}</strong>.</p><div class="lv-actions"><button type="button" class="lv-btn primary" data-a="yes">Approve</button><button type="button" class="lv-btn" data-a="no">Reject</button></div>`, { label: 'Action card' })
    say(`Human-in-the-loop: the agent wants to ${what}. Approve or reject.`)
    c.hold = Infinity
    p.querySelector('[data-a="yes"]').focus({ preventScroll: true })
    const choice = await new Promise((res) => {
      p.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => res(b.dataset.a)))
    })
    const ask = p.querySelector('.lv-ask')
    p.querySelector('.lv-actions').remove()
    c.w.el.focus({ preventScroll: true })
    if (choice === 'yes') {
      sorted = !sorted
      reorderAI(sorted)
      ask.innerHTML = '<span class="g">✓ Approved by you.</span> It ran.'
      c.done(`approved, and the agent ran it`)
    } else {
      ask.innerHTML = '<span class="r">✗ Rejected.</span> Nothing ran.'
      c.done('rejected, so nothing ran')
    }
    await c.wait(2600)
  }
  const AI_ORDER = window.SKILL_GROUPS[0].skills.map((s) => s.name)
  function reorderAI(alpha) {
    const ul = S.panel.querySelector('.sk-ai-grid')
    const lis = [...ul.children]
    const first = new Map(lis.map((li) => [li, li.getBoundingClientRect()]))
    const name = (li) => li.querySelector('.sk-ai-item').dataset.skill
    lis.sort((a, b) => alpha ? name(a).localeCompare(name(b)) : AI_ORDER.indexOf(name(a)) - AI_ORDER.indexOf(name(b)))
    lis.forEach((li) => ul.appendChild(li))
    if (rm()) return
    lis.forEach((li) => {
      const f = first.get(li), l = li.getBoundingClientRect()
      li.style.transition = 'none'
      li.style.transform = `translate(${f.left - l.left}px, ${f.top - l.top}px)`
    })
    void ul.offsetWidth
    lis.forEach((li, i) => {
      li.style.transition = `transform .6s var(--ease) ${i * 18}ms`
      li.style.transform = ''
    })
  }

  DEMOS['Agent evals'] = async (c) => {
    const p = c.pop('<p class="lv-k">Eval · this section vs. its baseline</p><div class="lv-rows"></div><p class="lv-foot"></p>')
    const rows = p.querySelector('.lv-rows')
    const cases = ['Every skill reads as plain text', 'Works with only a keyboard', 'Reduced motion: nothing moves on its own', 'No number without a source']
    for (const label of cases) {
      rows.insertAdjacentHTML('beforeend', `<div class="lv-row"><span>${label}</span><b class="dim">running…</b></div>`)
      const b = rows.lastElementChild.querySelector('b')
      await c.wait(rm() ? 150 : 420)
      b.className = 'g'
      b.textContent = '✓ pass'
    }
    p.querySelector('.lv-foot').textContent = 'The same checks every run, so a change can’t quietly break one.'
    c.done('four eval cases ran and passed')
    c.hold = 4200
  }

  DEMOS['Prompt-injection defense'] = async (c) => {
    const n = c.note()
    const payload = `<img src=x onerror="alert('hi')">`
    await c.type(n, payload, 24)
    await c.wait(450)
    n.innerHTML = `<s class="dim">${esc(payload)}</s>`
    c.tag(c.w.el, '🛡 <span class="g">shown as text, never run</span>', { cls: 'ok' })
    c.done('an injected image tag was shown as plain text, never run')
  }

  DEMOS['PHI guardrails'] = async (c) => {
    const n = c.note()
    n.innerHTML = '<span class="pii">Alex Example</span> · <span class="pii">North Hall</span> · asked about stress'
    await c.wait(900)
    for (const el of n.querySelectorAll('.pii')) { el.innerHTML = '<span class="dim">████</span>'; await c.wait(rm() ? 0 : 260) }
    c.tag(c.w.el, '<span class="g">✓ no identifiers reach the model</span>', { cls: 'ok' })
    c.done('a student’s name and residence hall were redacted before the model saw them')
  }

  DEMOS['LLM-as-judge'] = async (c) => {
    const p = c.pop('<p class="lv-k">Judge · duplicate records</p><div class="lv-rows"></div><p class="lv-foot"></p>')
    const rows = p.querySelector('.lv-rows')
    for (const [label, stamp, cls] of [['The same resource, listed twice', 'DISMISS · AUTOMATIC', 'g'], ['Two records to merge into one', 'MERGE · SENT TO A PERSON', 'a']]) {
      rows.insertAdjacentHTML('beforeend', `<div class="lv-row"><span>${label}</span><b class="dim">judging…</b></div>`)
      const b = rows.lastElementChild.querySelector('b')
      await c.wait(rm() ? 150 : 700)
      b.className = cls
      b.innerHTML = `<span class="lv-stamp">${stamp}</span>`
    }
    p.querySelector('.lv-foot').textContent = 'Autonomy gated by pattern: a merge always gets a person.'
    c.done('the judge dismissed a duplicate on its own and sent a merge to a person')
    c.hold = 4200
  }

  DEMOS['Autonomous coding agents'] = async (c) => {
    const p = c.pop('<p class="lv-k">Pull request · opened by an agent <span class="lv-pill">Open</span></p><p class="lv-pr-title">chore: make every skill clickable</p><div class="lv-rows tl"></div>')
    const tl = p.querySelector('.tl')
    tl.style.marginTop = '.6rem'
    for (const line of ['● Review requested: Phill', 'Phill: “Add a test first.”', '<span class="g">✓</span> The agent pushed a test', '<span class="g">✓ Approved and merged</span>']) {
      await c.wait(rm() ? 150 : 650)
      tl.insertAdjacentHTML('beforeend', `<div class="lv-row"><span>${line}</span></div>`)
    }
    const pill = p.querySelector('.lv-pill')
    pill.textContent = 'Merged'
    pill.classList.add('merged')
    c.done('an agent’s pull request got a review, a test and a merge')
    c.hold = 4200
  }

  /* --- frontend & mobile --- */
  DEMOS['TypeScript'] = async (c) => {
    c.tag(c.w.el, '<span class="c">TypeScript</span><span class="dim">: Skill</span> <span class="g">✓ no type errors</span>', { cls: 'ok' })
    c.done('it got a type, and no type errors')
  }
  DEMOS['React'] = async (c) => {
    c.box(c.w.el, 'lv-flash', 4)
    c.tag(c.w.el, 're-rendered just this one', { cls: 'ok' })
    c.done('it re-rendered, and nothing else did')
  }
  DEMOS['Next.js'] = async (c) => {
    const g = c.w.el.closest('.sk-group')
    const b = c.box(g.querySelector('.sk-h'), 'lv-bar')
    b.style.top = parseFloat(b.style.top) - 8 + 'px'
    b.style.height = '2px'
    requestAnimationFrame(() => { b.style.transform = 'scaleX(1)' })
    await c.wait(rm() ? 0 : 900)
    c.tag(c.w.el, 'prefetched · instant ✓', { cls: 'ok' })
    c.done('the route prefetched')
  }
  DEMOS['React Native'] = async (c) => {
    c.tag(c.w.el, '📱 the same code on iOS and Android ✓', { cls: 'ok' })
    c.done('one codebase for iOS and Android')
  }
  DEMOS['Three.js / R3F'] = async (c) => {
    c.cls(c.w.el, 'lv-3d')
    c.done('the word turned 3D and spun')
    c.hold = rm() ? 2500 : 3200
  }
  DEMOS['WebGL'] = async (c) => {
    c.cls(c.w.el, 'lv-plasma')
    c.done('the word filled with a shader-style plasma')
    c.hold = 3400
  }
  DEMOS['HTML'] = async (c) => {
    c.tag(c.w.el, '<span class="dim">&lt;button&gt;</span>HTML<span class="dim">&lt;/button&gt;</span> · a real button ✓', { cls: 'ok' })
    c.done('it showed its own tag: a real button')
  }
  DEMOS['CSS'] = async (c) => {
    c.box(c.w.el, 'lv-bm-m', 10)
    c.box(c.w.el, 'lv-bm-p', 4)
    c.box(c.w.el, 'lv-bm-c', 0)
    c.tag(c.w.el, '<span class="c">button.sk-w</span> · <span class="a">margin</span> · <span class="g">padding</span> · content', { stack: 0.4 })
    c.done('the box model drew itself around the word')
  }
  DEMOS['Accessibility'] = async (c) => {
    c.wave(groupWords('frontend'), 'lv-ring', 80, 900)
    c.tag(c.w.el, 'every skill here is a button · try Tab', { cls: 'ok' })
    c.done('focus rings toured the line; every skill is a button you can Tab to')
    c.hold = 3800
  }

  /* --- backend & data --- */
  DEMOS['REST'] = async (c) => {
    const t = c.tag(c.w.el, '<span class="c">GET</span> /skills/rest …')
    await c.wait(600)
    t.set('<span class="c">GET</span> /skills/rest → <span class="g">OK ✓</span>', 'ok')
    c.done('a GET came back OK')
  }
  DEMOS['tRPC'] = async (c) => {
    c.tag(c.w.el, '<span class="c">skills.byName.useQuery()</span> · typed end to end ✓', { cls: 'ok' })
    c.done('a query typed end to end')
  }
  DEMOS['Event-driven (SNS/SQS)'] = async (c) => {
    const subs = groupWords('backend').filter((el) => el !== c.w.el)
    const from = center(c.w.el)
    c.tag(c.w.el, 'published <span class="g">skill.clicked</span>')
    subs.forEach((el, i) => {
      const to = center(el)
      if (rm()) { c.later(0, () => { el.classList.add('lv-hot'); c.later(900, () => el.classList.remove('lv-hot')) }); return }
      const d = document.createElement('i')
      d.className = 'lv-dot'
      d.style.transform = `translate(${from.x}px, ${from.y}px)`
      layer.appendChild(d)
      c.cleanup(() => d.remove())
      c.later(40 + i * 35, () => { d.style.transform = `translate(${to.x}px, ${to.y}px)` })
      c.later(680 + i * 35, () => { d.style.opacity = '0'; el.classList.add('lv-hot'); c.later(700, () => el.classList.remove('lv-hot')) })
    })
    c.cleanup(() => subs.forEach((el) => el.classList.remove('lv-hot')))
    await c.wait(rm() ? 300 : 1300)
    c.done('an event went out, and every subscriber on the line got it')
  }
  DEMOS['BullMQ'] = async (c) => {
    const t = c.tag(c.w.el, 'job queued')
    await c.wait(500)
    t.set('<span class="lv-spin" aria-hidden="true"></span>processing…')
    await c.wait(900)
    t.set('<span class="g">done ✓</span>', 'ok')
    c.done('a job was queued, processed and done')
  }
  DEMOS['Postgres'] = async (c) => {
    c.tag(c.w.el, '<span class="c">SELECT</span> * <span class="c">FROM</span> skills <span class="c">WHERE</span> fun → this row ✓', { cls: 'ok' })
    c.done('a query returned this row')
  }
  DEMOS['Redis'] = async (c) => {
    const t = c.tag(c.w.el, '<span class="c">SET</span> skill → OK')
    await c.wait(700)
    t.set('<span class="c">GET</span> skill → <span class="g">hit ⚡</span>', 'ok')
    c.done('set, then a cache hit')
  }
  DEMOS['ETL pipelines'] = async (c) => {
    const el = c.w.el, clean = el.textContent
    el.style.minWidth = el.offsetWidth + 'px'
    c.cleanup(() => { el.textContent = clean; el.style.minWidth = '' })
    if (!rm()) {
      for (let k = 0; k < 6; k++) {
        el.textContent = [...clean].map((ch) => Math.random() < 0.5 ? ch.toUpperCase() : ch.toLowerCase()).join('')
        await c.wait(90)
      }
    } else {
      el.textContent = 'eTL piPeLINes'
      await c.wait(600)
    }
    el.textContent = clean
    c.tag(el, 'extracted · cleaned · loaded ✓', { cls: 'ok' })
    c.done('the messy word got cleaned')
  }
  DEMOS['Colyseus'] = async (c) => ghost(c, { label: 'Player 2', color: 'hsl(290 100% 80%)', say: 'Player 2 joined and played a few skills' })

  /* --- cloud & devops --- */
  DEMOS['Lambda@Edge'] = async (c) => {
    const el = c.w.el, a = rel(el), dx = root.clientWidth - 16 - (a.x + a.w)
    c.cls(el, 'lv-slide')
    c.cleanup(() => { el.style.transform = '' })
    if (!rm()) { el.style.transform = `translateX(${dx}px)`; await c.wait(650) }
    const t = c.tag(el, 'ran at the edge ⚡', { cls: 'ok' })
    await c.wait(900)
    el.style.transform = ''
    await c.wait(400)
    t.set('ran at the edge ⚡')
    c.done('it ran at the edge (of the page)')
  }
  DEMOS['Terraform'] = async (c) => {
    const t = c.tag(c.w.el, '<span class="g">+</span> resource "skill" "terraform"')
    await c.wait(900)
    t.set('<span class="g">Apply complete ✓</span>', 'ok')
    c.done('a plan to add it, then apply complete')
  }
  DEMOS['GitHub Actions'] = async (c) => {
    const t = c.tag(c.w.el, '<span class="a">●</span> queued')
    await c.wait(500)
    t.set('<span class="a">●</span> running checks…')
    await c.wait(1000)
    t.set('<span class="g">✓ All checks passed</span>', 'ok')
    c.done('checks ran and passed')
  }
  DEMOS['Docker'] = async (c) => {
    c.box(c.w.el, 'lv-container', 7)
    c.tag(c.w.el, '<span class="g">●</span> running · container <span class="c">skills</span>', { stack: 0.3 })
    c.done('the word got boxed into a running container')
  }
  DEMOS['Turborepo'] = async (c) => {
    c.tag(c.w.el, '⚡ <span class="m">&gt;&gt;&gt; FULL TURBO</span>', { cls: 'mag' })
    c.done('full turbo')
  }
  DEMOS['Vercel'] = async (c) => {
    const t = c.tag(c.w.el, '▲ building…')
    await c.wait(900)
    t.set('▲ <span class="g">deployed to production ✓</span>', 'ok')
    c.done('built and deployed')
  }
  DEMOS['Feature flags'] = async (c) => {
    const t = c.tag(c.w.el, 'flag <span class="c">fun-mode</span> · <span class="dim">○ off</span>')
    await c.wait(700)
    t.set('flag <span class="c">fun-mode</span> · <span class="g">● on</span>', 'ok')
    c.wave(S.words.filter((w) => !w.ai).map((w) => w.el), 'lv-hot', 14, 500)
    await c.wait(rm() ? 400 : 1200)
    t.set('shipped behind a flag ✓', 'ok')
    c.done('a flag flipped on and the whole list lit up')
  }

  /* --- quality & security --- */
  DEMOS['Jest'] = async (c) => {
    if (!rm()) c.box(c.w.el, 'lv-snap', 3)
    c.tag(c.w.el, '📸 snapshot matches ✓', { cls: 'ok' })
    c.done('the snapshot matched')
  }
  DEMOS['Playwright'] = async (c) => ghost(c, { label: 'test', color: 'hsl(130 90% 60%)', end: '✓ test passed', say: 'a test cursor clicked through a few skills, and the test passed' })
  DEMOS['Testing Library'] = async (c) => {
    c.tag(c.w.el, `<span class="c">getByRole</span>('button', { name: 'Testing Library' }) <span class="g">✓</span>`, { cls: 'ok' })
    c.done('found by its role, the way a user would')
  }
  DEMOS['TDD'] = async (c) => {
    const el = c.w.el
    c.cls(el, 'lv-fail')
    const t = c.tag(el, '<span class="r">✗ failing test</span>', { cls: 'warn' })
    await c.wait(900)
    el.classList.remove('lv-fail')
    c.cls(el, 'lv-pass')
    t.set('<span class="g">✓ passing</span>', 'ok')
    await c.wait(900)
    el.classList.remove('lv-pass')
    t.set('refactored ✓', 'ok')
    c.done('red, green, refactor')
  }
  DEMOS['SSO / OIDC'] = async (c) => {
    const t = c.tag(c.w.el, '🔒 Sign in with SSO…')
    await c.wait(900)
    t.set('<span class="g">✓ Signed in</span> · role: visitor', 'ok')
    c.done('signed in as a visitor')
  }
  DEMOS['RBAC'] = async (c) => {
    c.tag(c.w.el, 'role: visitor · read <span class="g">✓</span> · edit <span class="r">✗</span>', { cls: 'ok' })
    c.done('a visitor can read, not edit')
  }
  const trail = []
  DEMOS['Audit logging'] = async (c) => {
    const items = trail.slice(-6).reverse().map((n) => `<div class="lv-row"><span>visitor clicked <strong>${esc(n)}</strong></span></div>`).join('')
    c.pop(`<p class="lv-k">Audit log · this visit</p><div class="lv-rows">${items}</div><p class="lv-foot">Every action, who did it, newest first.</p>`)
    c.done('it showed the audit trail of your own clicks')
    c.hold = 4500
  }

  /* --- product --- */
  DEMOS['Product management'] = async (c) => {
    const t = c.tag(c.w.el, 'scoped')
    for (const s of ['scoped → designed', 'scoped → designed → built', 'scoped → designed → built → shipped ✓']) { await c.wait(rm() ? 300 : 520); t.set(s, s.endsWith('✓') ? 'ok' : undefined) }
    c.done('scoped, designed, built and shipped')
  }
  DEMOS['Stakeholder discovery'] = async (c) => {
    const asks = ['<span class="c">Finance</span> · does every dollar reconcile?', '<span class="c">Care Ops</span> · fewer tickets?', '<span class="c">Marketing</span> · in plain English?']
    for (let i = 0; i < asks.length; i++) { c.tag(c.w.el, asks[i], { stack: i }); await c.wait(rm() ? 0 : 450) }
    c.done('Finance, Care Ops and Marketing each asked their question')
    c.hold = 3800
  }
  DEMOS['UX & product design'] = async (c) => {
    const f = c.box(c.w.el, 'lv-frame', 5)
    f.innerHTML = '<span class="lbl">Frame · Skill</span><i style="left:-5px;top:-5px"></i><i style="right:-5px;top:-5px"></i><i style="left:-5px;bottom:-5px"></i><i style="right:-5px;bottom:-5px"></i>'
    c.done('it got selected like a frame in a design tool')
  }
  DEMOS['Roadmapping'] = async (c) => {
    c.tag(c.w.el, '<span class="g">Now</span>: this · <span class="c">Next</span>: the rest · <span class="dim">Later</span>: more')
    c.done('now, next, later')
  }
  DEMOS['Legal & compliance review'] = async (c) => {
    const t = c.tag(c.w.el, '⚖ in review…')
    await c.wait(900)
    t.set('⚖ <span class="g">approved ✓</span>', 'ok')
    c.done('reviewed and approved')
  }
  DEMOS['Release comms'] = async (c) => {
    c.tag(c.w.el, '📣 What’s new: every skill here does something', { cls: 'mag' })
    c.done('release notes went out')
  }
  DEMOS['Code review'] = async (c) => {
    const t = c.tag(c.w.el, '💬 nit: this one could use a test')
    await c.wait(1200)
    t.set('<span class="g">✓ resolved</span>', 'ok')
    c.done('a review comment, then resolved')
  }

  /* --- music & more --- */
  let ac = null
  function pluck(f, when, dur = 1.3) {
    const sr = ac.sampleRate, n = Math.floor(sr * dur), N = Math.max(2, Math.round(sr / f))
    const buf = ac.createBuffer(1, n, sr), out = buf.getChannelData(0), ring = new Float32Array(N)
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1
    for (let i = 0, p = 0; i < n; i++) {
      const a = ring[p], b = ring[(p + 1) % N]
      ring[p] = (a + b) * 0.5 * 0.997
      out[i] = a * Math.min(1, (n - i) / (sr * 0.06))
      p = (p + 1) % N
    }
    const src = ac.createBufferSource(), g = ac.createGain(), lp = ac.createBiquadFilter()
    lp.type = 'lowpass'; lp.frequency.value = 3200
    g.gain.value = 0.22
    src.buffer = buf
    src.connect(lp).connect(g).connect(ac.destination)
    src.start(when)
    src.onended = () => { src.disconnect(); lp.disconnect(); g.disconnect() }
  }
  DEMOS['Guitar'] = async (c) => {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) {
      ac = ac || new AC()
      if (ac.state === 'suspended') ac.resume()
      const t0 = ac.currentTime + 0.03
      ;[[329.63, 0], [392, 0.13], [440, 0.26], [392, 0.42], [329.63, 0.55], [293.66, 0.7], [329.63, 0.9]].forEach(([f, t]) => pluck(f, t0 + t))
    }
    if (!rm()) c.cls(c.w.el, 'lv-pluck')
    c.tag(c.w.el, '♪ a little lick', { cls: 'mag' })
    c.done('it played a short guitar lick')
  }
  DEMOS['Composition'] = async (c) => {
    groupWords('music').forEach((el, i) => c.later(rm() ? 0 : i * 120, () => {
      const b = rel(el), n = document.createElement('span')
      n.className = 'lv-note'
      n.textContent = i % 2 ? '♫' : '♪'
      n.style.left = b.x + b.w / 2 - 6 + 'px'
      n.style.top = b.y - 14 + 'px'
      layer.appendChild(n)
      c.cleanup(() => n.remove())
      if (!rm()) { el.classList.add('lv-bob'); c.cleanup(() => el.classList.remove('lv-bob')) }
    }))
    c.done('notes rose off every word on the Music line')
    c.hold = 3400
  }
  DEMOS['Recording & production'] = async (c) => {
    const t = c.tag(c.w.el, '<span class="r">● REC</span>', { cls: 'warn' })
    await c.wait(1300)
    t.set('<span class="g">✓ that’s the take</span>', 'ok')
    c.done('recorded, and that was the take')
  }
  DEMOS['Spanish'] = async (c) => {
    const el = c.w.el, eb = root.querySelector('#skills-h'), was = el.textContent, ebWas = eb.textContent
    el.style.minWidth = el.offsetWidth + 'px'
    el.textContent = 'Español'
    eb.textContent = 'Habilidades'
    c.cleanup(() => { el.textContent = was; el.style.minWidth = ''; eb.textContent = ebWas })
    c.tag(el, '¡Hola! ✓', { cls: 'ok' })
    c.done('it switched to Spanish, and so did the section’s label')
  }

  /* a second cursor visits a few skills (Colyseus: Player 2; Playwright: the test runner) */
  async function ghost(c, { label, color, end, say: sr }) {
    const pool = S.words.filter((w) => w.el !== c.w.el && !w.ai)
    const picks = []
    while (picks.length < 3) { const w = pool[Math.floor(Math.random() * pool.length)]; if (!picks.includes(w)) picks.push(w) }
    const cur = document.createElement('div')
    cur.className = 'lv-cursor'
    cur.style.color = color
    cur.innerHTML = `<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M2 1.5 L15 9 L9 10.2 L6.4 16 Z" fill="currentColor" stroke="hsl(222 45% 7%)" stroke-width="1.2" stroke-linejoin="round"/></svg><span style="background:${color}"><b>${esc(label)}</b></span>`
    const s = center(c.w.el)
    cur.style.transform = `translate(${s.x}px, ${s.y}px)`
    if (rm()) cur.style.transition = 'none'
    layer.appendChild(cur)
    c.cleanup(() => cur.remove())
    if (label === 'Player 2') c.tag(c.w.el, '<span class="m">Player 2 joined</span>', { cls: 'mag' })
    for (const w of picks) {
      await c.wait(rm() ? 350 : 650)
      const p = center(w.el)
      cur.style.transform = `translate(${p.x - 4}px, ${p.y - 6}px)`
      await c.wait(rm() ? 0 : 560)
      w.el.classList.add('lv-hot')
      c.box(w.el, 'lv-ping', 4)
      c.later(700, () => w.el.classList.remove('lv-hot'))
      c.cleanup(() => w.el.classList.remove('lv-hot'))
    }
    if (end) c.tag(c.w.el, `<span class="g">${end}</span>`, { cls: 'ok' })
    c.done(sr)
    await c.wait(600)
  }

  /* ---------- wiring ---------- */
  const TOTAL = Object.keys(DEMOS).length
  const F = found({ total: TOTAL, label: 'found' })
  S.words.forEach((w) => w.el.addEventListener('click', () => { trail.push(w.name); start(w) }))

  document.addEventListener('pointerdown', (e) => {
    if (popOwner && !pop.contains(e.target) && !byName.get(popOwner).el.contains(e.target) && !e.target.closest('[data-skill]')) stop(popOwner)
  })
  pop.addEventListener('click', (e) => { if (popOwner && !e.target.closest('button')) stop(popOwner) })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popOwner) { const w = byName.get(popOwner); stop(popOwner); w.el.focus({ preventScroll: true }) }
  })
  let rt = 0
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(stopAll, 100) })
  onReducedMotion(() => stopAll())

  /* the only hint: one sweep of light across the AI panel the first time it's on screen */
  const shine = document.createElement('div')
  shine.className = 'lv-shine'
  S.panel.appendChild(shine)
  const io = new IntersectionObserver((es) => {
    if (!es.some((e) => e.isIntersecting)) return
    io.disconnect()
    if (!rm()) setTimeout(() => shine.classList.add('go'), 500)
  }, { threshold: 0.45 })
  io.observe(S.panel)

  window.__live = { start: (name) => start(W(name)), stopAll, DEMOS, F }
})()
