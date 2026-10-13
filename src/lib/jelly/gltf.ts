/**
 * A small GLB reader for the Jelly Resume's cast (Phill and the shrimp): one mesh with one
 * triangle primitive, an optional skin and its clips, a base color texture and an optional
 * glow map. It reads what the cast's files use (EXT_meshopt_compression,
 * KHR_mesh_quantization, EXT_texture_webp, LINEAR/STEP clips) and is not a general loader.
 * Built by docs/design/jelly-resume/tools/actors.mjs.
 */

import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { M4x, type Quat, type Vec3 } from './math'

export interface VertexAttr {
  /** the bufferView's bytes, uploaded as is */
  bytes: Uint8Array
  size: number
  /** a GL component type: 5120 BYTE, 5121 UNSIGNED_BYTE, 5122 SHORT, 5123 UNSIGNED_SHORT, 5126 FLOAT */
  type: number
  normalized: boolean
  stride: number
  offset: number
}

export interface GltfNode {
  name: string
  t: Vec3
  r: Quat
  s: Vec3
  /** a fixed matrix instead of t/r/s */
  matrix: Float32Array | null
  parent: number
}

export interface Track {
  node: number
  path: 'translation' | 'rotation' | 'scale'
  times: Float32Array
  values: Float32Array
  step: boolean
}

export interface Clip {
  name: string
  duration: number
  tracks: Track[]
}

export interface GltfModel {
  nodes: GltfNode[]
  /** parents before children */
  order: number[]
  meshNode: number
  attrs: Partial<Record<'POSITION' | 'NORMAL' | 'TEXCOORD_0' | 'JOINTS_0' | 'WEIGHTS_0', VertexAttr>>
  indices: Uint16Array | Uint32Array
  /** joint node indexes and their inverse bind matrices (null: a static mesh) */
  joints: number[] | null
  ibm: Float32Array | null
  clips: Clip[]
  baseColor: ImageBitmap | null
  glow: ImageBitmap | null
  glowFactor: Vec3
  /** the vertex positions decoded to floats in the mesh's own space, for the bounds */
  positions: Float32Array
}

interface Json {
  nodes: { name?: string; translation?: number[]; rotation?: number[]; scale?: number[]; matrix?: number[]; children?: number[]; mesh?: number; skin?: number }[]
  meshes: { primitives: { attributes: Record<string, number>; indices?: number; material?: number; mode?: number }[] }[]
  accessors: { bufferView?: number; byteOffset?: number; componentType: number; normalized?: boolean; count: number; type: string }[]
  bufferViews: { buffer: number; byteOffset?: number; byteLength: number; byteStride?: number; extensions?: { EXT_meshopt_compression?: MeshoptView } }[]
  skins?: { joints: number[]; inverseBindMatrices?: number }[]
  animations?: { name?: string; channels: { sampler: number; target: { node?: number; path: string } }[]; samplers: { input: number; output: number; interpolation?: string }[] }[]
  materials?: { pbrMetallicRoughness?: { baseColorTexture?: { index: number } }; emissiveTexture?: { index: number }; emissiveFactor?: number[] }[]
  textures?: { source?: number; extensions?: { EXT_texture_webp?: { source: number } } }[]
  images?: { bufferView?: number; mimeType?: string }[]
}

interface MeshoptView {
  buffer: number
  byteOffset?: number
  byteLength: number
  byteStride: number
  count: number
  mode: 'ATTRIBUTES' | 'TRIANGLES' | 'INDICES'
  filter?: 'NONE' | 'OCTAHEDRAL' | 'QUATERNION' | 'EXPONENTIAL'
}

const COMPONENTS: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }
const BYTES: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }

/** Split a GLB into its JSON and its binary chunk. */
export function parseGlb(buf: ArrayBuffer): { json: Json; bin: Uint8Array } {
  const dv = new DataView(buf)
  if (dv.getUint32(0, true) !== 0x46546c67 || dv.getUint32(4, true) !== 2) throw new Error('Not a glTF 2.0 binary')
  let off = 12, json: Json | null = null, bin: Uint8Array | null = null
  while (off < buf.byteLength) {
    const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true), body = new Uint8Array(buf, off + 8, len)
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(body))
    else if (type === 0x004e4942) bin = body
    off += 8 + len
  }
  if (!json || !bin) throw new Error('A GLB without its JSON or binary chunk')
  return { json, bin }
}

/** Read a GLB into a model: decode meshopt views, read the clips, decode the textures. */
export async function readGltf(buf: ArrayBuffer): Promise<GltfModel> {
  const { json, bin } = parseGlb(buf)
  await MeshoptDecoder.ready
  const views = json.bufferViews.map((bv) => {
    const ext = bv.extensions?.EXT_meshopt_compression
    if (!ext) return bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength)
    const out = new Uint8Array(ext.count * ext.byteStride)
    const src = bin.subarray(ext.byteOffset ?? 0, (ext.byteOffset ?? 0) + ext.byteLength)
    MeshoptDecoder.decodeGltfBuffer(out, ext.count, ext.byteStride, src, ext.mode, ext.filter ?? 'NONE')
    return out
  })
  const stride = (i: number) => {
    const a = json.accessors[i]
    return json.bufferViews[a.bufferView!].byteStride ?? json.bufferViews[a.bufferView!].extensions?.EXT_meshopt_compression?.byteStride ?? BYTES[a.componentType] * COMPONENTS[a.type]
  }
  /** an accessor as floats (normalized integers scaled to -1…1 / 0…1), tightly packed */
  const floats = (i: number) => {
    const a = json.accessors[i], n = COMPONENTS[a.type], out = new Float32Array(a.count * n)
    const bytes = views[a.bufferView!], dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), st = stride(i), base = a.byteOffset ?? 0
    const cs = BYTES[a.componentType], norm = !!a.normalized
    for (let e = 0; e < a.count; e++) for (let c = 0; c < n; c++) {
      const o = base + e * st + c * cs
      let v: number
      switch (a.componentType) {
        case 5120: v = dv.getInt8(o); if (norm) v = Math.max(v / 127, -1); break
        case 5121: v = dv.getUint8(o); if (norm) v /= 255; break
        case 5122: v = dv.getInt16(o, true); if (norm) v = Math.max(v / 32767, -1); break
        case 5123: v = dv.getUint16(o, true); if (norm) v /= 65535; break
        case 5125: v = dv.getUint32(o, true); break
        default: v = dv.getFloat32(o, true)
      }
      out[e * n + c] = v
    }
    return out
  }

  const nodes: GltfNode[] = json.nodes.map((n) => ({
    name: n.name ?? '',
    t: (n.translation ?? [0, 0, 0]) as Vec3,
    r: (n.rotation ?? [0, 0, 0, 1]) as Quat,
    s: (n.scale ?? [1, 1, 1]) as Vec3,
    matrix: n.matrix ? new Float32Array(n.matrix) : null,
    parent: -1,
  }))
  json.nodes.forEach((n, i) => n.children?.forEach((c) => (nodes[c].parent = i)))
  const order: number[] = [], seen = new Set<number>()
  const visit = (i: number) => { if (seen.has(i)) return; if (nodes[i].parent >= 0) visit(nodes[i].parent); seen.add(i); order.push(i) }
  nodes.forEach((_, i) => visit(i))

  const meshNode = json.nodes.findIndex((n) => n.mesh !== undefined)
  if (meshNode < 0) throw new Error('A GLB without a mesh')
  const prim = json.meshes[json.nodes[meshNode].mesh!].primitives[0]
  if ((prim.mode ?? 4) !== 4 || prim.indices === undefined) throw new Error('Only indexed triangles')
  const attrs: GltfModel['attrs'] = {}
  for (const name of ['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0'] as const) {
    const i = prim.attributes[name]
    if (i === undefined) continue
    const a = json.accessors[i]
    attrs[name] = { bytes: views[a.bufferView!], size: COMPONENTS[a.type], type: a.componentType, normalized: !!a.normalized, stride: stride(i), offset: a.byteOffset ?? 0 }
  }
  const ia = json.accessors[prim.indices], iv = views[ia.bufferView!], io = (ia.byteOffset ?? 0) + iv.byteOffset
  const indices = ia.componentType === 5125
    ? new Uint32Array(iv.buffer.slice(io, io + ia.count * 4))
    : ia.componentType === 5123 ? new Uint16Array(iv.buffer.slice(io, io + ia.count * 2)) : Uint16Array.from(iv.subarray(ia.byteOffset ?? 0, (ia.byteOffset ?? 0) + ia.count))

  const skin = json.nodes[meshNode].skin !== undefined ? json.skins?.[json.nodes[meshNode].skin!] : undefined
  const joints = skin ? skin.joints : null
  const ibm = skin?.inverseBindMatrices !== undefined ? floats(skin.inverseBindMatrices) : skin ? new Float32Array(skin.joints.flatMap(() => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])) : null

  const clips: Clip[] = (json.animations ?? []).map((an) => {
    const tracks: Track[] = []
    for (const ch of an.channels) {
      const path = ch.target.path
      if (ch.target.node === undefined || (path !== 'translation' && path !== 'rotation' && path !== 'scale')) continue
      const sm = an.samplers[ch.sampler], times = floats(sm.input)
      let values = floats(sm.output)
      const n = path === 'rotation' ? 4 : 3
      if (sm.interpolation === 'CUBICSPLINE') values = values.filter((_, k) => Math.floor(k / n) % 3 === 1) // keep the values, drop the tangents
      tracks.push({ node: ch.target.node, path, times, values, step: sm.interpolation === 'STEP' })
    }
    return { name: an.name ?? '', duration: Math.max(0, ...tracks.map((t) => t.times[t.times.length - 1] ?? 0)), tracks }
  })

  const image = async (tex: { index: number } | undefined) => {
    if (!tex || !json.textures || !json.images) return null
    const t = json.textures[tex.index], src = t.extensions?.EXT_texture_webp?.source ?? t.source
    const img = src !== undefined ? json.images[src] : undefined
    if (!img || img.bufferView === undefined) return null
    const bytes = views[img.bufferView]
    return createImageBitmap(new Blob([bytes.slice()], { type: img.mimeType ?? 'image/png' }))
  }
  const mat = prim.material !== undefined ? json.materials?.[prim.material] : undefined
  const [baseColor, glowMap] = await Promise.all([image(mat?.pbrMetallicRoughness?.baseColorTexture), image(mat?.emissiveTexture)])
  // Meshy characters set the glow to the base color itself (full bright): that's the base color's job here
  const sameMap = mat?.emissiveTexture?.index === mat?.pbrMetallicRoughness?.baseColorTexture?.index
  if (sameMap) glowMap?.close()

  return {
    nodes, order, meshNode, attrs, indices, joints, ibm, clips,
    baseColor, glow: sameMap ? null : glowMap,
    glowFactor: (mat?.emissiveFactor ?? [0, 0, 0]) as Vec3,
    positions: floats(prim.attributes.POSITION),
  }
}

/** Every node's world matrix from its local transform (16 floats per node, in `order`). */
export function worldMatrices(m: GltfModel, local: Float32Array, out: Float32Array) {
  for (const i of m.order) {
    const p = m.nodes[i].parent
    if (p < 0) out.set(local.subarray(i * 16, i * 16 + 16), i * 16)
    else M4x.mulInto(out, out, local, i * 16, p * 16, i * 16)
  }
  return out
}

/** Each node's rest transform into `local`. */
export function restLocals(m: GltfModel, local: Float32Array) {
  m.nodes.forEach((n, i) => (n.matrix ? local.set(n.matrix, i * 16) : M4x.compose(local, n.t, n.r, n.s, i * 16)))
  return local
}

/** The bounds of the mesh under the given world matrices (skinned: joint matrices; static: its node). */
export function bounds(m: GltfModel, world: Float32Array, jointMats: Float32Array | null) {
  const P = m.positions, mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity], p = [0, 0, 0]
  const J = m.attrs.JOINTS_0, W = m.attrs.WEIGHTS_0
  const n = P.length / 3, jf = jointMats && J ? readInts(J, n) : null, wf = jointMats && W ? readWeights(W, n) : null
  for (let v = 0; v < n; v++) {
    let x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2]
    if (jf && wf && jointMats) {
      let sx = 0, sy = 0, sz = 0, ws = 0
      for (let k = 0; k < 4; k++) {
        const wt = wf[v * 4 + k]
        if (!wt) continue
        M4x.point(jointMats, x, y, z, p, jf[v * 4 + k] * 16)
        sx += p[0] * wt; sy += p[1] * wt; sz += p[2] * wt; ws += wt
      }
      x = sx / ws; y = sy / ws; z = sz / ws
    } else {
      M4x.point(world, x, y, z, p, m.meshNode * 16)
      x = p[0]; y = p[1]; z = p[2]
    }
    if (x < mn[0]) mn[0] = x; if (y < mn[1]) mn[1] = y; if (z < mn[2]) mn[2] = z
    if (x > mx[0]) mx[0] = x; if (y > mx[1]) mx[1] = y; if (z > mx[2]) mx[2] = z
  }
  return { min: mn as Vec3, max: mx as Vec3 }
}

function readInts(a: VertexAttr, n: number) {
  const out = new Uint16Array(n * 4), dv = new DataView(a.bytes.buffer, a.bytes.byteOffset, a.bytes.byteLength)
  for (let v = 0; v < n; v++) for (let k = 0; k < 4; k++) out[v * 4 + k] = a.type === 5121 ? dv.getUint8(a.offset + v * a.stride + k) : dv.getUint16(a.offset + v * a.stride + k * 2, true)
  return out
}

function readWeights(a: VertexAttr, n: number) {
  const out = new Float32Array(n * 4), dv = new DataView(a.bytes.buffer, a.bytes.byteOffset, a.bytes.byteLength)
  for (let v = 0; v < n; v++) for (let k = 0; k < 4; k++) {
    const o = a.offset + v * a.stride
    out[v * 4 + k] = a.type === 5121 ? dv.getUint8(o + k) / 255 : a.type === 5123 ? dv.getUint16(o + k * 2, true) / 65535 : dv.getFloat32(o + k * 4, true)
  }
  return out
}
