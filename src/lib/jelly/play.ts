/**
 * Play mode: Phill runs, jumps and smashes his way down his own resume, Mario style, from his
 * name to the bottom line (you read it walking down it). Every line is a one-way platform
 * (platforms.ts); he lands only while falling with his feet above it, ↓ drops through, and the
 * words give under him like jelly. The rules (clock, coins, checkpoints, best) are playRun.ts.
 * Its own chunk: the engine imports it on the first Play. Each frame it reads the keys (a plain
 * object the HUD writes; never React state), moves and poses him (the cast keeps drawing him),
 * pushes the jelly and steers the camera.
 */

import type { Cast, Drive } from './cast'
import { resetView, type UiInsets } from './camera'
import { FOV, LOOSE, PAD_X, ZMAX, ZMIN, type PlayConfig } from './config'
import type { Vec3 } from './math'
import { burst, healAll } from './physics'
import { buildLevel, solid, surfaceAt, type Level, type Surface } from './platforms'
import { bestStore, createRun, type RunResult } from './playRun'
import { bilerp, hidden, type World } from './world'

export interface PlayInput {
  left: boolean
  right: boolean
  jump: boolean
  down: boolean
  smash: boolean
  /** presses since Play's last frame: a tap shorter than a frame still counts */
  pressed: Set<'jump' | 'down' | 'smash'>
}

export interface PlayState {
  /** his feet (world units) and velocity */
  x: number
  y: number
  z: number
  vx: number
  vy: number
  grounded: boolean
  /** 1: facing right, -1: left */
  facing: number
  /** the line he stands on (-1 in the air) */
  line: number
  clip: string | null
  smashing: boolean
  pounding: boolean
  /** flailing off the page (he comes back at the last checkpoint) */
  falling: boolean
  /** diving in from his orbit (the entrance) */
  entering: boolean
  /** the last checkpoint reached (index into level.checkpoints; -1: none yet) */
  checkpoint: number
  /** the clock (ms; it starts on the first move), the coins collected of the total, the finish, the best time (ms) */
  timeMs: number
  started: boolean
  coins: number
  total: number
  finished: boolean
  bestMs: number | null
}

export type PlayEvent =
  | { type: 'enter' }
  | { type: 'exit' }
  | { type: 'jump' }
  | { type: 'land'; line: number; speed: number }
  /** words burst by a smash or a ground-pound (and which of them were coins) */
  | { type: 'smash'; bodies: number[]; coins: number[]; pound: boolean }
  /** off the page: the flail; then back in at the checkpoint (-1: the start) */
  | { type: 'fall' }
  | { type: 'respawn'; checkpoint: number }
  /** the first move: the clock starts */
  | { type: 'start' }
  /** a coin collected: where it was (world), and the count */
  | { type: 'coin'; body: number; at: Vec3; coins: number; total: number }
  /** a checkpoint reached: its line and where its title ends (world, on the ink: the flag's spot) */
  | { type: 'checkpoint'; index: number; year: number; title: string; line: number; at: Vec3 }
  /** the bottom line: the run's over */
  | { type: 'finish'; result: RunResult }
  /** Play again: back on the name, the clock and coins reset */
  | { type: 'again' }

export interface PlayContext {
  w: World
  cast: Cast
  params: PlayConfig
  input: PlayInput
  canvas: HTMLCanvasElement
  ui: UiInsets
  emit: (e: PlayEvent) => void
}

/** how far up a wobbling surface can rise and still carry him, and how far down it can sink */
const STEP_UP = 0.06
const STEP_DOWN = 0.1
/** the jump clip's frames: lift-off, the apex, coming down, and the landing crouch and recovery */
const JUMP_RISE = 0.58
const JUMP_APEX = 0.8
const JUMP_FALL = 1.1
const LAND_FROM = 1.2
const LAND_TO = 1.62
const LAND_DUR = 0.22
/** his turn speed (rad/s): a flip in ~0.1 s */
const TURN = 25
/** the smash plays the attack clip's strike window in this long (s) */
const SMASH_DUR = 0.3
/** the flail off the page, before he drops back in (s), and how high above the line he drops from */
const FLAIL = 1
const DROP_IN = 0.9
/** the camera shake's decay (s) */
const SHAKE = 0.3
/** a reached checkpoint's title glows this long (s); the finish's sparks fly this long (s) */
const LIT = 1.6
const FIREWORK = 1.8
/** the entrance: his dive from his orbit onto the name, and the camera's ease from the whole page (s) */
const INTRO = 0.8

export function createPlay({ w, cast, params: P, input, canvas, ui, emit }: PlayContext) {
  const level: Level = buildLevel(w)
  const found = cast.rig()
  if (!found) throw new Error('Play mode needs Phill')
  const rig = found
  const { pose } = rig
  const ground: Surface = { y: 0, z: 0, body: -1, line: -1 }
  const probe: Surface = { y: 0, z: 0, body: -1, line: -1 }
  const drive: Drive = { feet: [0, 0, 0], yaw: Math.PI / 2, size: P.size }
  let on = false
  let x = 0, y = 0, z = 0, vx = 0, vy = 0, grounded = false, facing = 1, yaw = Math.PI / 2
  let coyoteT = 0, bufferT = 0, dropT = 0, dropLine = -1, jumpY = 0, cut = false, landT = 1, prevJump = false, prevDown = false
  let lead = 0, anchorY = 0, camX = 0, camY = 0
  /** dropping back in after a fall: only this line (or one below it) catches him */
  let spawnLine = -1
  let prevSmash = false, smashT = -1, smashCd = 0, struck = false, hitStopT = 0, shakeT = 0, shakeClock = 0, shakePh = 0
  let pounding = false, splat = false, flailT = -1
  /** standing still with the music on: after `idleDance` s he dances (one from his rotation, until any input) */
  let stillT = 0, idleDance = ''
  /** how high his soles are above his model's origin now (model units): the planted foot stands on the line */
  let sole = rig.stand
  const coinSet = new Set(level.coins)
  const run = createRun(level, bestStore())
  /** lit checkpoint titles fading back (their bodies, seconds left) */
  const lits: { bodies: number[]; t: number }[] = []
  /** the finish's sparks in flight, and how long they've flown */
  const fw: number[] = []
  let fwT = 0
  const tmp = [0, 0, 0]
  /** the entrance: where he dove from (feet, yaw, size), how far along it is (s), and the camera it eases from */
  let introT = INTRO, from: Drive = { feet: [0, 0, 0], yaw: 0, size: P.size }
  const cam0 = { zoom: 1, x: 0, y: 0, tilt: 0, yaw: 0 }
  const arc: Vec3 = [0, 0, 0]

  const foot = () => P.size * 0.12
  const halfDepth = () => (Math.max(rig.dims[0], rig.dims[2]) / 2) * (P.size / rig.height)

  /** the highest surface under his feet at or below maxY, skipping the line he's dropping through (and, dropping back in, the lines above his checkpoint) */
  function find(maxY: number, out: Surface) {
    let found = surfaceAt(w, level, x, foot(), maxY, out)
    while (found && ((dropT > 0 && out.line === dropLine) || out.line < spawnLine)) found = surfaceAt(w, level, x, foot(), out.y - 1e-3, out)
    return found
  }

  function place(line: number, at: number) {
    const l = level.lines[line]
    x = at
    y = l.inkTop + 0.02
    vx = vy = 0
    grounded = false
    pounding = false
    smashT = -1
    flailT = -1
    spawnLine = -1
    if (find(y, ground)) { y = ground.y; grounded = true }
    anchorY = y
  }

  /** a line's left end (where a checkpoint's job title starts) */
  const lineStart = (line: number) => w.bodies[level.lines[line].bodies[0]].x0 + PAD_X + 0.25

  /** the start: the left end of the top line's longest stretch without a pit (a gap his foot can't bridge) */
  function startX() {
    const bodies = level.lines[level.start].bodies.map((bi) => w.bodies[bi])
    let a = 0, best = [0, 0]
    for (let i = 1; i <= bodies.length; i++) {
      if (i < bodies.length && bodies[i].x0 - bodies[i - 1].x1 + 2 * PAD_X <= 2 * foot()) continue
      if (bodies[i - 1].x1 - bodies[a].x0 > bodies[best[1]].x1 - bodies[best[0]].x0) best = [a, i - 1]
      a = i
    }
    return bodies[best[0]].x0 + PAD_X + 0.25
  }

  function enter() {
    if (on) return
    on = true
    // the entrance: he dives from wherever he is (in his orbit, knocked away, spat out) onto the name, shrinking
    const was = cast.place()
    if (was) {
      from = { feet: [...was.feet], yaw: was.yaw, size: was.size }
      introT = 0
    } else introT = INTRO
    cam0.zoom = w.cam.zoom ?? w.s.zoom
    cam0.x = w.cam.x ?? w.cam.scrollX
    cam0.y = w.cam.y ?? 0
    cam0.tilt = w.s.tilt
    cam0.yaw = w.s.yaw
    place(level.start, startX())
    facing = 1
    yaw = facing * (Math.PI / 2 - P.face)
    z = (grounded ? ground.z : 0.012) + halfDepth() + 0.03
    coyoteT = bufferT = dropT = 0
    landT = 1
    prevJump = input.jump
    prevDown = input.down
    prevSmash = input.smash
    smashCd = hitStopT = shakeT = 0
    splat = false
    sole = rig.stand
    startRun()
    lead = facing * P.lookAhead
    camX = x + lead
    camY = anchorY
    w.finger.active = false
    pose.play('idle', 0.2)
    cast.drive(sync())
    emit({ type: 'enter' })
  }

  /** a fresh run: the clock and coins reset, the coins glowing, nothing lit */
  function startRun() {
    run.reset()
    for (const bi of level.coins) w.bodies[bi].coinT = 1
    for (const l of lits) for (const bi of l.bodies) w.bodies[bi].litT = 0
    lits.length = 0
    for (const bi of level.lines[level.finish].bodies) w.bodies[bi].litT = 0
    stopFireworks()
  }

  /** Leave Play: he hops back out to his orbit, growing (instant: the resume is closing, no hop) */
  function exit(instant = false) {
    if (!on) return
    on = false
    w.cam.shake.x = w.cam.shake.y = 0
    for (const bd of w.bodies) bd.coinT = bd.litT = 0
    lits.length = 0
    stopFireworks()
    cast.drive(null, !instant)
    resetView(w)
    input.left = input.right = input.jump = input.down = input.smash = false
    input.pressed.clear()
    emit({ type: 'exit' })
  }

  function sync() {
    // his soles on the text (sunk in a little). He stands in front of the page, so draw his feet where the camera's
    // line of sight through that spot on the page meets his depth (else they look above or below the ink)
    const zs = grounded ? ground.z : z - halfDepth() - 0.03, eye = w.cam.eye, ys = y - P.sink
    const k = Math.abs(zs - eye[2]) > 1e-3 ? (z - eye[2]) / (zs - eye[2]) : 1
    drive.feet[0] = x
    drive.feet[1] = eye[1] + (ys - eye[1]) * k - sole * (P.size / rig.height)
    drive.feet[2] = z
    drive.yaw = yaw
    drive.size = P.size
    if (introT < INTRO) {
      // diving in: along an arc from where he was (up and out in front of the page, then down onto the name), shrinking
      const u = introT / INTRO, t = Math.pow(u, 1.3), e = u * u * (3 - 2 * u)
      for (let a = 0; a < 3; a++) {
        // (it swings out in front of the page, so a dive from behind it is seen)
        const p0 = from.feet[a], p2 = drive.feet[a], p1 = a === 1 ? Math.max(p0, p2) + 1.2 : a === 2 ? Math.max(p0, p2) + 2.5 : (p0 + p2) / 2
        arc[a] = (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2
      }
      drive.feet[0] = arc[0]
      drive.feet[1] = arc[1]
      drive.feet[2] = arc[2]
      let dy = yaw - from.yaw
      dy = Math.atan2(Math.sin(dy), Math.cos(dy))
      drive.yaw = from.yaw + dy * e
      drive.size = Math.exp(Math.log(Math.max(1e-3, from.size)) + (Math.log(P.size) - Math.log(Math.max(1e-3, from.size))) * e)
    }
    return drive
  }

  // ---- the jelly: the words give under him ----
  const near = (i: number, half: number) => { const d = Math.abs(w.pos[i * 3] - x); return d < half ? (1 - d / half) ** 2 : 0 }

  /** a push down on the top rows of the line under his feet (k: velocity change in units/s at his feet) */
  function press(line: number, k: number, half: number) {
    for (const bi of level.lines[line].bodies) {
      const bd = w.bodies[bi]
      if (!solid(bd) || bd.x1 < x - half || bd.x0 > x + half) continue
      for (let j = 0; j < 2; j++) for (let i = 0; i < bd.cols; i++) {
        const p = bd.p0 + j * bd.cols + i, f = near(p, half)
        if (f) w.vel[p * 3 + 1] -= k * f * (j ? 0.5 : 1)
      }
    }
  }

  /** words he passes through get nudged along with him; loose ones get shoved out of his way */
  function wake(dt: number) {
    const half = P.size * 0.3, top = y + P.size, spd = Math.hypot(vx, vy)
    level.lines.forEach((line, li) => {
      if (li === ground.line || line.inkTop < y - 0.25 || line.bottom > top + 0.1) return
      for (const bi of line.bodies) {
        const bd = w.bodies[bi]
        if (bd.x1 < x - half || bd.x0 > x + half) continue
        const loose = bd.state === LOOSE
        if (!loose && (!solid(bd) || spd < 0.5)) continue
        for (let p = bd.p0; p < bd.p1; p++) {
          const o = p * 3, py = w.pos[o + 1]
          if (py < y || py > top) continue
          const f = near(p, half)
          if (!f) continue
          if (loose) {
            w.vel[o] += (Math.sign(w.pos[o] - x || 1) * 12 + vx * 2) * f * dt
            w.vel[o + 1] += (vy * 2 + 2) * f * dt
          } else {
            w.vel[o] += vx * P.wake * f * dt
            w.vel[o + 1] += vy * P.wake * 2.5 * f * dt
          }
        }
      }
    })
  }

  // ---- smashing ----
  /**
   * The words in front of him, from his knees to his chest (about two lines), `reach` ahead: each
   * gets a kick his way, then bursts (so its sparks spray the way he swings; the shockwave
   * loosens the neighbors). `pound`: the solid words under his feet, kicked down.
   */
  function smashWords(pound: boolean, line = -1) {
    const x0 = pound ? x - foot() - 0.1 : facing > 0 ? x - 0.05 : x - P.reach
    const x1 = pound ? x + foot() + 0.1 : facing > 0 ? x + P.reach : x + 0.05
    const y0 = y + P.size * 0.2, y1 = y + P.size * 0.7
    const hit: number[] = []
    level.lines.forEach((l, li) => {
      if (pound ? li !== line : l.inkTop < y0 - 0.3 || l.bottom > y1 + 0.3) return
      for (const bi of l.bodies) {
        const bd = w.bodies[bi]
        if (hidden(bd) || (pound && !solid(bd)) || bd.x1 < x0 - 0.6 || bd.x0 > x1 + 0.6) continue
        // where its ink is now: its home box moved by how far its lattice has moved
        let dx = 0, dy = 0
        for (let p = bd.p0; p < bd.p1; p++) { dx += w.pos[p * 3] - w.home[p * 3]; dy += w.pos[p * 3 + 1] - w.home[p * 3 + 1] }
        dx /= bd.p1 - bd.p0
        dy /= bd.p1 - bd.p0
        const l0 = bd.x0 + PAD_X + dx, r0 = bd.x1 - PAD_X + dx, top = l.inkTop + dy, bot = l.bottom + dy
        if (r0 < x0 || l0 > x1) continue
        if (!pound && Math.min(top, y1) - Math.max(bot, y0) < 0.4 * (top - bot)) continue
        hit.push(bi)
      }
    })
    for (const bi of hit) {
      const bd = w.bodies[bi]
      if (run.collect(bi)) {
        // a coin: counted, and it re-forms plain
        bd.coinT = 0
        let cx = 0, cy = 0, cz = 0
        for (let p = bd.p0; p < bd.p1; p++) { cx += w.pos[p * 3]; cy += w.pos[p * 3 + 1]; cz += w.pos[p * 3 + 2] }
        const n = bd.p1 - bd.p0
        emit({ type: 'coin', body: bi, at: [cx / n, cy / n, cz / n], coins: run.coins, total: run.total })
      }
      for (let p = bd.p0; p < bd.p1; p++) {
        const o = p * 3
        if (pound) { w.vel[o + 1] -= 3; w.vel[o + 2] += 0.5 }
        else { w.vel[o] += facing * 4.5; w.vel[o + 1] += 1.2; w.vel[o + 2] += 0.8 }
      }
      burst(w, bd)
    }
    if (hit.length) {
      hitStopT = P.hitStop
      shakeT = SHAKE
      shakePh = Math.random() * 100
    }
    emit({ type: 'smash', bodies: hit, coins: hit.filter((bi) => coinSet.has(bi)), pound })
  }

  // ---- falling off the page ----
  /** knocked out into the nebula: a pop up and away, spinning, in the knock clip's flail (the camera holds) */
  function startFlail() {
    flailT = 0
    pounding = false
    smashT = -1
    grounded = false
    ground.body = ground.line = -1
    vy = 3.5
    vx = (Math.abs(x) > w.pageW / 2 ? Math.sign(x) : facing) * 2.5
    pose.play('die', 0.08, false)
    emit({ type: 'fall' })
  }

  /** back in at the last checkpoint (or the start), dropping onto its line with a splat */
  function respawn() {
    const cp = run.checkpoint, line = cp >= 0 ? level.checkpoints[cp].line : level.start
    place(line, cp >= 0 ? lineStart(line) : startX())
    spawnLine = line
    y = level.lines[line].inkTop + DROP_IN
    grounded = false
    ground.body = ground.line = -1
    facing = 1
    yaw = facing * (Math.PI / 2 - P.face)
    anchorY = level.lines[line].inkTop
    splat = true
    emit({ type: 'respawn', checkpoint: cp })
  }

  // ---- checkpoints and the finish ----
  /** a checkpoint reached: its title glows a moment; the HUD plants a flag where it ends */
  function reached(index: number) {
    const cp = level.checkpoints[index], l = level.lines[cp.line], bodies = l.bodies.slice(0, cp.title.split(' ').length)
    for (const bi of bodies) w.bodies[bi].litT = 1
    lits.push({ bodies, t: LIT })
    const last = w.bodies[bodies[bodies.length - 1]]
    emit({ type: 'checkpoint', index, year: cp.year, title: cp.title, line: cp.line, at: [last.x1 - PAD_X, l.inkTop, w.pos[last.p0 * 3 + 2]] })
  }

  /** the bottom line: the clock stops, the line lights up, its sparks fire up, he dances; Play input stops */
  let finishDance = 'dance'
  function finishRun() {
    const result = run.finish()
    if (!result) return
    for (const bi of level.lines[level.finish].bodies) w.bodies[bi].litT = 1
    fireworks(level.finish)
    finishDance = rig.dances.length ? rig.dances[Math.floor(Math.random() * rig.dances.length)] : 'idle'
    smashT = -1
    emit({ type: 'finish', result })
  }

  /** the line's words stay lit and solid while copies of their sparks fly up (their sparks are free while they're home) */
  function fireworks(line: number) {
    stopFireworks()
    for (const bi of level.lines[line].bodies) {
      const bd = w.bodies[bi]
      if (hidden(bd)) continue
      for (let k = bd.pt0; k < bd.pt0 + bd.ptN; k++) {
        const o = k * 3
        bilerp(w.pos, bd, w.ptLu[k], w.ptLv[k], tmp)
        const v = [(Math.random() - 0.5) * 2.4, 3 + Math.random() * 5, 0.6 + Math.random() * 1.6]
        for (let a = 0; a < 3; a++) {
          w.ptPos[o + a] = w.ptPrev[o + a] = tmp[a]
          w.ptVel[o + a] = w.ptSV[o + a] = v[a]
          w.ptTail[o + a] = tmp[a]
        }
        w.ptAlpha[k] = 1
        w.ptAge[k] = 0
        fw.push(k)
      }
    }
    fwT = 0
  }

  function stepFireworks(dt: number) {
    if (!fw.length) return
    fwT += dt
    const alpha = 1 - fwT / FIREWORK, drag = Math.max(0, 1 - 0.8 * dt), T = 0.05 * w.s.trail
    for (const k of fw) {
      const o = k * 3
      w.ptVel[o + 1] -= 3.5 * dt
      for (let a = 0; a < 3; a++) {
        w.ptVel[o + a] *= drag
        w.ptPos[o + a] += w.ptVel[o + a] * dt
        w.ptSV[o + a] = w.ptVel[o + a]
        w.ptTail[o + a] = w.ptPos[o + a] - w.ptVel[o + a] * T
        w.ptPrev[o + a] = w.ptPos[o + a]
      }
      w.ptAge[k] += dt
      w.ptAlpha[k] = Math.max(0, alpha)
    }
    if (fwT >= FIREWORK) stopFireworks()
  }

  function stopFireworks() {
    for (const k of fw) w.ptAlpha[k] = 0
    fw.length = 0
  }

  /** Play again: the page heals, the clock and coins reset, and he drops back onto the name */
  function again() {
    if (!on) return
    healAll(w)
    startRun()
    place(level.start, startX())
    spawnLine = level.start
    y = level.lines[level.start].inkTop + DROP_IN
    grounded = false
    ground.body = ground.line = -1
    facing = 1
    yaw = facing * (Math.PI / 2 - P.face)
    anchorY = level.lines[level.start].inkTop
    splat = true
    pose.play('idle', 0.2)
    emit({ type: 'again' })
  }

  // ---- his pose ----
  function animate(dt: number) {
    const v0 = (2 * P.jumpHeight) / P.apexTime
    if (run.finished && grounded) {
      pose.play(finishDance, 0.3)
      pose.update(dt)
    } else if (smashT >= 0) {
      // the attack clip's strike window, played fast
      const [a, b] = P.strike
      pose.play('attack', 0.05)
      pose.seek(a + (b - a) * Math.min(1, smashT / SMASH_DUR))
      pose.update(dt, 0)
    } else if (pounding) {
      pose.play('jumping', 0.06) // tucked
      pose.seek(JUMP_APEX)
      pose.update(dt, 0)
    } else if (!grounded) {
      // the jump clip, scrubbed by the jump (the wind-up is skipped: he leaves the ground the frame you press)
      const t = vy > 0 ? JUMP_RISE + (JUMP_APEX - JUMP_RISE) * Math.min(1, 1 - vy / v0) : JUMP_APEX + (JUMP_FALL - JUMP_APEX) * Math.min(1, -vy / (0.8 * v0))
      pose.play('jumping', 0.08)
      pose.seek(t)
      pose.update(dt, 0)
    } else if (landT < LAND_DUR && Math.abs(vx) < 0.3 * P.runSpeed) {
      pose.play('jumping', 0.05)
      pose.seek(LAND_FROM + (LAND_TO - LAND_FROM) * (landT / LAND_DUR))
      pose.update(dt, 0)
    } else if (Math.abs(vx) > 0.05) {
      pose.play('walk', 0.12)
      pose.update(dt, P.runRate * Math.max(0.35, Math.abs(vx) / P.runSpeed))
    } else if (stillT > P.idleDance && w.danceMix > 0.5 && rig.dances.length) {
      idleDance ||= rig.dances[Math.floor(Math.random() * rig.dances.length)]
      pose.play(idleDance, 0.4)
      pose.update(dt)
    } else {
      idleDance = ''
      pose.play('idle', 0.2)
      pose.update(dt)
    }
  }

  // ---- the camera: Phill ~pxDesktop/pxPhone tall, leading the way he faces, moving up a line when he lands on it ----
  function frame(dt: number) {
    const H = canvas.clientHeight || 1, asp = canvas.width / Math.max(1, canvas.height), tf = Math.tan(FOV / 2)
    const px = w.low ? P.pxPhone : P.pxDesktop
    const fitW = (w.pageW / 2 + 0.35) / (tf * asp), fitH = (w.pageH / 2 + 0.25) / (tf * Math.max(0.3, 1 - ui.top - ui.bot))
    const dist = (P.size * H) / (2 * tf * px) + z // (he stands z in front of the page, a little nearer the camera)
    w.s.zoom = Math.max(ZMIN, Math.min(ZMAX, dist / Math.max(fitW, fitH)))
    const halfH = w.cam.halfH
    if (flailT < 0) {
      // (flailing off the page, the camera holds)
      lead += (facing * P.lookAhead - lead) * Math.min(1, dt * 2.5)
      if (grounded) anchorY = y
      else if (y < camY - halfH * 0.75 || y + P.size > camY + halfH * 0.85) anchorY = y // he's leaving the view: follow him directly
      camX = x + lead
    }
    // a bit below him: you read the resume walking down it (and on a phone he stays in the upper part, clear of the pads)
    camY += (anchorY - halfH * 0.25 - camY) * Math.min(1, dt * 4)
    w.cam.scrollX = camX
    w.cam.scrollY = camY
    w.cam.mom = null
    if (introT < INTRO) {
      // the entrance: from the whole-page view to the play view, as he dives
      const u = introT / INTRO, e = u * u * (3 - 2 * u)
      w.s.zoom = Math.exp(Math.log(cam0.zoom) + (Math.log(w.s.zoom) - Math.log(cam0.zoom)) * e)
      w.cam.scrollX = cam0.x + (camX - cam0.x) * e
      w.cam.scrollY = cam0.y + (camY - cam0.y) * e
      w.s.tilt = cam0.tilt + (P.tilt - cam0.tilt) * e
      w.s.yaw = cam0.yaw * (1 - e)
      return
    }
    // a smash shakes it: a jolt that rings out (straight onto the camera, past its easing), and a little tilt and turn
    shakeT = Math.max(0, shakeT - dt)
    shakeClock += dt
    const e = shakeT / SHAKE, amp = P.shake * e * e, t = shakeClock * 6.283, ph = shakePh
    w.cam.shake.x = amp * (0.65 * Math.sin(t * 17 + ph) + 0.35 * Math.sin(t * 29 + 2 * ph))
    w.cam.shake.y = amp * (0.65 * Math.cos(t * 19 + ph) + 0.35 * Math.sin(t * 31 + 3 * ph))
    w.s.tilt = P.tilt + amp * 0.12 * Math.sin(t * 13 + ph)
    w.s.yaw += (P.lean * facing * Math.min(1, Math.abs(vx) / P.runSpeed) + amp * 0.12 * Math.sin(t * 11 + 2 * ph) - w.s.yaw) * Math.min(1, dt * 3)
  }

  function update(dt: number) {
    if (!on || dt <= 0) return
    const g = (2 * P.jumpHeight) / (P.apexTime * P.apexTime), v0 = (2 * P.jumpHeight) / P.apexTime
    if (introT < INTRO) {
      // the entrance (no control yet): the dive clip's fall frames, then a jelly splat on the name
      introT += dt
      pose.play('jumping', 0.1)
      pose.seek(JUMP_APEX + (JUMP_FALL - JUMP_APEX) * Math.min(1, introT / INTRO))
      pose.update(dt, 0)
      if (introT >= INTRO) {
        press(level.start, 2, foot() + 0.5)
        landT = 0
        prevJump = input.jump
        prevDown = input.down
        prevSmash = input.smash
        input.pressed.clear()
        emit({ type: 'land', line: level.start, speed: 6 })
      }
      frame(dt)
      sync()
      return
    }
    // the clock (it runs through hit-stops and falls), the glowing titles fading back, the finish's sparks
    run.tick(dt)
    for (let i = lits.length - 1; i >= 0; i--) {
      if ((lits[i].t -= dt) > 0) continue
      for (const bi of lits[i].bodies) w.bodies[bi].litT = run.finished && level.lineOf[bi] === level.finish ? 1 : 0
      lits.splice(i, 1)
    }
    stepFireworks(dt)
    // a smash's hit-stop: he and his pose hold for a moment (the sparks and the camera don't)
    if (hitStopT > 0) {
      hitStopT -= dt
      frame(dt)
      sync()
      return
    }
    if (flailT >= 0) {
      // off the page: the knock clip's flail, tumbling away, then back in at the last checkpoint
      flailT += dt
      vy -= 0.35 * g * dt
      x += vx * dt
      y += vy * dt
      yaw += 9 * dt
      pose.update(dt)
      frame(dt)
      if (flailT >= FLAIL) respawn()
      sync()
      return
    }
    const tap = input.pressed, live = !run.finished // (after the finish, Play input stops)
    if (!run.started && (input.left || input.right || input.jump || input.down || input.smash || tap.size)) {
      run.begin() // the first move starts the clock
      emit({ type: 'start' })
    }
    // any input (or moving, or the air) wakes him from an idle dance
    stillT = input.left || input.right || input.jump || input.down || input.smash || tap.size || !grounded || smashT >= 0 ? 0 : stillT + dt
    const jumpPressed = live && ((input.jump && !prevJump) || tap.has('jump')), downPressed = live && ((input.down && !prevDown) || tap.has('down'))
    const smashPressed = live && ((input.smash && !prevSmash) || tap.has('smash'))
    tap.clear()
    prevJump = input.jump
    prevDown = input.down
    prevSmash = input.smash
    smashCd = Math.max(0, smashCd - dt)
    if (smashPressed && smashCd <= 0) {
      smashT = 0
      struck = false
      smashCd = P.smashCooldown
    }
    if (smashT >= 0) {
      smashT += dt
      const [a, b] = P.strike
      if (!struck && smashT >= ((P.hit - a) / Math.max(1e-3, b - a)) * SMASH_DUR) { struck = true; smashWords(false) }
      if (smashT >= SMASH_DUR) smashT = -1
    }
    bufferT = jumpPressed ? P.buffer : Math.max(0, bufferT - dt)
    coyoteT = grounded ? P.coyote : Math.max(0, coyoteT - dt)
    dropT = Math.max(0, dropT - dt)
    landT += dt

    // run: accelerate toward the held direction, brake without one (less control in the air; none in a ground-pound)
    const dir = pounding || !live ? 0 : (input.right ? 1 : 0) - (input.left ? 1 : 0)
    if (dir) facing = dir
    const ctl = pounding ? 100 : grounded ? 1 : P.air
    const rate = (dir ? (vx * dir < 0 ? P.decel + P.accel : P.accel) : P.decel) * ctl
    const tv = dir * P.runSpeed
    vx = vx < tv ? Math.min(tv, vx + rate * dt) : Math.max(tv, vx - rate * dt)

    // ↓ in the air: a ground-pound. Standing: drop through the line; jump (buffered, with coyote time after a ledge)
    if (downPressed && !grounded && !pounding) {
      pounding = true
      vy = -P.poundSpeed
    } else if (downPressed && grounded) {
      dropLine = ground.line
      dropT = P.dropTime
      grounded = false
      coyoteT = 0
      vy = Math.min(vy, -0.5)
    } else if (bufferT > 0 && (grounded || coyoteT > 0)) {
      vy = v0
      jumpY = y
      cut = false
      grounded = false
      coyoteT = bufferT = 0
      emit({ type: 'jump' })
    }
    // let go early: a lower jump (the tapped apex)
    if (!grounded && vy > 0 && (!input.jump || !live) && !cut) {
      cut = true
      vy = Math.min(vy, Math.max(Math.sqrt(2 * g * Math.max(0, P.tapHeight - (y - jumpY))), vy * 0.5))
    }
    if (pounding) vy = -P.poundSpeed
    else if (!grounded) vy = Math.max(-P.maxFall, vy - g * (vy < 0 ? P.fallMul : 1) * dt)

    const prevY = y
    x += vx * dt
    y += vy * dt

    if (grounded) {
      // ride the (wobbling, dancing) line; walk off its end and fall
      if (find(y + STEP_UP, probe) && probe.y >= y - STEP_DOWN) { y = probe.y; Object.assign(ground, probe) }
      else { grounded = false; coyoteT = P.coyote; vy = 0; ground.body = ground.line = -1 }
    } else if (vy <= 0 && find(prevY + 1e-3, probe) && y <= probe.y) {
      if (pounding) {
        // a ground-pound bursts the words it hits and keeps going, through that line
        pounding = false
        dropLine = probe.line
        dropT = P.dropTime
        y = probe.y
        smashWords(true, probe.line)
        vy = -Math.min(P.poundSpeed, P.maxFall)
      } else {
        // one-way: land only falling, with the feet above the surface last step
        const speed = -vy
        y = probe.y
        vy = 0
        grounded = true
        landT = 0
        Object.assign(ground, probe)
        press(ground.line, Math.min(splat ? 2 : 1.4, P.squash * speed * (splat ? 2 : 1)), foot() + (splat ? 0.45 : 0.25))
        splat = false
        spawnLine = -1
        emit({ type: 'land', line: ground.line, speed })
        if (bufferT > 0) { vy = v0; jumpY = y; cut = false; grounded = false; bufferT = 0; emit({ type: 'jump' }) }
      }
    }
    if (!grounded) { ground.body = -1; ground.line = -1 }
    // the checkpoints he's reached (standing on a line at or below theirs), and the bottom line: the finish
    if (grounded) {
      for (const cp of run.reach(ground.line)) reached(level.checkpoints.indexOf(cp))
      if (ground.line === level.finish) finishRun()
    }
    // off the paper's edge, or below the page: the void
    if (Math.abs(x) > w.pageW / 2 + 0.1 || y < w.pageBottom - 0.2) {
      startFlail()
      frame(dt)
      sync()
      return
    }

    if (grounded) press(ground.line, P.weight * 4 * dt, foot() + 0.15)
    wake(dt)

    const ty = facing * (Math.PI / 2 - P.face)
    yaw += Math.max(-TURN * dt, Math.min(TURN * dt, ty - yaw))
    const zt = (grounded ? ground.z : w.bend.at(x, y) + 0.012) + halfDepth() + 0.03
    z += (zt - z) * Math.min(1, dt * 12)
    animate(dt)
    // his planted foot on the line: the lowest foot joint against its rest height (in the air: idle's stance)
    let s0 = rig.stand
    if (grounded && rig.feet.length) {
      s0 = Infinity
      for (const f of rig.feet) s0 = Math.min(s0, pose.world[f.node * 16 + 13] - f.rest)
    }
    sole += (s0 - sole) * Math.min(1, dt * 30)
    frame(dt)
    sync()
  }

  const state = (): PlayState => ({
    x, y, z, vx, vy, grounded, facing, line: grounded ? ground.line : -1, clip: pose.clip,
    smashing: smashT >= 0, pounding, falling: flailT >= 0, entering: introT < INTRO, checkpoint: run.checkpoint,
    timeMs: run.timeMs, started: run.started, coins: run.coins, total: run.total, finished: run.finished, bestMs: run.best(),
  })

  return {
    level,
    enter,
    exit,
    update,
    state,
    isOn: () => on,
    again,
    /** dev: put him on a line (index into level.lines) at x */
    place: (line: number, at: number) => { if (on) place(line, at) },
  }
}

export type Play = ReturnType<typeof createPlay>
