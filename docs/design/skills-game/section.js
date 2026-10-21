/*
 * Skills rethink, round 1: renders the section both games share into <section id="skills">:
 * the header, the list (AI first, in a glass panel with a note per skill; the other groups as
 * quiet lines), the Play button, and a hidden arena the game takes over. Each skill element
 * carries data-skill so a game can fly the words from the list into its level.
 *
 *   SECTION.mount({ playLabel, hint, onPlay })  → { root, list, cta, arena }
 *   SECTION.showArena() / showList(), SECTION.reducedMotion(), SECTION.say(text)
 */
(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const reducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('rm')

  function mockBar(title) {
    const bar = document.createElement('div')
    bar.className = 'mock-bar'
    bar.innerHTML = `<a href="index.html">← Both ideas</a><span class="mock-title">${esc(title)}</span><span class="spacer"></span><label><input type="checkbox" data-t="rm"> Reduced motion</label>`
    document.body.prepend(bar)
    const rm = bar.querySelector('[data-t="rm"]')
    rm.checked = reducedMotion()
    rm.addEventListener('change', (e) => {
      document.documentElement.classList.toggle('rm', e.target.checked)
      window.dispatchEvent(new CustomEvent('mock:rm', { detail: e.target.checked }))
    })
  }

  const PLAY_ICON = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="16" height="9" rx="4.5"/><path d="M6.5 9v3M5 10.5h3"/><circle cx="13" cy="9.6" r=".9" fill="currentColor"/><circle cx="14.6" cy="11.4" r=".9" fill="currentColor"/></svg>'

  let els = null
  function mount({ title, playLabel, hint, onPlay }) {
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
        <div class="hud sk-ai">
          <div class="sk-ai-head"><h3 class="sk-h">${esc(ai.name)}</h3><p class="sk-cap">${esc(ai.caption)}</p></div>
          <ul class="sk-ai-grid">${ai.skills.map((s) => `<li><span class="sk-name" data-skill="${esc(s.name)}">${esc(s.name)}</span><span class="sk-note">${esc(s.note)}</span></li>`).join('')}</ul>
        </div>
        <div class="sk-groups">${rest.map((g) => `
          <div class="sk-group ${g.id}"><h3 class="sk-h">${esc(g.name)}</h3>
            <p class="sk-line">${g.skills.map((s) => `<span class="w" data-skill="${esc(s.name)}">${esc(s.name)}</span>`).join('<span class="dot" aria-hidden="true">·</span> ')}</p>
          </div>`).join('')}
        </div>
      </div>
      <div class="sk-cta" id="sk-cta">
        <button type="button" class="hbtn primary" id="sk-play">${PLAY_ICON}<span>${esc(playLabel)}</span></button>
        <span class="hint">${esc(hint)}</span>
      </div>
      <div class="sk-arena hud" id="sk-arena" hidden></div>
      <p class="sk-live" aria-live="polite" id="sk-live"></p>`
    els = { root, list: root.querySelector('#sk-list'), cta: root.querySelector('#sk-cta'), arena: root.querySelector('#sk-arena'), live: root.querySelector('#sk-live') }
    root.querySelector('#sk-play').addEventListener('click', onPlay)
    return els
  }

  function showArena() {
    els.list.hidden = true
    els.cta.hidden = true
    els.arena.hidden = false
  }
  function showList() {
    els.arena.hidden = true
    els.arena.innerHTML = ''
    els.list.hidden = false
    els.cta.hidden = false
    els.root.querySelector('#sk-play').focus({ preventScroll: true })
  }
  const say = (t) => { if (els) els.live.textContent = t }

  window.SECTION = { mount, showArena, showList, reducedMotion, say, esc }
})()
