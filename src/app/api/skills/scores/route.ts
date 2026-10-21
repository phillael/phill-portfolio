import { allowedOrigin } from '@/lib/allowed-origin'
import { readBoard, saveEntry, takeRun, limitSave } from '@/lib/scoreboard/store'
import type { SaveBody, SaveError, SaveResult } from '@/lib/scoreboard/types'
import { checkCity, checkName, checkRun, isCountry } from '@/lib/scoreboard/validate'

export const runtime = 'nodejs'

const headers = { 'Cache-Control': 'no-store' }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const isInt = (v: unknown, max: number): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max
const fail = (error: SaveError, status: number, extra?: Partial<SaveResult>) => Response.json({ ok: false, error, ...extra }, { status, headers })

/** the body's shape and ranges (step 2), or null */
function parseBody(raw: unknown): SaveBody | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const b = raw as Record<string, unknown>
  if (typeof b.runId !== 'string' || !UUID.test(b.runId) || typeof b.playerId !== 'string' || !UUID.test(b.playerId)) return null
  if (!isInt(b.score, 10_000_000) || !isInt(b.wave, 500) || !isInt(b.resumes, 10_000)) return null
  if (typeof b.name !== 'string' || typeof b.city !== 'string') return null
  if (b.country !== '' && !isCountry(b.country)) return null
  return { runId: b.runId, playerId: b.playerId, score: b.score, wave: b.wave, resumes: b.resumes, name: b.name, city: b.city, country: b.country as string }
}

/** the all-time board (plan §3): public, so no Origin check (a same-origin GET carries none). `player` marks their
    entry, `score` asks where a run would land; bad values are ignored */
export async function GET(request: Request): Promise<Response> {
  const q = new URL(request.url).searchParams
  const player = q.get('player') ?? '', score = q.get('score') ?? ''
  try {
    const board = await readBoard({
      player: UUID.test(player) ? player : undefined,
      score: /^\d{1,8}$/.test(score) && Number(score) <= 10_000_000 ? Number(score) : undefined,
    })
    return Response.json(board, { headers })
  } catch (err) {
    console.error('skills scores: Redis unavailable', err)
    return Response.json({ error: 'unavailable' }, { status: 503, headers })
  }
}

/**
 * Saves a run (plan §3), checked in this order; nothing touches Redis before step 4:
 * 1 the Origin (403) · 2 the body (400) · 3 the name and city (422; the run isn't spent, so they can fix it) ·
 * 4 the IP's saves today (429) · 5 the run's ticket, taken once (410) · 6 could a real run do this (422) ·
 * 7 the player's best already beats it (409, with the board) · 8 save (200, with the board).
 */
export async function POST(request: Request): Promise<Response> {
  if (!allowedOrigin(request.headers.get('origin'))) return new Response(null, { status: 403, headers })
  let raw: unknown
  try { raw = await request.json() } catch { return fail('bad_request', 400) }
  const body = parseBody(raw)
  if (!body) return fail('bad_request', 400)
  const name = checkName(body.name)
  if (name === null) return fail('name', 422)
  const city = checkCity(body.city)
  if (city === null) return fail('city', 422)

  try {
    if (!(await limitSave(request.headers.get('x-real-ip')))) return fail('rate_limited', 429)
    const start = await takeRun(body.runId)
    if (start === null) return fail('run', 410)
    const elapsed = (Date.now() - start) / 1000
    if (!checkRun({ wave: body.wave, score: body.score, resumes: body.resumes, elapsed })) return fail('score', 422)
    const now = await readBoard({ player: body.playerId, score: body.score })
    if (now.mine && now.mine.score >= body.score) return fail('not_best', 409, { board: now })
    const board = await saveEntry({ playerId: body.playerId, score: body.score, wave: body.wave, name, city, country: body.country })
    const ok: SaveResult = { ok: true, board }
    return Response.json(ok, { headers })
  } catch (err) {
    console.error('skills scores: Redis unavailable', err)
    return fail('unavailable', 503)
  }
}
