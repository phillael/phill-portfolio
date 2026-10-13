/**
 * The entrance galaxy: a two-armed spiral of stardust behind the page. Each spark has a
 * slot (radius, starting angle on one of the arms, depth jitter) and orbits it.
 */

export function galaxySlots(n: number, rand: () => number) {
  const g = new Float32Array(n * 3), gauss = () => (rand() + rand() + rand() - 1.5) * 0.8
  for (let k = 0; k < n; k++) {
    const r = 3.2 + 11 * rand() ** 1.4
    g[k * 3] = r
    g[k * 3 + 1] = (k % 2) * Math.PI + r * 0.42 + gauss() * (0.25 + 0.04 * r)
    g[k * 3 + 2] = gauss() * 0.8
  }
  return g
}

/** Where slot k sits at time t (the galaxy follows the camera's height). */
export function galaxyAt(gal: Float32Array, k: number, t: number, camY: number, out: number[]) {
  const r = gal[k * 3], a = gal[k * 3 + 1] + (t * 0.75) / Math.sqrt(r / 4), z = gal[k * 3 + 2]
  out[0] = Math.cos(a) * r
  out[1] = Math.sin(a) * r * 0.55 + camY
  out[2] = -3.5 + Math.sin(a) * r * 0.35 + z
}
