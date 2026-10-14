/**
 * WebGL2 rendering: the baked nebula, stars and mist, the bending paper sheet, the words
 * (chrome ink with raised 3D layers), the comet sparks, the Finder links and the black
 * hole. One canvas, premultiplied alpha; it starts transparent and fades the backdrop in
 * over the real page (`skyAmt`).
 */

import { camDist } from './camera'
import {
  DRIP, FOV, INK_FINISH_INDEX, JELLY_COLORS, NEBULA, PAD_TOP, PAGE_FINISH_INDEX, PCOLOR_INDEX, ROWS, SITE,
} from './config'
import { attr, bakeInto, compileAll, texFrom } from './gl'
import type { HeroPool } from './hero'
import { hex } from './math'
import * as SH from './shaders'
import type { AtlasRect, World } from './world'

const TRI = new Float32Array([-1, -1, 3, -1, -1, 3])
const CORNERS = new Float32Array([0, -1, 1, -1, 0, 1, 1, 1])
const LINK_MAX = 2400
/** the page's light (the cast's too) */
export const LIGHT = [-0.45, 0.65, 0.62]

interface Mist {
  front: boolean
  halo?: boolean
  x: number
  y: number
  z: number
  size: number
  col: number[]
  par: number
  rot: number
  spin: number
  drift: number
  a: number
}

export function createRenderer(gl: WebGL2RenderingContext, w: World) {
  const [BODY, PAGE, PTS, SKYBAKE, CLOUDBAKE, GRAINBAKE, SKY, STARS, MIST, LINK, HOLE] = compileAll(gl, [
    [SH.BODY_VS, SH.BODY_FS], [SH.PAGE_VS, SH.PAGE_FS], [SH.PT_VS, SH.PT_FS],
    [SH.QUAD_VS, SH.SKYBAKE_FS], [SH.QUAD_VS, SH.CLOUDBAKE_FS], [SH.QUAD_VS, SH.GRAINBAKE_FS], [SH.SKY_VS, SH.SKY_FS],
    [SH.STAR_VS, SH.STAR_FS], [SH.MIST_VS, SH.MIST_FS], [SH.LINK_VS, SH.LINK_FS], [SH.HOLE_VS, SH.HOLE_FS],
  ])
  const programs = [BODY, PAGE, PTS, SKYBAKE, CLOUDBAKE, GRAINBAKE, SKY, STARS, MIST, LINK, HOLE]

  const vaos: WebGLVertexArrayObject[] = []
  const vao = () => { const v = gl.createVertexArray()!; vaos.push(v); return v }
  const linkData = new Float32Array(LINK_MAX * 4), linkVAO = vao(), holeVAO = vao()
  const linkBuf = attr(gl, LINK, linkVAO, 'aPA', 4, linkData, gl.DYNAMIC_DRAW)
  attr(gl, HOLE, holeVAO, 'aCorner', 2, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]))
  const skyBakeVAO = vao(), cloudBakeVAO = vao(), skyVAO = vao(), grainBakeVAO = vao()
  attr(gl, SKYBAKE, skyBakeVAO, 'aPos', 2, TRI)
  attr(gl, CLOUDBAKE, cloudBakeVAO, 'aPos', 2, TRI)
  attr(gl, SKY, skyVAO, 'aPos', 2, TRI)
  attr(gl, GRAINBAKE, grainBakeVAO, 'aPos', 2, TRI)
  gl.bindVertexArray(null)

  let skyTex: WebGLTexture | null = null, cloudTex: WebGLTexture | null = null, grainTex: WebGLTexture | null = null
  let backTex: WebGLTexture | null = null, atlasTex: WebGLTexture | null = null
  let atlasW = 1, atlasH = 1
  let starVAO: WebGLVertexArrayObject | null = null, starCount = 0
  let mistVAO: WebGLVertexArrayObject | null = null, mistBuf: WebGLBuffer | null = null, mistData = new Float32Array(0)
  let mistInst: Mist[] = []
  let bodyVAO: WebGLVertexArrayObject | null = null, ptVAO: WebGLVertexArrayObject | null = null, pageVAO: WebGLVertexArrayObject | null = null
  let posBuf: WebGLBuffer, jigBuf: WebGLBuffer, visBuf: WebGLBuffer, hlBuf: WebGLBuffer, glowBuf: WebGLBuffer
  let ptPosBuf: WebGLBuffer, ptTailBuf: WebGLBuffer, ptAlphaBuf: WebGLBuffer, ptAgeBuf: WebGLBuffer
  let jigData = new Float32Array(0), hlData = new Float32Array(0), glowData = new Float32Array(0), idxCount = 0, pageCount = 0
  let glowsShown = false
  const buffers: WebGLBuffer[] = []
  const track = (b: WebGLBuffer) => { buffers.push(b); return b }

  // ---- Outer space: a nebula baked once into an equirectangular texture, star points, drifting mist sprites ----
  function bakeSky() {
    const hi = !w.low, sd = w.s.nebulaSeed
    skyTex = skyTex || gl.createTexture()!
    bakeInto(gl, skyTex, hi ? 2048 : 1024, hi ? 1024 : 512, SKYBAKE, skyBakeVAO, (u) => {
      gl.uniform3fv(u.uA, hex(NEBULA.a)); gl.uniform3fv(u.uB, hex(NEBULA.b)); gl.uniform3fv(u.uC, hex(NEBULA.c))
      gl.uniform3fv(u.uD, hex(NEBULA.d)); gl.uniform3fv(u.uBase, hex(NEBULA.base))
      gl.uniform3f(u.uSeed, sd * 7.13, sd * 3.71, sd * 5.29)
    })
    if (!cloudTex) { cloudTex = gl.createTexture()!; bakeInto(gl, cloudTex, 256, 256, CLOUDBAKE, cloudBakeVAO, () => {}, true) }
    if (!grainTex) {
      // paper grain / fibers / mottling, baked once and tiled over the page
      grainTex = gl.createTexture()!
      bakeInto(gl, grainTex, 1024, 1024, GRAINBAKE, grainBakeVAO, () => {}, true)
      gl.bindTexture(gl.TEXTURE_2D, grainTex)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT)
    }
    buildMist()
  }

  function buildStars() {
    const N = Math.round((w.low ? 1200 : 2600) * w.s.starDensity), P = new Float32Array(N * 3), I = new Float32Array(N * 4)
    let sd = 99
    const r = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296 }
    for (let i = 0; i < N; i++) {
      const th = r() * Math.PI * 2, ph = Math.acos(2 * r() - 1), R = 70 + r() * 70
      P.set([Math.sin(ph) * Math.cos(th) * R, Math.cos(ph) * R, -Math.abs(Math.sin(ph) * Math.sin(th)) * R - 10], i * 3)
      const big = r() < 0.06
      I.set([big ? 2.6 + r() * 2 : 1 + r() * 1.4, r(), r(), big ? 1 : 0.35 + r() * 0.5], i * 4)
    }
    if (starVAO) gl.deleteVertexArray(starVAO)
    starVAO = gl.createVertexArray()!
    track(attr(gl, STARS, starVAO, 'aPos', 3, P))
    track(attr(gl, STARS, starVAO, 'aInfo', 4, I))
    gl.bindVertexArray(null)
    starCount = N
  }

  // Mist: a few big soft sprites at different depths. Back ones sit behind the page; front ones drift near its edges.
  function buildMist() {
    const cols = [hex(NEBULA.a), hex(NEBULA.b), hex(NEBULA.c)]
    let sd = 7 + w.s.nebulaSeed
    const r = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296 }
    mistInst = []
    for (let i = 0; i < 10; i++) mistInst.push({ front: false, x: (r() - 0.5) * 46, y: (r() - 0.5) * 30, z: -8 - r() * 26, size: 12 + r() * 18, col: cols[i % 3], par: 0.55 + r() * 0.3, rot: r() * 6.28, spin: (r() - 0.5) * 0.12, drift: (r() - 0.5) * 0.6, a: 0.16 + r() * 0.14 })
    // halo right behind the page
    mistInst.push({ front: false, halo: true, x: 0, y: 0, z: -0.8, size: 12, col: cols[0], par: 1, rot: 0, spin: 0.03, drift: 0, a: 0.22 })
    for (let i = 0; i < 5; i++) {
      const side = i % 2 ? 1 : -1
      mistInst.push({ front: true, x: side * (3.5 + r() * 5), y: (r() - 0.5) * 9, z: 2 + r() * 5, size: 4 + r() * 4, col: cols[(i + 1) % 3], par: 1.15, rot: r() * 6.28, spin: (r() - 0.5) * 0.2, drift: (r() - 0.5) * 0.8, a: 0.2 + r() * 0.15 })
    }
    if (mistVAO) gl.deleteVertexArray(mistVAO)
    mistVAO = gl.createVertexArray()!
    gl.bindVertexArray(mistVAO)
    const corner = track(gl.createBuffer()!)
    gl.bindBuffer(gl.ARRAY_BUFFER, corner)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    let loc = gl.getAttribLocation(MIST.p, 'aCorner')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    mistData = new Float32Array(mistInst.length * 9)
    mistBuf = track(gl.createBuffer()!)
    gl.bindBuffer(gl.ARRAY_BUFFER, mistBuf)
    gl.bufferData(gl.ARRAY_BUFFER, mistData, gl.DYNAMIC_DRAW)
    for (const [nm, sz, off] of [['aCenter', 4, 0], ['aColRot', 4, 16], ['aAlpha', 1, 32]] as const) {
      loc = gl.getAttribLocation(MIST.p, nm)
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, sz, gl.FLOAT, false, 36, off)
      gl.vertexAttribDivisor(loc, 1)
    }
    gl.bindVertexArray(null)
  }

  function drawMist(front: boolean, amt: number) {
    const s = w.s, k = (front ? s.fgMist * (w.low ? 0 : 1) : s.mist) * amt
    if (k <= 0 || !mistVAO || !mistBuf) return
    const t = w.time * s.mistDrift, cam = w.cam
    let n = 0
    for (const m of mistInst) {
      if (m.front !== front) continue
      const o = n * 9
      mistData[o] = m.halo ? 0 : m.x + Math.sin(t * 0.3 + m.rot) * m.drift * 4
      mistData[o + 1] = (cam.y ?? 0) * m.par + m.y + Math.cos(t * 0.23 + m.rot) * m.drift * 2
      mistData[o + 2] = m.z
      mistData[o + 3] = m.halo ? Math.max(11, w.pageW * 1.45) : m.size
      mistData[o + 4] = m.col[0]; mistData[o + 5] = m.col[1]; mistData[o + 6] = m.col[2]; mistData[o + 7] = m.rot + t * m.spin
      mistData[o + 8] = m.a * k * (1 + s.pulse * w.danceMix * w.music.bass * 0.9)
      n++
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, mistBuf)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, mistData, 0, n * 9)
    gl.useProgram(MIST.p)
    gl.uniformMatrix4fv(MIST.u.uMVP, false, cam.mvp); gl.uniform3fv(MIST.u.uRight, cam.right); gl.uniform3fv(MIST.u.uUp, cam.up)
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, cloudTex); gl.uniform1i(MIST.u.uCloud, 0)
    gl.bindVertexArray(mistVAO); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n); gl.bindVertexArray(null)
  }

  /** Upload the words (lattices + atlas), their sparks and the paper sheet. */
  function buildGPU(atlas: HTMLCanvasElement, rects: AtlasRect[]) {
    const NP = w.NP, NPT = w.NPT
    if (bodyVAO) gl.deleteVertexArray(bodyVAO)
    bodyVAO = gl.createVertexArray()!
    const uv = new Float32Array(NP * 2), local = new Float32Array(NP * 2), rect = new Float32Array(NP * 4), sd = new Float32Array(NP)
    jigData = new Float32Array(NP)
    hlData = new Float32Array(NP)
    glowData = new Float32Array(NP * 2)
    const idx: number[] = []
    w.bodies.forEach((bd, bi) => {
      const r = rects[bi]
      for (let j = 0; j < ROWS; j++) for (let i = 0; i < bd.cols; i++) {
        const p = bd.p0 + j * bd.cols + i, lx = i / (bd.cols - 1), ly = j / (ROWS - 1)
        uv[p * 2] = r.u0 + (r.u1 - r.u0) * lx; uv[p * 2 + 1] = r.v0 + (r.v1 - r.v0) * ly
        local[p * 2] = lx; local[p * 2 + 1] = ly
        rect.set([r.u0, r.v0, r.u1, r.v1], p * 4)
        sd[p] = bd.seed
      }
      for (let j = 0; j < ROWS - 1; j++) for (let i = 0; i < bd.cols - 1; i++) {
        const a = bd.p0 + j * bd.cols + i, b = a + 1, c = a + bd.cols, d = c + 1
        idx.push(a, c, b, b, c, d)
      }
    })
    posBuf = track(attr(gl, BODY, bodyVAO, 'aPos', 3, w.pos, gl.DYNAMIC_DRAW))
    track(attr(gl, BODY, bodyVAO, 'aUv', 2, uv)); track(attr(gl, BODY, bodyVAO, 'aLocal', 2, local)); track(attr(gl, BODY, bodyVAO, 'aRect', 4, rect))
    jigBuf = track(attr(gl, BODY, bodyVAO, 'aJig', 1, jigData, gl.DYNAMIC_DRAW)); track(attr(gl, BODY, bodyVAO, 'aSeed', 1, sd))
    visBuf = track(attr(gl, BODY, bodyVAO, 'aVis', 1, w.vis, gl.DYNAMIC_DRAW))
    hlBuf = track(attr(gl, BODY, bodyVAO, 'aHl', 1, hlData, gl.DYNAMIC_DRAW))
    glowBuf = track(attr(gl, BODY, bodyVAO, 'aGlow', 2, glowData, gl.DYNAMIC_DRAW))
    const ib = track(gl.createBuffer()!)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(idx), gl.STATIC_DRAW)
    idxCount = idx.length
    gl.bindVertexArray(null)
    atlasTex = texFrom(gl, atlas, atlasTex)
    atlasW = atlas.width
    atlasH = atlas.height
    if (ptVAO) gl.deleteVertexArray(ptVAO)
    ptVAO = gl.createVertexArray()!
    // one quad per spark: a shared corner strip, and everything else per instance
    track(attr(gl, PTS, ptVAO, 'aCorner', 2, CORNERS))
    ptPosBuf = track(attr(gl, PTS, ptVAO, 'aPos', 3, w.ptPos, gl.DYNAMIC_DRAW, 1))
    ptTailBuf = track(attr(gl, PTS, ptVAO, 'aTail', 3, w.ptTail, gl.DYNAMIC_DRAW, 1))
    track(attr(gl, PTS, ptVAO, 'aCol', 3, w.ptCol, gl.STATIC_DRAW, 1))
    ptAlphaBuf = track(attr(gl, PTS, ptVAO, 'aAlpha', 1, w.ptAlpha, gl.DYNAMIC_DRAW, 1))
    track(attr(gl, PTS, ptVAO, 'aId', 1, Float32Array.from({ length: NPT }, (_, i) => i), gl.STATIC_DRAW, 1))
    ptAgeBuf = track(attr(gl, PTS, ptVAO, 'aAge', 1, w.ptAge, gl.DYNAMIC_DRAW, 1))
    gl.bindVertexArray(null)
    // The sheet: a front and a back grid (fine enough to bend smoothly) and a rim joining them
    const pageW = w.pageW, pageH = w.pageH
    const SX = 40, SY = Math.round(pageH * 4), pp: number[] = [], pu: number[] = [], ps: number[] = [], pi: number[] = []
    const X = (i: number) => -pageW / 2 + (pageW * i) / SX, Y = (j: number) => pageH / 2 - (pageH * j) / SY
    for (const side of [0, 1]) {
      const b0 = pp.length / 3
      for (let j = 0; j <= SY; j++) for (let i = 0; i <= SX; i++) { pp.push(X(i), Y(j), 0); pu.push(i / SX, j / SY); ps.push(side) }
      for (let j = 0; j < SY; j++) for (let i = 0; i < SX; i++) { const a = b0 + j * (SX + 1) + i, b = a + 1, c = a + SX + 1, d = c + 1; pi.push(a, c, b, b, c, d) }
    }
    const edges: [number[][], number[]][] = [
      [Array.from({ length: SX + 1 }, (_, i) => [X(i), Y(0)]), [0, 1]], [Array.from({ length: SY + 1 }, (_, j) => [X(SX), Y(j)]), [1, 0]],
      [Array.from({ length: SX + 1 }, (_, i) => [X(SX - i), Y(SY)]), [0, -1]], [Array.from({ length: SY + 1 }, (_, j) => [X(0), Y(SY - j)]), [-1, 0]],
    ]
    for (const [pts, nrm] of edges) {
      const b0 = pp.length / 3
      for (const [x, y] of pts) { pp.push(x, y, 0, x, y, 0); pu.push(nrm[0], nrm[1], nrm[0], nrm[1]); ps.push(2, 3) }
      for (let k = 0; k < pts.length - 1; k++) { const a = b0 + k * 2, b = a + 1, c = a + 2, d = a + 3; pi.push(a, b, c, c, b, d) }
    }
    if (pageVAO) gl.deleteVertexArray(pageVAO)
    pageVAO = gl.createVertexArray()!
    track(attr(gl, PAGE, pageVAO, 'aPos', 3, new Float32Array(pp))); track(attr(gl, PAGE, pageVAO, 'aUv', 2, new Float32Array(pu))); track(attr(gl, PAGE, pageVAO, 'aSide', 1, new Float32Array(ps)))
    const pib = track(gl.createBuffer()!)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pib)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(pi), gl.STATIC_DRAW)
    pageCount = pi.length
    gl.bindVertexArray(null)
  }

  /** The page's backing: white paper plus the snapshot's decorations (tint bars, rules, bullets). */
  function buildBacking(back: HTMLCanvasElement) {
    backTex = texFrom(gl, back, backTex)
  }

  /** The comet program's uniforms, for the resume's sparks and the hero pool (photo colors heating into the comet ramp). */
  function sparkUniforms(dist: number, hero: HeroPool | null) {
    const s = w.s, u = PTS.u
    gl.useProgram(PTS.p)
    gl.uniformMatrix4fv(u.uMVP, false, w.cam.mvp); gl.uniform1f(u.uSize, 0.045 * s.pSize)
    gl.uniform1f(u.uFlash, s.flash); gl.uniform1f(u.uGlow, s.pGlow)
    gl.uniform1f(u.uScale, gl.drawingBufferHeight / (2 * Math.tan(FOV / 2))); gl.uniform1f(u.uTime, w.time); gl.uniform1f(u.uHue, s.hueSpeed)
    gl.uniform1f(u.uShroom, hero ? 0 : w.shroomAmt); gl.uniform1i(u.uMode, hero ? 4 : PCOLOR_INDEX[s.pColor])
    gl.uniform1i(u.uHero, hero ? 1 : 0); gl.uniform1f(u.uDot, hero ? hero.dot : 2)
    gl.uniform1f(u.uTint, hero ? hero.tint : 0); gl.uniform3fv(u.uTintCol, [0.6, 0.42, 1.0]) // a blue-violet (#996bff): the site violet read pink once white-hot
    gl.uniform3fv(u.uJelly, hex(JELLY_COLORS[s.jelly]))
    gl.uniform3fv(u.uNeonA, hex(SITE.cyan)); gl.uniform3fv(u.uNeonB, hex(SITE.purple)); gl.uniform3fv(u.uNeonC, hex(SITE.green))
    gl.uniform3fv(u.uElec, hex(SITE.electric)); gl.uniform3fv(u.uBlue, [0.25, 0.42, 1.0]); gl.uniform3fv(u.uViolet, [0.3, 0.2, 0.82]) // cools to deep indigo (violet dots on white read pastel)
    gl.uniform2f(u.uView, gl.drawingBufferWidth, gl.drawingBufferHeight)
    gl.uniform3fv(u.uEye, w.cam.eye); gl.uniform1f(u.uFog, hero ? 0 : s.fog); gl.uniform1f(u.uFogStart, dist + 3); gl.uniform1f(u.uFogEnd, dist + 26)
  }

  // ---- The hero pool: its own instanced buffers, uploaded only when something changed (at rest, nothing does) ----
  let heroVAO: WebGLVertexArrayObject | null = null
  let heroBuf: { pos: WebGLBuffer; tail: WebGLBuffer; alpha: WebGLBuffer; age: WebGLBuffer; heat: WebGLBuffer } | null = null
  let heroOwn: WebGLBuffer[] = []
  function buildHero(hp: HeroPool) {
    if (heroVAO) gl.deleteVertexArray(heroVAO)
    for (const b of heroOwn) gl.deleteBuffer(b)
    heroVAO = gl.createVertexArray()!
    const mk = (name: string, size: number, data: Float32Array, usage: number) => { const b = attr(gl, PTS, heroVAO!, name, size, data, usage, name === 'aCorner' ? 0 : 1); heroOwn.push(b); return b }
    heroOwn = []
    mk('aCorner', 2, CORNERS, gl.STATIC_DRAW)
    heroBuf = {
      pos: mk('aPos', 3, hp.pos, gl.DYNAMIC_DRAW), tail: mk('aTail', 3, hp.tail, gl.DYNAMIC_DRAW), alpha: mk('aAlpha', 1, hp.alpha, gl.DYNAMIC_DRAW),
      age: mk('aAge', 1, hp.age, gl.DYNAMIC_DRAW), heat: mk('aHeat', 1, hp.heat, gl.DYNAMIC_DRAW),
    }
    mk('aCol', 3, hp.col, gl.STATIC_DRAW)
    mk('aId', 1, Float32Array.from({ length: hp.N }, (_, i) => i), gl.STATIC_DRAW)
    gl.bindVertexArray(null)
  }

  /** The hero pool draws over everything (it starts as the photo in front of the page). */
  function drawHero(hp: HeroPool) {
    if (!heroVAO || !heroBuf || !hp.show || !hp.N) return
    const b = heroBuf
    if (hp.dirtyPos) {
      gl.bindBuffer(gl.ARRAY_BUFFER, b.pos); gl.bufferSubData(gl.ARRAY_BUFFER, 0, hp.pos)
      gl.bindBuffer(gl.ARRAY_BUFFER, b.tail); gl.bufferSubData(gl.ARRAY_BUFFER, 0, hp.tail)
    }
    if (hp.dirtyAttr) {
      gl.bindBuffer(gl.ARRAY_BUFFER, b.alpha); gl.bufferSubData(gl.ARRAY_BUFFER, 0, hp.alpha)
      gl.bindBuffer(gl.ARRAY_BUFFER, b.age); gl.bufferSubData(gl.ARRAY_BUFFER, 0, hp.age)
      gl.bindBuffer(gl.ARRAY_BUFFER, b.heat); gl.bufferSubData(gl.ARRAY_BUFFER, 0, hp.heat)
    }
    hp.dirtyPos = hp.dirtyAttr = false
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    sparkUniforms(hp.dist, hp)
    gl.bindVertexArray(heroVAO); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, hp.N)
    gl.bindVertexArray(null); gl.depthMask(true)
  }

  /**
   * One frame. skyAmt fades the backdrop in over the page underneath; reveal is the
   * scanline (revealY); showSparks hides the resume's own sparks while the hero's stand in;
   * cast draws the cast (Phill, the shrimp) after the page and the words, before the sparks.
   */
  function render(skyAmt: number, reveal: number, showSparks: boolean, hero: HeroPool | null, drawResume = true, cast?: () => void) {
    const s = w.s, cam = w.cam
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    const space = s.backdrop !== 'void'
    const bg = space ? [0.004, 0.005, 0.012] : [0.027, 0.031, 0.047].map((v, i) => v + [0.04, 0.0, 0.06][i] * w.shroomAmt)
    gl.clearColor(bg[0] * skyAmt, bg[1] * skyAmt, bg[2] * skyAmt, skyAmt)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    // Backdrop: sky, stars, then mist behind the page (no depth writes)
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false)
    const skyRot = w.time * 0.004 + w.shroomAmt * Math.sin(w.time * 0.3) * 0.05
    if (s.backdrop === 'nebula' && skyTex && skyAmt > 0) {
      gl.disable(gl.BLEND); gl.useProgram(SKY.p)
      gl.uniform3fv(SKY.u.uFwd, cam.fwd); gl.uniform3fv(SKY.u.uRight, cam.right); gl.uniform3fv(SKY.u.uUp, cam.up)
      gl.uniform1f(SKY.u.uTf, Math.tan(FOV / 2)); gl.uniform1f(SKY.u.uAsp, cam.aspect); gl.uniform1f(SKY.u.uAmt, skyAmt)
      gl.uniform1f(SKY.u.uBright, s.nebulaBright * (1 + 0.3 * w.shroomAmt) * (1 + s.pulse * w.danceMix * (0.6 * w.music.bass + 0.5 * w.music.beat)))
      gl.uniform1f(SKY.u.uRot, skyRot)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, skyTex); gl.uniform1i(SKY.u.uSky, 0)
      gl.bindVertexArray(skyVAO); gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE)
    if (space && starCount && starVAO) {
      gl.useProgram(STARS.p)
      gl.uniformMatrix4fv(STARS.u.uMVP, false, cam.mvp); gl.uniform1f(STARS.u.uTime, w.time); gl.uniform1f(STARS.u.uDpr, dprOf())
      gl.uniform1f(STARS.u.uAmt, skyAmt)
      gl.bindVertexArray(starVAO); gl.drawArrays(gl.POINTS, 0, starCount)
    }
    if (s.backdrop === 'nebula') drawMist(false, skyAmt)
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND)
    const dist = camDist(w)
    if (drawResume && w.NP && bodyVAO && pageVAO && ptVAO) { // the page, the words, the sparks and the Finder links (none until the resume loads)
      gl.useProgram(PAGE.p)
      const pu = PAGE.u, bend = w.bend.p
      gl.uniformMatrix4fv(pu.uMVP, false, cam.mvp); gl.uniform1f(pu.uTime, w.time); gl.uniform1f(pu.uShroom, w.shroomAmt)
      gl.uniform1f(pu.uHue, s.hueSpeed); gl.uniform1f(pu.uAspect, w.pageH / w.pageW)
      gl.uniform1i(pu.uFinish, PAGE_FINISH_INDEX[s.pageFinish]); gl.uniform1f(pu.uGrain, s.grain)
      gl.uniform1f(pu.uRot, skyRot); gl.uniform3fv(pu.uEye, cam.eye); gl.uniform3fv(pu.uLight, LIGHT)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, backTex); gl.uniform1i(pu.uBack, 0)
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, grainTex); gl.uniform1i(pu.uGrainTex, 1)
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, skyTex); gl.uniform1i(pu.uSky, 2)
      gl.uniform1f(pu.uThick, s.paperThick); gl.uniform2f(pu.uHalf, w.pageW / 2, w.pageH / 2)
      gl.uniform1f(pu.uBendA, bend.a); gl.uniform1f(pu.uBendC, bend.c); gl.uniform1f(pu.uBendT, bend.t); gl.uniform1f(pu.uBendS, bend.s)
      gl.uniform1f(pu.uReveal, reveal); gl.uniform1f(pu.uDim, w.searchAmt); gl.uniform3fv(pu.uScan, hex(SITE.cyan))
      gl.bindVertexArray(pageVAO); gl.drawElements(gl.TRIANGLES, pageCount, gl.UNSIGNED_INT, 0)

      let glows = false
      for (const bd of w.bodies) {
        const v = bd.jig, h = bd.hl, c = bd.coin, l = bd.lit
        if (c || l) glows = true
        for (let i = bd.p0; i < bd.p1; i++) { jigData[i] = v; hlData[i] = h; glowData[i * 2] = c; glowData[i * 2 + 1] = l }
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, w.pos)
      gl.bindBuffer(gl.ARRAY_BUFFER, jigBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, jigData)
      gl.bindBuffer(gl.ARRAY_BUFFER, visBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, w.vis)
      gl.bindBuffer(gl.ARRAY_BUFFER, hlBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, hlData)
      if (glows || glowsShown) { gl.bindBuffer(gl.ARRAY_BUFFER, glowBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, glowData) } // (all zero: no upload)
      glowsShown = glows
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.useProgram(BODY.p)
      const u = BODY.u
      gl.uniformMatrix4fv(u.uMVP, false, cam.mvp); gl.uniform1f(u.uShroom, w.shroomAmt); gl.uniform1f(u.uMelt, s.melt)
      gl.uniform1f(u.uDrip, s.drip); gl.uniform1f(u.uTime, w.time); gl.uniform1f(u.uHue, s.hueSpeed); gl.uniform1f(u.uGummy, s.gummy)
      gl.uniform1f(u.uTextFrac, (PAD_TOP + 0.228) / (PAD_TOP + 0.228 * (1 + DRIP))); gl.uniform3fv(u.uJelly, hex(JELLY_COLORS[s.jelly]))
      const fogCol = space ? hex(NEBULA.base).map((v) => v * 0.8) : bg
      gl.uniform3fv(u.uEye, cam.eye); gl.uniform3fv(u.uFogCol, fogCol); gl.uniform1f(u.uFog, s.fog)
      gl.uniform1f(u.uFogStart, dist + 3); gl.uniform1f(u.uFogEnd, dist + 26)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlasTex); gl.uniform1i(u.uAtlas, 0)
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, skyTex); gl.uniform1i(u.uSky, 1)
      gl.uniform1i(u.uInkMode, INK_FINISH_INDEX[s.inkFinish]); gl.uniform1f(u.uShine, s.shine)
      gl.uniform2f(u.uTexel, 1.5 / atlasW, 1.5 / atlasH); gl.uniform3fv(u.uLight, LIGHT); gl.uniform1f(u.uRot, skyRot)
      gl.uniform1f(u.uSearch, w.searchAmt); gl.uniform3fv(u.uGlowA, hex(SITE.cyan)); gl.uniform3fv(u.uGlowB, hex(SITE.purple))
      gl.uniform3fv(u.uCoin, hex(SITE.green))
      // Raised letters: lift the face and fill the gap with darker stacked copies (fewer on phones)
      const thick = s.textDepth * 0.05, layers = s.textDepth > 0 ? Math.min(w.low ? 2 : 6, Math.max(1, Math.round(s.textDepth * 6))) : 0
      gl.uniform1f(u.uLift, thick)
      gl.bindVertexArray(bodyVAO)
      gl.uniform1i(u.uPass, 1)
      for (let l = layers; l >= 1; l--) {
        gl.uniform1f(u.uLayerZ, (-thick * l) / layers); gl.uniform1f(u.uLayerShade, 0.3 + 0.3 * (1 - l / layers))
        gl.drawElements(gl.TRIANGLES, idxCount, gl.UNSIGNED_INT, 0)
      }
      gl.uniform1i(u.uPass, 0); gl.uniform1f(u.uLayerZ, 0)
      gl.drawElements(gl.TRIANGLES, idxCount, gl.UNSIGNED_INT, 0)
      if (cast) { gl.bindVertexArray(null); cast(); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA) }

      gl.depthMask(false)
      gl.bindBuffer(gl.ARRAY_BUFFER, ptPosBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, w.ptPos)
      gl.bindBuffer(gl.ARRAY_BUFFER, ptTailBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, w.ptTail)
      gl.bindBuffer(gl.ARRAY_BUFFER, ptAlphaBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, w.ptAlpha)
      gl.bindBuffer(gl.ARRAY_BUFFER, ptAgeBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, w.ptAge)
      if (showSparks) {
        sparkUniforms(dist, null)
        gl.bindVertexArray(ptVAO); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, w.NPT)
      }

      // Finder links: dots flowing along arcs between consecutive matches, in reading order
      if (w.searchAmt > 0.02 && w.searchN > 1) {
        let n = 0, prev: number[] | null = null
        const per = Math.max(3, Math.min(24, Math.floor(LINK_MAX / w.searchN))), pos = w.pos
        for (const bd of w.bodies) {
          if (!bd.hlT) continue
          const a = bd.p0 * 3, b = (bd.p1 - 1) * 3, c = [(pos[a] + pos[b]) / 2, (pos[a + 1] + pos[b + 1]) / 2, (pos[a + 2] + pos[b + 2]) / 2]
          if (prev && n < LINK_MAX) {
            const len = Math.hypot(c[0] - prev[0], c[1] - prev[1]), K = Math.max(3, Math.min(per, Math.round(len * 7)))
            for (let j = 0; j < K && n < LINK_MAX; j++, n++) {
              const t = (j / K + (w.time * 0.3) / Math.max(0.5, len)) % 1, o = n * 4
              linkData[o] = prev[0] + (c[0] - prev[0]) * t; linkData[o + 1] = prev[1] + (c[1] - prev[1]) * t
              linkData[o + 2] = prev[2] + (c[2] - prev[2]) * t + Math.sin(Math.PI * t) * Math.min(0.9, 0.15 + len * 0.12)
              linkData[o + 3] = Math.sin(Math.PI * t) * w.searchAmt * 0.85
            }
          }
          prev = c
        }
        gl.disable(gl.DEPTH_TEST); gl.blendFunc(gl.ONE, gl.ONE)
        gl.bindBuffer(gl.ARRAY_BUFFER, linkBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, linkData, 0, n * 4)
        gl.useProgram(LINK.p); gl.uniformMatrix4fv(LINK.u.uMVP, false, cam.mvp); gl.uniform3fv(LINK.u.uCol, hex(SITE.cyan))
        gl.uniform1f(LINK.u.uScale, gl.drawingBufferHeight / (2 * Math.tan(FOV / 2)))
        gl.bindVertexArray(linkVAO); gl.drawArrays(gl.POINTS, 0, n)
        gl.enable(gl.DEPTH_TEST); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      }
    }
    // Black hole on top of everything it's eating
    const hole = w.hole
    if (hole.amt > 0.01) {
      gl.enable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.useProgram(HOLE.p); gl.uniformMatrix4fv(HOLE.u.uMVP, false, cam.mvp)
      gl.uniform3fv(HOLE.u.uC, hole.p); gl.uniform3fv(HOLE.u.uRight, cam.right); gl.uniform3fv(HOLE.u.uUp, cam.up)
      gl.uniform1f(HOLE.u.uSize, 0.45 + 1.7 * hole.amt * Math.min(1.6, s.holePull)); gl.uniform1f(HOLE.u.uTime, w.time); gl.uniform1f(HOLE.u.uAmt, hole.amt)
      gl.uniform3fv(HOLE.u.uA, hex(SITE.violet)); gl.uniform3fv(HOLE.u.uB, hex(SITE.cyan))
      gl.bindVertexArray(holeVAO); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      gl.enable(gl.DEPTH_TEST)
    }
    if (s.backdrop === 'nebula') { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); drawMist(true, skyAmt) }
    gl.bindVertexArray(null); gl.depthMask(true)
    if (hero) drawHero(hero)
  }

  let dpr = 1
  const dprOf = () => dpr
  const setDpr = (v: number) => { dpr = v }

  function dispose() {
    for (const p of programs) gl.deleteProgram(p.p)
    for (const v of [...vaos, bodyVAO, ptVAO, pageVAO, starVAO, mistVAO]) if (v) gl.deleteVertexArray(v)
    for (const b of [...buffers, ...heroOwn]) gl.deleteBuffer(b)
    if (heroVAO) gl.deleteVertexArray(heroVAO)
    gl.deleteBuffer(linkBuf)
    for (const t of [skyTex, cloudTex, grainTex, backTex, atlasTex]) if (t) gl.deleteTexture(t)
  }

  return { bakeSky, buildStars, buildGPU, buildBacking, buildHero, render, setDpr, dispose }
}

export type Renderer = ReturnType<typeof createRenderer>
