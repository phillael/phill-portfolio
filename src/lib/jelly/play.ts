/**
 * Play mode (the Career Climb): Phill runs and jumps up his own resume, Mario style. Every
 * line is a one-way platform (platforms.ts); he lands only while falling with his feet above
 * it, ↓ drops through, and the words give under him like jelly. Its own chunk: the engine
 * imports it on the first Play. Each frame it reads the keys (a plain object the HUD writes;
 * never React state), moves and poses him (the cast keeps drawing him), pushes the jelly and
 * steers the camera.
 */

import type { Cast, Drive } from './cast'
import { resetView, type UiInsets } from './camera'
import { FOV, LOOSE, PAD_X, ZMAX, ZMIN, type PlayConfig } from './config'
import { buildLevel, solid, surfaceAt, type Level, type Surface } from './platforms'
import type { World } from './world'

export interface PlayInput {
  left: boolean
  right: boolean
  jump: boolean
  down: boolean
  smash: boolean
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
}

export type PlayEvent = { type: 'enter' } | { type: 'exit' } | { type: 'jump' } | { type: 'land'; line: number; speed: number }

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

export function createPlay({ w, cast, params: P, input, canvas, ui, emit }: PlayContext) {
  const level: Level = buildLevel(w)
  const rig = cast.rig()
  if (!rig) throw new Error('Play mode needs Phill')
  const { pose } = rig
  const ground: Surface = { y: 0, z: 0, body: -1, line: -1 }
  const probe: Surface = { y: 0, z: 0, body: -1, line: -1 }
  const drive: Drive = { feet: [0, 0, 0], yaw: Math.PI / 2, size: P.size }
  let on = false
  let x = 0, y = 0, z = 0, vx = 0, vy = 0, grounded = false, facing = 1, yaw = Math.PI / 2
  let coyoteT = 0, bufferT = 0, dropT = 0, dropLine = -1, jumpY = 0, cut = false, landT = 1, prevJump = false, prevDown = false
  let lead = 0, anchorY = 0, camX = 0, camY = 0

  const foot = () => P.size * 0.12
  const halfDepth = () => (Math.max(rig.dims[0], rig.dims[2]) / 2) * (P.size / rig.height)

  /** the highest surface under his feet at or below maxY, skipping the line he's dropping through */
  function find(maxY: number, out: Surface) {
    if (!surfaceAt(w, level, x, foot(), maxY, out)) return false
    if (dropT > 0 && out.line === dropLine) return surfaceAt(w, level, x, foot(), out.y - 1e-3, out) && out.line !== dropLine
    return true
  }

  function place(line: number, at: number) {
    const l = level.lines[line]
    x = at
    y = l.inkTop + 0.02
    vx = vy = 0
    grounded = false
    if (find(y, ground)) { y = ground.y; grounded = true }
    anchorY = y
  }

  /** the start: the left end of the bottom line's longest stretch without a pit (a gap his foot can't bridge) */
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
    place(level.start, startX())
    facing = 1
    yaw = facing * (Math.PI / 2 - P.face)
    z = (grounded ? ground.z : 0.012) + halfDepth() + 0.03
    coyoteT = bufferT = dropT = 0
    landT = 1
    prevJump = input.jump
    prevDown = input.down
    lead = facing * P.lookAhead
    camX = x + lead
    camY = anchorY
    w.finger.active = false
    pose.play('idle', 0.2)
    cast.drive(sync())
    emit({ type: 'enter' })
  }

  function exit() {
    if (!on) return
    on = false
    cast.drive(null)
    resetView(w)
    input.left = input.right = input.jump = input.down = input.smash = false
    emit({ type: 'exit' })
  }

  function sync() {
    // he stands in front of the page, and the camera looks down a little: lift him by that parallax so his feet sit on the ink
    drive.feet[0] = x
    drive.feet[1] = y + (z - (grounded ? ground.z : z - halfDepth() - 0.03)) * Math.sin(w.s.tilt)
    drive.feet[2] = z
    drive.yaw = yaw
    drive.size = P.size
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

  // ---- his pose ----
  function animate(dt: number) {
    const v0 = (2 * P.jumpHeight) / P.apexTime
    if (!grounded) {
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
    } else {
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
    lead += (facing * P.lookAhead - lead) * Math.min(1, dt * 2.5)
    const halfH = w.cam.halfH
    if (grounded) anchorY = y
    else if (y < camY - halfH * 0.75 || y + P.size > camY + halfH * 0.85) anchorY = y // he's leaving the view: follow him directly
    // a bit above him (more to see up the climb); on a phone, clear of the pads
    const bias = halfH * (w.low ? 0.15 : 0.25)
    camX = x + lead
    camY += (anchorY + bias - camY) * Math.min(1, dt * 4)
    w.cam.scrollX = camX
    w.cam.scrollY = camY
    w.cam.mom = null
    w.s.tilt = P.tilt
    w.s.yaw += (P.lean * facing * Math.min(1, Math.abs(vx) / P.runSpeed) - w.s.yaw) * Math.min(1, dt * 3)
  }

  function update(dt: number) {
    if (!on || dt <= 0) return
    const g = (2 * P.jumpHeight) / (P.apexTime * P.apexTime), v0 = (2 * P.jumpHeight) / P.apexTime
    const jumpPressed = input.jump && !prevJump, downPressed = input.down && !prevDown
    prevJump = input.jump
    prevDown = input.down
    bufferT = jumpPressed ? P.buffer : Math.max(0, bufferT - dt)
    coyoteT = grounded ? P.coyote : Math.max(0, coyoteT - dt)
    dropT = Math.max(0, dropT - dt)
    landT += dt

    // run: accelerate toward the held direction, brake without one (less control in the air)
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0)
    if (dir) facing = dir
    const ctl = grounded ? 1 : P.air
    const rate = (dir ? (vx * dir < 0 ? P.decel + P.accel : P.accel) : P.decel) * ctl
    const tv = dir * P.runSpeed
    vx = vx < tv ? Math.min(tv, vx + rate * dt) : Math.max(tv, vx - rate * dt)

    // ↓ standing: drop through the line; jump (buffered, with coyote time after a ledge)
    if (downPressed && grounded) {
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
    if (!grounded && vy > 0 && !input.jump && !cut) {
      cut = true
      vy = Math.min(vy, Math.max(Math.sqrt(2 * g * Math.max(0, P.tapHeight - (y - jumpY))), vy * 0.5))
    }
    if (!grounded) vy = Math.max(-P.maxFall, vy - g * (vy < 0 ? P.fallMul : 1) * dt)

    const prevY = y
    x += vx * dt
    y += vy * dt

    if (grounded) {
      // ride the (wobbling, dancing) line; walk off its end and fall
      if (find(y + STEP_UP, probe) && probe.y >= y - STEP_DOWN) { y = probe.y; Object.assign(ground, probe) }
      else { grounded = false; coyoteT = P.coyote; vy = 0; ground.body = ground.line = -1 }
    } else if (vy <= 0 && find(prevY + 1e-3, probe) && y <= probe.y) {
      // one-way: land only falling, with the feet above the surface last step
      const speed = -vy
      y = probe.y
      vy = 0
      grounded = true
      landT = 0
      Object.assign(ground, probe)
      press(ground.line, Math.min(1.4, P.squash * speed), foot() + 0.25)
      emit({ type: 'land', line: ground.line, speed })
      if (bufferT > 0) { vy = v0; jumpY = y; cut = false; grounded = false; bufferT = 0; emit({ type: 'jump' }) }
    }
    if (!grounded) { ground.body = -1; ground.line = -1 }
    // (falling off the page: T5 makes it a flail and a respawn at the last checkpoint)
    if (y < w.pageBottom - 3) place(level.start, startX())

    if (grounded) press(ground.line, P.weight * 4 * dt, foot() + 0.15)
    wake(dt)

    const ty = facing * (Math.PI / 2 - P.face)
    yaw += Math.max(-TURN * dt, Math.min(TURN * dt, ty - yaw))
    const zt = (grounded ? ground.z : w.bend.at(x, y) + 0.012) + halfDepth() + 0.03
    z += (zt - z) * Math.min(1, dt * 12)
    animate(dt)
    frame(dt)
    sync()
  }

  const state = (): PlayState => ({ x, y, z, vx, vy, grounded, facing, line: grounded ? ground.line : -1, clip: pose.clip })

  return {
    level,
    enter,
    exit,
    update,
    state,
    isOn: () => on,
    /** dev: put him on a line (index into level.lines) at x */
    place: (line: number, at: number) => { if (on) place(line, at) },
  }
}

export type Play = ReturnType<typeof createPlay>
