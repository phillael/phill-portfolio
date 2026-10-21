#!/usr/bin/env node
/**
 * The Skill blaster scoreboard's admin script: look at a board, take an entry off it, or clear a test board.
 *
 *   node --env-file=.env.local scripts/scoreboard.mjs list [--n 20] [--env development|preview|production]
 *   node --env-file=.env.local scripts/scoreboard.mjs rm <playerId> [--env …]
 *   node --env-file=.env.local scripts/scoreboard.mjs clear [--env development|preview]
 *
 * --env defaults to development. The keys are `sb:{env}:*` (src/lib/scoreboard/store.ts). .env.local points at
 * PRODUCTION's Upstash DB: local runs and this script's default only touch `sb:development:*`.
 *   list   rank, score, name, place, wave, date and player id, best first (ties share a rank)
 *   rm     takes a player off the board (ZREM + HDEL): how Phill removes anything the filter let through
 *   clear  deletes a test board (its board and who, and its run tickets and rate-limit counters); refuses production
 */

import { Redis } from '@upstash/redis'

const ENVS = ['development', 'preview', 'production']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function die(msg, code = 1) {
  console.error(msg)
  process.exit(code)
}

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  if (i < 0) return fallback
  const v = argv[i + 1]
  if (!v || v.startsWith('--')) die(`--${name} needs a value`, 2)
  argv.splice(i, 2)
  return v
}
const env = flag('env', 'development')
const n = Number(flag('n', '20'))
const [cmd, arg] = argv
const usage = 'usage: scoreboard.mjs list [--n 20] | rm <playerId> | clear   [--env development|preview|production]'
if (!ENVS.includes(env)) die(`--env must be one of ${ENVS.join(', ')}`, 2)
if (!Number.isInteger(n) || n < 1) die('--n must be a whole number from 1', 2)

const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN
if (!url || !token) die('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are missing: run with --env-file=.env.local')
const redis = new Redis({ url, token })
const key = { board: `sb:${env}:board`, who: `sb:${env}:who` }

async function list() {
  const flat = await redis.zrange(key.board, 0, n - 1, { rev: true, withScores: true })
  const total = await redis.zcard(key.board)
  if (!flat.length) return console.log(`sb:${env}: empty`)
  const ids = [], scores = []
  for (let i = 0; i < flat.length; i += 2) { ids.push(String(flat[i])); scores.push(Number(flat[i + 1])) }
  const who = (await redis.hmget(key.who, ...ids)) ?? {}
  const rows = ids.map((id, i) => {
    const w = who[id] ?? {}
    const place = w.city ? (w.country ? `${w.city}, ${w.country}` : w.city) : (w.country ?? '')
    return [
      String(1 + scores.filter((s) => s > scores[i]).length),
      scores[i].toLocaleString('en-US'),
      w.name ?? '?',
      place,
      w.wave === undefined ? '' : String(w.wave + 1),
      w.at ? new Date(w.at).toISOString().slice(0, 10) : '',
      id,
    ]
  })
  const head = ['rank', 'score', 'name', 'place', 'wave', 'date', 'player id']
  const width = head.map((h, c) => Math.max(h.length, ...rows.map((r) => r[c].length)))
  const line = (r) => r.map((v, c) => (c < 2 ? v.padStart(width[c]) : v.padEnd(width[c]))).join('  ').trimEnd()
  console.log(`sb:${env}: ${total.toLocaleString('en-US')} on the board${total > rows.length ? `, the top ${rows.length}` : ''}`)
  console.log(line(head))
  rows.forEach((r) => console.log(line(r)))
}

async function rm(id) {
  if (!id || !UUID.test(id)) die('rm needs a player id (a lowercase UUID, as `list` prints it)', 2)
  const [gone] = await redis.pipeline().zrem(key.board, id).hdel(key.who, id).exec()
  console.log(gone ? `sb:${env}: removed ${id}` : `sb:${env}: no entry for ${id}`)
}

async function clear() {
  if (env === 'production') die('clear refuses production: take entries off one at a time with rm')
  const keys = [key.board, key.who]
  for (const match of [`sb:${env}:run:*`, `sb:${env}:lim:*`]) {
    let cursor = '0'
    do {
      const [next, found] = await redis.scan(cursor, { match, count: 500 })
      keys.push(...found)
      cursor = String(next)
    } while (cursor !== '0')
  }
  const gone = await redis.del(...keys)
  console.log(`sb:${env}: cleared (${gone} key${gone === 1 ? '' : 's'})`)
}

const run = { list, rm: () => rm(arg), clear }[cmd]
if (!run) die(usage, 2)
run().catch((err) => die(`scoreboard: ${err.message}`))
