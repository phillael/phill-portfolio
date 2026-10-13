// Snapshot a Rezmancer resume for the Jelly Resume playground and the site.
//
//   node snapshot.mjs <rezmancer-resume.html> <out.js>           # playground (has phone + email; gitignored)
//   node snapshot.mjs --web <rezmancer-resume.html> <out-dir>    # site: public/resume/, no phone or email
//
// Lays the printed HTML out at the Letter content width (8.5in minus Rezmancer's
// 0.55in side margins), then records:
//   - every word's box, font, color and role (heading / bold / body)
//   - a transparent text-only image (exact glyphs, kerning, font features)
//   - a backing image with the page decorations (tint bars, rules, bullets) and no text
// and writes them as `window.REZ_SNAPSHOT = {...}` so a file:// page can load it.
//
// --web drops the phone and email from the contact line (with their separators) before
// measuring, renders at 2x instead of 3x, and writes snapshot.json + text.webp + decor.webp
// into <out-dir>. It refuses to write anything if a phone number or email survives.
import fs from 'node:fs';
import path from 'node:path';

const PUPPETEER = process.env.PUPPETEER_CORE
  || '/Users/phillipaelony/.npm/_npx/a6a54b540d72890f/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const { default: puppeteer } = await import(PUPPETEER);

const argv = process.argv.slice(2);
const WEB = argv.includes('--web');
const [htmlPath, outPath] = argv.filter((a) => !a.startsWith('--'));
if (!htmlPath || !outPath) {
  console.error('usage: node snapshot.mjs <resume.html> <out.js>\n       node snapshot.mjs --web <resume.html> <out-dir>');
  process.exit(1);
}

const DPR = WEB ? 2 : 3;
// What must never reach the public site. Lambda@Edge is the one legit "@" in the resume.
const PHONE_RE = /\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const leaks = (t) => (t.includes('@') && !/^Lambda@Edge\W*$/.test(t)) || /\(\d{3}\)|\d{3}-\d{4}/.test(t);
const PAGE = { w: 8.5, h: 11, marginX: 0.55, marginY: 0.4 }; // inches, from Rezmancer's @page
const contentW = Math.round((PAGE.w - 2 * PAGE.marginX) * 96);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: contentW, height: 1200, deviceScaleFactor: DPR });
await page.emulateMediaType('print');

async function load() {
  await page.goto('file://' + path.resolve(htmlPath), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  if (WEB) await stripContact();
}
// Remove the phone and email <li>s from the contact line. The `·` separators are
// `.contact li + li::before`, so they go with their items. Runs after every load:
// the decorations pass reloads the page.
async function stripContact() {
  const r = await page.evaluate((phoneSrc, emailSrc) => {
    const phone = new RegExp(phoneSrc), email = new RegExp(emailSrc);
    const ul = document.querySelector('ul.contact');
    if (!ul) return { removed: 0, leak: 'no ul.contact in the markup' };
    let removed = 0;
    for (const li of [...ul.children]) {
      if (li.querySelector('a[href^="mailto:"], a[href^="tel:"]') || email.test(li.textContent) || phone.test(li.textContent)) { li.remove(); removed++; }
    }
    const text = document.body.innerText;
    const leak = document.querySelector('a[href^="mailto:"], a[href^="tel:"]') ? 'a mailto:/tel: link'
      : email.test(text) ? 'an email address' : phone.test(text) ? 'a phone number' : null;
    return { removed, leak };
  }, PHONE_RE.source, EMAIL_RE.source);
  if (r.removed !== 2 || r.leak) {
    console.error(`--web: refusing to snapshot (removed ${r.removed} contact items, expected 2; leak: ${r.leak || 'none'}). Check the Rezmancer contact markup.`);
    await browser.close(); process.exit(2);
  }
}
await load();

const layout = await page.evaluate(() => {
  const main = document.querySelector('main'); const mr = main.getBoundingClientRect();
  const words = [];
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const el = n.parentElement, cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const re = /\S+/g; let m;
    while ((m = re.exec(n.data))) {
      const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
      const rc = r.getClientRects()[0]; if (!rc || rc.width < 0.5) continue;
      const strong = el.closest('strong, b');
      const head = el.closest('h1, h2, .title, .job-head strong, .role-title');
      const kind = el.closest('h1, h2') ? 'heading' : strong ? (el.closest('li, .summary, p') ? 'bold' : 'heading') : head ? 'heading' : 'body';
      words.push({
        t: cs.textTransform === 'uppercase' ? m[0].toUpperCase() : m[0],
        x: rc.left - mr.left, y: rc.top - mr.top, w: rc.width, h: rc.height,
        color: cs.color, size: parseFloat(cs.fontSize), weight: cs.fontWeight, kind,
      });
    }
  }
  return { words, w: mr.width, h: mr.height };
});
const clip = { x: 0, y: 0, width: layout.w, height: Math.ceil(layout.h) };

// Text only, on a transparent background
await page.addStyleTag({ content: `
  html, body { background: transparent !important; }
  * { background: transparent !important; border-color: transparent !important; box-shadow: none !important; }
  *::before, *::after { visibility: hidden !important; }` });
const textPng = await page.screenshot({ clip, omitBackground: true, captureBeyondViewport: true });

// Decorations only (bullets, separators, tint bars, rules), no text
await load();
await page.addStyleTag({ content: `* { color: transparent !important; -webkit-text-fill-color: transparent !important; }` });
const backingPng = await page.screenshot({ clip, captureBeyondViewport: true });
await browser.close();

if (WEB) {
  const { default: sharp } = await import('sharp');
  const bad = layout.words.filter((w) => leaks(w.t));
  if (bad.length) { console.error('--web: contact details leaked into the words:', bad.map((w) => w.t)); process.exit(2); }
  const r2 = (v) => Math.round(v * 100) / 100;
  const snapshot = {
    source: path.basename(htmlPath), createdAt: new Date().toISOString(), dpr: DPR, page: PAGE,
    content: { w: layout.w, h: layout.h }, images: { text: 'text.webp', decor: 'decor.webp' },
    words: layout.words.map((w) => ({ ...w, x: r2(w.x), y: r2(w.y), w: r2(w.w), h: r2(w.h) })),
  };
  // Lossy color with lossless alpha: the engine samples glyph alpha for bursts and normals.
  const textWebp = await sharp(textPng).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toBuffer();
  const decorWebp = await sharp(backingPng).webp({ quality: 90, effort: 6 }).toBuffer();
  fs.mkdirSync(outPath, { recursive: true });
  fs.writeFileSync(path.join(outPath, 'snapshot.json'), JSON.stringify(snapshot));
  fs.writeFileSync(path.join(outPath, 'text.webp'), textWebp);
  fs.writeFileSync(path.join(outPath, 'decor.webp'), decorWebp);
  console.log(`${layout.words.length} words, content ${layout.w}x${Math.round(layout.h)}px @${DPR}x, text ${(textWebp.length / 1024).toFixed(0)}KB, decor ${(decorWebp.length / 1024).toFixed(0)}KB → ${outPath}`);
} else {
  const snapshot = {
    source: path.basename(htmlPath), createdAt: new Date().toISOString(), dpr: DPR, page: PAGE,
    content: { w: layout.w, h: layout.h }, words: layout.words,
    textPng: 'data:image/png;base64,' + textPng.toString('base64'),
    backingPng: 'data:image/png;base64,' + backingPng.toString('base64'),
  };
  fs.writeFileSync(outPath, '// Generated by tools/snapshot.mjs from ' + snapshot.source + '\nwindow.REZ_SNAPSHOT = ' + JSON.stringify(snapshot) + ';\n');
  console.log(`${layout.words.length} words, content ${layout.w}x${Math.round(layout.h)}px, text ${(textPng.length / 1024).toFixed(0)}KB, backing ${(backingPng.length / 1024).toFixed(0)}KB → ${outPath}`);
}
