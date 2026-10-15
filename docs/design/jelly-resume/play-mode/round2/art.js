/**
 * Play mode round 2: the pixel art, as plain functions on a 2D canvas so the engine can take
 * them as they are (PLAYER 1 START is painted into the page's backing canvas in engine.load(),
 * like the decorations; the mushroom and the ? block are voxel meshes built from these grids).
 *
 * Everything is original art in the site's colors (inspired by NES-era sprites, not copied
 * from any game). Grids are drawn one art pixel = `px` canvas pixels, no smoothing.
 */

/** the printed palette: resume ink on white paper, plus the site's neon, darkened enough to read on paper */
export const PAL = {
  k: '#16181d', // the resume's ink
  d: '#3a3f4b',
  g: '#8a93a3',
  l: '#d9dde5',
  w: '#ffffff',
  m: '#ff4fd8', // site pink
  v: '#c44dff', // site violet
  V: '#7a22b5',
  o: '#4a1470', // deep violet outline
  c: '#00b8e0', // electric, printable
  C: '#80eaff', // site cyan
  r: '#ff3b5c',
  R: '#a8123a',
  y: '#ffd24a',
  Y: '#b8860b',
  t: '#0f766e', // the resume's teal
  b: '#7a5230',
  B: '#3d2a18',
  s: '#e9b98f',
  p: '#f1e6cf',
  n: '#8b5a3c',
  j: '#3b5ba5',
  e: '#fff1d6',
  a: '#5c6474', // slate (the meteor)
  A: '#262a33',
  G: '#bff6ff', // glass
  F: '#19c6e6', // the pod's fluid
}

// ---- a 5×7 pixel font (the letters these labels need) ----
const F5 = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '>': ['#....', '##...', '###..', '####.', '###..', '##...', '#....'], // ▶
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
}
// a 3×5 font for tiny labels
const F3 = {
  S: ['###', '#..', '###', '..#', '###'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  E: ['###', '#..', '##.', '#..', '###'],
  L: ['#..', '#..', '#..', '#..', '###'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  ' ': ['...', '...', '...', '...', '...'],
}

/** the width of a label in art pixels (bold: each stroke doubled to the right, like an arcade font) */
export function textWidth(s, { bold = false, small = false } = {}) {
  const gw = small ? 3 : 5, adv = gw + (bold ? 1 : 0) + 1
  return s.length * adv - 1
}

/** draw a label at art pixel (x, y); returns its width */
export function text(g, s, x, y, px, col, { bold = false, small = false } = {}) {
  const font = small ? F3 : F5, gw = small ? 3 : 5, adv = gw + (bold ? 1 : 0) + 1
  g.fillStyle = col
  for (let i = 0; i < s.length; i++) {
    const rows = font[s[i]] ?? font[' ']
    rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) if (row[c] === '#') g.fillRect((x + i * adv + c) * px, (y + r) * px, px * (bold ? 2 : 1), px)
    })
  }
  return textWidth(s, { bold, small })
}

/** a grid of palette letters ('.' = empty) at art pixel (x, y) */
export function grid(g, rows, x, y, px, pal = PAL) {
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const k = row[c]
      if (k === '.' || k === ' ') continue
      g.fillStyle = pal[k] ?? k
      g.fillRect((x + c) * px, (y + r) * px, px, px)
    }
  })
}

/** shapes → a grid: fill(x, y) returns a palette letter or null; an outline is added around everything filled */
export function shape(w, h, fill, outline) {
  const cells = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => fill(x, y)))
  const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? cells[y][x] : null)
  const out = cells.map((row, y) => row.map((v, x) => {
    if (v) return v
    if (!outline) return '.'
    return at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1) ? outline : '.'
  }))
  return out.map((r) => r.join(''))
}

// ---- PLAYER 1 START: three looks ----

/** A: an arcade cabinet's 1P button (three-quarter view) beside "PLAYER 1 / ▶ START" */
function arcadeButton(on) {
  const W = 30, H = 22, cx = 14.5
  return shape(W, H, (x, y) => {
    const dx = x - cx
    const inE = (cy, rx, ry) => (dx / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1
    const top = inE(7.5, 9, 3.4), side = Math.abs(dx) <= 9 && y + 0.5 >= 7.5 && y + 0.5 <= 12.5, bot = inE(12.5, 9, 3.4)
    if (top) {
      if ((dx / 6) ** 2 + ((y + 0.5 - 6.6) / 1.6) ** 2 <= 1 && dx < 0) return on ? 'w' : 'm'
      return on ? 'm' : 'r'
    }
    if (side || bot) return 'R'
    const plate = inE(15.5, 14.2, 5.6), plateIn = inE(15, 12.4, 4.6)
    if (plateIn) return 'd'
    if (plate) return 'k'
    return null
  }, 'k')
}

/** B: a little game controller (original design: d-pad, select/start, B and A) */
function controller(on) {
  const W = 50, H = 21
  const body = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return false
    const cut = (cx, cy) => (x - cx) ** 2 + (y - cy) ** 2
    // rounded corners
    if (x < 3 && y < 3 && cut(3, 3) > 9) return false
    if (x > W - 4 && y < 3 && cut(W - 4, 3) > 9) return false
    if (x < 3 && y > H - 4 && cut(3, H - 4) > 9) return false
    if (x > W - 4 && y > H - 4 && cut(W - 4, H - 4) > 9) return false
    return true
  }
  return shape(W, H, (x, y) => {
    if (!body(x, y)) return null
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1 || !body(x - 1, y) || !body(x + 1, y) || !body(x, y - 1) || !body(x, y + 1)) return 'k'
    // a faceplate band
    const face = y >= 4 && y <= H - 4 && x >= 3 && x <= W - 4
    // d-pad
    const dx = x - 9, dy = y - 10.5
    if ((Math.abs(dx) <= 1 && Math.abs(dy) <= 5.5) || (Math.abs(dy) <= 1.5 && Math.abs(dx) <= 5)) return Math.abs(dx) <= 1 && Math.abs(dy) <= 1.5 ? 'd' : 'k'
    // select / start pills
    if (y >= 12 && y <= 13 && x >= 19 && x <= 23) return 'g'
    if (y >= 12 && y <= 13 && x >= 26 && x <= 30) return on ? 'c' : 'g'
    // B and A
    const b = (x - 36.5) ** 2 + (y - 11.5) ** 2, a = (x - 43.5) ** 2 + (y - 11.5) ** 2
    if (b <= 9.5) return b <= 2 && x < 36.5 && y < 11.5 ? 'w' : 'v'
    if (a <= 9.5) return a <= 2 && x < 43.5 && y < 11.5 ? 'w' : 'm'
    if (b <= 13 || a <= 13) return 'k'
    return face ? 'l' : 'g'
  }, null)
}

/** C: an 8-bit Phill (cowboy hat, poncho, jeans) */
const PHILL = [
  '.....kkkkkk.....',
  '....kbbbbbbk....',
  '....kbbbbbbk....',
  '.kkkkBBBBBBkkkk.',
  'kbbbbbbbbbbbbbbk',
  '.kkkkkkkkkkkkkk.',
  '....kssssssk....',
  '....kskssksk....',
  '....kssssssk....',
  '....kBssssBk....',
  '...kkBBBBBBkk...',
  '..kppppppppppk..',
  '.kpnnnnnnnnnnpk.',
  'kppppppppppppppk',
  'kpkkkkkkkkkkkkpk',
  'kppppppppppppppk',
  'kpnnnnnnnnnnnnpk',
  'kkkkkkkkkkkkkkkk',
  '...kjjjkkjjjk...',
  '...kjjjkkjjjk...',
  '...kjjjkkjjjk...',
  '..kBBBBkkBBBBk..',
  '..kkkkkkkkkkkk..',
]

/**
 * Paint PLAYER 1 START into a canvas: its right edge at canvas x `right`, centered on canvas y `cy`,
 * one art pixel = `px` canvas pixels. Returns its box and the parts that blink (canvas pixels).
 */
export function paintStart(g, look, right, cy, px, { on = true } = {}) {
  let w, h
  const blink = []
  const parts = []
  if (look === 'A') {
    const btn = arcadeButton(on), tw = textWidth('PLAYER 1', { bold: true })
    w = 30 + 4 + tw
    h = 22
    parts.push(() => grid(g, btn, 0, 0, px))
    parts.push(() => text(g, 'PLAYER 1', 34, 3, px, PAL.k, { bold: true }))
    parts.push(() => { if (on) text(g, '>', 34, 12, px, PAL.m) })
    parts.push(() => text(g, 'START', 41, 12, px, PAL.k, { bold: true }))
    blink.push([34, 12, 5, 7], [5, 3, 19, 10])
  } else if (look === 'B') {
    const pad = controller(on), label = 'PLAYER 1 START', tw = textWidth(label) + 7
    w = Math.max(50, tw)
    h = 21 + 4 + 7
    const px0 = Math.round((w - 50) / 2), tx = Math.round((w - tw) / 2)
    parts.push(() => grid(g, pad, px0, 0, px))
    parts.push(() => { if (on) text(g, '>', tx, 25, px, PAL.m) })
    parts.push(() => text(g, label, tx + 7, 25, px, PAL.k))
    blink.push([tx, 25, 5, 7], [px0 + 26, 12, 5, 2])
  } else {
    const tw = textWidth('PLAYER 1', { bold: true })
    w = 16 + 5 + tw
    h = 23
    parts.push(() => grid(g, PHILL, 0, 0, px))
    parts.push(() => text(g, 'PLAYER 1', 21, 5, px, PAL.k, { bold: true }))
    parts.push(() => { if (on) text(g, '>', 21, 14, px, PAL.m) })
    parts.push(() => text(g, 'START', 28, 14, px, PAL.k, { bold: true }))
    blink.push([21, 14, 5, 7])
  }
  const x0 = Math.round(right - w * px), y0 = Math.round(cy - (h * px) / 2)
  g.save()
  g.translate(x0, y0)
  g.imageSmoothingEnabled = false
  for (const p of parts) p()
  g.restore()
  return {
    box: [x0, y0, w * px, h * px],
    blink: blink.map(([x, y, bw, bh]) => [x0 + x * px, y0 + y * px, bw * px, bh * px]),
    size: [w, h],
  }
}

// ---- the mushroom and the ? block (front views; the engine extrudes them into voxels) ----

/** the mushroom, 16 × 18: the cap in the site's violet (or a classic red), spots, a cream stem with eyes */
export function mushroom(kind = 'violet') {
  const cap = kind === 'red' ? 'r' : 'v', spot = kind === 'red' ? 'w' : 'C', rim = kind === 'red' ? 'R' : 'o'
  return shape(16, 18, (x, y) => {
    const X = x + 0.5, Y = y + 0.5
    const inCap = ((X - 8) / 7.1) ** 2 + ((Y - 9.4) / 7.9) ** 2 <= 1 && Y <= 10.4
    if (inCap) {
      const spots = [[8, 3.9, 2.3], [3.3, 7.9, 1.8], [12.7, 7.9, 1.8]]
      if (spots.some(([sx, sy, r]) => (X - sx) ** 2 + (Y - sy) ** 2 <= r * r)) return spot
      if (Y > 9.4) return rim
      return cap
    }
    if (X >= 4.5 && X <= 11.5 && Y > 10.4 && Y <= 16.4) {
      if ((X < 5.5 || X > 10.5) && Y > 15.4) return null
      if ((x === 6 || x === 9) && (y === 12 || y === 13)) return 'k'
      return 'e'
    }
    return null
  }, rim === 'o' ? 'o' : 'B')
}

/** the ? block, 12 × 12: rivets in the corners and a bold "?" with a drop shadow */
const Q_BLOCK = [
  'OOOOOOOOOOOO',
  'OOffffffffOO',
  'Offffqqqqfff',
  'Offfqqffqqff',
  'Offfffffqqff',
  'Offfffffqqff',
  'Offfffqqffff',
  'Offfffqqffff',
  'Offfffffffff',
  'Offfffqqffff',
  'OOffffffffOO',
  'OOOOOOOOOOOO',
]
export function qBlock(kind = 'gold') {
  const [O, f, q] = kind === 'gold' ? ['Y', 'y', 'w'] : ['o', 'v', 'w']
  return Q_BLOCK.map((row, y) => row.split('').map((k, x) => {
    if (x === 11 && k !== 'O') return O // the right edge
    if (k === 'O') return O
    if (k === 'q') return q
    return Q_BLOCK[y - 1]?.[x - 1] === 'q' ? O : f // the "?" casts a shadow down-right
  }).join(''))
}

// ---- the containers: what you smash for a mushroom (round 2b: space and cyberpunk, not Mario's ? block) ----

/** the pixels along a polyline (cracks) */
function linePx(pts) {
  const out = new Set()
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
    for (let s = 0; s <= n; s++) out.add(`${Math.round(x0 + ((x1 - x0) * s) / n)},${Math.round(y0 + ((y1 - y0) * s) / n)}`)
  }
  return out
}

/** the UFO's rim lights: the cells the mockup chases (row 7, every third pixel) */
export const UFO_LIGHTS = (x, y) => y === 7 && x % 3 === 2

/** a little flying saucer, 24 × 12: a glass dome with the mushroom riding inside, chasing rim lights, a beam port underneath */
export function ufo() {
  const cx = 12
  return shape(24, 12, (x, y) => {
    const X = x + 0.5, Y = y + 0.5, dx = X - cx
    if ((dx / 4.6) ** 2 + ((Y - 5.6) / 4.8) ** 2 <= 1 && Y <= 5.6) {
      if (y === 2 && (x === 11 || x === 12)) return 'v' // the passenger
      if (y === 3 && x >= 10 && x <= 13) return x === 11 ? 'C' : 'v'
      if (y === 4 && (x === 11 || x === 12)) return 'e'
      if ((x === 10 && y === 1) || (x === 9 && y === 2)) return 'w'
      return y === 5 ? 'c' : 'C'
    }
    if ((dx / 10.8) ** 2 + ((Y - 7.6) / 2.6) ** 2 <= 1) {
      if (y <= 6) return 'l'
      if (y === 7) return UFO_LIGHTS(x, y) ? ['y', 'm', 'C'][Math.floor(x / 3) % 3] : 'g'
      return y === 8 ? 'g' : 'd'
    }
    if (y === 10 && x >= 10 && x <= 13) return 'c'
    return null
  }, 'k')
}

/** a spore meteor, 18 × 13: a cratered space rock, cracked open and glowing cyan (what's inside is alive) */
export function meteor() {
  const o = 1
  const blobs = [[8, 7.4, 5.8], [5.2, 5.6, 3.6], [11, 5, 3.8], [12.6, 8.6, 3.2], [3.6, 9, 3.2]].map(([x, y, r]) => [x + o, y, r])
  const crack = new Set([...linePx([[3, 4], [5, 6], [8, 5], [10, 8], [13, 9]]), ...linePx([[8, 5], [9, 2]]), ...linePx([[6, 10], [10, 8]])].map((k) => { const [x, y] = k.split(',').map(Number); return `${x + o},${y}` }))
  const hot = new Set([`${8 + o},5`, `${10 + o},8`])
  const craters = [[5 + o, 9.2, 1.3], [11.6 + o, 4.4, 1.1], [6.4 + o, 2.8, 0.9]]
  return shape(18, 13, (x, y) => {
    const X = x + 0.5, Y = y + 0.5
    if (Y > 12.2 || !blobs.some(([bx, by, r]) => (X - bx) ** 2 + (Y - by) ** 2 <= r * r)) return null
    const k = `${x},${y}`
    if (hot.has(k)) return 'w'
    if (crack.has(k)) return 'C'
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => crack.has(`${x + a},${y + b}`)) && (x + y) % 2 === 0) return 'c'
    for (const [cx, cy, r] of craters) if ((X - cx) ** 2 + (Y - cy) ** 2 <= r * r) return X - cx + Y - cy > 0.4 ? 'a' : 'A'
    const lit = -(X - 8.5 - o) * 0.6 - (Y - 7) * 0.8
    return lit > 2.4 ? 'a' : lit < -2.6 ? 'A' : 'd'
  }, 'k')
}

/** a specimen pod, 14 × 21: a lab capsule of glowing fluid with the mushroom floating inside. Two layers of the same size: the solid parts, and the glass + fluid (drawn see-through) */
export function pod() {
  const rows = [
    '..............',
    '......kk......',
    '.....kmmk.....',
    '...kkkkkkkk...',
    '..kaggggggak..',
    '..kddddddddk..',
    '..kkkkkkkkkk..',
    '..k........k..',
    '..k........k..',
    '..k...vv...k..',
    '..k..vCvv..k..',
    '..k.vvvvvv.k..',
    '..k..oooo..k..',
    '..k.w.ee...k..',
    '..k...ee...k..',
    '..k.......wk..',
    '..k.w......k..',
    '..kkkkkkkkkk..',
    '.kddydddcddk..',
    'kaaaaaaaaaaaak',
    'kkkkkkkkkkkkkk',
  ].map((r) => r.padEnd(14, '.'))
  const glass = rows.map((r, y) => r.split('').map((c, x) => (y >= 7 && y <= 16 && x >= 3 && x <= 10 ? (y === 7 ? 'G' : 'F') : '.')).join(''))
  return { rows, glass }
}

/** a cyber crate, 16 × 13: a dark cargo crate, a neon frame, hazard stripes and a status screen; a hologram of what's inside floats over it */
export function crate() {
  const W = 16, H = 13
  return Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => {
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) return 'k'
    if ((x === 1 || x === W - 2) && (y === 1 || y === H - 2)) return 'g' // bolts
    if (x === 1 || y === 1 || x === W - 2 || y === H - 2) return 'm' // the neon frame
    if (y >= 5 && y <= 7) return (x + y) % 4 < 2 ? 'y' : 'A' // hazard stripes
    if (y >= 9 && y <= 10 && x >= 10 && x <= 13) return x === 13 && y === 9 ? 'C' : 'c' // the status screen
    return x === 2 || y === 2 ? 'a' : 'd'
  }).join(''))
}

/** the crate's hologram: the mushroom's silhouette, 8 × 7, in electric cyan (the mockup draws it see-through, scanlined) */
export function hologram() {
  return ['..cccc..', '.cccccc.', 'cccccccc', 'cccccccc', '..cccc..', '..cccc..', '..cccc..']
}
