/**
 * The scoreboard's store in Upstash Redis (plan §4), the wizard's database. Every key is under `sb:{env}`, so previews
 * and local runs never touch production's board (.env.local points at production's DB: local runs write
 * `sb:development:*` only).
 *
 *   sb:{env}:board                     sorted set: player id → their best score
 *   sb:{env}:who                       hash: player id → { name, city, country, wave, at }
 *   sb:{env}:run:{runId}               a run's start time (ms), 3 h
 *   sb:{env}:lim:run:{ip}:{hour}       runs per IP per hour
 *   sb:{env}:lim:read:{ip}:{hour}      board reads per IP per hour (the board is public; its DB is the wizard's too)
 *   sb:{env}:lim:save:{ip}:{day}       saves per IP per day
 *
 * Player ids are the key to an entry: they never leave this module. Every call throws when Redis fails or isn't
 * configured; the routes answer 503. Tests: scoreboard-store.test.ts (on src/__tests__/helpers/fakeRedis.ts).
 */

import { createHash } from 'node:crypto'
import { Redis } from '@upstash/redis'
import type { Board, BoardEntry } from './types'

export const RUN_TTL = 3 * 60 * 60
export const RUNS_PER_HOUR = 60
export const READS_PER_HOUR = 120
export const SAVES_PER_DAY = 20
const RUN_LIM_TTL = 60 * 60
const SAVE_LIM_TTL = 26 * 60 * 60
const TOP = 10

interface Who { name: string; city: string; country: string; wave: number; at: number }
export interface Entry { playerId: string; score: number; wave: number; name: string; city: string; country: string }

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('scoreboard: Upstash is not configured')
  return new Redis({ url, token })
}

/** `sb:` + the Vercel environment (development locally) */
export const envPrefix = () => `sb:${process.env.VERCEL_ENV || 'development'}`
const keys = () => {
  const p = envPrefix()
  return { board: `${p}:board`, who: `${p}:who`, run: (id: string) => `${p}:run:${id}`, lim: (kind: Limit, ip: string, at: string) => `${p}:lim:${kind}:${ip}:${at}` }
}

/** the first 16 hex characters of the IP's SHA-256 ('unknown' without one): no IP is stored as-is */
export const ipHash = (ip: string | null) => (ip ? createHash('sha256').update(ip).digest('hex').slice(0, 16) : 'unknown')

/** a run's ticket: its start time, for 3 hours */
export async function createRun(runId: string, start = Date.now()) {
  await getRedis().set(keys().run(runId), start, { ex: RUN_TTL })
}
/** the run's start time, taken once (GETDEL): null when it's gone, used or never was */
export async function takeRun(runId: string): Promise<number | null> {
  const v = await getRedis().getdel<number | string>(keys().run(runId))
  return v === null ? null : Number(v)
}

type Limit = 'run' | 'read' | 'save'
async function underLimit(kind: Limit, ip: string | null, at: string, limit: number, ttl: number) {
  const key = keys().lim(kind, ipHash(ip), at)
  const [n] = (await getRedis().multi().incr(key).expire(key, ttl).exec()) as [number, number]
  return n <= limit
}
/** counts a run against the IP's hour; false past 60 */
export const limitRun = (ip: string | null) => underLimit('run', ip, new Date().toISOString().slice(0, 13), RUNS_PER_HOUR, RUN_LIM_TTL)
/** counts a board read against the IP's hour; false past 120 */
export const limitRead = (ip: string | null) => underLimit('read', ip, new Date().toISOString().slice(0, 13), READS_PER_HOUR, RUN_LIM_TTL)
/** counts a save against the IP's day; false past 20 */
export const limitSave = (ip: string | null) => underLimit('save', ip, new Date().toISOString().slice(0, 10), SAVES_PER_DAY, SAVE_LIM_TTL)

const entryOf = (w: Partial<Who> | null | undefined, score: number, rank: number, me: boolean): BoardEntry => ({
  rank, name: w?.name ?? '', city: w?.city ?? '', country: w?.country ?? '', score, ...(me ? { me: true as const } : {}),
})

/**
 * The board (plan §3's GET): the top 10 with shared ranks (1 + the count strictly higher), the total, the player's
 * entry (`mine`) and the rank a score would have (`at`). Two round trips: the ranges and counts, then the top's
 * details and, when the player is below the top, their rank. `write` puts a save's commands at the head of the first.
 */
async function board(redis: Redis, { player, score }: { player?: string; score?: number }, write?: Entry): Promise<Board> {
  const k = keys()
  const p = redis.pipeline()
  if (write) {
    const who: Who = { name: write.name, city: write.city, country: write.country, wave: write.wave, at: Date.now() }
    p.zadd(k.board, { gt: true }, { score: write.score, member: write.playerId }).hset(k.who, { [write.playerId]: who })
  }
  p.zrange(k.board, 0, TOP - 1, { rev: true, withScores: true }).zcard(k.board)
  if (player) p.zscore(k.board, player).hget(k.who, player)
  if (score !== undefined) p.zcount(k.board, `(${score}`, '+inf')
  const res = (await p.exec()) as unknown[]
  const r = res.slice(write ? 2 : 0)
  const flat = r[0] as (string | number)[], total = Number(r[1])
  const mineScore = player && r[2] !== null ? Number(r[2]) : null
  const mineWho = player ? (r[3] as Who | null) : null
  const at = score !== undefined ? 1 + Number(r[player ? 4 : 2]) : null

  const ids: string[] = [], scores: number[] = []
  for (let i = 0; i < flat.length; i += 2) { ids.push(String(flat[i])); scores.push(Number(flat[i + 1])) }
  const inTop = player ? ids.indexOf(player) : -1
  const p2 = redis.pipeline()
  if (ids.length) p2.hmget(k.who, ...ids)
  if (mineScore !== null && inTop < 0) p2.zcount(k.board, `(${mineScore}`, '+inf')
  const r2 = ids.length || (mineScore !== null && inTop < 0) ? ((await p2.exec()) as unknown[]) : []
  const whos = (ids.length ? r2[0] : null) as Record<string, Who | null> | null

  const rankIn = (s: number) => 1 + scores.filter((x) => x > s).length
  const top = ids.map((id, i) => entryOf(whos?.[id], scores[i], rankIn(scores[i]), id === player))
  const mine = mineScore === null ? null
    : inTop >= 0 ? top[inTop]
    : entryOf(mineWho, mineScore, 1 + Number(r2[ids.length ? 1 : 0]), true)
  return { top, total, mine, at }
}

/** the board for a player (their entry) and a score (where it would land); both optional */
export async function readBoard(q: { player?: string; score?: number }): Promise<Board> {
  return board(getRedis(), q)
}
/** saves a run as the player's entry (the board keeps their best: ZADD GT) and returns the board for them and it */
export async function saveEntry(e: Entry): Promise<Board> {
  return board(getRedis(), { player: e.playerId, score: e.score }, e)
}
