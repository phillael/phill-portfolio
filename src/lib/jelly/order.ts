/**
 * Reading order, for the hero → page handoff: the hero sparks and the resume's glyph
 * sparks are each ranked top to bottom (in 48 bands), then left to right, and glyph
 * spark k takes over the hero spark of the same rank, so the photo's top becomes the
 * page's header.
 */

export const BANDS = 48

/** The sort key for a point at (u, v) in [0, 1): its band from the top, then across. */
export const bandKey = (u: number, v: number, bands = BANDS) => Math.floor(v * bands) + u

/** Indices sorted by their keys. */
export const orderByKey = (key: Float32Array) => Int32Array.from({ length: key.length }, (_, i) => i).sort((a, b) => key[a] - key[b])

/** Rank-for-rank pairing: for each page spark, the hero spark it takes over. */
export function handoffMap(pageOrder: Int32Array, heroOrder: Int32Array): Int32Array {
  const N = pageOrder.length, H = heroOrder.length, heroFor = new Int32Array(N)
  for (let r = 0; r < N; r++) heroFor[pageOrder[r]] = heroOrder[Math.min(H - 1, Math.floor((r * H) / N))]
  return heroFor
}
