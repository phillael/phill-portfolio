// Usage: node shoot.mjs <url> <outPrefix> [steps.mjs]
// Shoots the page at 1280×800 (mouse) and 375×812 (touch). If a steps module is given, its
// default export `async (page, { shot, mobile, log }) => {}` runs on each viewport after load;
// `shot(name)` saves <outPrefix>-<desk|phone>-<name>.png. Console errors are printed.
const { default: puppeteer } = await import('/Users/phillipaelony/.npm/_npx/a6a54b540d72890f/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js')
const [url, out, stepsPath] = process.argv.slice(2)
const steps = stepsPath ? (await import(new URL(stepsPath, 'file://' + process.cwd() + '/').href)).default : null
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--autoplay-policy=no-user-gesture-required', '--hide-scrollbars'],
})
const views = [
  { tag: 'desk', viewport: { width: 1280, height: 800, deviceScaleFactor: 1 } },
  { tag: 'phone', viewport: { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
]
const only = process.env.ONLY
for (const v of views) {
  if (only && only !== v.tag) continue
  const page = await browser.newPage()
  await page.setViewport(v.viewport)
  if (v.tag === 'phone') await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log(`[${v.tag} console.${m.type()}]`, m.text()) })
  page.on('pageerror', (e) => console.log(`[${v.tag} pageerror]`, e.message))
  await page.goto(url, { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)
  const shot = async (name, opts = {}) => {
    const path = `${out}-${v.tag}-${name}.png`
    await page.screenshot({ path, ...opts })
    console.log('saved', path)
  }
  if (steps) await steps(page, { shot, mobile: v.tag === 'phone', log: (...a) => console.log(`[${v.tag}]`, ...a) })
  else await shot('full', { fullPage: true })
  await page.close()
}
await browser.close()
