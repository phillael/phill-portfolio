/**
 * Play mode's level, read off the resume itself: every visual line is a one-way (jump-through)
 * platform, standing on its tallest glyphs (a word's box includes line-height padding, so
 * standing on the box would float him). The climb starts on the lowest line and ends on the
 * name; the dated job lines are its checkpoints and the Finder's Impact numbers its coins.
 * Pure functions over the world's bodies (no GL).
 */

import { HOME, PAD_X, RETURN } from './config'
import { findMatches } from './finder'
import { bilerp, type Body, type World } from './world'

export interface PlayLine {
  /** its words (body indexes), left to right */
  bodies: number[]
  /** the boxes' bottom (world y, at home) */
  bottom: number
  /** the tallest glyphs' top (world y, at home): where his feet go */
  inkTop: number
  /** the ends of its ink (world x, at home) */
  x0: number
  x1: number
  /** a right-aligned date range's start year (0: none), and the line's words minus the date */
  year: number
  title: string
}

export interface Checkpoint {
  line: number
  year: number
  title: string
}

export interface Level {
  /** top to bottom (reading order) */
  lines: PlayLine[]
  /** per body: its line, and its line's ink top as a lattice v (0 the top row … 1 the bottom row) */
  lineOf: Int32Array
  inkV: Float32Array
  /** the lowest line (the climb starts here) and the name (the summit) */
  start: number
  summit: number
  /** in climbing order (bottom up), each year later than the last */
  checkpoints: Checkpoint[]
  /** the Impact numbers (body indexes) */
  coins: number[]
}

export interface Surface {
  y: number
  z: number
  body: number
  line: number
}

/** words one line apart differ by 16 px or more; within a line by at most 1 px */
const SAME_LINE = 0.04
/** how far a line's words can sit above their home (dancing, wobbling) */
const SLACK = 0.5
const MONTH = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\.?$/i
const YEAR = /^(19|20)\d\d$/
const DATE_WORD = (t: string) => MONTH.test(t) || YEAR.test(t) || /^[–—-]$/.test(t) || /^present$/i.test(t)

/** Only words at home, or springing back at half strength or more, hold him up. */
export const solid = (bd: Body) => bd.state === HOME || (bd.state === RETURN && bd.strength >= 0.5)

/** A word's ink top as a lattice v, from its glyph samples (the sparks); null if it has none. */
export function sparkInkV(w: World, bi: number): number | null {
  const bd = w.bodies[bi]
  if (!bd.ptN) return null
  let v = 1
  for (let k = bd.pt0; k < bd.pt0 + bd.ptN; k++) v = Math.min(v, w.ptLv[k])
  return v
}

/** The level from the world's bodies (built, at home). `inkV`: each word's ink top as a lattice v (default: its sparks). */
export function buildLevel(w: World, inkV: (bi: number) => number | null = (bi) => sparkInkV(w, bi)): Level {
  const n = w.bodies.length
  const bottom = (bd: Body) => w.pageH / 2 + bd.b.line.top - bd.b.line.lh
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => bottom(w.bodies[b]) - bottom(w.bodies[a]))
  const groups: number[][] = []
  for (const bi of order) {
    const g = groups[groups.length - 1]
    if (g && bottom(w.bodies[g[0]]) - bottom(w.bodies[bi]) <= SAME_LINE) g.push(bi)
    else groups.push([bi])
  }
  const lineOf = new Int32Array(n), inkVOut = new Float32Array(n)
  const lines = groups.map((g, li): PlayLine => {
    g.sort((a, b) => w.bodies[a].x0 - w.bodies[b].x0)
    let inkTop = -Infinity, bot = Infinity
    for (const bi of g) {
      const bd = w.bodies[bi], v = inkV(bi)
      bot = Math.min(bot, bottom(bd))
      if (v != null) inkTop = Math.max(inkTop, bd.yTop - v * (bd.yTop - bd.yBot))
      lineOf[bi] = li
    }
    if (!Number.isFinite(inkTop)) inkTop = Math.max(...g.map((bi) => w.bodies[bi].yTop))
    for (const bi of g) { const bd = w.bodies[bi]; inkVOut[bi] = (bd.yTop - inkTop) / (bd.yTop - bd.yBot) }
    // a right-aligned date range: the run of month/year/dash/Present words at the end of the line
    const text = g.map((bi) => w.bodies[bi].b.text)
    let k = text.length
    while (k > 0 && DATE_WORD(text[k - 1])) k--
    const date = text.slice(k), first = date.find((t) => YEAR.test(t))
    const year = k > 0 && first ? +first : 0
    return {
      bodies: g, bottom: bot, inkTop,
      x0: w.bodies[g[0]].x0 + PAD_X, x1: w.bodies[g[g.length - 1]].x1 - PAD_X,
      year, title: (year ? text.slice(0, k) : text).join(' '),
    }
  })
  const checkpoints: Checkpoint[] = []
  for (let li = lines.length - 1; li >= 0; li--) {
    const l = lines[li]
    if (l.year && l.year > (checkpoints[checkpoints.length - 1]?.year ?? 0)) checkpoints.push({ line: li, year: l.year, title: l.title })
  }
  const hit = findMatches(w.bodies.map((bd) => ({ text: bd.b.text, tok: bd.tok, parts: bd.parts })), 'Impact')
  const coins: number[] = []
  hit.forEach((h, bi) => { if (h) coins.push(bi) })
  return { lines, lineOf, inkV: inkVOut, start: lines.length - 1, summit: 0, checkpoints, coins }
}

const at = [0, 0, 0]

/**
 * The highest solid surface under a foot span [x − f, x + f] at or below maxY (one-way
 * platforms: whatever is above his feet doesn't count), following the words' current
 * lattices (they wobble, dance and ride the bending paper). False if there's none.
 */
export function surfaceAt(w: World, lv: Level, x: number, f: number, maxY: number, out: Surface): boolean {
  let found = false
  for (let li = 0; li < lv.lines.length; li++) {
    const line = lv.lines[li]
    if (line.inkTop - SLACK > maxY) continue // all of it above his feet
    if (found && line.inkTop + SLACK < out.y) break // nothing lower can beat what's found
    if (line.x1 < x - f || line.x0 > x + f) continue
    for (const bi of line.bodies) {
      const bd = w.bodies[bi], l = bd.x0 + PAD_X, r = bd.x1 - PAD_X
      if (r < x - f || l > x + f || !solid(bd)) continue
      const cx = (Math.max(x - f, l) + Math.min(x + f, r)) / 2
      bilerp(w.pos, bd, (cx - bd.x0) / (bd.x1 - bd.x0), lv.inkV[bi], at)
      if (at[1] > maxY || (found && at[1] <= out.y)) continue
      found = true
      out.y = at[1]
      out.z = at[2]
      out.body = bi
      out.line = li
    }
  }
  return found
}
