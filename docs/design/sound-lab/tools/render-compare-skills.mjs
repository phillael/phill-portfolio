// Offline render comparison, Skill blaster engine: renders the same hits and beats through two engines with a seeded
// Math.random in an OfflineAudioContext and prints the difference (relErrDb ≤ -100 = identical; Chrome's convolver adds
// run-to-run noise of about -80…-150 dB even for one engine against itself). Written for the round 6 refactor (window.OLD,
// built from the pre-refactor game script, vs round6/synth.js). For the site's TypeScript port, build the TS engine into a
// plain script the way render-compare-jelly.mjs does (node:module stripTypeScriptTypes) and compare it to synth.js.
// Serve the repo root first: python3 -m http.server 8765

// Renders the same sounds through round 6's original engine and the refactored synth.js (seeded
// Math.random, OfflineAudioContext) and compares the samples.
const { default: puppeteer } = await import('/Users/phillipaelony/.npm/_npx/a6a54b540d72890f/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js')
const fs = await import('node:fs')
const dir = new URL('.', import.meta.url).pathname // (expects old-engine.js next to this file)
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('pageerror', e.message))
page.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()) })
await page.goto('http://127.0.0.1:8765/docs/design/skills-game/round6/blaster-synth.html')
await page.addScriptTag({ url: '/docs/design/skills-game/round6/synth.js' })
await page.addScriptTag({ content: fs.readFileSync(dir + 'old-engine.js', 'utf8') })
const diff = process.argv[2] ? JSON.parse(process.argv[2]) : undefined
const res = await page.evaluate(async (diff) => {
  const SR = 44100
  const seed = (s) => { let a = s >>> 0; Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
  const BEAT = 60 / 172, SIX = BEAT / 4
  // each case schedules on an engine adapter: { hit(group, k, t, v), beat(level, bar, pos, t), ... }
  const k = (gi, n) => ({ gi, frac: gi / Math.max(1, n - 1) })
  const CASES = {
    bass1: (E) => { E.hit('backend', k(4, 14), 0.05, 1) },
    bass2: (E) => { E.hit('backend', k(4, 14), 0.05, 1); E.hit('backend', k(9, 14), 0.05 + 2 * BEAT, 0.45) },
    bass: (E) => { E.hit('cloud', k(3, 12), 0.02, 0); E.hit('backend', k(4, 14), 0.05, 1); E.hit('backend', k(9, 14), 0.05 + 2 * BEAT, 0.45) },
    chords: (E) => { E.hit('cloud', k(1, 12), 0.05, 1); E.hit('cloud', k(6, 12), 0.05 + 4 * BEAT, 0.45) },
    arp: (E) => { E.hit('frontend', k(5, 15), 0.05, 1) },
    lead: (E) => { E.hit('ai', k(2, 16), 0.05, 1); E.hit('ai', k(7, 16), 0.05 + BEAT, 1); E.hit('ai', k(15, 16), 0.05 + 4 * BEAT, 0.7) },
    bleeps: (E) => { E.hit('quality', k(3, 10), 0.05, 1) },
    bells: (E) => { E.hit('product', k(6, 8), 0.05, 1) },
    vox: (E) => { [0, 1, 2, 3].forEach((i) => E.hit('music', k(i, 6), 0.05 + i * BEAT, 1)) },
    drums: (E) => { for (const level of [0, 1, 2, 3, 4]) for (let s = 0; s < 16; s++) E.beat(level, level, s, 0.05 + (level * 16 + s) * SIX) },
    riser: (E) => { E.D.riser(0.05, 0.05 + 4 * BEAT); E.D.crash(0.05 + 4 * BEAT, 1); E.D.impact(0.05 + 4 * BEAT) },
    song: (E) => {
      for (let s = 0; s < 64; s++) E.beat(2, (s / 16) | 0, s % 16, 0.05 + s * SIX)
      E.hit('cloud', k(0, 12), 0.05, 1); E.hit('backend', k(0, 14), 0.05, 1); E.hit('ai', k(4, 16), 0.05 + 2 * BEAT, 1)
      E.hit('cloud', k(8, 12), 0.05 + 8 * BEAT, 1); E.hit('frontend', k(3, 15), 0.05 + 9 * BEAT, 1); E.hit('product', k(2, 8), 0.05 + 10 * BEAT, 1)
      E.hit('quality', k(8, 10), 0.05 + 11 * BEAT, 1); E.hit('music', k(5, 6), 0.05 + 12 * BEAT, 1); E.hit('backend', k(13, 14), 0.05 + 12 * BEAT, 1)
    },
  }
  const DUR = { bass1: 2, bass2: 2, bass: 2, chords: 5, arp: 2, lead: 4, bleeps: 2, bells: 3, vox: 3, drums: 8, riser: 4, song: 9 }
  async function render(which, name) {
    seed(1234)
    const ctx = new OfflineAudioContext(2, SR * DUR[name], SR)
    let E
    if (which === 'old') {
      const O = window.OLD(ctx)
      E = { D: O.D, hit: (g, kk, t, v) => O.HIT[g](kk, t, v), beat: (level, bar, pos, t) => { O.M.level = level; O.drums(bar, pos, t) } }
    } else {
      const N = SKILL_SYNTH.create(ctx, diff)
      N.mbus.gain.value = 1
      E = { D: N.D, hit: N.hit, beat: N.beat }
    }
    CASES[name](E)
    const buf = await ctx.startRendering()
    return [buf.getChannelData(0), buf.getChannelData(1)]
  }
  const out = {}
  for (const name of Object.keys(CASES)) {
    const a = await render('old', name), b = await render('new', name)
    let max = 0, se = 0, ss = 0, at = 0
    for (let c = 0; c < 2; c++) for (let i = 0; i < a[c].length; i++) { const d = a[c][i] - b[c][i]; if (Math.abs(d) > max) { max = Math.abs(d); at = i / SR } se += d * d; ss += a[c][i] * a[c][i] }
    out[name] = { at: +at.toFixed(4), rms: +Math.sqrt(ss / a[0].length / 2).toFixed(4), maxDiff: +max.toExponential(2), relErrDb: ss ? +(10 * Math.log10(se / ss || 1e-30)).toFixed(1) : null }
  }
  return out
}, diff)
console.table(res)
await browser.close()
