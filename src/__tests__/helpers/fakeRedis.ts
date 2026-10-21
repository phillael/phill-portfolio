/**
 * An in-memory `@upstash/redis` for the scoreboard's tests: the commands the store uses, with Upstash's automatic
 * JSON (de)serialization (an object value is stored as JSON and parsed back; numbers come back as numbers), and
 * `pipeline()`/`multi()` whose `exec()` runs the queue in order. Use it with
 *
 *   jest.mock('@upstash/redis', () => require('./helpers/fakeRedis').upstashModule)
 *   import { fakeRedis } from './helpers/fakeRedis'
 *
 * `fakeRedis.reset()` between tests; `fakeRedis.failNext = true` makes the next command (or exec) throw;
 * `fakeRedis.now` drives the TTLs (ms); `ttl(key)` and `keys()` let tests look inside.
 */

type Value = string | number | boolean | object
type Bound = number | string

const ser = (v: Value): string => (typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v))
/** Upstash's default deserializer: JSON.parse when it can, numbers only when they round-trip */
const de = (s: string | null): unknown => {
  if (s === null) return null
  try {
    const p = JSON.parse(s)
    return typeof p === 'number' && String(p) !== s ? s : p
  } catch { return s }
}
const parseBound = (b: Bound): { v: number; open: boolean } => {
  if (typeof b === 'number') return { v: b, open: false }
  if (b === '+inf' || b === '+') return { v: Infinity, open: false }
  if (b === '-inf' || b === '-') return { v: -Infinity, open: false }
  const open = b.startsWith('(')
  return { v: Number(open || b.startsWith('[') ? b.slice(1) : b), open }
}

export class FakeRedis {
  strings = new Map<string, string>()
  zsets = new Map<string, Map<string, number>>()
  hashes = new Map<string, Map<string, string>>()
  expiry = new Map<string, number>()
  now = 1_000_000
  failNext = false
  /** every command run, in order, as [name, key] */
  log: [string, string][] = []

  reset() {
    this.strings.clear(); this.zsets.clear(); this.hashes.clear(); this.expiry.clear()
    this.now = 1_000_000; this.failNext = false; this.log = []
  }
  private gate(cmd: string, key: string) {
    if (this.failNext) { this.failNext = false; throw new Error('fake redis: down') }
    this.log.push([cmd, key])
    const at = this.expiry.get(key)
    if (at !== undefined && at <= this.now) this.drop(key)
  }
  private drop(key: string) { this.strings.delete(key); this.zsets.delete(key); this.hashes.delete(key); this.expiry.delete(key) }
  private z(key: string) { let m = this.zsets.get(key); if (!m) this.zsets.set(key, (m = new Map())); return m }
  private h(key: string) { let m = this.hashes.get(key); if (!m) this.hashes.set(key, (m = new Map())); return m }

  /** seconds left on a key (-1 without one, -2 when missing), like TTL */
  ttl(key: string) {
    if (!this.strings.has(key) && !this.zsets.has(key) && !this.hashes.has(key)) return -2
    const at = this.expiry.get(key)
    return at === undefined ? -1 : Math.ceil((at - this.now) / 1000)
  }
  keys() { return [...this.strings.keys(), ...this.zsets.keys(), ...this.hashes.keys()].sort() }

  async set(key: string, value: Value, opts?: { ex?: number }) {
    this.gate('set', key)
    this.strings.set(key, ser(value))
    if (opts?.ex) this.expiry.set(key, this.now + opts.ex * 1000); else this.expiry.delete(key)
    return 'OK'
  }
  async get(key: string) { this.gate('get', key); return de(this.strings.get(key) ?? null) }
  async getdel(key: string) {
    this.gate('getdel', key)
    const v = this.strings.get(key) ?? null
    this.drop(key)
    return de(v)
  }
  async incr(key: string) {
    this.gate('incr', key)
    const n = Number(this.strings.get(key) ?? 0) + 1
    this.strings.set(key, String(n))
    return n
  }
  async expire(key: string, seconds: number) {
    this.gate('expire', key)
    if (!this.strings.has(key) && !this.zsets.has(key) && !this.hashes.has(key)) return 0
    this.expiry.set(key, this.now + seconds * 1000)
    return 1
  }
  async del(...keys: string[]) {
    let n = 0
    for (const k of keys) { this.gate('del', k); if (this.ttl(k) !== -2) n++; this.drop(k) }
    return n
  }

  async zadd(key: string, a: { gt?: true; lt?: true; nx?: true; xx?: true } | { score: number; member: string }, ...rest: { score: number; member: string }[]) {
    this.gate('zadd', key)
    const opts = 'score' in a ? {} : a
    const pairs = 'score' in a ? [a, ...rest] : rest
    const m = this.z(key)
    let added = 0
    for (const { score, member } of pairs) {
      const old = m.get(member)
      if (old === undefined) { if ('xx' in opts && opts.xx) continue; m.set(member, score); added++; continue }
      if ('nx' in opts && opts.nx) continue
      if ('gt' in opts && opts.gt && !(score > old)) continue
      if ('lt' in opts && opts.lt && !(score < old)) continue
      m.set(member, score)
    }
    return added
  }
  async zrem(key: string, ...members: string[]) {
    this.gate('zrem', key)
    const m = this.z(key)
    let n = 0
    for (const x of members) if (m.delete(x)) n++
    return n
  }
  async zcard(key: string) { this.gate('zcard', key); return this.zsets.get(key)?.size ?? 0 }
  async zscore(key: string, member: string) { this.gate('zscore', key); return this.zsets.get(key)?.get(member) ?? null }
  async zcount(key: string, min: Bound, max: Bound) {
    this.gate('zcount', key)
    const lo = parseBound(min), hi = parseBound(max)
    let n = 0
    for (const s of this.zsets.get(key)?.values() ?? []) {
      if ((lo.open ? s > lo.v : s >= lo.v) && (hi.open ? s < hi.v : s <= hi.v)) n++
    }
    return n
  }
  /** by rank only (what the store uses): Redis orders ties by member, reversed with REV */
  async zrange(key: string, start: number, stop: number, opts?: { rev?: boolean; withScores?: boolean }) {
    this.gate('zrange', key)
    const all = [...(this.zsets.get(key) ?? new Map<string, number>())].sort((x, y) => x[1] - y[1] || (x[0] < y[0] ? -1 : 1))
    if (opts?.rev) all.reverse()
    const end = stop < 0 ? all.length + stop : stop
    const slice = all.slice(start, end + 1)
    return opts?.withScores ? slice.flatMap(([m, s]) => [de(m), s]) : slice.map(([m]) => de(m))
  }

  async hset(key: string, kv: Record<string, Value>) {
    this.gate('hset', key)
    const h = this.h(key)
    let n = 0
    for (const [f, v] of Object.entries(kv)) { if (!h.has(f)) n++; h.set(f, ser(v)) }
    return n
  }
  async hget(key: string, field: string) { this.gate('hget', key); return de(this.hashes.get(key)?.get(field) ?? null) }
  /** Upstash's HMGET: an object of field → parsed value, or null when every field is missing */
  async hmget(key: string, ...fields: string[]) {
    this.gate('hmget', key)
    const h = this.hashes.get(key)
    const vals = fields.map((f) => h?.get(f) ?? null)
    if (vals.every((v) => v === null)) return null
    return Object.fromEntries(fields.map((f, i) => [f, de(vals[i])]))
  }
  async hdel(key: string, ...fields: string[]) {
    this.gate('hdel', key)
    const h = this.h(key)
    let n = 0
    for (const f of fields) if (h.delete(f)) n++
    return n
  }

  /** a queue of the commands above; exec() runs them in order and resolves with their results */
  pipeline() {
    const queue: (() => Promise<unknown>)[] = []
    const p: Record<string, unknown> = {
      exec: async () => {
        if (!queue.length) throw new Error('Pipeline is empty') // as Upstash's does
        if (this.failNext) { this.failNext = false; throw new Error('fake redis: down') }
        const out: unknown[] = []
        for (const run of queue) out.push(await run())
        return out
      },
    }
    for (const name of ['set', 'get', 'getdel', 'incr', 'expire', 'del', 'zadd', 'zrem', 'zcard', 'zscore', 'zcount', 'zrange', 'hset', 'hget', 'hmget', 'hdel'] as const) {
      p[name] = (...args: unknown[]) => {
        queue.push(() => (this[name] as (...a: unknown[]) => Promise<unknown>).apply(this, args))
        return p
      }
    }
    return p
  }
  multi() { return this.pipeline() }
}

export const fakeRedis = new FakeRedis()
/** the module jest.mock('@upstash/redis') returns: every `new Redis()` is the one fake */
export const upstashModule = { Redis: function Redis() { return fakeRedis } }
