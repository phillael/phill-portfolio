/**
 * @jest-environment node
 *
 * The Jelly Resume's cast: the GLB reader on the real files in public/resume (meshopt,
 * quantization, the skin and its clips), clip sampling and the crossfading pose. Drawing
 * needs WebGL2, which tests don't have; that's checked in the browser.
 */

import { readFileSync } from 'fs'
import path from 'path'
import { Pose, bendAxes, jointMatrices, sampleTrack } from '@/lib/jelly/actors'
import { CAST_CONFIG } from '@/lib/jelly/config'
import { bounds, parseGlb, readGltf, restLocals, worldMatrices, type GltfModel, type Track } from '@/lib/jelly/gltf'

// three ships the decoder as an ES module; the same decoder's CommonJS build reads the same files
jest.mock('three/examples/jsm/libs/meshopt_decoder.module.js', () => ({ MeshoptDecoder: jest.requireActual('meshoptimizer/meshopt_decoder.js') }))

const closed = jest.fn()
beforeAll(() => {
  ;(globalThis as unknown as { createImageBitmap: unknown }).createImageBitmap = jest.fn(async () => ({ width: 1, height: 1, close: closed }))
})

const glb = (name: string) => {
  const b = readFileSync(path.join(process.cwd(), 'public/resume', name))
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
}

const restPose = (m: GltfModel) => {
  const n = m.nodes.length, world = worldMatrices(m, restLocals(m, new Float32Array(n * 16)), new Float32Array(n * 16))
  return { world, joints: m.joints ? jointMatrices(m, world, new Float32Array(m.joints.length * 16)) : null }
}

describe('readGltf: Phill', () => {
  let m: GltfModel
  beforeAll(async () => { m = await readGltf(glb('phill.glb')) })

  it('has his 24-bone skin, his own clips and the dances borrowed from the other characters', () => {
    expect(m.joints).toHaveLength(24)
    expect(m.ibm).toHaveLength(24 * 16)
    expect(m.clips.map((c) => c.name).sort()).toEqual(['dance', 'die', 'garlic', 'human', 'idle', 'lasagna', 'moose', 'zombie'])
    const own = new Set(['dance', 'die', 'idle'])
    for (const c of m.clips) {
      expect(c.duration).toBeGreaterThan(1)
      // his own: translation, rotation and scale for each bone; the borrowed ones: each bone's rotation and the hips' height
      expect(c.tracks.length).toBe(own.has(c.name) ? 72 : 25)
    }
  })

  it('reads the quantized, meshopt-packed mesh', () => {
    expect(Object.keys(m.attrs).sort()).toEqual(['JOINTS_0', 'NORMAL', 'POSITION', 'TEXCOORD_0', 'WEIGHTS_0'])
    expect(m.attrs.POSITION).toMatchObject({ size: 3, type: 5122, normalized: true })
    expect(m.indices.length % 3).toBe(0)
    const verts = m.positions.length / 3
    expect(Math.max(...m.indices)).toBe(verts - 1)
    expect(m.baseColor).not.toBeNull()
    expect(m.glow).toBeNull() // Meshy's glow map is the base color itself
  })

  it('stands about 1.85 units tall in his rest pose (the cast scales him to CAST_CONFIG.size)', () => {
    const { world, joints } = restPose(m)
    const b = bounds(m, world, joints)
    expect(b.max[1] - b.min[1]).toBeCloseTo(1.85, 1)
    expect(b.min[1]).toBeCloseTo(0, 1) // feet at the origin
  })

  it('decodes rotation keys to unit quaternions', () => {
    for (const c of m.clips) for (const t of c.tracks) if (t.path === 'rotation') {
      for (let k = 0; k < t.values.length; k += 4) {
        expect(Math.hypot(t.values[k], t.values[k + 1], t.values[k + 2], t.values[k + 3])).toBeCloseTo(1, 2)
      }
    }
  })
})

describe('readGltf: the shrimp', () => {
  it('is a static mesh (no skin, no clips) with its glow map, sized by its node transform', async () => {
    const m = await readGltf(glb('shrimp.glb'))
    expect(m.joints).toBeNull()
    expect(m.clips).toHaveLength(0)
    expect(m.glow).not.toBeNull()
    const { world } = restPose(m)
    const b = bounds(m, world, null)
    expect(b.max[1] - b.min[1]).toBeCloseTo(0.12, 2)
  })

  it('bends along its length and sideways across its thinnest side (for the waveform wiggle)', async () => {
    const m = await readGltf(glb('shrimp.glb'))
    const { along, side, lo, hi } = bendAxes(m.positions)
    expect(hi).toBeGreaterThan(lo)
    expect(along).not.toEqual(side)
    for (const v of [along, side]) expect(v.reduce((a, x) => a + x * x, 0)).toBe(1)
  })
})

describe('parseGlb', () => {
  it('rejects something that is not a GLB', () => {
    expect(() => parseGlb(new TextEncoder().encode('not a model at all').buffer)).toThrow('Not a glTF 2.0 binary')
  })
})

describe('sampleTrack', () => {
  const out = new Float32Array(4)
  const lin: Track = { node: 0, path: 'translation', times: new Float32Array([0, 1, 2]), values: new Float32Array([0, 0, 0, 10, 0, 0, 10, 20, 0]), step: false }

  it('interpolates between keys and holds the ends', () => {
    sampleTrack(lin, 0.5, out, 0)
    expect(Array.from(out.slice(0, 3))).toEqual([5, 0, 0])
    sampleTrack(lin, 1.5, out, 0)
    expect(Array.from(out.slice(0, 3))).toEqual([10, 10, 0])
    sampleTrack(lin, -1, out, 0)
    expect(out[0]).toBe(0)
    sampleTrack(lin, 9, out, 0)
    expect(Array.from(out.slice(0, 3))).toEqual([10, 20, 0])
  })

  it('steps when the clip says STEP', () => {
    sampleTrack({ ...lin, step: true }, 0.9, out, 0)
    expect(out[0]).toBe(0)
  })

  it('slerps rotations (a quarter turn halfway is an eighth)', () => {
    const s = Math.SQRT1_2
    const rot: Track = { node: 0, path: 'rotation', times: new Float32Array([0, 1]), values: new Float32Array([0, 0, 0, 1, 0, s, 0, s]), step: false }
    sampleTrack(rot, 0.5, out, 0)
    expect(out[1]).toBeCloseTo(Math.sin(Math.PI / 8), 5)
    expect(out[3]).toBeCloseTo(Math.cos(Math.PI / 8), 5)
  })
})

describe('Pose', () => {
  let m: GltfModel
  beforeAll(async () => { m = await readGltf(glb('phill.glb')) })

  it('plays a clip and crossfades to the next', () => {
    const p = new Pose(m)
    expect(p.has('dance')).toBe(true)
    expect(p.has('moonwalk')).toBe(false)
    p.play('dance', 0)
    expect(p.clip).toBe('dance')
    const before = Float32Array.from(p.joints)
    p.update(0.5)
    expect(p.joints).not.toEqual(before) // he moves
    p.play('die', 0.2, false)
    expect(p.clip).toBe('die')
    p.update(10) // past the end of a one-shot: it holds its last frame
    expect(p.joints.every(Number.isFinite)).toBe(true)
  })

  it('reports how far through its loop a clip is, dropping back when it comes round', () => {
    const p = new Pose(m)
    p.play('human', 0)
    const dur = m.clips.find((c) => c.name === 'human')!.duration
    p.update(dur * 0.5)
    expect(p.phase).toBeCloseTo(0.5, 2)
    p.update(dur * 0.6)
    expect(p.phase).toBeCloseTo(0.1, 2)
  })

  it('keeps him dancing in place (the root bone never travels sideways)', () => {
    const p = new Pose(m)
    p.play('dance', 0)
    const hips = m.joints!.find((j) => !m.joints!.includes(m.nodes[j].parent))!
    const rest = m.nodes[hips].t
    for (let t = 0; t < 4; t += 0.25) {
      p.update(0.25)
      const x = p.local[hips * 16 + 12], z = p.local[hips * 16 + 14]
      expect(x).toBeCloseTo(rest[0], 4)
      expect(z).toBeCloseTo(rest[2], 4)
    }
  })
})

describe('CAST_CONFIG', () => {
  it('is frozen, and the shrimp keep to a handful', () => {
    expect(Object.isFrozen(CAST_CONFIG)).toBe(true)
    expect(CAST_CONFIG.shrimp).toBeLessThanOrEqual(4) // the cast keeps four shrimp slots
  })
})

describe('bendAxes', () => {
  it('picks the longest axis to bend along and the thinnest to bend across', () => {
    // a box 4 long (z), 2 tall (y), 1 wide (x)
    const P = new Float32Array([-0.5, -1, -2, 0.5, 1, 2, 0, 0, 0])
    expect(bendAxes(P)).toEqual({ along: [0, 0, 1], side: [1, 0, 0], lo: -2, hi: 2 })
  })
})
