/**
 * @jest-environment node
 *
 * The Relic Vault's sets (src/lib/vault/sets.ts) and CRT material (crt.ts), built in node (three makes geometry
 * without WebGL): every screen's centre at SCREEN_Y, nothing in front of any picture (the mockup's oval bug: a
 * cabinet face over the screen's corners), and the shader's uniforms all supplied.
 */

import * as THREE from 'three'
import type { ProjectTv } from '@/types/content'
import projectsData from '@/data/projects.json'
import { CRT, FRAG, IDLE, VERT, crtMaterial } from '@/lib/vault/crt'
import { R, SCREEN_Y, angleOf } from '@/lib/vault/math'
import { SETS, buildExhibit, createMaterials } from '@/lib/vault/sets'

const N = projectsData.length
const M = createMaterials()
const exhibits = projectsData.map((p, i) => ({ id: p.id, tv: p.tv as ProjectTv, ex: buildExhibit(p.tv as ProjectTv, i, N, M) }))

type Ex = (typeof exhibits)[number]['ex']

/**
 * A point on the screen's plane, `k` of the way from its centre to the picture's corner in the quadrant (su, sv).
 * The picture is a rounded rect (the shader's mask and the bezel's hole: radius uRound × h), so its corner is on
 * that arc, on the diagonal; past it the bezel's lip frames the glass on purpose.
 */
function onScreen(ex: Ex, su: number, sv: number, k: number, z = 0) {
  const { w, h, mat } = ex.scr
  const r = mat.uniforms.uRound.value * h
  const d = r * (1 - Math.SQRT1_2)
  return ex.scr.mesh.localToWorld(new THREE.Vector3(su * k * (w / 2 - d), sv * k * (h / 2 - d), z))
}

/** the first thing a ray from `from` toward `to` hits on the television */
function firstHit(ex: Ex, from: THREE.Vector3, to: THREE.Vector3) {
  const ray = new THREE.Raycaster(from, to.clone().sub(from).normalize())
  return ray.intersectObject(ex.tv, true)[0]?.object
}

const POINTS: [string, number, number, number][] = [
  ['the centre', 1, 1, 0],
  ['90 % toward the top left corner', -1, 1, 0.9],
  ['90 % toward the top right corner', 1, 1, 0.9],
  ['90 % toward the bottom right corner', 1, -1, 0.9],
  ['90 % toward the bottom left corner', -1, -1, 0.9],
]

describe('the six sets', () => {
  it('builds one for each kind of television, and the projects use each once', () => {
    expect(Object.keys(SETS).sort()).toEqual(['console', 'pocket', 'portable', 'sphere', 'terminal', 'tube'])
    expect(new Set(exhibits.map((e) => e.tv)).size).toBe(6)
  })

  it.each(exhibits.map((e) => [e.id, e] as const))('%s: the screen’s centre is at SCREEN_Y on its plinth', (_, { ex }) => {
    const c = ex.scr.mesh.getWorldPosition(new THREE.Vector3())
    expect(Math.abs(c.y - SCREEN_Y)).toBeLessThanOrEqual(0.001)
    expect(ex.plinthH).toBeGreaterThan(0.2)
  })

  it.each(exhibits.map((e) => [e.id, e] as const))('%s: stands on the arc, facing the hall’s centre', (_, { ex }) => {
    expect(Math.hypot(ex.root.position.x, ex.root.position.z)).toBeCloseTo(R, 9)
    const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(ex.root.quaternion)
    const toCentre = ex.root.position.clone().negate().normalize()
    expect(facing.dot(toCentre)).toBeCloseTo(1, 9)
  })

  describe.each(exhibits.map((e) => [e.id, e] as const))('%s: nothing covers the picture', (_, { ex }) => {
    const hitsScreen = (o: THREE.Object3D | undefined) => o === ex.scr.mesh || o === ex.scr.glass

    it.each(POINTS)('from 5 units straight in front, at %s', (_, su, sv, k) => {
      expect(hitsScreen(firstHit(ex, onScreen(ex, su, sv, k, 5), onScreen(ex, su, sv, k)))).toBe(true)
    })

    it.each(POINTS)('from the camera with the set in front (wide and phone), at %s', (_, su, sv, k) => {
      const i = exhibits.findIndex((e) => e.ex === ex)
      const a = angleOf(i, N)
      for (const [camD, y] of [
        [4.4, 1.74],
        [3.55, 1.62],
      ]) {
        const r = R - camD
        const cam = new THREE.Vector3(r * Math.sin(a), y, -r * Math.cos(a))
        expect(hitsScreen(firstHit(ex, cam, onScreen(ex, su, sv, k)))).toBe(true)
      }
    })
  })
})

describe('the CRT material', () => {
  const declared = (src: string) =>
    [...src.matchAll(/^\s*uniform\s+\w+\s+([^;]+);/gm)].flatMap((m) => m[1].split(',').map((s) => s.trim()))

  it('supplies every uniform the shader declares, and nothing else', () => {
    const mat = crtMaterial(4 / 3, 0.06)
    const names = declared(FRAG).concat(declared(VERT))
    expect(names).toHaveLength(18)
    expect(Object.keys(mat.uniforms).sort()).toEqual(names.sort())
    for (const k of names) expect(mat.uniforms[k as keyof typeof mat.uniforms].value).toBeDefined()
  })

  it('resolves its include from this three', () => {
    const includes = [...FRAG.matchAll(/#include <(\w+)>/g)].map((m) => m[1])
    expect(includes).toEqual(['colorspace_fragment'])
    includes.forEach((k) => expect(THREE.ShaderChunk[k as keyof typeof THREE.ShaderChunk]).toBeDefined())
  })

  it('starts idle (Static) with the Classic CRT', () => {
    const u = crtMaterial(4 / 3, 0.06).uniforms
    expect([u.uOpenX.value, u.uOpenY.value, u.uBright.value, u.uStatic.value]).toEqual([IDLE.open, IDLE.open, IDLE.bright, IDLE.stat])
    expect([u.uCurv.value, u.uScan.value, u.uMask.value, u.uBleed.value, u.uWobble.value]).toEqual([0.11, 0.5, 0.22, 1, 0])
    expect(CRT).toEqual({ curv: 0.11, scan: 0.5, mask: 0.22, bleed: 1, wobble: 0 })
    expect(IDLE).toEqual({ open: 1, bright: 0.3, stat: 0.85 })
  })
})
