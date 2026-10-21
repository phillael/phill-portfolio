/**
 * The Skill blaster scoreboard's client (plan §6): the routes (/api/skills/run, /api/skills/scores), the player's id
 * and their remembered name and place. Every storage access is wrapped: private modes throw. Tests:
 * skills-scoreboard-api.test.ts.
 */

import type { Board, RunTicket, SaveBody, SaveError, SaveResult } from '@/lib/scoreboard/types'

const PLAYER_KEY = 'skill-blaster-player'
const PROFILE_KEY = 'skill-blaster-profile'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const ERRORS: readonly SaveError[] = ['bad_request', 'name', 'city', 'run', 'score', 'not_best', 'rate_limited', 'unavailable']
const JSON_HEADERS = { 'Content-Type': 'application/json' }

const hasFetch = () => typeof fetch === 'function'
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isBoard = (v: unknown): v is Board => isObj(v) && Array.isArray(v.top) && typeof v.total === 'number'

/** the run's ticket, asked for at the first shot; null on any failure (the run then can't be saved) */
export async function startRun(): Promise<RunTicket | null> {
  if (!hasFetch()) return null
  try {
    const res = await fetch('/api/skills/run', { method: 'POST', headers: JSON_HEADERS, body: '{}' })
    if (!res.ok) return null
    const t: unknown = await res.json()
    return isObj(t) && typeof t.runId === 'string' && isObj(t.geo) && typeof t.geo.city === 'string' && typeof t.geo.country === 'string'
      ? { runId: t.runId, geo: { city: t.geo.city, country: t.geo.country } }
      : null
  } catch { return null }
}

/** the board for this player, with where `score` lands; throws when it can't load (the board's offline state) */
export async function fetchBoard(player: string, score: number): Promise<Board> {
  if (!hasFetch()) throw new Error('scoreboard: no fetch')
  const q = new URLSearchParams({ player, score: String(score) })
  const res = await fetch(`/api/skills/scores?${q}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`scoreboard: ${res.status}`)
  const b: unknown = await res.json()
  if (!isBoard(b)) throw new Error('scoreboard: an odd answer')
  return b
}

/** saves the run; the server's answer as it is, and anything it can't make sense of is 'unavailable' */
export async function saveScore(body: SaveBody): Promise<SaveResult> {
  const out: SaveResult = { ok: false, error: 'unavailable' }
  if (!hasFetch()) return out
  try {
    const res = await fetch('/api/skills/scores', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) })
    const r: unknown = await res.json()
    if (!isObj(r)) return out
    if (res.ok && r.ok === true && isBoard(r.board)) return { ok: true, board: r.board }
    if (r.ok === false && ERRORS.includes(r.error as SaveError)) {
      return { ok: false, error: r.error as SaveError, ...(isBoard(r.board) ? { board: r.board } : {}) }
    }
    return out
  } catch { return out }
}

/** a v4 UUID: the browser's when it has one (secure contexts), else from getRandomValues */
function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(b)
  else for (let i = 0; i < 16; i++) b[i] = (Math.random() * 256) | 0
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

let pageId: string | null = null
/** who's playing: a random id kept in localStorage (clearing it makes a new player); for this page when storage throws */
export function playerId(): string {
  try {
    const kept = localStorage.getItem(PLAYER_KEY)
    if (kept && UUID.test(kept)) return kept
    const id = uuid()
    localStorage.setItem(PLAYER_KEY, id)
    return id
  } catch {
    return (pageId ??= uuid())
  }
}

export interface Profile { name: string; city: string; country: string }
/** the name and place saved last on this device, or null */
export function loadProfile(): Profile | null {
  try {
    const p: unknown = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null')
    return isObj(p) && typeof p.name === 'string' && typeof p.city === 'string' && typeof p.country === 'string'
      ? { name: p.name, city: p.city, country: p.country }
      : null
  } catch { return null }
}
export function saveProfile(p: Profile) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: p.name, city: p.city, country: p.country })) } catch { /* private mode */ }
}
