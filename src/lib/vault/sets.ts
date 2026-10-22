/**
 * The Relic Vault's six televisions and their plinths, ported 1:1 from the mockup. Each set is built in code; its
 * screen unit's back sits on its cabinet's face, with the face's rim under the bezel's lip, so no cabinet covers the
 * picture (the mockup's oval bug). The plinth is cut so every screen's centre is at SCREEN_Y. No DOM here: the
 * textures drawn in code come in from hall.ts, so src/__tests__/vault-sets.test.ts builds the sets in node.
 */

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { ProjectTv } from '@/types/content'
import { crtMaterial, type CrtMaterial } from './crt'
import { R, SCREEN_Y, angleOf } from './math'

export type SetTextures = {
  wood?: THREE.Texture
  grille?: THREE.Texture
  keys?: THREE.Texture
  blob?: THREE.Texture
  env?: THREE.Texture
}

export function createMaterials(t: SetTextures = {}) {
  const M = {
    black: new THREE.MeshPhysicalMaterial({ color: 0x111316, roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.22 }),
    bezel: new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.5 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe4eaee, roughness: 0.16, metalness: 1 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.28, metalness: 1 }),
    wood: new THREE.MeshStandardMaterial({ map: t.wood ?? null, roughness: 0.5 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x2c1709, roughness: 0.55 }),
    panel: new THREE.MeshStandardMaterial({ color: 0x1c140e, roughness: 0.6 }),
    beige: new THREE.MeshStandardMaterial({ color: 0xd9cfb4, roughness: 0.62 }),
    beigeDark: new THREE.MeshStandardMaterial({ color: 0xbcb092, roughness: 0.66 }),
    white: new THREE.MeshPhysicalMaterial({ color: 0xc4c4be, roughness: 0.4, clearcoat: 0.55, clearcoatRoughness: 0.15 }),
    red: new THREE.MeshPhysicalMaterial({ color: 0xc8352a, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.15 }),
    gun: new THREE.MeshStandardMaterial({ color: 0x41474e, roughness: 0.36, metalness: 0.75 }),
    grille: new THREE.MeshStandardMaterial({ map: t.grille ?? null, roughness: 0.85 }),
    keys: new THREE.MeshStandardMaterial({ map: t.keys ?? null, roughness: 0.6 }),
    acrylic: new THREE.MeshPhysicalMaterial({ color: 0xdff4ff, roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false }),
    led: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 2.2, 0.6) }),
    plinth: new THREE.MeshStandardMaterial({ color: 0x1b2328, roughness: 0.32, metalness: 0.35 }),
    blob: new THREE.MeshBasicMaterial({ map: t.blob ?? null, transparent: true, depthWrite: false }),
    // CRT glass: only its reflections, added over the picture
    glass: new THREE.MeshBasicMaterial({
      color: 0x000000,
      combine: THREE.AddOperation,
      reflectivity: 0.09,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      envMap: t.env ?? null,
    }),
  }
  return M
}
export type Mats = ReturnType<typeof createMaterials>

export type Screen = { mesh: THREE.Mesh<THREE.PlaneGeometry, CrtMaterial>; glass: THREE.Mesh; mat: CrtMaterial; w: number; h: number }
type Built = { g: THREE.Group; scr: Screen }

/* ---------- geometry helpers ---------- */
const box = (w: number, h: number, d: number, r: number, mat: THREE.Material) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat)
const cyl = (rt: number, rb: number, h: number, mat: THREE.Material, seg = 32) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat)
const plane = (w: number, h: number, mat: THREE.Material) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): T {
  o.position.set(x, y, z)
  o.rotation.set(rx, ry, rz)
  return o
}
function rr<T extends THREE.Path>(w: number, h: number, r: number, s: T): T {
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}
function bezel(w: number, h: number, bw: number, rIn: number, depth: number, mat: THREE.Material) {
  const s = rr(w + 2 * bw, h + 2 * bw, rIn + bw * 0.8, new THREE.Shape())
  s.holes.push(rr(w, h, rIn, new THREE.Path()))
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 3, curveSegments: 10 })
  g.translate(0, 0, 0.01) // its back on the mount, its lip at depth + 0.02
  return new THREE.Mesh(g, mat)
}

type UnitOpts = { w: number; h: number; round?: number; bulge?: number; bw?: number; depth?: number; mat?: THREE.Material }
/** a curved CRT face in a bezel; the unit's back is at z 0 (put it on the cabinet's face) */
function screenUnit(M: Mats, { w, h, round = 0.06, bulge = 0.035, bw = 0.04, depth = 0.04, mat = M.bezel }: UnitOpts): Built {
  const g = new THREE.Group()
  const geo = new THREE.PlaneGeometry(w, h, 32, 24)
  const pos = geo.attributes.position
  for (let k = 0; k < pos.count; k++) {
    const nx = pos.getX(k) / (w / 2)
    const ny = pos.getY(k) / (h / 2)
    pos.setZ(k, bulge * (1 - nx * nx) * (1 - ny * ny))
  }
  geo.computeVertexNormals()
  const crt = crtMaterial(w / h, round)
  const z = bw > 0 ? depth + 0.008 : 0.004 // the face's rim sits under the bezel's lip; its bulge comes out past it
  const mesh = at(new THREE.Mesh(geo, crt), 0, 0, z)
  const glass = at(new THREE.Mesh(geo, M.glass), 0, 0, z + 0.002)
  glass.renderOrder = 2
  g.add(mesh, glass)
  if (bw > 0) g.add(bezel(w, h, bw, round * h, depth, mat))
  return { g, scr: { mesh, glass, mat: crt, w, h } }
}
function knob(M: Mats, r = 0.06) {
  const g = new THREE.Group()
  g.add(at(cyl(r, r * 1.06, 0.035, M.chrome), 0, 0, 0.018, Math.PI / 2))
  g.add(at(cyl(r * 0.7, r * 0.74, 0.05, M.black), 0, 0, 0.045, Math.PI / 2))
  g.add(at(box(r * 0.16, r * 0.9, 0.012, 0.004, M.chrome), 0, r * 0.25, 0.072))
  return g
}

/* ---------- the sets ---------- */
export const SETS: Record<ProjectTv, (M: Mats) => Built> = {
  // Number Slayers: a black tube set, c. 1994
  tube(M) {
    const g = new THREE.Group()
    g.add(at(box(0.86, 0.06, 0.66, 0.02, M.black), 0, 0.03, -0.04))
    g.add(at(box(1.32, 1.04, 0.62, 0.05, M.black), 0, 0.6, 0))
    g.add(at(box(1.0, 0.82, 0.52, 0.12, M.black), 0, 0.64, -0.5))
    const { g: su, scr } = screenUnit(M, { w: 0.98, h: 0.735, round: 0.05, bulge: 0.03, bw: 0.03, depth: 0.025 })
    g.add(at(su, 0, 0.66, 0.312))
    g.add(at(box(0.32, 0.02, 0.012, 0.005, M.chrome), 0, 0.17, 0.312))
    g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.01, 12, 8), M.led), 0.54, 0.17, 0.312))
    for (let k = 0; k < 4; k++) g.add(at(box(0.05, 0.022, 0.015, 0.006, M.bezel), 0.26 + k * 0.065, 0.17, 0.31))
    return { g, scr }
  },
  // Pong: a wood console set, c. 1974
  console(M) {
    const g = new THREE.Group()
    for (const [x, z] of [
      [-0.64, 0.28],
      [0.64, 0.28],
      [-0.64, -0.28],
      [0.64, -0.28],
    ])
      g.add(at(cyl(0.03, 0.018, 0.36, M.woodDark, 12), x, 0.17, z, z > 0 ? 0.14 : -0.14, 0, x > 0 ? -0.12 : 0.12))
    g.add(at(box(1.6, 1.0, 0.82, 0.05, M.wood), 0, 0.84, 0))
    g.add(at(box(1.48, 0.88, 0.03, 0.02, M.panel), 0, 0.84, 0.4))
    const { g: su, scr } = screenUnit(M, { w: 0.84, h: 0.63, round: 0.11, bulge: 0.05, bw: 0.045, depth: 0.03, mat: M.brass })
    g.add(at(su, -0.27, 0.86, 0.415))
    g.add(at(plane(0.34, 0.34, M.grille), 0.46, 0.74, 0.418))
    g.add(at(knob(M, 0.06), 0.37, 1.08, 0.415))
    g.add(at(knob(M, 0.06), 0.55, 1.08, 0.415))
    g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.black), 0.3, 1.34, -0.08))
    for (const s of [-1, 1]) {
      const L = 0.82
      const a = 0.46
      g.add(at(cyl(0.006, 0.007, L, M.chrome, 8), 0.3 + (s * Math.sin(a) * L) / 2, 1.38 + (Math.cos(a) * L) / 2, -0.08, 0, 0, -s * a))
      g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), M.chrome), 0.3 + s * Math.sin(a) * L, 1.38 + Math.cos(a) * L, -0.08))
    }
    return { g, scr }
  },
  // Jelly Resume: a space helmet set, c. 1970
  sphere(M) {
    const g = new THREE.Group()
    g.add(at(cyl(0.3, 0.32, 0.05, M.white, 48), 0, 0.025, 0))
    g.add(at(cyl(0.035, 0.045, 0.3, M.chrome, 16), 0, 0.2, 0))
    const cap = 0.8 // the shell's opening at the front
    const shell = at(new THREE.Mesh(new THREE.SphereGeometry(0.5, 64, 48, 0, Math.PI * 2, cap, Math.PI - cap), M.white), 0, 0.82, 0, Math.PI / 2)
    g.add(shell)
    const fz = 0.5 * Math.cos(cap)
    g.add(at(cyl(0.362, 0.362, 0.05, M.black, 64), 0, 0.82, fz - 0.02, Math.PI / 2))
    const { g: su, scr } = screenUnit(M, { w: 0.46, h: 0.355, round: 0.17, bulge: 0.03, bw: 0.022, depth: 0.02 })
    g.add(at(su, 0, 0.83, fz + 0.005))
    g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 10, 28), M.chrome), 0, 1.36, 0))
    return { g, scr }
  },
  // Rezmancer: a beige office terminal, c. 1984
  terminal(M) {
    const g = new THREE.Group()
    g.add(at(box(0.8, 1.02, 0.78, 0.06, M.beige), 0, 0.53, -0.16))
    g.add(at(box(0.66, 0.54, 0.03, 0.03, M.beigeDark), 0, 0.71, 0.23))
    const { g: su, scr } = screenUnit(M, { w: 0.5, h: 0.375, round: 0.07, bulge: 0.03, bw: 0.03, depth: 0.025 })
    g.add(at(su, 0, 0.71, 0.245))
    g.add(at(box(0.24, 0.016, 0.02, 0.005, M.black), 0.14, 0.3, 0.235))
    for (let k = 0; k < 5; k++) g.add(at(box(0.012, 0.18, 0.01, 0.004, M.beigeDark), -0.3 + k * 0.03, 0.26, 0.235))
    g.add(at(box(0.74, 0.045, 0.27, 0.015, M.beige), 0, 0.028, 0.5, 0.06))
    g.add(at(plane(0.68, 0.22, M.keys), 0, 0.053, 0.5, -Math.PI / 2 + 0.06))
    return { g, scr }
  },
  // Quadzilla: a pocket television, c. 1982 (a tall screen, for the phone video)
  pocket(M) {
    const g = new THREE.Group()
    const dev = new THREE.Group()
    dev.add(box(0.46, 0.84, 0.12, 0.035, M.gun))
    const { g: su, scr } = screenUnit(M, { w: 0.34, h: 0.56, round: 0.06, bulge: 0.015, bw: 0.022, depth: 0.012 })
    dev.add(at(su, 0, 0.09, 0.062))
    dev.add(at(plane(0.24, 0.1, M.grille), 0, -0.31, 0.061))
    dev.add(at(knob(M, 0.035), 0.235, 0.22, 0, 0, Math.PI / 2))
    let y = 0.42
    let r = 0.011
    for (const L of [0.28, 0.26, 0.22]) {
      dev.add(at(cyl(r * 0.9, r, L, M.chrome, 10), -0.17 - Math.sin(0.28) * (y - 0.42 + L / 2), y + (Math.cos(0.28) * L) / 2, -0.02, 0, 0, 0.28))
      y += Math.cos(0.28) * L
      r *= 0.75
    }
    dev.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), M.chrome), -0.17 - Math.sin(0.28) * (y - 0.42), y, -0.02))
    at(dev, 0, 0.5, 0, -0.12)
    g.add(dev)
    g.add(at(box(0.4, 0.05, 0.24, 0.012, M.acrylic), 0, 0.025, 0.02))
    g.add(at(box(0.32, 0.72, 0.015, 0.006, M.acrylic), 0, 0.4, -0.12, -0.2))
    g.scale.setScalar(1.3)
    return { g, scr }
  },
  // Pickleball 2079: a portable colour set, c. 1986
  portable(M) {
    const g = new THREE.Group()
    for (const x of [-0.4, 0.4]) for (const z of [-0.2, 0.2]) g.add(at(cyl(0.03, 0.03, 0.03, M.black, 12), x, 0.015, z))
    g.add(at(box(1.06, 0.8, 0.64, 0.07, M.red), 0, 0.43, 0))
    const { g: su, scr } = screenUnit(M, { w: 0.6, h: 0.45, round: 0.08, bulge: 0.03, bw: 0.045, depth: 0.025, mat: M.black })
    g.add(at(su, -0.16, 0.46, 0.322))
    g.add(at(plane(0.22, 0.3, M.grille), 0.34, 0.53, 0.321))
    g.add(at(knob(M, 0.04), 0.28, 0.21, 0.32))
    g.add(at(knob(M, 0.04), 0.4, 0.21, 0.32))
    g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.022, 12, 40, Math.PI), M.black), 0, 0.84, 0))
    for (const x of [-0.3, 0.3]) g.add(at(box(0.07, 0.06, 0.1, 0.015, M.black), x, 0.85, 0))
    return { g, scr }
  },
}

export type Exhibit = {
  root: THREE.Group
  /** the television (on its plinth) */
  tv: THREE.Group
  scr: Screen
  ringMat: THREE.MeshBasicMaterial
  spot: THREE.SpotLight
  /** an invisible box to click */
  hit: THREE.Mesh
  /** the plinth's height */
  plinthH: number
}

/** set i of n on its lit plinth, on the arc, facing the hall's centre */
export function buildExhibit(tvKind: ProjectTv, i: number, n: number, M: Mats): Exhibit {
  const root = new THREE.Group()
  const a = angleOf(i, n)
  root.position.set(R * Math.sin(a), 0, -R * Math.cos(a))
  root.rotation.y = -a
  const tv = SETS[tvKind](M)
  root.add(tv.g)
  root.updateMatrixWorld(true)
  const sp = new THREE.Vector3()
  tv.scr.mesh.getWorldPosition(sp)
  const h = SCREEN_Y - sp.y // the plinth makes up the difference
  tv.g.position.y = h
  const plinth = at(cyl(0.8, 0.84, h, M.plinth, 64), 0, h / 2, 0)
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.8, 1) })
  const ring = at(new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.005, 6, 96), ringMat), 0, h, 0, Math.PI / 2)
  const size = new THREE.Box3().setFromObject(tv.g).getSize(new THREE.Vector3())
  const blob = at(plane(size.x * 1.25, size.z * 1.4, M.blob), 0, h + 0.002, 0, -Math.PI / 2)
  root.add(plinth, ring, blob)
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(size.x, 1), h + size.y, Math.max(size.z, 0.8)),
    new THREE.MeshBasicMaterial({ visible: false }),
  )
  hit.position.set(0, (h + size.y) / 2, 0)
  hit.userData.i = i
  root.add(hit)
  const spot = new THREE.SpotLight(0xe6f7ff, 0, 0, 0.42, 0.9, 2)
  spot.position.set(0, 4.6, 1.9)
  const tgt = new THREE.Object3D()
  tgt.position.set(0, SCREEN_Y - 0.35, 0)
  root.add(spot, tgt)
  spot.target = tgt
  root.updateMatrixWorld(true)
  return { root, tv: tv.g, scr: tv.scr, ringMat, spot, hit, plinthH: h }
}
