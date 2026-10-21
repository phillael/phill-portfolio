// The round 6 mockup's full game flow (desktop + phone), used with shoot.mjs:
//   node docs/design/skills-game/tools/shoot.mjs http://127.0.0.1:8765/docs/design/skills-game/round6/blaster-synth.html /tmp/r6 docs/design/skills-game/tools/flow-steps.mjs
// It drives the mockup through its dev handle (window.__bl) and mock-bar controls ([data-t="w3"] = Jump to wave 3).
// For the site, port it to the site's dev handle (window.__skills) and drop the mock-bar steps.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export default async (page, { shot, mobile, log }) => {
  const tap = (x, y) => (mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y))
  const st = () => page.evaluate(() => {
    const G = __bl.G, M = __bl.M
    return { state: G.state, wave: G.wave + 1, score: G.score, hp: G.hp, active: G.active.size, music: M.on, level: M.level, band: __bl.bandSize(), status: document.querySelector('.bl-hud .r2').textContent.trim().slice(0, 90), voices: __bl.active() }
  })
  const freeze = () => page.evaluate(() => document.getAnimations().forEach((a) => a.pause()))
  const thaw = () => page.evaluate(() => document.getAnimations().forEach((a) => { if (a.playState === 'paused') a.play() }))
  const center = (sel) => page.$eval(sel, (el) => { const r = (el.querySelector('.sk-name') || el).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  const lit = (foes = true) => page.evaluate((foes) => [...__bl.G.active].filter((t) => foes || !t.foe).map((t) => { const r = t.k.label.getBoundingClientRect(); return { name: t.k.name, kind: t.kind, hp: t.hp, x: r.left + r.width / 2, y: r.top + r.height / 2 } }), foes)
  async function play(until, { foes = true, max = 500 } = {}) {
    for (let i = 0; i < max; i++) {
      const s = await st()
      if (until(s)) return s
      for (const t of await lit(foes)) { for (let j = 0; j < t.hp; j++) { await tap(t.x, t.y); await sleep(40) } }
      await sleep(90)
    }
    return st()
  }

  // the site's player is on when the game starts: the game pauses it
  await page.click('#sp-fab').catch(() => page.tap('#sp-fab'))
  await sleep(1200)
  log('site playing before', await page.evaluate(() => __bl.SITE_MUSIC.isPlaying()))
  if (mobile) await page.$eval('[data-skill="Docker"]', (el) => el.scrollIntoView({ block: 'center' }))
  else { const top = await page.$eval('.sk-groups', (el) => el.getBoundingClientRect().top + scrollY); await page.evaluate((y) => scrollTo(0, y - 300), top) }
  await sleep(250)
  const d = await center('[data-skill="Docker"]')
  await tap(d.x, d.y)
  await sleep(200)
  log('first', JSON.stringify(await st()), 'site playing', await page.evaluate(() => __bl.SITE_MUSIC.isPlaying()))
  for (let i = 0; i < 40 && (await st()).active < 1; i++) await sleep(100)
  await sleep(300)
  await shot('wave1')
  let s = await play((s) => s.wave >= 2 && s.state === 'wave')
  log('wave2', JSON.stringify(s))
  await sleep(500)
  await shot('wave2')
  s = await play((s) => s.state === 'between' && s.wave === 2)
  log('wave2 clear (riser)', JSON.stringify(s), JSON.stringify(await page.evaluate(() => ({ dropBar: __bl.M.dropBar, next: __bl.M.next && __bl.M.next.level, bar: Math.floor((__bl.ac.currentTime - __bl.M.zero) / (240 / 172)) }))))
  for (let i = 0; i < 80 && (await st()).wave < 3; i++) await sleep(50)
  await sleep(1200)
  await shot('drop')
  log('drop', JSON.stringify(await st()))
  // let an enemy fire, keep the band going
  const hp0 = (await st()).hp
  const tEnd = Date.now() + 20000
  while (Date.now() < tEnd && (await st()).hp === hp0) { for (const t of await lit(false)) { await tap(t.x, t.y); await sleep(30) } await sleep(25) }
  await sleep(60)
  await freeze(); await shot('hit-taken'); await thaw()
  log('hit taken', JSON.stringify(await st()), 'muteUntil-now', await page.evaluate(() => +(__bl.M.muteUntil - __bl.ac.currentTime).toFixed(2)))
  s = await play((s) => s.wave >= 4 && s.state === 'wave')
  log('wave4', JSON.stringify(s))
  await sleep(400)
  await shot('wave4')
  // game over
  await page.evaluate(() => { __bl.G.hp = 1 })
  for (let i = 0; i < 200 && (await st()).state !== 'over'; i++) { for (const t of await lit(false)) { await tap(t.x, t.y); await sleep(30) } await sleep(40) }
  log('over', JSON.stringify(await st()))
  await sleep(1800)
  log('after tape stop', JSON.stringify(await st()), 'site playing (handed back)', await page.evaluate(() => __bl.SITE_MUSIC.isPlaying()), JSON.stringify(await page.evaluate(() => __bl.SITE_MUSIC.calls)))
  await page.$eval('.bl-hud', (el) => el.scrollIntoView({ block: 'end' }))
  await sleep(200)
  await shot('game-over')
  // idle pauses the beat
  await page.evaluate(() => __bl.SITE_MUSIC.audio.pause())
  await page.$eval('[data-skill="Docker"]', (el) => el.scrollIntoView({ block: 'center' }))
  await sleep(200)
  const d2 = await center('[data-skill="Docker"]')
  await tap(d2.x, d2.y)
  await sleep(7500)
  log('ignored', JSON.stringify(await st()))
  // a shot resumes it
  const d3 = await center('[data-skill="Docker"]')
  await tap(d3.x, d3.y)
  await sleep(300)
  log('resumed', JSON.stringify(await st()))
  if (!mobile) {
    await page.keyboard.press('Escape')
    await sleep(500)
    await page.click('[data-t="w3"]')
    await sleep(200)
    log('jump', JSON.stringify(await st()), JSON.stringify(await page.evaluate(() => ({ dropBar: __bl.M.dropBar, next: __bl.M.next }))))
    for (let i = 0; i < 80 && (await st()).wave < 3; i++) await sleep(50)
    log('jump drop', JSON.stringify(await st()))
  }
  await page.keyboard.press('Escape').catch(() => {})
  await sleep(3500)
  log('settled', JSON.stringify(await st()), 'layer', await page.evaluate(() => document.querySelector('.bl-layer').children.length), 'screen', await page.evaluate(() => document.querySelector('.bl-screen').children.length))
}
