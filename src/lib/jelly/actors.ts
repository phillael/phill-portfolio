/**
 * The cast's GPU side and animation: upload a GLB model (one VAO, one texture), play its
 * clips with crossfades, and draw it skinned (Phill) or static (the shrimp) in the resume's
 * own pass, so the page hides whatever passes behind it and the fog matches the words.
 */

import { compileAll, texFrom, type Program } from './gl'
import { bounds, readGltf, restLocals, worldMatrices, type Clip, type GltfModel, type Track } from './gltf'
import { M4x, Q, type Vec3 } from './math'
import * as SH from './shaders'

export const MAX_JOINTS = 32

export interface ActorModel {
  m: GltfModel
  vao: WebGLVertexArrayObject
  bufs: WebGLBuffer[]
  count: number
  itype: number
  tex: WebGLTexture
  glow: WebGLTexture | null
  /** the rest pose's bounds center, height and largest extent, in model units */
  center: Vec3
  height: number
  extent: number
  /** for a wiggle, in the mesh's own space: its longest axis, its thinnest (the way it bends), and its span along the first */
  bend: { along: Vec3; side: Vec3; lo: number; hi: number }
}

export interface CastFrame {
  mvp: Float32Array
  eye: Vec3
  light: number[]
  fogCol: Vec3
  fog: number
  fogStart: number
  fogEnd: number
  shroom: number
  time: number
  hue: number
  rimA: Vec3
  rimB: Vec3
}

export interface DrawLook {
  alpha: number
  flash: number
  rim: number
  ambient: number
  glow: Vec3
  /** the fog for this one: far shrimp fade into the nebula more gently than the words */
  fog?: number
  /** a wiggle along the body: sixteen samples (-1…1) and how far they bend it, as a share of its length */
  wave?: Float32Array
  waveAmp?: number
}

const ATTRS = { POSITION: 'aPos', NORMAL: 'aNormal', TEXCOORD_0: 'aUv', JOINTS_0: 'aJoints', WEIGHTS_0: 'aWeights' } as const

export function createActorRenderer(gl: WebGL2RenderingContext) {
  const [CAST] = compileAll(gl, [[SH.CAST_VS, SH.CAST_FS]])
  const models: ActorModel[] = []
  let gone = false

  /** Read and upload a GLB; the slow parts (meshopt, image decode) don't block the main thread for long. */
  async function load(buf: ArrayBuffer, ready: () => Promise<void>): Promise<ActorModel> {
    const m = await readGltf(buf)
    await ready()
    // closed while it decoded: don't upload into a context that's going away
    if (gone) { m.baseColor?.close(); m.glow?.close(); throw new Error('The cast was disposed while loading') }
    const vao = gl.createVertexArray()!, bufs: WebGLBuffer[] = []
    gl.bindVertexArray(vao)
    for (const [name, attr] of Object.entries(ATTRS) as [keyof typeof ATTRS, string][]) {
      const a = m.attrs[name], loc = gl.getAttribLocation(CAST.p, attr)
      if (!a || loc < 0) continue
      const b = gl.createBuffer()!
      bufs.push(b)
      gl.bindBuffer(gl.ARRAY_BUFFER, b)
      gl.bufferData(gl.ARRAY_BUFFER, a.bytes, gl.STATIC_DRAW)
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, a.size, a.type, a.normalized, a.stride, a.offset)
    }
    const ib = gl.createBuffer()!
    bufs.push(ib)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.indices, gl.STATIC_DRAW)
    gl.bindVertexArray(null)
    const tex = m.baseColor ? texFrom(gl, m.baseColor) : texFrom(gl, new ImageData(new Uint8ClampedArray([255, 255, 255, 255]), 1, 1))
    const glow = m.glow ? texFrom(gl, m.glow) : null
    m.baseColor?.close()
    m.glow?.close()
    // the rest pose's bounds (skinned: through the joints)
    const n = m.nodes.length, local = restLocals(m, new Float32Array(n * 16)), world = worldMatrices(m, local, new Float32Array(n * 16))
    const b = bounds(m, world, m.joints ? jointMatrices(m, world, new Float32Array(m.joints.length * 16)) : null)
    const am: ActorModel = {
      m, vao, bufs, count: m.indices.length, itype: m.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, tex, glow,
      center: [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2],
      height: b.max[1] - b.min[1],
      extent: Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]),
      bend: bendAxes(m.positions),
    }
    models.push(am)
    return am
  }

  /** Once per frame, before any draw. */
  function begin(f: CastFrame) {
    const u = CAST.u
    gl.useProgram(CAST.p)
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.uniformMatrix4fv(u.uMVP, false, f.mvp); gl.uniform3fv(u.uEye, f.eye); gl.uniform3fv(u.uLight, f.light)
    gl.uniform3fv(u.uFogCol, f.fogCol); gl.uniform1f(u.uFogStart, f.fogStart); gl.uniform1f(u.uFogEnd, f.fogEnd)
    gl.uniform1f(u.uShroom, f.shroom); gl.uniform1f(u.uTime, f.time); gl.uniform1f(u.uHue, f.hue)
    gl.uniform3fv(u.uRimA, f.rimA); gl.uniform3fv(u.uRimB, f.rimB)
    gl.uniform1i(u.uTex, 0); gl.uniform1i(u.uGlowTex, 1)
    fogBase = f.fog
  }
  let fogBase = 0

  function draw(a: ActorModel, model: Float32Array, joints: Float32Array | null, look: DrawLook) {
    if (look.alpha <= 0.002) return
    const u = CAST.u
    gl.uniformMatrix4fv(u.uModel, false, model)
    gl.uniform1i(u.uSkin, joints ? 1 : 0)
    if (joints) gl.uniformMatrix4fv(u['uJoints[0]'], false, joints, 0, Math.min(MAX_JOINTS * 16, joints.length)) // arrays are listed by their first element
    gl.uniform1f(u.uAlpha, look.alpha); gl.uniform1f(u.uFlash, look.flash); gl.uniform1f(u.uRim, look.rim); gl.uniform1f(u.uAmbient, look.ambient)
    gl.uniform1f(u.uFog, look.fog ?? fogBase)
    gl.uniform1i(u.uHasGlow, a.glow ? 1 : 0); gl.uniform3fv(u.uGlowCol, look.glow)
    const bd = a.bend, amp = look.wave ? (look.waveAmp ?? 0) * (bd.hi - bd.lo) : 0
    gl.uniform1f(u.uWaveAmp, amp)
    if (amp > 0) {
      gl.uniform1fv(u['uWave[0]'], look.wave!)
      gl.uniform3fv(u.uWaveAlong, bd.along); gl.uniform3fv(u.uWaveSide, bd.side); gl.uniform2f(u.uWaveSpan, bd.lo, bd.hi)
    }
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, a.tex)
    if (a.glow) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, a.glow) }
    gl.bindVertexArray(a.vao)
    // fading: lay down its depth first, so only its nearest surface blends (not its far side and insides)
    const fading = look.alpha < 0.999
    if (fading) {
      gl.colorMask(false, false, false, false)
      gl.drawElements(gl.TRIANGLES, a.count, a.itype, 0)
      gl.colorMask(true, true, true, true)
      gl.depthFunc(gl.LEQUAL)
    }
    gl.drawElements(gl.TRIANGLES, a.count, a.itype, 0)
    if (fading) gl.depthFunc(gl.LESS)
    gl.bindVertexArray(null)
  }

  function dispose() {
    gone = true
    gl.deleteProgram(CAST.p)
    for (const a of models) {
      gl.deleteVertexArray(a.vao)
      for (const b of a.bufs) gl.deleteBuffer(b)
      gl.deleteTexture(a.tex)
      if (a.glow) gl.deleteTexture(a.glow)
    }
    models.length = 0
  }

  return { load, begin, draw, dispose, program: CAST as Program }
}

export type ActorRenderer = ReturnType<typeof createActorRenderer>

/** A mesh's longest and thinnest axes (x, y or z) in its own space, and its span along the longest. */
export function bendAxes(P: Float32Array): ActorModel['bend'] {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]
  for (let v = 0; v < P.length; v += 3) for (let c = 0; c < 3; c++) { if (P[v + c] < mn[c]) mn[c] = P[v + c]; if (P[v + c] > mx[c]) mx[c] = P[v + c] }
  const ext = [0, 1, 2].map((c) => mx[c] - mn[c]), byLen = [0, 1, 2].sort((a, b) => ext[b] - ext[a])
  const unit = (c: number): Vec3 => [c === 0 ? 1 : 0, c === 1 ? 1 : 0, c === 2 ? 1 : 0]
  return { along: unit(byLen[0]), side: unit(byLen[2]), lo: mn[byLen[0]], hi: mx[byLen[0]] }
}

/** joint matrix j = the joint's world matrix · its inverse bind matrix */
export function jointMatrices(m: GltfModel, world: Float32Array, out: Float32Array) {
  m.joints!.forEach((node, j) => M4x.mulInto(out, world, m.ibm!, j * 16, node * 16, j * 16))
  return out
}

/** Sample a track at time t into out (binary search; LINEAR or STEP; rotations slerp). */
export function sampleTrack(tr: Track, t: number, out: Float32Array, o: number) {
  const T = tr.times, V = tr.values, n = tr.path === 'rotation' ? 4 : 3, last = T.length - 1
  if (t <= T[0] || last === 0) { for (let c = 0; c < n; c++) out[o + c] = V[c]; return }
  if (t >= T[last]) { for (let c = 0; c < n; c++) out[o + c] = V[last * n + c]; return }
  let lo = 0, hi = last
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (T[mid] <= t) lo = mid; else hi = mid }
  if (tr.step) { for (let c = 0; c < n; c++) out[o + c] = V[lo * n + c]; return }
  const k = (t - T[lo]) / (T[hi] - T[lo])
  if (n === 4) {
    Q.slerp(V.subarray(lo * 4, lo * 4 + 4), V.subarray(hi * 4, hi * 4 + 4), k, scratchQ)
    out.set(scratchQ, o)
  } else for (let c = 0; c < 3; c++) out[o + c] = V[lo * 3 + c] + (V[hi * 3 + c] - V[lo * 3 + c]) * k
}
const scratchQ = new Float32Array(4)

interface Playing {
  clip: Clip
  t: number
  loop: boolean
}

/**
 * A skinned model's animation: the current clip and the one fading out under it. The root
 * joint's sideways travel is held at rest (he dances in place; his orbit moves him).
 */
export class Pose {
  readonly local: Float32Array
  readonly world: Float32Array
  readonly joints: Float32Array
  private T: Float32Array
  private R: Float32Array
  private S: Float32Array
  private T2: Float32Array
  private R2: Float32Array
  private S2: Float32Array
  private cur: Playing | null = null
  private prev: Playing | null = null
  private fade = 1
  private fadeDur = 0.25
  private root: number

  constructor(private m: GltfModel) {
    const n = m.nodes.length
    this.local = new Float32Array(n * 16)
    this.world = new Float32Array(n * 16)
    this.joints = new Float32Array((m.joints?.length ?? 0) * 16)
    this.T = new Float32Array(n * 3); this.R = new Float32Array(n * 4); this.S = new Float32Array(n * 3)
    this.T2 = new Float32Array(n * 3); this.R2 = new Float32Array(n * 4); this.S2 = new Float32Array(n * 3)
    const js = new Set(m.joints ?? [])
    this.root = m.joints?.find((j) => !js.has(m.nodes[j].parent)) ?? -1
    this.update(0)
  }

  has(name: string) {
    return this.m.clips.some((c) => c.name === name)
  }

  get clip() {
    return this.cur?.clip.name ?? null
  }

  /** how far through its clip the current one is (0…1; it drops back when a loop comes round) */
  get phase() {
    return this.cur && this.cur.clip.duration > 0 ? this.cur.t / this.cur.clip.duration : 0
  }

  /** Crossfade to a clip (no-op if it's already playing). */
  play(name: string, fade = 0.25, loop = true) {
    if (this.cur?.clip.name === name) return
    const clip = this.m.clips.find((c) => c.name === name)
    if (!clip) return
    this.prev = this.cur
    this.cur = { clip, t: 0, loop }
    this.fade = this.prev ? 0 : 1
    this.fadeDur = Math.max(1e-3, fade)
  }

  private rest(T: Float32Array, R: Float32Array, S: Float32Array) {
    this.m.nodes.forEach((n, i) => { T.set(n.t, i * 3); R.set(n.r, i * 4); S.set(n.s, i * 3) })
  }

  private apply(p: Playing, T: Float32Array, R: Float32Array, S: Float32Array) {
    for (const tr of p.clip.tracks) {
      if (tr.path === 'rotation') sampleTrack(tr, p.t, R, tr.node * 4)
      else if (tr.path === 'translation') sampleTrack(tr, p.t, T, tr.node * 3)
      else sampleTrack(tr, p.t, S, tr.node * 3)
    }
    if (this.root >= 0) { const r = this.m.nodes[this.root].t; T[this.root * 3] = r[0]; T[this.root * 3 + 2] = r[2] }
  }

  /** Advance the clips by dt (rate: playback speed) and rebuild the joint matrices. */
  update(dt: number, rate = 1) {
    const adv = (p: Playing) => {
      p.t += dt * rate
      if (p.t > p.clip.duration) p.t = p.loop && p.clip.duration > 0 ? p.t % p.clip.duration : p.clip.duration
    }
    const { T, R, S, T2, R2, S2, m } = this
    this.rest(T, R, S)
    if (this.cur) { adv(this.cur); this.apply(this.cur, T, R, S) }
    if (this.prev && this.fade < 1) {
      this.fade = Math.min(1, this.fade + dt / this.fadeDur)
      adv(this.prev)
      this.rest(T2, R2, S2)
      this.apply(this.prev, T2, R2, S2)
      // blend: the fading clip under the current one
      const k = this.fade * this.fade * (3 - 2 * this.fade)
      for (let i = 0; i < m.nodes.length; i++) {
        for (let c = 0; c < 3; c++) {
          T[i * 3 + c] = T2[i * 3 + c] + (T[i * 3 + c] - T2[i * 3 + c]) * k
          S[i * 3 + c] = S2[i * 3 + c] + (S[i * 3 + c] - S2[i * 3 + c]) * k
        }
        Q.slerp(R2.subarray(i * 4, i * 4 + 4), R.subarray(i * 4, i * 4 + 4), k, scratchQ)
        R.set(scratchQ, i * 4)
      }
    } else this.prev = null
    m.nodes.forEach((n, i) => (n.matrix ? this.local.set(n.matrix, i * 16) : M4x.compose(this.local, T.subarray(i * 3, i * 3 + 3), R.subarray(i * 4, i * 4 + 4), S.subarray(i * 3, i * 3 + 3), i * 16)))
    worldMatrices(m, this.local, this.world)
    if (m.joints) jointMatrices(m, this.world, this.joints)
  }
}
