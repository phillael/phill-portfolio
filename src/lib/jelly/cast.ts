/**
 * The cast: Phill (from Number Slayers) floats in an orbit around the page, behind it
 * across the top and in front along the bottom, and now and then a shrimp drifts across
 * the nebula like a slow planet. With the site's music on he dances (the game's dances,
 * a new one every so often) and bounces on the beat, and each shrimp swells and glows
 * with its own slice of the spectrum while its body bends to the live waveform. Click one
 * and it spins off (Phill flails), then drifts back; the black hole eats them and spits
 * them out; Chaos knocks them all.
 *
 * It loads after the page has printed (so the cold open never waits on it) and draws in
 * the resume's pass, so the page hides whatever passes behind it.
 */

import { createActorRenderer, Pose, type ActorModel, type ActorRenderer, type CastFrame } from './actors'
import { camDist, type Ray } from './camera'
import { CAST_CONFIG, FOV, NEBULA, SITE, type CastConfig } from './config'
import { hex, lcg, M4x, Q, type Quat, type Vec3 } from './math'
import { LIGHT } from './render'
import type { VoxelMesh } from './voxels'
import type { World } from './world'

const IDLE = 'idle'
const KNOCKED = 'die'
/** handed back from Play mode, he grows back to his orbit size over this long (s) */
const GROW = 0.7
/** Play mode's run, smash and jump: never part of his dances */
export const PLAY_CLIPS: readonly string[] = ['walk', 'attack', 'jumping']

/** the clips he dances to the music: all but idle, the knock and Play mode's */
export const danceSet = (clips: string[]) => new Set(clips.filter((n) => n !== IDLE && n !== KNOCKED && !PLAY_CLIPS.includes(n)))
/** samples of the waveform along a shrimp's body */
const WAVE = 16

interface Body {
  pos: Vec3
  vel: Vec3
  rot: Quat
  spin: Vec3
  /** seconds left flying loose (no pull back to its path) */
  free: number
  flash: number
  eaten: boolean
  /** shrinks to nothing inside the black hole */
  scale: number
}

interface PhillState extends Body {
  a: ActorModel
  pose: Pose
  th: number
  /** seconds since he arrived (he flies in from deep in the nebula) */
  age: number
  /** his dances (danceSet), and what's left of this round of them (shuffled) */
  dances: Set<string>
  bag: string[]
  /** the music's on (with some hysteresis) */
  groove: boolean
  /** seconds into this dance, and how far through its loop it was last frame */
  danceT: number
  phase: number
  /** this frame's beat bounce (0…1) */
  pump: number
}

interface ShrimpState extends Body {
  on: boolean
  wait: number
  t: number
  dur: number
  from: Vec3
  to: Vec3
  axis: Vec3
  rate: number
  ang: number
  base: Quat
  size: number
  /** its slice of the spectrum (0 bass … 1 treble) and how loud that is now */
  band: number
  level: number
  /** the bend along its body (sixteen samples), its swim's phase, how many of the music's 96 waveform points it spans, and their recent peak */
  wave: Float32Array
  ph: number
  span: number
  peak: number
}

/**
 * Phill for Play mode: his pose, size, and his foot joints (node, height in the rest pose, where his
 * soles are at the origin), so the soles can stand on the text; `stand`: how high idle holds them (model units).
 */
export interface Rig {
  pose: Pose
  height: number
  dims: Vec3
  feet: { node: number; rest: number }[]
  stand: number
  /** his dances (the rotation) */
  dances: string[]
}

/** Play mode drives Phill: where his feet are, which way he faces (yaw) and how tall he is (units); in the trip, rainbow with afterimages (and hidden while it flickers) */
export interface Drive {
  feet: Vec3
  yaw: number
  size: number
  trip?: number
  flicker?: boolean
}

/**
 * Something Play mode puts on the page (a shrimp pickup, a UFO's parts, the mushroom), drawn by the cast each
 * frame in its pass, in the list's order (see-through ones last). Play owns the list (`cast.props`) and
 * mutates it in place; nothing here moves them.
 */
export interface Prop {
  /** the shrimp, or a model Play uploaded through `cast.voxels` */
  model: 'shrimp' | ActorModel
  /** where its middle goes (or, `origin`, its model's own origin: a voxel mesh's bottom middle), its turn and longest side (units) */
  pos: Vec3
  anchor?: 'origin'
  rot: Quat
  size: number
  alpha: number
  glow: Vec3
  flash: number
  ambient?: number
  rim?: number
  /** a skinned model's pose (its joint matrices: a Pose's `joints`) */
  joints?: Float32Array | null
  /** stretched across (x/z) and up (y), e.g. squashed flat */
  sx?: number
  sy?: number
  /** a soft glow just behind it (its diameter, color and strength) */
  halo: { size: number; color: Vec3; alpha: number } | null
}

/** The UFO's beam: an open cone of see-through cyan down from `top` (Play fills `cast.beams`) */
export interface Beam {
  top: Vec3
  len: number
  rTop: number
  rBot: number
  alpha: number
}

/** the trip's afterimages: how many, and how far back each (in snapshots, taken 60 a second) */
const GHOSTS = 3
const GHOST_STEP = 8
const GHOST_SLOTS = GHOSTS * GHOST_STEP + 1

/** a fully saturated hue (HSL 1, 0.5), into out */
function hueRgb(h: number, out: Vec3, k = 1) {
  const f = (n: number) => Math.max(0, Math.min(1, n))
  h = ((h % 1) + 1) % 1
  out[0] = f(Math.abs(h * 6 - 3) - 1) * k
  out[1] = f(2 - Math.abs(h * 6 - 2)) * k
  out[2] = f(2 - Math.abs(h * 6 - 4)) * k
  return out
}

const body = (pos: Vec3): Body => ({ pos, vel: [0, 0, 0], rot: [0, 0, 0, 1], spin: [0, 0, 0], free: 0, flash: 0, eaten: false, scale: 1 })

export function createCast(gl: WebGL2RenderingContext, w: World) {
  const params: CastConfig = { ...CAST_CONFIG }
  const rnd = lcg(31)
  let R: ActorRenderer | null = null
  let phill: PhillState | null = null
  let shrimpModel: ActorModel | null = null
  let shrimpWorld: Float32Array | null = null
  /** Play mode round 2's enemy: fetched once Play has started (never in the cold open) */
  let lasagna: ActorModel | null = null, lasagnaLoad: Promise<ActorModel | null> | null = null
  const shrimp: ShrimpState[] = Array.from({ length: 4 }, (_, i) => ({
    ...body([0, 0, -40]), on: false, wait: 3 + i * 6 + rnd() * 6, t: 0, dur: 1, from: [0, 0, 0], to: [0, 0, 0], axis: [0, 1, 0], rate: 0, ang: 0, base: [0, 0, 0, 1], size: 1,
    band: 0, level: 0, wave: new Float32Array(WAVE), ph: 0, span: 32, peak: 0.2,
  }))
  let alpha = 0
  const props: Prop[] = []
  const beams: Beam[] = []
  const origin: Vec3 = [0, 0, 0]
  /** Play mode owns his position, rotation, size and clip while this is set (the cast keeps drawing him) */
  let drive: Drive | null = null
  let rigInfo: Rig | null = null
  /** handed back from Play mode: he grows from Play's size to his orbit's over GROW s */
  let growFrom = 0, growT = GROW
  /** the music's bass, smoothed (and zero while it's off) */
  let energy = 0
  let disposed = false

  /** Fetch and build both models, a step per frame. Failures leave the stage empty (never the resume). */
  async function load(nextTask: () => Promise<void>) {
    try {
      const get = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.arrayBuffer() })
      const [pb, sb] = await Promise.all([params.phill ? get('/resume/phill.glb') : null, get('/resume/shrimp.glb')])
      await nextTask()
      if (disposed) return
      R = createActorRenderer(gl)
      if (pb) {
        await nextTask()
        if (disposed) return
        const a = await R.load(pb, nextTask)
        if (disposed) return
        const pose = new Pose(a.m, { noLift: ['jumping'] })
        pose.play(pose.has(IDLE) ? IDLE : a.m.clips[0]?.name ?? '', 0)
        const dances = danceSet(a.m.clips.map((c) => c.name))
        phill = { ...body([0, params.lift + 3, -40]), a, pose, th: -Math.PI / 2, age: 0, scale: 0.4, dances, bag: [], groove: false, danceT: 0, phase: 0, pump: 0 }
      }
      await nextTask()
      if (disposed) return
      shrimpModel = await R.load(sb, nextTask)
      if (disposed) return
      const m = shrimpModel.m
      // the static mesh's own node transform (it carries the quantization scale)
      const local = new Float32Array(m.nodes.length * 16), world = new Float32Array(m.nodes.length * 16)
      m.nodes.forEach((n, i) => (n.matrix ? local.set(n.matrix, i * 16) : M4x.compose(local, n.t, n.r, n.s, i * 16)))
      for (const i of m.order) {
        const p = m.nodes[i].parent
        if (p < 0) world.set(local.subarray(i * 16, i * 16 + 16), i * 16)
        else M4x.mulInto(world, world, local, i * 16, p * 16, i * 16)
      }
      shrimpWorld = world.slice(m.meshNode * 16, m.meshNode * 16 + 16)
    } catch (err) {
      if (!disposed) console.warn('The resume cast failed to load', err) // (closing mid-load stops the renderer's uploads with an error)
    }
  }

  // ---- where things are ----
  const zoom = () => Math.max(0.05, w.cam.zoom ?? 1)
  /** the camera's distance from the page with the whole page in view (orbits don't shrink as you zoom in) */
  const fitDist = () => camDist(w) / zoom()
  const fitHalfW = () => w.cam.halfW / zoom()

  /** a portrait screen (a phone): the page fills the width, so he dances in the sky above it, smaller */
  const portrait = () => w.cam.aspect < 0.8
  const sizeNow = () => params.size * (portrait() ? params.phoneScale : 1)

  /** his spot on the orbit at angle th: around the page (in front low, behind high), or above it on a phone */
  function orbitAt(th: number, out: Vec3) {
    const size = sizeNow()
    if (portrait()) {
      out[0] = Math.max(1, fitHalfW() * 0.62) * Math.cos(th)
      out[1] = w.pageH / 2 + size * 0.62 + params.phoneLift - 0.5 * Math.sin(th)
      out[2] = params.orbitZ * 0.6 * Math.sin(th)
      return out
    }
    const A = Math.min(w.pageW / 2 + params.orbitX, Math.max(w.pageW * 0.3, fitHalfW() - size * 0.3))
    out[0] = A * Math.cos(th)
    out[1] = params.lift - params.tilt * Math.sin(th)
    out[2] = params.orbitZ * Math.sin(th)
    return out
  }

  // ---- motion shared by Phill and the shrimp ----
  const tq: Quat = [0, 0, 0, 1], sq: Quat = [0, 0, 0, 1]
  /** Loose: fly and spin. Otherwise: a spring back to its spot and its pose. */
  function stepBody(b: Body, target: Vec3, rot: Quat, dt: number, K: number) {
    if (b.free > 0) {
      b.free -= dt
      const d = Math.exp(-0.35 * dt)
      for (let a = 0; a < 3; a++) { b.pos[a] += b.vel[a] * dt; b.vel[a] *= d }
    } else {
      const D = 1.8 * Math.sqrt(K)
      for (let a = 0; a < 3; a++) { b.vel[a] += ((target[a] - b.pos[a]) * K - b.vel[a] * D) * dt; b.pos[a] += b.vel[a] * dt }
    }
    const sp = Math.hypot(b.spin[0], b.spin[1], b.spin[2])
    if (sp > 1e-3) {
      Q.axis(b.spin[0] / sp, b.spin[1] / sp, b.spin[2] / sp, sp * dt, sq)
      Q.norm(Q.mul(sq, b.rot, b.rot))
      const d = Math.exp(-(b.free > 0 ? 0.25 : 2.2) * dt)
      for (let a = 0; a < 3; a++) b.spin[a] *= d
    }
    if (b.free <= 0) Q.slerp(b.rot, rot, 1 - Math.exp(-2.5 * dt), b.rot)
    b.flash = Math.max(0, b.flash - dt * 2.5)
  }

  /** The black hole pulls everything in, eats it, and spits it back out when it closes. */
  function holeStep(b: Body, dt: number) {
    const h = w.hole
    if (b.eaten) {
      b.scale = Math.max(0, b.scale - dt * 5)
      for (let a = 0; a < 3; a++) b.pos[a] += (h.p[a] - b.pos[a]) * Math.min(1, dt * 8)
      if (!h.on) {
        b.eaten = false
        knock(b, [rnd() - 0.5, rnd() - 0.2, 0.6 + rnd() * 0.4], 1.4)
      }
      return
    }
    b.scale = Math.min(1, b.scale + dt * 3)
    if (h.amt > 0.02) {
      const d = [h.p[0] - b.pos[0], h.p[1] - b.pos[1], h.p[2] - b.pos[2]], dist = Math.hypot(d[0], d[1], d[2]) || 1
      const pull = (45 * h.amt) / (0.6 + dist * 0.35)
      for (let a = 0; a < 3; a++) b.vel[a] += (d[a] / dist) * pull * dt
      b.spin[1] += dt * 10 * h.amt
      b.free = Math.max(b.free, 0.5)
      if (h.on && dist < 0.9) b.eaten = true
    }
  }

  /** Send a body flying along dir (roughly), spinning; it drifts back once it calms down. */
  function knock(b: Body, dir: number[], k = 1) {
    const l = Math.hypot(dir[0], dir[1], dir[2]) || 1
    for (let a = 0; a < 3; a++) b.vel[a] += ((dir[a] / l) * 7 + (rnd() - 0.5) * 3) * k
    b.vel[1] += (1.5 + rnd() * 1.5) * k
    const ax = [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5], al = Math.hypot(ax[0], ax[1], ax[2]) || 1, sp = (8 + rnd() * 6) * k
    for (let a = 0; a < 3; a++) b.spin[a] += (ax[a] / al) * sp
    b.free = 2.4
    b.flash = 0.55
    if (phill && b === phill) phill.pose.play(KNOCKED, 0.12, false)
    else { const s = b as ShrimpState; s.dur = Math.max(s.dur, s.t / 0.8) } // a shrimp near the end of its pass sticks around to come back
  }

  /** On to the next dance: a shuffled round of them all, never the same one twice running. */
  function nextDance(p: PhillState, fade: number) {
    if (!p.bag.length) {
      p.bag = [...p.dances].filter((d) => d !== p.pose.clip)
      for (let i = p.bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [p.bag[i], p.bag[j]] = [p.bag[j], p.bag[i]] }
    }
    const next = p.bag.pop()
    if (next) p.pose.play(next, fade)
    p.danceT = 0
    p.phase = 0
  }

  // ---- shrimp ----
  /**
   * The bend along a shrimp's body: a swim that runs down it, faster and bigger the louder
   * its slice of the spectrum and kicked by the beat, with the live waveform rippling on top
   * (a stretch of the music's 96 points from a rising zero crossing, so it holds still like a
   * scope's, scaled by its recent peak). Its ends swing more than its middle.
   */
  function waveInto(s: ShrimpState, dt: number) {
    const W = w.music.wave, n = W.length, span = Math.min(s.span, n - 1)
    let start = 0
    for (let k = 1; k < n - span; k++) if (W[k - 1] < 0 && W[k] >= 0) { start = k; break }
    let peak = 0
    for (let k = 0; k < span; k++) peak = Math.max(peak, Math.abs(W[start + k]))
    s.peak = Math.max(0.05, peak, s.peak * Math.max(0, 1 - dt * 0.7))
    s.ph += dt * (0.5 + 2 * s.level)
    const swim = 0.45 * s.level + 0.6 * w.music.beat, e = Math.min(1, dt * 25)
    for (let k = 0; k < WAVE; k++) {
      const u = k / (WAVE - 1), f = start + u * (span - 1), i = Math.floor(f), t = f - i
      const scope = (W[i] * (1 - t) + W[Math.min(n - 1, i + 1)] * t) / s.peak
      const v = (swim * Math.sin(6.283 * (0.9 * u - s.ph)) + 0.35 * scope) * (0.4 + 0.6 * Math.abs(2 * u - 1))
      s.wave[k] += (v - s.wave[k]) * e
    }
  }

  function spawn(s: ShrimpState) {
    const z = -(4 + rnd() * 20), d = fitDist() - z, tf = Math.tan(FOV / 2), hw = d * tf * w.cam.aspect, hh = d * tf
    const side = rnd() < 0.5 ? -1 : 1
    s.size = params.shrimpSize * (0.7 + rnd() * 0.6) * (1 + -z / 16) * (portrait() ? params.phoneScale : 1) // far ones bigger, like planets
    const m = s.size
    s.from = [-side * (hw + m), (rnd() - 0.5) * hh * 1.2, z]
    s.to = [side * (hw + m), s.from[1] + (rnd() - 0.5) * hh * 0.6, z + (rnd() - 0.5) * 4]
    s.dur = Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1], s.to[2] - s.from[2]) / (params.shrimpSpeed * (0.7 + rnd() * 0.6) * (1 + -z / 25))
    s.t = 0
    const ax = [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5], al = Math.hypot(ax[0], ax[1], ax[2]) || 1
    s.axis = [ax[0] / al, ax[1] / al, ax[2] / al]
    s.rate = (0.15 + rnd() * 0.35) * (rnd() < 0.5 ? -1 : 1)
    s.ang = rnd() * 6.28
    s.band = 0.03 + rnd() * 0.6
    s.span = 24 + Math.floor(rnd() * 24)
    s.level = 0
    s.wave.fill(0)
    Q.norm(Q.axis(s.axis[1], s.axis[2], s.axis[0], rnd() * 6.28, s.base))
    s.pos = [...s.from]
    s.vel = [0, 0, 0]
    s.spin = [0, 0, 0]
    s.rot = [...s.base]
    s.free = 0
    s.scale = 1
    s.eaten = false
    s.on = true
  }

  const target: Vec3 = [0, 0, 0], ahead: Vec3 = [0, 0, 0]

  /** Advance everything; `show`: the resume is open and settled (no intro, not closing). */
  function update(dt: number, show: boolean) {
    alpha += ((show ? 1 : 0) - alpha) * Math.min(1, dt * (show ? 2.5 : 6))
    if (alpha < 0.002 && !show) return
    const t = w.time, music = w.music, dm = w.danceMix
    energy += (music.bass * dm - energy) * Math.min(1, dt * 3)

    if (phill && drive) {
      // Play mode has him: the model's origin (between his feet) at drive.feet, turned to drive.yaw
      const p = phill, k = drive.size / p.a.height, c = p.a.center, cy = Math.cos(drive.yaw), sy = Math.sin(drive.yaw)
      p.pos[0] = drive.feet[0] + (c[0] * cy + c[2] * sy) * k
      p.pos[1] = drive.feet[1] + c[1] * k
      p.pos[2] = drive.feet[2] + (-c[0] * sy + c[2] * cy) * k
      Q.axis(0, 1, 0, drive.yaw, p.rot)
      p.vel[0] = p.vel[1] = p.vel[2] = 0
      p.spin[0] = p.spin[1] = p.spin[2] = 0
      p.free = 0
      p.eaten = false
      p.scale = 1
      p.pump = 0
      p.flash = Math.max(0, p.flash - dt * 2.5)
    } else if (phill) {
      const p = phill, cam = w.cam
      p.age += dt
      growT = Math.min(GROW, growT + dt)
      p.th += (dt * Math.PI * 2) / Math.max(4, params.lap)
      orbitAt(p.th + 0.01, ahead)
      orbitAt(p.th, target)
      // he faces you, turning a little toward where he's going
      const yawCam = Math.atan2(cam.eye[0] - target[0], cam.eye[2] - target[2])
      const yawGo = Math.atan2(ahead[0] - target[0], ahead[2] - target[2])
      p.pump = Math.min(1, music.beat * dm * params.pump)
      target[1] += params.bob * Math.sin(t * 1.1) + 0.3 * p.pump
      let dy = yawGo - yawCam
      dy = Math.atan2(Math.sin(dy), Math.cos(dy))
      Q.axis(0, 1, 0, yawCam + dy * params.face, tq)
      Q.mul(tq, Q.axis(0, 0, 1, 0.07 * Math.sin(t * 0.9), sq), tq)
      holeStep(p, dt)
      if (!p.eaten) stepBody(p, target, tq, dt, p.age < 4 ? 1.5 + p.age * 1.6 : 8) // he flies in slowly, then keeps close to his spot
      // music on: he dances, a new one every so often (at the end of a loop); off: he hangs about
      if (dm > 0.5) p.groove = true
      else if (dm < 0.3) p.groove = false
      const dancing = p.dances.has(p.pose.clip ?? '')
      if (p.free <= 0 && !p.eaten) {
        if (!p.groove) p.pose.play(IDLE, 0.8)
        else if (!dancing) nextDance(p, 0.6)
        else {
          p.danceT += dt
          const ph = p.pose.phase
          if (p.danceT > params.danceSwitch && ph < p.phase) nextDance(p, 0.5)
          else p.phase = ph
        }
      }
      p.pose.update(dt, dancing ? params.danceRate * (0.9 + 0.25 * energy) : 1)
    }

    if (shrimpModel) {
      const max = Math.max(0, params.shrimp - (w.low ? 1 : 0))
      let live = shrimp.filter((s) => s.on).length
      shrimp.forEach((s, i) => {
        if (!s.on) {
          s.wait -= dt * (1 + dm) // they come twice as often with the music on
          if (s.wait <= 0 && show && live < max && i < max) { spawn(s); live++ }
          return
        }
        s.t += dt
        const u = s.t / s.dur
        if (u >= 1 && !s.eaten) { s.on = false; s.wait = params.shrimpGap * (0.5 + rnd()); return }
        for (let a = 0; a < 3; a++) target[a] = s.from[a] + (s.to[a] - s.from[a]) * Math.min(1, u)
        s.level += (music.bandAt(s.band) * dm - s.level) * Math.min(1, dt * 12)
        if (dm > 0.01) waveInto(s, dt)
        s.ang += s.rate * dt * (1 + 1.5 * s.level)
        Q.mul(Q.axis(s.axis[0], s.axis[1], s.axis[2], s.ang, tq), s.base, tq)
        holeStep(s, dt)
        if (!s.eaten) stepBody(s, target, tq, dt, 1.2)
      })
    }
  }

  // ---- drawing ----
  const place = new Float32Array(16), model = new Float32Array(16), rc = [0, 0, 0], tv: Vec3 = [0, 0, 0], kv: Vec3 = [1, 1, 1]
  /** translate(pos) · rotate(rot) · scale(k; stretched by sy up its height, sx across) · translate(-center) */
  function placement(pos: Vec3, rot: Quat, k: number, c: Vec3, sx = 1, sy = 1) {
    // the center, scaled and rotated: R·(S·c)
    const x = c[0] * k * sx, y = c[1] * k * sy, z = c[2] * k * sx, qx = rot[0], qy = rot[1], qz = rot[2], qw = rot[3]
    const ix = qw * x + qy * z - qz * y, iy = qw * y + qz * x - qx * z, iz = qw * z + qx * y - qy * x, iw = -qx * x - qy * y - qz * z
    rc[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy
    rc[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz
    rc[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx
    tv[0] = pos[0] - rc[0]; tv[1] = pos[1] - rc[1]; tv[2] = pos[2] - rc[2]
    kv[0] = kv[2] = k * sx; kv[1] = k * sy
    return M4x.compose(place, tv, rot, kv)
  }

  /** his size in his orbit (shrunk inside the black hole; growing back from Play mode's) */
  function orbitSize() {
    const full = sizeNow() * (phill?.scale ?? 1)
    if (growT >= GROW) return full
    const u = growT / GROW, e = u * u * (3 - 2 * u)
    return Math.exp(Math.log(Math.max(1e-3, growFrom)) + (Math.log(Math.max(1e-3, full)) - Math.log(Math.max(1e-3, growFrom))) * e)
  }

  /** the trip's afterimages: a ring of his recent placements and poses (16 + the joints' floats each) */
  let ghostJ = 0, ghostHead = 0, ghostN = 0, ghostLast = -1
  let ghostModel: Float32Array[] = [], ghostJoints: Float32Array[] = []
  const rainbow: Vec3 = [0, 0, 0], ghostGlow: Vec3 = [0, 0, 0]
  function snapGhost(m: Float32Array, joints: Float32Array) {
    if (ghostJ !== joints.length) {
      // (sized to his joints once)
      ghostJ = joints.length
      const buf = new Float32Array(GHOST_SLOTS * (16 + ghostJ))
      ghostModel = Array.from({ length: GHOST_SLOTS }, (_, i) => buf.subarray(i * (16 + ghostJ), i * (16 + ghostJ) + 16))
      ghostJoints = Array.from({ length: GHOST_SLOTS }, (_, i) => buf.subarray(i * (16 + ghostJ) + 16, (i + 1) * (16 + ghostJ)))
      ghostN = 0
    }
    ghostHead = (ghostHead + 1) % GHOST_SLOTS
    ghostModel[ghostHead].set(m)
    ghostJoints[ghostHead].set(joints)
    ghostN = Math.min(GHOST_SLOTS, ghostN + 1)
  }

  const fogCol = hex(NEBULA.base).map((v) => v * 0.8) as Vec3, rimA = hex(SITE.cyan), rimB = hex(SITE.violet)
  const glowShrimp: Vec3 = [1, 0.42, 0.24], glowNow: Vec3 = [0, 0, 0]
  const noGlow: Vec3 = [0, 0, 0]
  function draw() {
    if (!R || alpha < 0.002 || (!phill && !shrimpModel)) return
    const s = w.s, dist = camDist(w)
    const f: CastFrame = {
      mvp: w.cam.mvp, eye: w.cam.eye, light: LIGHT, fogCol, fog: s.backdrop === 'void' ? 0 : s.fog, fogStart: dist + 3, fogEnd: dist + 26,
      shroom: w.shroomAmt, time: w.time, hue: s.hueSpeed, rimA, rimB,
    }
    R.begin(f)
    if (shrimpModel && shrimpWorld) {
      const a = shrimpModel
      for (const sh of shrimp) {
        if (!sh.on || sh.scale <= 0.01) continue
        // fade in and out at the ends of the pass, as well as with the resume
        const u = sh.t / sh.dur, edge = Math.min(1, u * 8, (1 - u) * 8)
        // with the music: it swells and glows with its slice of the spectrum, and kicks on the beat
        const lv = sh.level * params.shrimpPulse, kick = w.music.beat * w.danceMix * params.shrimpPulse
        for (let c = 0; c < 3; c++) glowNow[c] = glowShrimp[c] * (1 + 2.2 * lv)
        M4x.mulInto(model, placement(sh.pos, sh.rot, (sh.size / a.extent) * sh.scale * (1 + 0.18 * lv + 0.1 * kick), a.center), shrimpWorld)
        R.draw(a, model, null, {
          alpha: alpha * Math.max(0, edge), flash: sh.flash, rim: params.rim * 0.8, ambient: 0.7, glow: glowNow, fog: f.fog * 0.6,
          wave: sh.wave, waveAmp: 0.14 * params.shrimpWiggle * w.danceMix,
        })
      }
    }
    if (phill) {
      const p = phill, k = (drive ? drive.size : orbitSize()) / p.a.height, trip = drive?.trip ?? 0
      // a squash-and-stretch bounce on the beat, and the neon rim brightening with the bass; in the trip, rainbow
      const m = placement(p.pos, p.rot, k, p.a.center, 1 - 0.04 * p.pump, 1 + 0.08 * p.pump)
      R.draw(p.a, m, p.pose.joints, {
        alpha: drive?.flicker ? 0 : alpha, flash: p.flash, rim: params.rim * (1 + 1.2 * energy * params.pump),
        ambient: params.ambient, glow: trip > 0.01 ? hueRgb(w.time * 0.25, rainbow, 0.35 * trip) : noGlow,
      })
      // and his afterimages: his poses 0.13, 0.27 and 0.4 s ago, fading, each a hue further on
      if (trip > 0.01) {
        if (w.time - ghostLast >= 1 / 60 || w.time < ghostLast) { ghostLast = w.time; snapGhost(m, p.pose.joints) }
        for (let i = 0; i < GHOSTS; i++) {
          const back = (i + 1) * GHOST_STEP
          if (back >= ghostN) break
          const slot = (ghostHead - back + GHOST_SLOTS) % GHOST_SLOTS
          R.draw(p.a, ghostModel[slot], ghostJoints[slot], {
            alpha: alpha * 0.3 * trip * (1 - i * 0.25), flash: 0, rim: params.rim, ambient: params.ambient,
            glow: hueRgb(w.time * 0.25 + 0.2 * (i + 1), ghostGlow, 0.6),
          })
        }
      } else ghostN = 0
    }
    // Play mode's props, then its beams and the props' halos (no depth writes: last; the halos a little behind them)
    if (!props.length && !beams.length) return
    for (const pr of props) {
      if (pr.alpha <= 0.002 || pr.size <= 1e-4) continue
      const shrimp = pr.model === 'shrimp', a = shrimp ? shrimpModel : (pr.model as ActorModel)
      if (!a || (shrimp && !shrimpWorld)) continue
      const m = placement(pr.pos, pr.rot, pr.size / a.extent, pr.anchor === 'origin' ? origin : a.center, pr.sx ?? 1, pr.sy ?? 1)
      R.draw(a, shrimp ? M4x.mulInto(model, m, shrimpWorld!) : m, pr.joints ?? null, {
        alpha: alpha * pr.alpha, flash: pr.flash, rim: params.rim * (pr.rim ?? 0.8), ambient: pr.ambient ?? 0.7, glow: pr.glow, fog: 0,
      })
    }
    for (const b of beams) R.beam(b.top, b.len, b.rTop, b.rBot, b.alpha * alpha, w.time)
    const fwd = w.cam.fwd
    for (const pr of props) {
      if (!pr.halo || pr.alpha <= 0.002) continue
      for (let c = 0; c < 3; c++) tv[c] = pr.pos[c] + fwd[c] * 0.08
      R.halo(tv, pr.halo.size, pr.halo.color, pr.halo.alpha * pr.alpha * alpha, w.cam.right, w.cam.up)
    }
  }

  // ---- clicks ----
  /** The nearest body under the ray that the page doesn't hide. */
  function hit(ray: Ray): Body | null {
    if (alpha < 0.5) return null
    const e = ray.eye, d = ray.dir
    // the page (roughly its plane) hides anything behind it
    let tPage = Infinity
    if (Math.abs(d[2]) > 1e-4) {
      const tp = -e[2] / d[2], x = e[0] + d[0] * tp, y = e[1] + d[1] * tp
      if (tp > 0 && Math.abs(x) < w.pageW / 2 && Math.abs(y) < w.pageH / 2) tPage = tp
    }
    const cands: [Body, number][] = []
    if (phill && !phill.eaten && !drive) cands.push([phill, sizeNow() * 0.42 * phill.scale])
    for (const s of shrimp) if (s.on && !s.eaten) cands.push([s, s.size * 0.5])
    let best: Body | null = null, bt = Math.min(tPage, Infinity)
    for (const [b, r] of cands) {
      const cx = b.pos[0] - e[0], cy = b.pos[1] - e[1], cz = b.pos[2] - e[2], tc = cx * d[0] + cy * d[1] + cz * d[2]
      const d2 = cx * cx + cy * cy + cz * cz - tc * tc
      if (tc <= 0 || d2 > r * r) continue
      const t = tc - Math.sqrt(r * r - d2)
      if (t < bt) { bt = t; best = b }
    }
    return best
  }

  /**
   * A click that started on a body (picked at pointerdown, since it keeps moving): knock it
   * out into the nebula, away from the page rather than through it. Unless it has left the
   * stage since (eaten, or a shrimp whose pass ended).
   */
  function click(target: object, ray: Ray) {
    const b: Body | undefined = target === phill ? (drive ? undefined : phill) : shrimp.find((s) => s === target && s.on)
    if (!b || b.eaten) return
    const side = Math.abs(b.pos[0]) > 0.5 ? Math.sign(b.pos[0]) : rnd() < 0.5 ? -1 : 1
    knock(b, [side * 0.8 + ray.dir[0] * 0.3, b.pos[1] * 0.06 + 0.25, b.pos[2] > 0 ? 0.35 : -0.6])
  }

  /** Chaos: everyone flies. */
  function kickAll() {
    const bodies: Body[] = [...(phill && !drive ? [phill] : []), ...shrimp.filter((s) => s.on)]
    for (const b of bodies) knock(b, [b.pos[0] || rnd() - 0.5, b.pos[1] || rnd() - 0.5, 1], 0.9)
  }

  function dispose() {
    disposed = true
    R?.dispose()
    R = null
    phill = null
    shrimpModel = null
  }

  return {
    params,
    load,
    update,
    draw,
    /** Play mode's things on the page and the UFOs' beams (it fills and moves them; the cast draws them) */
    props,
    beams,
    /** upload a voxel mesh as a model for Play's props (null before the cast has loaded) */
    voxels: (v: VoxelMesh): ActorModel | null => (R ? R.addVoxels(v) : null),
    /** Play mode round 2's lasagna: fetch and upload it once (a step per frame); null if it fails (Play goes on without it) */
    loadLasagna: (nextTask: () => Promise<void>) => {
      lasagnaLoad ??= (async () => {
        const r = await fetch('/resume/lasagna.glb')
        if (!r.ok) throw new Error(`/resume/lasagna.glb: ${r.status}`)
        const buf = await r.arrayBuffer()
        await nextTask()
        if (disposed || !R) return null
        lasagna = await R.load(buf, nextTask)
        return lasagna
      })().catch((err) => { if (!disposed) console.warn('The lasagna failed to load', err); return null })
      return lasagnaLoad
    },
    lasagna: () => lasagna,
    /** a pose for a skinned model (its own clips, crossfades and the jump's hip clamp) */
    pose: (a: ActorModel, noLift: string[] = []) => new Pose(a.m, { noLift }),
    /** the body under the ray (Phill or a shrimp), if any */
    hit: (ray: Ray): object | null => hit(ray),
    click,
    kickAll,
    dispose,
    /** Phill's model and pose for Play mode (null until he's loaded) */
    rig: (): Rig | null => {
      if (!phill) return null
      if (!rigInfo) {
        // his foot joints' heights in the rest pose (where his soles are at the origin), and how high idle holds them
        const m = phill.a.m, rest = new Pose(m), idle = new Pose(m)
        idle.play(IDLE, 0)
        idle.update(0)
        const feet = (m.joints ?? []).filter((n) => /Foot|Toe/.test(m.nodes[n].name)).map((node) => ({ node, rest: rest.world[node * 16 + 13] }))
        const stand = feet.length ? Math.min(...feet.map((f) => idle.world[f.node * 16 + 13] - f.rest)) : 0
        rigInfo = { pose: phill.pose, height: phill.a.height, dims: phill.a.dims, feet, stand, dances: [...phill.dances] }
      }
      return rigInfo
    },
    /**
     * Play mode takes Phill (it moves, turns, sizes and poses him; the cast keeps drawing him, and
     * clicks, Chaos and the black hole leave him be), or hands him back (null): he drifts back to his orbit.
     */
    drive: (d: Drive | null, hop = false) => {
      if (!d && drive && phill) {
        phill.pose.play(IDLE, 0.3)
        if (hop) {
          // a hop up and back out toward his orbit (its spring takes him home), growing on the way
          const p = phill
          p.vel[0] = Math.sign(p.pos[0] || 1) * 2
          p.vel[1] = 5
          p.vel[2] = 2.5
          growFrom = drive.size
          growT = 0
        }
      }
      drive = d
    },
    /** where he is and how big (feet, yaw, height in units), for Play mode's entrance */
    place: (): Drive | null => {
      if (!phill) return null
      const p = phill, size = drive ? drive.size : orbitSize(), k = size / p.a.height, c = p.a.center
      const yaw = 2 * Math.atan2(p.rot[1], p.rot[3]), cy = Math.cos(yaw), sy = Math.sin(yaw)
      return { feet: [p.pos[0] - (c[0] * cy + c[2] * sy) * k, p.pos[1] - c[1] * k, p.pos[2] - (-c[0] * sy + c[2] * cy) * k], yaw, size }
    },
    /** dev: skip to the next dance */
    nextDance: () => { if (phill) nextDance(phill, 0.4) },
    /** dev: the state, for scripted checks */
    debug: () => ({ alpha, energy, phill, shrimp }),
  }
}

export type Cast = ReturnType<typeof createCast>
