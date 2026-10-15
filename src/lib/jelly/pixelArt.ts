/**
 * Play mode's pixel art (round 2), ported from the mockup's docs/design/jelly-resume/play-mode/round2/art.js
 * with only what ships: PLAYER 1 START (look A, the arcade button), painted into the page's backing
 * in engine.load(), and the grids the voxel meshes are built from (the violet mushroom, the UFO).
 *
 * Original art in the site's colors (inspired by NES-era sprites, not copied from any game).
 * Grids are drawn one art pixel = `px` canvas pixels, no smoothing; '.' is an empty cell.
 */

/** the printed palette: resume ink on white paper, plus the site's neon, darkened enough to read on paper */
export const PAL: Readonly<Record<string, string>> = Object.freeze({
  k: '#16181d', // the resume's ink
  d: '#3a3f4b',
  g: '#8a93a3',
  l: '#d9dde5',
  w: '#ffffff',
  m: '#ff4fd8', // site pink
  v: '#c44dff', // site violet
  o: '#4a1470', // deep violet outline
  c: '#00b8e0', // electric, printable
  C: '#80eaff', // site cyan
  r: '#ff3b5c',
  R: '#a8123a',
  y: '#ffd24a',
  e: '#fff1d6',
})

/** what the art paints with: a 2D context (or a stand-in in tests) */
export type Painter = Pick<CanvasRenderingContext2D, 'fillStyle' | 'fillRect' | 'save' | 'restore' | 'translate' | 'imageSmoothingEnabled'>

type Font = Record<string, readonly string[]>

// a 5×7 pixel font (the letters these labels need)
const F5: Font = {
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
  '>': ['#....', '##...', '###..', '####.', '###..', '##...', '#....'], // ▶
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
}
// a 3×5 font for tiny labels
const F3: Font = {
  S: ['###', '#..', '###', '..#', '###'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  E: ['###', '#..', '##.', '#..', '###'],
  L: ['#..', '#..', '#..', '#..', '###'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  ' ': ['...', '...', '...', '...', '...'],
}

interface TextOpts {
  /** each stroke doubled to the right, like an arcade font */
  bold?: boolean
  /** the 3×5 font */
  small?: boolean
}

/** the width of a label in art pixels */
export function textWidth(s: string, { bold = false, small = false }: TextOpts = {}) {
  const adv = (small ? 3 : 5) + (bold ? 1 : 0) + 1
  return s.length * adv - 1
}

/** draw a label at art pixel (x, y); returns its width */
export function text(g: Painter, s: string, x: number, y: number, px: number, col: string, { bold = false, small = false }: TextOpts = {}) {
  const font = small ? F3 : F5, adv = (small ? 3 : 5) + (bold ? 1 : 0) + 1
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
export function grid(g: Painter, rows: readonly string[], x: number, y: number, px: number, pal: Readonly<Record<string, string>> = PAL) {
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
export function shape(w: number, h: number, fill: (x: number, y: number) => string | null, outline: string | null) {
  const cells = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => fill(x, y)))
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < w && y < h ? cells[y][x] : null)
  return cells.map((row, y) => row.map((v, x) => {
    if (v) return v
    if (!outline) return '.'
    return at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1) ? outline : '.'
  }).join(''))
}

// ---- PLAYER 1 START ----

/** an arcade cabinet's 1P button (three-quarter view), 30 × 22; `on` = lit (the blink's on frame) */
function arcadeButton(on: boolean) {
  const cx = 14.5
  return shape(30, 22, (x, y) => {
    const dx = x - cx
    const inE = (cy: number, rx: number, ry: number) => (dx / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1
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

/** canvas pixels: x, y, width, height */
export type PixelRect = [number, number, number, number]

/**
 * Paint PLAYER 1 START (the arcade button beside "PLAYER 1 / ▶ START", 89 × 22 art pixels) into a
 * canvas: its right edge at canvas x `right`, centered on canvas y `cy`, one art pixel = `px` canvas
 * pixels. `on: false` is the blink's off frame (the button unlit, no ▶). Returns its box, the parts
 * that blink (the ▶ and the button's highlight) and its size in art pixels.
 */
export function paintStart(g: Painter, right: number, cy: number, px: number, { on = true } = {}) {
  const btn = arcadeButton(on), w = 30 + 4 + textWidth('PLAYER 1', { bold: true }), h = 22
  const x0 = Math.round(right - w * px), y0 = Math.round(cy - (h * px) / 2)
  g.save()
  g.translate(x0, y0)
  g.imageSmoothingEnabled = false
  grid(g, btn, 0, 0, px)
  text(g, 'PLAYER 1', 34, 3, px, PAL.k, { bold: true })
  if (on) text(g, '>', 34, 12, px, PAL.m)
  text(g, 'START', 41, 12, px, PAL.k, { bold: true })
  g.restore()
  const blink: PixelRect[] = [[34, 12, 5, 7], [5, 3, 19, 10]]
  return {
    box: [x0, y0, w * px, h * px] as PixelRect,
    blink: blink.map(([x, y, bw, bh]): PixelRect => [x0 + x * px, y0 + y * px, bw * px, bh * px]),
    size: [w, h] as [number, number],
  }
}

// ---- the voxel art (front views; voxels.ts extrudes them) ----

/** the mushroom, 16 × 18: a violet cap with cyan spots and a deep violet rim, a cream stem with eyes */
export function mushroom() {
  return shape(16, 18, (x, y) => {
    const X = x + 0.5, Y = y + 0.5
    const inCap = ((X - 8) / 7.1) ** 2 + ((Y - 9.4) / 7.9) ** 2 <= 1 && Y <= 10.4
    if (inCap) {
      const spots = [[8, 3.9, 2.3], [3.3, 7.9, 1.8], [12.7, 7.9, 1.8]]
      if (spots.some(([sx, sy, r]) => (X - sx) ** 2 + (Y - sy) ** 2 <= r * r)) return 'C'
      if (Y > 9.4) return 'o'
      return 'v'
    }
    if (X >= 4.5 && X <= 11.5 && Y > 10.4 && Y <= 16.4) {
      if ((X < 5.5 || X > 10.5) && Y > 15.4) return null
      if ((x === 6 || x === 9) && (y === 12 || y === 13)) return 'k'
      return 'e'
    }
    return null
  }, 'o')
}

/** the UFO's rim lights: the cells that chase (row 7, every third cell) */
export const UFO_LIGHTS = (x: number, y: number) => y === 7 && x % 3 === 2

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
