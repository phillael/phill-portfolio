/**
 * Play mode round 2's hit boxes: 2D boxes on the page plane (world x, y), and whether two overlap.
 * Pure; Play and the round 2 props (UFOs, the lasagnas) test against them.
 */

export interface Box {
  x0: number
  x1: number
  y0: number
  y1: number
}

export const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1

/** his smash: in front of him (`reach` ahead, a little behind), from his knees to his chest (0.2…0.7 of his height) */
export const smashBox = (x: number, y: number, facing: number, size: number, reach: number): Box => ({
  x0: facing > 0 ? x - 0.05 : x - reach,
  x1: facing > 0 ? x + reach : x + 0.05,
  y0: y + size * 0.2,
  y1: y + size * 0.7,
})

/** the UFO: 0.42 wide and 0.21 tall from its bottom (bx: its middle, by: its bottom) */
export const ufoBox = (bx: number, by: number): Box => ({ x0: bx - 0.21, x1: bx + 0.21, y0: by, y1: by + 0.21 })

/** his body: ±0.1 around his feet, up to 0.46 */
export const bodyBox = (x: number, y: number): Box => ({ x0: x - 0.1, x1: x + 0.1, y0: y, y1: y + 0.46 })

/** the mushroom: ±0.13 around its feet, 0.28 tall */
export const mushroomBox = (x: number, y: number): Box => ({ x0: x - 0.13, x1: x + 0.13, y0: y, y1: y + 0.28 })
