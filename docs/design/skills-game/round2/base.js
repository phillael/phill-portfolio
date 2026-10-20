/*
 * Skills rethink, round 2: renders the section every idea shares into <section id="skills">.
 * Round 1's redesign (header, the AI glass panel with a note per skill, the other groups as
 * quiet lines) with no Play button: every skill is a <button> that looks like text, so the
 * list stays the content (readable, focusable, searchable) and a click is the discovery.
 *
 *   SECTION2.mount({ title, aiCaption? }) → { root, panel, groups, words, live }
 *     words: [{ el, name, note?, group, ai }] in reading order; el.dataset.skill = name
 *   SECTION2.found({ total, label }) → { add(key) → boolean (true if new), count }
 *   SECTION2.say(text)          the polite live region
 *   SECTION2.reducedMotion()    the OS setting or the mock bar's toggle
 *   SECTION2.onReducedMotion(cb)
 *   SECTION2.esc(s)
 */
(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const reducedMotion = () => rmQuery.matches || document.documentElement.classList.contains('rm')
  const rmListeners = []
  const onReducedMotion = (cb) => rmListeners.push(cb)
  rmQuery.addEventListener('change', () => rmListeners.forEach((cb) => cb(reducedMotion())))

  function mockBar(title) {
    const bar = document.createElement('div')
    bar.className = 'mock-bar'
    bar.innerHTML = `<a href="index.html">← All four</a><span class="mock-title">${esc(title)}</span><span class="spacer"></span><label><input type="checkbox" data-t="rm"> Reduced motion</label>`
    document.body.prepend(bar)
    const rm = bar.querySelector('[data-t="rm"]')
    rm.checked = reducedMotion()
    rm.addEventListener('change', (e) => {
      document.documentElement.classList.toggle('rm', e.target.checked)
      rmListeners.forEach((cb) => cb(reducedMotion()))
    })
  }

  /* hide the separator dot at the end of each visual line (layout reads, outside any rAF) */
  function markLineEnds(root) {
    root.querySelectorAll('.sk-words').forEach((ul) => {
      const items = [...ul.children]
      items.forEach((li, i) => {
        const next = items[i + 1]
        li.classList.toggle('eol', !!next && next.offsetTop > li.offsetTop + 4)
      })
    })
  }

  let live = null
  function mount({ title, aiCaption }) {
    document.documentElement.classList.add('js')
    mockBar(title)
    const S = window.SKILLS
    const [ai, ...rest] = window.SKILL_GROUPS
    const root = document.getElementById('skills')
    root.innerHTML = `
      <header class="head">
        <h2 class="eyebrow cyan" id="skills-h">Skills</h2>
        <p class="title">${esc(S.headline)}</p>
        <p class="lede">${esc(S.lede)}</p>
      </header>
      <div class="sk-list" id="sk-list">
        <div class="hud sk-ai" id="sk-ai">
          <div class="sk-ai-head"><h3 class="sk-h">${esc(ai.name)}</h3><p class="sk-cap">${esc(aiCaption || ai.caption)}</p></div>
          <ul class="sk-ai-grid">${ai.skills.map((s) => `<li><button type="button" class="sk-ai-item" data-skill="${esc(s.name)}" data-group="ai"><span class="sk-name">${esc(s.name)}</span><span class="sk-note">${esc(s.note)}</span></button></li>`).join('')}</ul>
        </div>
        <div class="sk-groups">${rest.map((g) => `
          <div class="sk-group ${g.id}" data-group="${g.id}"><h3 class="sk-h" id="skg-${g.id}">${esc(g.name)}</h3>
            <ul class="sk-words" aria-labelledby="skg-${g.id}">${g.skills.map((s) => `<li><button type="button" class="sk-w" data-skill="${esc(s.name)}" data-group="${g.id}">${esc(s.name)}</button><span class="dot" aria-hidden="true">·</span></li>`).join('')}</ul>
          </div>`).join('')}
        </div>
      </div>
      <p class="sk-live" aria-live="polite" id="sk-live"></p>`
    live = root.querySelector('#sk-live')
    const byName = new Map(window.SKILL_GROUPS.flatMap((g) => g.skills.map((s) => [s.name, { ...s, group: g.id, ai: !!g.featured }])))
    const words = [...root.querySelectorAll('[data-skill]')].map((el) => ({ el, ...byName.get(el.dataset.skill) }))
    const relayout = () => markLineEnds(root)
    document.fonts.ready.then(relayout)
    let t = 0
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(relayout, 120) })
    relayout()
    return { root, panel: root.querySelector('#sk-ai'), groups: [...root.querySelectorAll('.sk-group')], words, live, relayout }
  }

  /* the quiet "n of total found" pill: hidden until the first find */
  function found({ total, label = 'found' }) {
    const root = document.getElementById('skills')
    const pill = document.createElement('div')
    pill.className = 'sk-found'
    pill.setAttribute('aria-hidden', 'true') // the live region says it instead
    root.appendChild(pill)
    const seen = new Set()
    const render = () => { pill.innerHTML = `<b>${seen.size}</b><span>of ${total} ${esc(label)}</span>` }
    return {
      add(key) {
        if (seen.has(key)) return false
        seen.add(key)
        render()
        pill.classList.add('on')
        const b = pill.querySelector('b')
        b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump')
        return true
      },
      get count() { return seen.size },
      pill,
    }
  }

  const say = (t) => { if (!live) return; live.textContent = ''; setTimeout(() => { live.textContent = t }, 30) }

  window.SECTION2 = { mount, found, say, reducedMotion, onReducedMotion, esc }
})()
