/**
 * Play mode round 2's pixel art (ported from docs/design/jelly-resume/play-mode/round2/art.js)
 * and the voxel meshes built from it. The expected grids are the mockup's own output.
 */

import { mushroom, paintStart, textWidth, ufo, UFO_LIGHTS, type Painter } from '@/lib/jelly/pixelArt'
import { revolve, voxels, type VoxelMesh } from '@/lib/jelly/voxels'

const MUSHROOM = [
  '................', '.....oooooo.....', '...oovCCCCvoo...', '..ovvvCCCCvvvo..', '.ovvvvCCCCvvvvo.', '.ovvvvCCCCvvvvo.',
  'ovCCvvvvvvvvCCvo', 'ovCCCvvvvvvCCCvo', 'ovCCCvvvvvvCCCvo', 'ooCCooooooooCCoo', '.oooeeeeeeeeooo.', '...oeeeeeeeeo...',
  '...oeekeekeeo...', '...oeekeekeeo...', '...oeeeeeeeeo...', '....oeeeeeeo....', '.....oooooo.....', '................',
]
const UFO = [
  '..........kkkk..........', '........kkwCCCkk........', '.......kCwCvvCCCk.......', '.......kCCvCvvCCk.......',
  '......kkCCCeeCCCkk......', '..kkkklcccccccccclkkkk..', '.kllllllllllllllllllllk.', 'kgyggmggCggyggmggCggyggk',
  '.kggggggggggggggggggggk.', '..kkkddddddddddddddkkk..', '.....kkkkkcccckkkkk.....', '..........kkkk..........',
]

/** a 2D context stand-in that adds up the area painted in each color */
function recorder() {
  let fill = ''
  const area: Record<string, number> = {}
  let rects = 0
  const g: Painter = {
    get fillStyle() { return fill },
    set fillStyle(v) { fill = String(v) },
    imageSmoothingEnabled: true,
    fillRect: (_x, _y, w, h) => { rects++; area[fill] = (area[fill] ?? 0) + w * h },
    save: () => {}, restore: () => {}, translate: () => {},
  }
  return { g, area, rects: () => rects }
}

describe('pixel art', () => {
  it('ports the mockup grids exactly', () => {
    expect(mushroom()).toEqual(MUSHROOM)
    expect(ufo()).toEqual(UFO)
    expect([mushroom()[0].length, mushroom().length]).toEqual([16, 18])
    expect([ufo()[0].length, ufo().length]).toEqual([24, 12])
  })

  it('marks the rim lights on row 7, every third cell', () => {
    const lit = UFO[7].split('').map((_, x) => x).filter((x) => UFO_LIGHTS(x, 7))
    expect(lit).toEqual([2, 5, 8, 11, 14, 17, 20, 23])
    expect(lit.map((x) => UFO[7][x]).join('')).toBe('ymCymCyk') // the last one is the outline
    expect(UFO_LIGHTS(2, 6)).toBe(false)
  })

  it('measures labels like an arcade font', () => {
    expect(textWidth('PLAYER 1', { bold: true })).toBe(55)
    expect(textWidth('START', { bold: true })).toBe(34)
    expect(textWidth('ST', { small: true })).toBe(7)
  })

  it('paints PLAYER 1 START (look A) as the mockup does', () => {
    const on = recorder()
    const r = paintStart(on.g, 1800, 36, 4, { on: true })
    expect(r.size).toEqual([89, 22])
    expect(r.box).toEqual([1444, -8, 356, 88])
    expect(r.blink).toEqual([[1580, 40, 20, 28], [1464, 4, 76, 40]])
    expect(on.rects()).toBe(607)
    expect(on.area).toEqual({ '#16181d': 7616, '#ff4fd8': 1584, '#ffffff': 240, '#a8123a': 1440, '#3a3f4b': 1600 })

    const off = recorder()
    paintStart(off.g, 1800, 36, 4, { on: false })
    expect(off.rects()).toBe(591)
    expect(off.area).toEqual({ '#16181d': 7616, '#ff3b5c': 1328, '#ff4fd8': 240, '#a8123a': 1440, '#3a3f4b': 1600 })
  })
})

describe('revolve', () => {
  it('turns each row into a disc as wide as the row', () => {
    const d = revolve(['..####..', '........', '.######.'])
    expect([2, 3, 4, 5].map((x) => d(x, 0))).toEqual([3, 4, 4, 3])
    expect(d(0, 0)).toBe(1) // outside the row: the minimum
    expect(d(3, 1)).toBe(1) // an empty row: the minimum
    expect([1, 2, 3].map((x) => d(x, 2))).toEqual([3, 5, 6])
  })

  it('scales the depth by k and keeps the minimum', () => {
    const d = revolve(['..####..'], 0.5, 2)
    expect([2, 3].map((x) => d(x, 0))).toEqual([2, 2])
  })
})

// ---- the voxel meshes ----

const f32 = (m: VoxelMesh, name: 'POSITION' | 'NORMAL' | 'TEXCOORD_0') => {
  const a = m.model.attrs[name]!
  return new Float32Array(a.bytes.buffer, a.bytes.byteOffset, a.bytes.byteLength / 4)
}

/** the faces as (center, normal, texel), one per quad */
function faces(m: VoxelMesh) {
  const P = f32(m, 'POSITION'), N = f32(m, 'NORMAL'), U = f32(m, 'TEXCOORD_0'), I = m.model.indices
  const out: { c: number[]; n: number[]; texel: number; area: number }[] = []
  for (let q = 0; q < I.length; q += 6) {
    const quad = Array.from(new Set(I.slice(q, q + 6)))
    expect(quad.length).toBe(4)
    const c = [0, 1, 2].map((k) => quad.reduce((s, v) => s + P[v * 3 + k], 0) / 4)
    const n = [0, 1, 2].map((k) => N[quad[0] * 3 + k])
    const xs = quad.map((v) => [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]])
    const span = [0, 1, 2].map((k) => Math.max(...xs.map((p) => p[k])) - Math.min(...xs.map((p) => p[k])))
    const area = span.filter((_, k) => n[k] === 0).reduce((a, b) => a * b, 1)
    out.push({ c, n, texel: Math.floor(U[quad[0] * 2] * m.base.width), area })
  }
  return out
}

/** is model-space point p inside a filled voxel? (the grid's layout: x centered, the bottom row on y = 0, depth centered on z = 0) */
function inside(rows: string[], depth: (x: number, y: number) => number, vox: number, p: number[]) {
  const W = rows[0].length, H = rows.length
  const x = Math.floor(p[0] / vox + W / 2), y = H - 1 - Math.floor(p[1] / vox)
  if (x < 0 || y < 0 || x >= W || y >= H || rows[y][x] === '.') return false
  return Math.abs(p[2] / vox) < depth(x, y) / 2
}

describe('voxels', () => {
  const PAL = { a: '#ff0000', b: '#00ff00', c: '#0000ff' }

  it('culls the faces between filled voxels and keeps every exposed one', () => {
    const rows = ['.aab.', 'aabba', '..c..']
    const depth = (x: number, y: number) => [[0, 3, 4, 2, 0], [1, 5, 2, 6, 3], [0, 0, 2, 0, 0]][y][x]
    const vox = 0.5
    const m = voxels(rows, depth, { vox, pal: PAL })
    const e = vox * 0.01
    let area = 0
    for (const f of faces(m)) {
      // just behind the face is solid, just in front of it is empty
      expect(inside(rows, depth, vox, f.c.map((c, k) => c - f.n[k] * e))).toBe(true)
      expect(inside(rows, depth, vox, f.c.map((c, k) => c + f.n[k] * e))).toBe(false)
      area += f.area
    }
    // the exposed area by brute force, on a grid fine enough for the half-voxel depths
    const R = 4, W = rows[0].length, H = rows.length
    let want = 0
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (rows[y][x] === '.') continue
      const d = depth(x, y)
      want += 2 // front and back
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, nd = nx >= 0 && ny >= 0 && nx < W && ny < H && rows[ny][nx] !== '.' ? depth(nx, ny) : 0
        for (let s = 0; s < d * R; s++) if (Math.abs(-d / 2 + (s + 0.5) / R) >= nd / 2) want += 1 / R
      }
    }
    expect(area).toBeCloseTo(want * vox * vox, 6)
  })

  it('has one quad per face of a flat run (two cells, depth 1: 10 faces, not 12)', () => {
    expect(voxels(['aa'], () => 1, { pal: PAL }).quads).toBe(10)
    expect(voxels(['aaa', 'aaa', 'aaa'], () => 1, { pal: PAL }).quads).toBe(9 + 9 + 12)
  })

  it('lays the grid out like the mockup: x centered, the bottom row on y = 0, depth centered', () => {
    const m = voxels(['a.', 'ab'], (x) => (x === 0 ? 4 : 2), { vox: 0.25, pal: PAL })
    expect(m.min).toEqual([-0.25, 0, -0.5])
    expect(m.max).toEqual([0.25, 0.5, 0.5])
    expect(m.model.joints).toBeNull()
    expect(m.model.clips).toEqual([])
    expect(m.model.positions.buffer).toBe(m.model.attrs.POSITION!.bytes.buffer) // the bounds read what's uploaded
  })

  it('skips cells it is not asked for, and keeps the faces against them', () => {
    const all = voxels(['ab'], () => 1, { pal: PAL })
    const onlyA = voxels(['ab'], () => 1, { pal: PAL, include: (_x, _y, c) => c === 'a' })
    expect(all.quads).toBe(10)
    expect(onlyA.quads).toBe(6)
  })

  it('paints each face its cell color from a small palette texture', () => {
    const m = voxels(['ab', 'ca'], () => 2, { pal: PAL })
    expect(m.base.width * m.base.height).toBe(3)
    const color = (t: number) => Array.from(m.base.data.slice(t * 4, t * 4 + 4))
    const seen = new Set(faces(m).map((f) => color(f.texel).join()))
    expect(seen).toEqual(new Set(['255,0,0,255', '0,255,0,255', '0,0,255,255']))
    expect(m.glow).toBeNull()
  })

  it('glows only the cells it is asked to', () => {
    // the same color glows in one cell and not in another: two palette entries
    const m = voxels(['aab'], () => 1, { pal: PAL, glow: (x) => x === 1 })
    expect(m.glow).not.toBeNull()
    const glow = m.glow!, base = m.base
    expect(base.width * base.height).toBe(3)
    const texelAt = (t: number) => ({ base: Array.from(base.data.slice(t * 4, t * 4 + 3)), glow: Array.from(glow.data.slice(t * 4, t * 4 + 3)) })
    const W = 3
    for (const f of faces(m)) {
      const cell = Math.floor(f.c[0] - f.n[0] * 0.01 + W / 2)
      const t = texelAt(f.texel)
      expect(t.glow).toEqual(cell === 1 ? [255, 0, 0] : [0, 0, 0])
      expect(t.base).toEqual(cell === 2 ? [0, 255, 0] : [255, 0, 0])
    }
  })

  it('builds the shipped art: the mushroom (cap 7 deep, stem 5) and the UFO (turned)', () => {
    const mush = voxels(mushroom(), (_x, y) => (y <= 10 ? 7 : 5), { vox: 0.3 / 18 })
    expect(mush.max[1]).toBeCloseTo((17 / 18) * 0.3, 6) // row 0 is empty
    expect(mush.min[1]).toBeCloseTo((1 / 18) * 0.3, 6) // and so is row 17
    expect(mush.max[2]).toBeCloseTo((3.5 / 18) * 0.3, 6)
    const saucer = voxels(UFO, revolve(UFO), { vox: 0.42 / 24, glow: (x, y) => UFO_LIGHTS(x, y) })
    expect(saucer.max[0] - saucer.min[0]).toBeCloseTo(0.42, 6)
    expect(saucer.max[2] * 2).toBeCloseTo(0.42, 6) // the widest row (24 cells) turned into a disc 24 deep
    expect(saucer.glow).not.toBeNull()
    expect(saucer.model.indices).toBeInstanceOf(Uint16Array)
  })
})
