/* Experience refresh mockups: helpers + the mockup bar. Load after career.js. */
(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

  /** `**bold**` → <strong>, everything else escaped (same markup as resume.ts). */
  const rich = (s) =>
    String(s)
      .split('**')
      .map((t, i) => (i % 2 ? `<strong>${esc(t)}</strong>` : esc(t)))
      .join('')

  /** A source tag, shown only with "Show sources" on. */
  const src = (s) => (s ? `<span class="src" title="Source">${esc(s)}</span>` : '')

  /** True when motion should be reduced (the media query or the mockup bar's toggle). */
  const reducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('rm')

  /** Mockup bar: back link, title, Sources + Reduced-motion toggles. Fires 'mock:rm' on toggle. */
  function mockBar(title) {
    const bar = document.createElement('div')
    bar.className = 'mock-bar'
    bar.innerHTML = `
      <a href="index.html">← All directions</a>
      <span class="mock-title">${esc(title)}</span>
      <span class="spacer"></span>
      <label><input type="checkbox" data-t="src"> Show sources</label>
      <label><input type="checkbox" data-t="rm"> Reduced motion</label>`
    document.body.prepend(bar)
    const root = document.documentElement
    bar.querySelector('[data-t="src"]').addEventListener('change', (e) => root.classList.toggle('show-src', e.target.checked))
    const rm = bar.querySelector('[data-t="rm"]')
    rm.checked = reducedMotion()
    rm.addEventListener('change', (e) => {
      root.classList.toggle('rm', e.target.checked)
      window.dispatchEvent(new CustomEvent('mock:rm', { detail: e.target.checked }))
    })
  }

  window.MOCK = { esc, rich, src, reducedMotion, mockBar }
})()
