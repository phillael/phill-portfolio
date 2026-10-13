/**
 * Builds the Jelly Resume's cast from the Number Slayers models (~/Desktop/dev/number-slayers,
 * apps/web/public/models):
 *   - phill.glb: the game's Phill (mesh, WebP texture, idle/dance/die)
 *   - shrimp.glb: the game's shrimp, Draco → meshopt, only its base color and glow maps
 *
 * --dances <wizard.glb> also retargets the shroom wizard's dances onto Phill (same 24 Meshy
 * bone names, different bind poses: Phill was rigged in the hero pose, the wizard in a
 * T-pose, so rotations go through each bone's direction rather than being copied). Off by
 * default: the game's Phill has the llamas welded to his mesh and skinned to his arms, so
 * the wizard's big arm moves swing them around. Worth it with a llama-free model.
 *
 * Its deps aren't the site's, so run a copy from a scratch folder:
 *   mkdir /tmp/cast && cp docs/design/jelly-resume/tools/actors.mjs /tmp/cast && cd /tmp/cast && npm init -y
 *   npm i @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 meshoptimizer draco3dgltf sharp
 *   NS=~/Desktop/dev/number-slayers/apps/web/public/models
 *   node actors.mjs --phill $NS/glb/phill.glb --shrimp $NS/shrimp.glb --out <repo>/public/resume [--dances <repo>/public/models/shroom_wizard_merged_animations.glb]
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { meshopt, prune, textureCompress } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import draco3d from 'draco3dgltf'
import sharp from 'sharp'

const arg = (k) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null }
const phillPath = arg('phill'), wizPath = arg('dances'), shrimpPath = arg('shrimp'), outDir = arg('out')
if (!phillPath || !shrimpPath || !outDir) throw new Error('usage: node actors.mjs --phill <glb> --shrimp <glb> --out <dir> [--dances <wizard glb>]')
await MeshoptDecoder.ready
await MeshoptEncoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder,
  'draco3d.decoder': await draco3d.createDecoderModule(),
})

// ---- quaternions [x, y, z, w] ----
const qmul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
]
const qinv = (q) => [-q[0], -q[1], -q[2], q[3]]
const qnorm = (q) => { const l = Math.hypot(...q); return q.map((v) => v / l) }
const qrot = (q, v) => { const r = qmul(qmul(q, [...v, 0]), qinv(q)); return [r[0], r[1], r[2]] }
const qslerp = (a, b, t) => {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]
  if (d < 0) { b = b.map((v) => -v); d = -d }
  if (d > 0.9995) return qnorm(a.map((v, i) => v + (b[i] - v) * t))
  const th = Math.acos(d), s = Math.sin(th), ka = Math.sin((1 - t) * th) / s, kb = Math.sin(t * th) / s
  return a.map((v, i) => v * ka + b[i] * kb)
}
/** the shortest rotation taking unit vector u onto unit vector v */
const qarc = (u, v) => {
  const d = u[0] * v[0] + u[1] * v[1] + u[2] * v[2]
  if (d < -0.9999) { // opposite: any perpendicular axis
    const ax = Math.abs(u[0]) < 0.9 ? [0, -u[2], u[1]] : [-u[2], 0, u[0]], l = Math.hypot(...ax)
    return [ax[0] / l, ax[1] / l, ax[2] / l, 0]
  }
  const c = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
  return qnorm([c[0], c[1], c[2], 1 + d])
}
/** rotation of a column-major 4×4 (uniform scale divided out) */
const qFromMat = (m) => {
  const c = [0, 1, 2].map((k) => { const v = [m[k * 4], m[k * 4 + 1], m[k * 4 + 2]], l = Math.hypot(...v); return v.map((x) => x / l) })
  const [m00, m10, m20] = c[0], [m01, m11, m21] = c[1], [m02, m12, m22] = c[2], tr = m00 + m11 + m22
  let q
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25 * s] }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; q = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s] }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; q = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s] }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; q = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s] }
  return qnorm(q)
}
const inv4 = (a) => {
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = a
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11
  const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30
  const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32
  const d = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06)
  return [
    (a11 * b11 - a12 * b10 + a13 * b09) * d, (a02 * b10 - a01 * b11 - a03 * b09) * d, (a31 * b05 - a32 * b04 + a33 * b03) * d, (a22 * b04 - a21 * b05 - a23 * b03) * d,
    (a12 * b08 - a10 * b11 - a13 * b07) * d, (a00 * b11 - a02 * b08 + a03 * b07) * d, (a32 * b02 - a30 * b05 - a33 * b01) * d, (a20 * b05 - a22 * b02 + a23 * b01) * d,
    (a10 * b10 - a11 * b08 + a13 * b06) * d, (a01 * b08 - a00 * b10 - a03 * b06) * d, (a30 * b04 - a31 * b02 + a33 * b00) * d, (a21 * b02 - a20 * b04 - a23 * b00) * d,
    (a11 * b07 - a10 * b09 - a12 * b06) * d, (a00 * b09 - a01 * b07 + a02 * b06) * d, (a31 * b01 - a30 * b03 - a32 * b00) * d, (a20 * b03 - a21 * b01 + a22 * b00) * d,
  ]
}

/** a rig: joints in parent-first order, each joint's parent index, rest TRS and bind-pose world rotation */
function rig(doc) {
  const skin = doc.getRoot().listSkins()[0], joints = skin.listJoints(), ibm = skin.getInverseBindMatrices().getArray()
  const order = [], seen = new Set()
  const visit = (j) => { if (seen.has(j)) return; const p = j.getParentNode(); if (p && joints.includes(p)) visit(p); seen.add(j); order.push(j) }
  joints.forEach(visit)
  const byName = new Map(order.map((j) => [j.getName(), j]))
  const parent = new Map(order.map((j) => { const p = j.getParentNode(); return [j.getName(), p && joints.includes(p) ? p.getName() : null] }))
  const bind = new Map(joints.map((j, i) => [j.getName(), qFromMat(inv4(Array.from(ibm.slice(i * 16, i * 16 + 16))))]))
  return { names: order.map((j) => j.getName()), byName, parent, bind }
}

/** sample a channel's sampler at time t (LINEAR or STEP) */
function sampler(s, isRot) {
  const input = s.getInput().getArray(), out = s.getOutput(), n = input.length, step = s.getInterpolation() === 'STEP'
  const vals = Array.from({ length: n }, (_, i) => out.getElement(i, []))
  return (t) => {
    if (t <= input[0]) return vals[0]
    if (t >= input[n - 1]) return vals[n - 1]
    let i = 0
    while (input[i + 1] < t) i++
    if (step) return vals[i]
    const k = (t - input[i]) / (input[i + 1] - input[i])
    return isRot ? qslerp(vals[i], vals[i + 1], k) : vals[i].map((v, c) => v + (vals[i + 1][c] - v) * k)
  }
}

/**
 * Retarget one clip: each target bone's world rotation is the source bone's world-space
 * change from its bind pose, applied to the target bone after its direction is turned to
 * match the source's bind direction (Meshy bones point along local +Y). Hips translation
 * moves by the source's offset from rest, scaled by the hip heights.
 */
function retarget(srcDoc, src, tgt, tgtDoc, clip, name, fps = 30) {
  const ch = new Map()
  for (const c of clip.listChannels()) {
    const node = c.getTargetNode(), path = c.getTargetPath()
    if (!node || (path !== 'rotation' && path !== 'translation')) continue
    ch.set(node.getName() + ':' + path, sampler(c.getSampler(), path === 'rotation'))
  }
  const dur = Math.max(...clip.listSamplers().map((s) => { const a = s.getInput().getArray(); return a[a.length - 1] }))
  const frames = Math.max(2, Math.round(dur * fps) + 1)
  const Y = [0, 1, 0]
  const C = new Map(src.names.map((n) => {
    const sb = src.bind.get(n), tb = tgt.bind.get(n), arc = qarc(qrot(tb, Y), qrot(sb, Y))
    return [n, qmul(qinv(sb), qmul(arc, tb))]
  }))
  const hipsS = src.byName.get('Hips').getTranslation(), hipsT = tgt.byName.get('Hips').getTranslation(), k = hipsT[1] / hipsS[1]
  const times = new Float32Array(frames), rot = new Map(tgt.names.map((n) => [n, new Float32Array(frames * 4)])), hips = new Float32Array(frames * 3)
  for (let f = 0; f < frames; f++) {
    const t = (f / (frames - 1)) * dur
    times[f] = t
    const sw = new Map(), tw = new Map()
    for (const n of src.names) {
      const local = ch.get(n + ':rotation')?.(t) ?? src.byName.get(n).getRotation(), p = src.parent.get(n)
      sw.set(n, p ? qmul(sw.get(p), local) : local)
    }
    for (const n of tgt.names) {
      const w = qnorm(qmul(sw.get(n), C.get(n))), p = tgt.parent.get(n)
      tw.set(n, w)
      let local = p ? qmul(qinv(tw.get(p)), w) : w
      const prev = f ? Array.from(rot.get(n).slice((f - 1) * 4, f * 4)) : null
      if (prev && prev[0] * local[0] + prev[1] * local[1] + prev[2] * local[2] + prev[3] * local[3] < 0) local = local.map((v) => -v) // keep the hemisphere (no flips when interpolating)
      rot.get(n).set(local, f * 4)
    }
    const ht = ch.get('Hips:translation')?.(t) ?? hipsS
    hips.set([hipsT[0] + (ht[0] - hipsS[0]) * k, hipsT[1] + (ht[1] - hipsS[1]) * k, hipsT[2] + (ht[2] - hipsS[2]) * k], f * 3)
  }
  const buf = tgtDoc.getRoot().listBuffers()[0]
  const anim = tgtDoc.createAnimation(name)
  const input = tgtDoc.createAccessor().setType('SCALAR').setArray(times).setBuffer(buf)
  const add = (node, path, arr, type) => {
    const s = tgtDoc.createAnimationSampler().setInput(input).setOutput(tgtDoc.createAccessor().setType(type).setArray(arr).setBuffer(buf)).setInterpolation('LINEAR')
    anim.addSampler(s).addChannel(tgtDoc.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(s))
  }
  for (const n of tgt.names) add(tgt.byName.get(n), 'rotation', rot.get(n), 'VEC4')
  add(tgt.byName.get('Hips'), 'translation', hips, 'VEC3')
  return dur
}

// ---- Phill ----
const phill = await io.read(phillPath)
const keep = new Set(['idle', 'dance', 'die'])
for (const a of phill.getRoot().listAnimations()) if (!keep.has(a.getName())) a.dispose()
for (const m of phill.getRoot().listMaterials()) m.setExtension('KHR_materials_specular', null)
if (wizPath) {
  const wiz = await io.read(wizPath), tgt = rig(phill), src = rig(wiz)
  const DANCES = { All_Night_Dance: 'allnight', Boom_Dance: 'boom', Bubble_Dance: 'bubble', Hip_Hop_Dance_3: 'hiphop', Magic_Genie: 'genie', Proud_Strut: 'strut' }
  for (const clip of wiz.getRoot().listAnimations()) {
    const name = DANCES[clip.getName()]
    if (!name) continue
    const dur = retarget(wiz, src, tgt, phill, clip, name)
    console.log('retargeted', clip.getName(), '→', name, dur.toFixed(2) + 's')
  }
}
await phill.transform(
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 88 }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
)
await io.write(`${outDir}/phill.glb`, phill)

// ---- the shrimp: keep its color and its glow; the asteroid shader needs nothing else ----
const shrimp = await io.read(shrimpPath)
for (const m of shrimp.getRoot().listMaterials()) { m.setNormalTexture(null); m.setMetallicRoughnessTexture(null) }
shrimp.getRoot().listExtensionsUsed().filter((e) => e.extensionName === 'KHR_draco_mesh_compression').forEach((e) => e.dispose())
await shrimp.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
await io.write(`${outDir}/shrimp.glb`, shrimp)
console.log('done')
