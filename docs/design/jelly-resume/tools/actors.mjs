/**
 * Builds the Jelly Resume's cast from the Number Slayers models (~/Desktop/dev/number-slayers,
 * apps/web/public/models):
 *   - phill.glb: the game's Phill (mesh, WebP texture, idle/walk/dance/attack/die) plus other characters'
 *     dances and the Play mode's jump
 *   - shrimp.glb: the game's shrimp, Draco → meshopt, only its base color and glow maps
 *
 * --dances <glb>,<glb>,… retargets other characters' dances onto Phill: the shroom wizard's
 * six (named below), any clip called "dance" and a file's only clip (both named after the
 * file: zombie, garlic, …, jumping). Mixamo FBX downloads become GLBs with fbx2glb.py (its
 * header has the Blender command); the jump is ~/Downloads/Jumping.fbx → <scratch>/jumping.glb.
 * Meshy rigs share Phill's 24 bone names; Mixamo rigs (human, mutant, zombie) are mapped
 * onto them and are Z-up under their armature. Bind poses differ (Phill was rigged in the
 * hero pose, the others in a T-pose), so rotations go through each bone's direction rather
 * than being copied. The game's Phill has the llamas welded to his mesh and skinned to his
 * arms, so big arm moves swing them around and tear his poncho: --arms 1 keeps his arms in
 * his idle pose (the llamas tucked in) while the rest of him does the dance.
 *
 * Its deps aren't the site's, so run a copy from a scratch folder:
 *   mkdir /tmp/cast && cp docs/design/jelly-resume/tools/actors.mjs /tmp/cast && cd /tmp/cast && npm init -y
 *   npm i @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 meshoptimizer draco3dgltf sharp
 *   NS=~/Desktop/dev/number-slayers/apps/web/public/models
 *   G=$NS/glb; node actors.mjs --phill $G/phill.glb --shrimp $NS/shrimp.glb --out <repo>/public/resume \
 *     --dances $G/zombie.glb,$G/human.glb,$G/garlic.glb,$G/lasagna.glb,$G/moose.glb,<scratch>/jumping.glb --arms 1
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { meshopt, prune, resample, textureCompress } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import draco3d from 'draco3dgltf'
import sharp from 'sharp'

const arg = (k) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null }
const phillPath = arg('phill'), dancePaths = arg('dances'), armHold = +(arg('arms') ?? 0), shrimpPath = arg('shrimp'), outDir = arg('out')
if (!phillPath || !shrimpPath || !outDir) throw new Error('usage: node actors.mjs --phill <glb> --shrimp <glb> --out <dir> [--dances <glb>,<glb>,… [--arms 0…1]]')
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

/** Mixamo's bone names → Meshy's (the spine counts the other way) */
const MIXAMO = { Spine: 'Spine02', Spine1: 'Spine01', Spine2: 'Spine', Neck: 'neck' }
const canon = (n) => { const b = n.replace(/^mixamorig:/, ''); return n === b ? b : MIXAMO[b] ?? b }

/**
 * A rig: joints (by Meshy name) in parent-first order, each joint's parent, and its bind
 * rotation in the scene's frame. `up` and `scale`: the armature above the skeleton (Mixamo's
 * is turned Z-up), which the clips' local rotations and the hips' translation sit under.
 */
function rig(doc) {
  const skin = doc.getRoot().listSkins()[0], joints = skin.listJoints(), ibm = skin.getInverseBindMatrices().getArray()
  const order = [], seen = new Set()
  const visit = (j) => { if (seen.has(j)) return; const p = j.getParentNode(); if (p && joints.includes(p)) visit(p); seen.add(j); order.push(j) }
  joints.forEach(visit)
  const above = order[0].getParentNode()?.getWorldMatrix() ?? [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  const up = qFromMat(above), scale = Math.hypot(above[0], above[1], above[2])
  const byName = new Map(order.map((j) => [canon(j.getName()), j]))
  const parent = new Map(order.map((j) => { const p = j.getParentNode(); return [canon(j.getName()), p && joints.includes(p) ? canon(p.getName()) : null] }))
  // inverse binds already include the armature (world · inverse bind = a uniform scale), so they're in the scene's frame
  const bind = new Map(joints.map((j, i) => [canon(j.getName()), qFromMat(inv4(Array.from(ibm.slice(i * 16, i * 16 + 16))))]))
  return { names: order.map((j) => canon(j.getName())), byName, parent, bind, up, scale }
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
 * match the source's bind direction (both rigs' bones point along local +Y). Bones the
 * source lacks keep their rest pose. The hips move by the source's offset from rest, in
 * the scene's frame, scaled by the hip heights.
 */
const channels = (clip) => {
  const ch = new Map()
  for (const c of clip.listChannels()) {
    const node = c.getTargetNode(), path = c.getTargetPath()
    if (!node || (path !== 'rotation' && path !== 'translation')) continue
    ch.set(canon(node.getName()) + ':' + path, sampler(c.getSampler(), path === 'rotation'))
  }
  return ch
}
const clipLength = (clip) => Math.max(...clip.listSamplers().map((s) => { const a = s.getInput().getArray(); return a[a.length - 1] }))
const ARMS = new Set(['LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand'])

function retarget(src, tgt, tgtDoc, clip, name, hold, fps = 30) {
  const ch = channels(clip)
  const dur = clipLength(clip)
  const frames = Math.max(2, Math.round(dur * fps) + 1)
  const Y = [0, 1, 0]
  const C = new Map(tgt.names.filter((n) => src.bind.has(n)).map((n) => {
    const sb = src.bind.get(n), tb = tgt.bind.get(n), arc = qarc(qrot(tb, Y), qrot(sb, Y))
    return [n, qmul(qinv(sb), qmul(arc, tb))]
  }))
  // hips offsets in the scene's frame: (armature turn) · (local offset) · (armature scale)
  const toScene = (r, v) => qrot(r.up, v).map((x) => x * r.scale)
  const hipsS = src.byName.get('Hips').getTranslation(), hipsT = tgt.byName.get('Hips').getTranslation()
  const k = toScene(tgt, hipsT)[1] / toScene(src, hipsS)[1]
  const times = new Float32Array(frames), rot = new Map(tgt.names.map((n) => [n, new Float32Array(frames * 4)])), hips = new Float32Array(frames * 3)
  for (let f = 0; f < frames; f++) {
    const t = (f / (frames - 1)) * dur
    times[f] = t
    const sw = new Map(), tw = new Map()
    for (const n of src.names) {
      const local = ch.get(n + ':rotation')?.(t) ?? src.byName.get(n).getRotation(), p = src.parent.get(n)
      sw.set(n, qmul(p ? sw.get(p) : src.up, local))
    }
    for (const n of tgt.names) {
      const p = tgt.parent.get(n), above = p ? tw.get(p) : tgt.up
      const w = C.has(n) ? qnorm(qmul(sw.get(n), C.get(n))) : qmul(above, tgt.byName.get(n).getRotation())
      tw.set(n, w)
      let local = qmul(qinv(above), w)
      if (hold && ARMS.has(n)) local = qslerp(local, hold.ch.get(n + ':rotation')?.(t % hold.dur) ?? tgt.byName.get(n).getRotation(), hold.k)
      const prev = f ? Array.from(rot.get(n).slice((f - 1) * 4, f * 4)) : null
      if (prev && prev[0] * local[0] + prev[1] * local[1] + prev[2] * local[2] + prev[3] * local[3] < 0) local = local.map((v) => -v) // keep the hemisphere (no flips when interpolating)
      rot.get(n).set(local, f * 4)
    }
    const ht = ch.get('Hips:translation')?.(t) ?? hipsS
    const d = toScene(src, [ht[0] - hipsS[0], ht[1] - hipsS[1], ht[2] - hipsS[2]]), dl = qrot(qinv(tgt.up), d).map((x) => (x * k) / tgt.scale)
    hips.set([hipsT[0] + dl[0], hipsT[1] + dl[1], hipsT[2] + dl[2]], f * 3)
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

/**
 * What he holds follows his hand: a mesh island (connected triangles, welded where seams split
 * a position) skinned mostly to a hand also had a few vertices on that side's thigh and shin,
 * so any clip that moves the leg against the hand stretched a long sliver between them (the
 * jump's tuck: 1.1 units). Those leg weights go to the hand (44 on the game's Phill).
 */
function handHeld(doc) {
  const skin = doc.getRoot().listSkins()[0], names = skin.listJoints().map((j) => j.getName())
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0'), idx = prim.getIndices()
    if (!pos || !J || !W || !idx) continue
    const n = pos.getCount(), par = Int32Array.from({ length: n }, (_, i) => i)
    const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x] } return x }
    const join = (a, b) => { a = find(a); b = find(b); if (a !== b) par[a] = b }
    const ia = idx.getArray()
    for (let f = 0; f < ia.length; f += 3) { join(ia[f], ia[f + 1]); join(ia[f + 1], ia[f + 2]) }
    const at = new Map()
    for (let v = 0, p = []; v < n; v++) { const k = pos.getElement(v, p).join(','), o = at.get(k); if (o === undefined) at.set(k, v); else join(v, o) }
    const islands = new Map()
    for (let v = 0; v < n; v++) { const r = find(v); if (!islands.has(r)) islands.set(r, []); islands.get(r).push(v) }
    let moved = 0
    for (const side of ['Left', 'Right']) {
      const hand = names.indexOf(side + 'Hand'), legs = new Set([names.indexOf(side + 'UpLeg'), names.indexOf(side + 'Leg')])
      for (const vs of islands.values()) {
        if (vs.length > n / 4) continue // the body itself
        let onHand = 0
        for (const v of vs) { const j = J.getElement(v, []), w = W.getElement(v, []); for (let k = 0; k < 4; k++) if (j[k] === hand) onHand += w[k] }
        if (onHand / vs.length < 0.4) continue
        for (const v of vs) {
          const j = J.getElement(v, []), w = W.getElement(v, [])
          let hit = false
          for (let k = 0; k < 4; k++) if (w[k] > 0 && legs.has(j[k])) { j[k] = hand; hit = true; moved++ }
          if (hit) J.setElement(v, j)
        }
      }
    }
    console.log('hand-held: moved', moved, 'leg weights to the hands')
  }
}

// ---- Phill ----
const phill = await io.read(phillPath)
const keep = new Set(['idle', 'dance', 'die', 'walk', 'attack']) // walk and attack: Play mode's run and smash
for (const a of phill.getRoot().listAnimations()) if (!keep.has(a.getName())) a.dispose()
for (const m of phill.getRoot().listMaterials()) m.setExtension('KHR_materials_specular', null)
handHeld(phill)
if (dancePaths) {
  const tgt = rig(phill), idle = phill.getRoot().listAnimations().find((a) => a.getName() === 'idle')
  const hold = idle && armHold > 0 ? { ch: channels(idle), dur: clipLength(idle), k: armHold } : null
  const WIZARD = { All_Night_Dance: 'allnight', Boom_Dance: 'boom', Bubble_Dance: 'bubble', Hip_Hop_Dance_3: 'hiphop', Magic_Genie: 'genie', Proud_Strut: 'strut' }
  for (const path of dancePaths.split(',')) {
    const doc = await io.read(path), src = rig(doc), file = path.split('/').pop().replace(/\.glb$/, '')
    const only = doc.getRoot().listAnimations().length === 1
    for (const clip of doc.getRoot().listAnimations()) {
      const name = WIZARD[clip.getName()] ?? (clip.getName() === 'dance' || only ? file : null)
      if (!name) continue
      const dur = retarget(src, tgt, phill, clip, name, hold)
      console.log('retargeted', file, clip.getName(), '→', name, dur.toFixed(2) + 's')
    }
  }
}
await phill.transform(
  resample(), // drops keys a straight line through their neighbors already gives
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 88 }),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }), // 'high' also packs the clips (16-bit quaternions), half their size
)
await io.write(`${outDir}/phill.glb`, phill)

// ---- the shrimp: keep its color and its glow; the asteroid shader needs nothing else ----
const shrimp = await io.read(shrimpPath)
for (const m of shrimp.getRoot().listMaterials()) { m.setNormalTexture(null); m.setMetallicRoughnessTexture(null) }
shrimp.getRoot().listExtensionsUsed().filter((e) => e.extensionName === 'KHR_draco_mesh_compression').forEach((e) => e.dispose())
await shrimp.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
await io.write(`${outDir}/shrimp.glb`, shrimp)
console.log('done')
