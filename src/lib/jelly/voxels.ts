/**
 * Voxel meshes from pixel art (Play mode round 2: the mushroom and the UFO): each filled cell of a
 * grid is extruded into a column `depthOf(x, y, c)` voxels deep, centered on z = 0, and the columns
 * are merged into one static mesh shaped like the cast's models (a GltfModel with one node, no skin,
 * no clips), colored through a small palette texture, with a glow texture for the cells that glow.
 *
 * Faces between filled voxels are culled exactly: a column's front and back are always seen, and
 * each side shows only the part its neighbor's column doesn't cover (neighbors are centered too, so
 * that's at most two strips, top and bottom of the neighbor's depth, even for half-voxel offsets).
 * Layout (as the mockup's): x centered on the grid, the grid's bottom row on y = 0, y up, +z the front.
 */

import type { GltfModel, VertexAttr } from './gltf'
import type { Vec3 } from './math'
import { PAL } from './pixelArt'

/** RGBA texels, ImageData's layout (in the browser: `new ImageData(data, width, height)`) */
export interface Texels {
  width: number
  height: number
  data: Uint8ClampedArray
}

export interface VoxelMesh {
  /** the mesh, ready for the cast's renderer (its base color and glow are `base` and `glow`) */
  model: GltfModel
  /** one texel per (color, glows) pair the cells use; every face samples its texel's center. Upload with NEAREST filtering */
  base: Texels
  /** the same layout: the cell's color where it glows, black elsewhere; null when nothing glows */
  glow: Texels | null
  /** the bounds of what was built (model units) */
  min: Vec3
  max: Vec3
  quads: number
}

type Cell = (x: number, y: number, c: string) => boolean

export interface VoxelOptions {
  /** one voxel's size (model units; default 1) */
  vox?: number
  /** the cells this mesh holds (default: every filled cell); faces against the others are kept */
  include?: Cell
  /** the cells that glow (their color also goes into the glow texture) */
  glow?: Cell
  pal?: Readonly<Record<string, string>>
}

/** A solid of revolution: each row turned into a disc as wide as the row (the saucer). `k` scales the depth, `min` is the least. */
export function revolve(rows: readonly string[], k = 1, min = 1) {
  const ext = rows.map((r) => {
    const a = r.search(/[^.]/)
    return a < 0 ? null : [a, r.length - 1 - r.split('').reverse().join('').search(/[^.]/)]
  })
  return (x: number, y: number) => {
    const e = ext[y]
    if (!e) return min
    const cx = (e[0] + e[1] + 1) / 2, R = (e[1] - e[0] + 1) / 2, dx = x + 0.5 - cx
    return Math.max(min, Math.round(2 * k * Math.sqrt(Math.max(0, R * R - dx * dx))))
  }
}

const hex = (s: string) => {
  const m = /^#([0-9a-f]{6})$/i.exec(s)
  if (!m) throw new Error(`voxels: not a #rrggbb color: ${s}`)
  const n = parseInt(m[1], 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}

const floatAttr = (a: Float32Array, size: number): VertexAttr => ({
  bytes: new Uint8Array(a.buffer, a.byteOffset, a.byteLength), size, type: 5126, normalized: false, stride: size * 4, offset: 0,
})

/** Build one merged mesh from a grid of palette letters ('.' or ' ' = empty). */
export function voxels(rows: readonly string[], depthOf: (x: number, y: number, c: string) => number, opts: VoxelOptions = {}): VoxelMesh {
  const { vox = 1, include, glow, pal = PAL } = opts
  const H = rows.length, W = rows[0]?.length ?? 0
  // each cell's depth in this mesh (0: not in it)
  const D = new Float32Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = rows[y][x]
    if (c === '.' || c === ' ' || c === undefined || (include && !include(x, y, c))) continue
    D[y * W + x] = Math.max(0, depthOf(x, y, c))
  }
  const depth = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : D[y * W + x])

  // the palette: one entry per (color, glows)
  const entries = new Map<string, number>(), colors: { rgb: number[]; glows: boolean }[] = []
  const entry = (c: string, glows: boolean) => {
    const key = `${c}|${glows ? 1 : 0}`
    let i = entries.get(key)
    if (i === undefined) {
      const col = pal[c] ?? c
      entries.set(key, (i = colors.length))
      colors.push({ rgb: hex(col), glows })
    }
    return i
  }

  const P: number[] = [], N: number[] = [], U: number[] = [], I: number[] = []
  const tex: number[] = []
  /** a quad from four corners (counter-clockwise seen from its normal's side) */
  const quad = (a: number[], b: number[], c: number[], d: number[], n: number[], t: number) => {
    const v = P.length / 3
    for (const p of [a, b, c, d]) { P.push(p[0] * vox, p[1] * vox, p[2] * vox); N.push(n[0], n[1], n[2]); tex.push(t) }
    I.push(v, v + 1, v + 2, v, v + 2, v + 3)
  }

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = D[y * W + x]
    if (!d) continue
    const c = rows[y][x], t = entry(c, !!glow?.(x, y, c))
    const x0 = x - W / 2, x1 = x0 + 1, y0 = H - 1 - y, y1 = y0 + 1, z = d / 2
    quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [0, 0, 1], t) // front
    quad([x1, y0, -z], [x0, y0, -z], [x0, y1, -z], [x1, y1, -z], [0, 0, -1], t) // back
    // the sides: what the neighbor's column doesn't cover, as z ranges
    const strips = (nd: number): [number, number][] => (nd >= d ? [] : nd <= 0 ? [[-z, z]] : [[nd / 2, z], [-z, -nd / 2]])
    for (const [za, zb] of strips(depth(x + 1, y))) quad([x1, y0, zb], [x1, y0, za], [x1, y1, za], [x1, y1, zb], [1, 0, 0], t)
    for (const [za, zb] of strips(depth(x - 1, y))) quad([x0, y0, za], [x0, y0, zb], [x0, y1, zb], [x0, y1, za], [-1, 0, 0], t)
    for (const [za, zb] of strips(depth(x, y - 1))) quad([x0, y1, zb], [x1, y1, zb], [x1, y1, za], [x0, y1, za], [0, 1, 0], t) // the row above
    for (const [za, zb] of strips(depth(x, y + 1))) quad([x0, y0, za], [x1, y0, za], [x1, y0, zb], [x0, y0, zb], [0, -1, 0], t)
  }

  // the palette texture: a row of texels (a square-ish block once it's long)
  const n = Math.max(1, colors.length), tw = Math.min(n, 16), th = Math.ceil(n / tw)
  const base = new Uint8ClampedArray(tw * th * 4), glowData = new Uint8ClampedArray(tw * th * 4)
  colors.forEach(({ rgb, glows }, i) => {
    base.set([rgb[0], rgb[1], rgb[2], 255], i * 4)
    glowData.set(glows ? [rgb[0], rgb[1], rgb[2], 255] : [0, 0, 0, 255], i * 4)
  })
  const uvs = new Float32Array(tex.length * 2)
  tex.forEach((t, i) => { uvs[i * 2] = ((t % tw) + 0.5) / tw; uvs[i * 2 + 1] = (Math.floor(t / tw) + 0.5) / th })

  const positions = new Float32Array(P), normals = new Float32Array(N)
  const min: Vec3 = [Infinity, Infinity, Infinity], max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < positions.length; i += 3) for (let k = 0; k < 3; k++) {
    if (positions[i + k] < min[k]) min[k] = positions[i + k]
    if (positions[i + k] > max[k]) max[k] = positions[i + k]
  }
  const model: GltfModel = {
    nodes: [{ name: 'voxels', t: [0, 0, 0], r: [0, 0, 0, 1], s: [1, 1, 1], matrix: null, parent: -1 }],
    order: [0],
    meshNode: 0,
    attrs: { POSITION: floatAttr(positions, 3), NORMAL: floatAttr(normals, 3), TEXCOORD_0: floatAttr(uvs, 2) },
    indices: positions.length / 3 > 65535 ? new Uint32Array(I) : new Uint16Array(I),
    joints: null,
    ibm: null,
    clips: [],
    baseColor: null,
    glow: null,
    glowFactor: [1, 1, 1],
    positions,
  }
  return {
    model,
    base: { width: tw, height: th, data: base },
    glow: colors.some((e) => e.glows) ? { width: tw, height: th, data: glowData } : null,
    min, max, quads: I.length / 6,
  }
}
