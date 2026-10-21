// Offline render comparison, Jelly sounds: the site's src/lib/jelly/sfx.ts (types stripped) against the lab's jelly-sfx.js,
// cue by cue, seeded Math.random. Build the stripped script first (from the repo root):
//   node -e 'const m=require("node:module"),fs=require("fs");const s=(f)=>m.stripTypeScriptTypes(fs.readFileSync(f,"utf8"),{mode:"strip"}).replace(/^import .*$/mg,"").replace(/^export (const|function|type|interface)/mg,"$1");fs.writeFileSync("docs/design/sound-lab/tools/sfx-new.js","window.ORIG_SFX=(()=>{\\n"+s("src/lib/jelly/config.ts")+"\\n"+s("src/lib/jelly/sfx.ts")+"\\nreturn{createSfx}})()")'
// then serve the repo root (python3 -m http.server 8765) and run: node docs/design/sound-lab/tools/render-compare-jelly.mjs
// (sfx-new.js is a build artifact: don't commit it).

// Renders each Jelly cue through the real sfx.ts (types stripped) and the lab's jelly-sfx.js port at its
// defaults, with the same seeded Math.random, and compares the samples.
const { default: puppeteer } = await import('/Users/phillipaelony/.npm/_npx/a6a54b540d72890f/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js')
const fs = await import('node:fs')
const dir = new URL('.', import.meta.url).pathname
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('pageerror', e.message))
await page.goto('http://127.0.0.1:8765/docs/design/sound-lab/index.html')
await page.addScriptTag({ content: fs.readFileSync(dir + 'sfx-new.js', 'utf8') })
const res = await page.evaluate(async () => {
  const SR = 44100
  const seed = (s) => { let a = s >>> 0; Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
  const CASES = [
    ['whoosh', (o) => o.intro(2.09), (n) => n.cue('whoosh', 0, 0)],
    ['gulp', (o) => o.gulp(), (n) => n.cue('gulp', 0, 0)],
    ['boom', (o) => o.boom(), (n) => n.cue('boom', 0, 0)],
    ['drone', (o) => o.hole(0.6), (n) => n.hole(0.6)],
    ['jump', (o) => o.jump(), (n) => n.cue('jump', 0, 0)],
    ['land', (o) => o.land(6), (n) => n.cue('land', 6, 0)],
    ['smash', (o) => o.smash(), (n) => n.cue('smash', 0, 0)],
    ['coin', (o) => o.coin(), (n) => n.cue('coin', 0, 0)],
    ['finish', (o) => o.finish(), (n) => n.cue('finish', 0, 0)],
    ['shrimp', (o) => o.shrimp(), (n) => n.cue('shrimp', 0, 0)],
    ['ufo', (o) => o.ufo(), (n) => n.cue('ufo', 0, 0)],
    ['mushroom', (o) => o.mushroomAppear(), (n) => n.cue('mushroom', 0, 0)],
    ['powerUp', (o) => o.powerUp(), (n) => n.cue('powerUp', 0, 0)],
    ['powerDown', (o) => o.powerDown(), (n) => n.cue('powerDown', 0, 0)],
    ['alert', (o) => o.enemyAlert(), (n) => n.cue('alert', 0, 0)],
    ['stomp', (o) => o.stomp(), (n) => n.cue('stomp', 0, 0)],
    ['kicked', (o) => o.kicked(), (n) => n.cue('kicked', 0, 0)],
    ['tink', (o) => o.tink(), (n) => n.cue('tink', 0, 0)],
    ['giantStep', (o) => o.giantStep(0.7), (n) => n.cue('giantStep', 0.7, 0)],
  ]
  const run = async (fn, which) => {
    seed(99)
    const ctx = new OfflineAudioContext(2, SR * 2.5, SR)
    if (which === 'orig') {
      const proxy = new Proxy(ctx, { get(t, k) { if (k === 'state') return 'running'; const v = Reflect.get(t, k, t); return typeof v === 'function' ? v.bind(t) : v } })
      const keep = window.AudioContext
      window.AudioContext = function () { return proxy }
      const s = ORIG_SFX.createSfx(() => ({ soundOn: true, volume: 1 }))
      s.init(); s.prepare()
      window.AudioContext = keep
      fn(s)
    } else fn(JELLY_SFX.create(ctx))
    const b = await ctx.startRendering()
    return [b.getChannelData(0), b.getChannelData(1)]
  }
  const out = {}
  for (const [name, o, n] of CASES) {
    const a = await run(o, 'orig'), b = await run(n, 'port')
    let max = 0, se = 0, ss = 0
    for (let c = 0; c < 2; c++) for (let i = 0; i < a[c].length; i++) { const d = a[c][i] - b[c][i]; max = Math.max(max, Math.abs(d)); se += d * d; ss += a[c][i] * a[c][i] }
    out[name] = { rms: +Math.sqrt(ss / a[0].length / 2).toFixed(4), maxDiff: +max.toExponential(2), relErrDb: ss ? +(10 * Math.log10(se / ss || 1e-30)).toFixed(1) : null }
  }
  return out
})
console.table(res)
await browser.close()
