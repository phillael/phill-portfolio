/**
 * @jest-environment node
 */
/** The scoreboard's Redis store (src/lib/scoreboard/store.ts), on an in-memory @upstash/redis. */
import { fakeRedis } from './helpers/fakeRedis'
import { createRun, envPrefix, ipHash, limitRead, limitRun, limitSave, readBoard, saveEntry, takeRun } from '../lib/scoreboard/store'

jest.mock('@upstash/redis', () => require('./helpers/fakeRedis').upstashModule)

const P = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const ME = P(999)
const seed = async (rows: [number, string, number][]) => {
  for (const [id, name, score] of rows) await saveEntry({ playerId: P(id), score, wave: 3, name, city: '', country: '' })
}

beforeEach(() => {
  fakeRedis.reset()
  delete process.env.VERCEL_ENV
  process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
})

describe('the env prefix', () => {
  it('keeps local runs, previews and production apart', () => {
    expect(envPrefix()).toBe('sb:development')
    process.env.VERCEL_ENV = 'preview'
    expect(envPrefix()).toBe('sb:preview')
    process.env.VERCEL_ENV = 'production'
    expect(envPrefix()).toBe('sb:production')
  })
  it('is where everything is written', async () => {
    process.env.VERCEL_ENV = 'preview'
    await createRun('r1')
    await saveEntry({ playerId: ME, score: 500, wave: 2, name: 'Ana', city: 'Lisbon', country: 'PT' })
    await limitRun('1.2.3.4')
    await limitSave('1.2.3.4')
    expect(fakeRedis.keys().every((k) => k.startsWith('sb:preview:'))).toBe(true)
    expect(fakeRedis.keys()).toEqual(expect.arrayContaining(['sb:preview:board', 'sb:preview:who', 'sb:preview:run:r1']))
  })
})

describe('run tickets', () => {
  it('hold the start time for 3 hours, and are taken once', async () => {
    await createRun('r1', 123_456)
    expect(fakeRedis.ttl('sb:development:run:r1')).toBe(10800)
    expect(await takeRun('r1')).toBe(123_456)
    expect(await takeRun('r1')).toBeNull()
    expect(await takeRun('nope')).toBeNull()
  })
  it('expire', async () => {
    await createRun('r2', 5)
    fakeRedis.now += 10800 * 1000
    expect(await takeRun('r2')).toBeNull()
  })
})

describe('the board', () => {
  it('is empty to start', async () => {
    expect(await readBoard({})).toEqual({ top: [], total: 0, mine: null, at: null })
    expect(await readBoard({ player: ME, score: 400 })).toEqual({ top: [], total: 0, mine: null, at: 1 })
  })
  it('lists the top 10, best first, ties sharing a rank', async () => {
    await seed([[1, 'a', 900], [2, 'b', 800], [3, 'c', 800], [4, 'd', 700], [5, 'e', 600], [6, 'f', 500], [7, 'g', 400], [8, 'h', 300], [9, 'i', 200], [10, 'j', 100], [11, 'k', 50], [12, 'l', 10]])
    const b = await readBoard({})
    expect(b.total).toBe(12)
    expect(b.top).toHaveLength(10)
    expect(b.top.map((e) => [e.rank, e.score])).toEqual([[1, 900], [2, 800], [2, 800], [4, 700], [5, 600], [6, 500], [7, 400], [8, 300], [9, 200], [10, 100]])
    expect(b.top[0]).toEqual({ rank: 1, name: 'a', city: '', country: '', score: 900 })
  })
  it('gives the player’s entry with its rank (mine) and where a score would land (at)', async () => {
    await seed([[1, 'a', 900], [2, 'b', 800], [3, 'c', 700]])
    for (let i = 0; i < 10; i++) await seed([[20 + i, `x${i}`, 600]])
    await saveEntry({ playerId: ME, score: 300, wave: 4, name: 'Me', city: 'Austin', country: 'US' })
    const b = await readBoard({ player: ME, score: 800 })
    expect(b.mine).toEqual({ rank: 14, name: 'Me', city: 'Austin', country: 'US', score: 300, me: true })
    expect(b.at).toBe(2) // one strictly higher (900); the 800 ties
    expect(b.top.some((e) => e.me)).toBe(false)
    expect((await readBoard({ player: ME, score: 5000 })).at).toBe(1)
    expect((await readBoard({ player: ME, score: 0 })).at).toBe(15)
  })
  it('marks the player’s row in the top 10 with me', async () => {
    await seed([[1, 'a', 900], [2, 'b', 800]])
    await saveEntry({ playerId: ME, score: 850, wave: 4, name: 'Me', city: '', country: 'PT' })
    const b = await readBoard({ player: ME })
    expect(b.top.map((e) => [e.name, e.rank, e.me])).toEqual([['a', 1, undefined], ['Me', 2, true], ['b', 3, undefined]])
    expect(b.mine).toEqual({ rank: 2, name: 'Me', city: '', country: 'PT', score: 850, me: true })
  })
  it('never carries a player id', async () => {
    await seed([[1, 'a', 900]])
    await saveEntry({ playerId: ME, score: 100, wave: 2, name: 'Me', city: '', country: '' })
    const json = JSON.stringify(await readBoard({ player: ME, score: 50 }))
    expect(json).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/)
    expect(json).not.toContain(ME)
  })
  it('returns no me for someone else', async () => {
    await seed([[1, 'a', 900]])
    const b = await readBoard({ player: ME })
    expect(b.mine).toBeNull()
    expect(b.top[0].me).toBeUndefined()
  })
})

describe('a save', () => {
  it('keeps the player’s best (GT) and their latest details with it', async () => {
    await saveEntry({ playerId: ME, score: 500, wave: 2, name: 'Ana', city: 'Lisbon', country: 'PT' })
    await saveEntry({ playerId: ME, score: 300, wave: 2, name: 'Lower', city: '', country: '' })
    expect((await readBoard({ player: ME })).mine?.score).toBe(500)
    const b = await saveEntry({ playerId: ME, score: 900, wave: 4, name: 'Ana B', city: 'Porto', country: 'PT' })
    expect(b.total).toBe(1)
    expect(b.mine).toEqual({ rank: 1, name: 'Ana B', city: 'Porto', country: 'PT', score: 900, me: true })
  })
  it('stores the details as JSON, with the wave and the time', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    await saveEntry({ playerId: ME, score: 500, wave: 3, name: 'Ana', city: 'Lisbon', country: 'PT' })
    expect(await fakeRedis.hget('sb:development:who', ME)).toEqual({ name: 'Ana', city: 'Lisbon', country: 'PT', wave: 3, at: 1_700_000_000_000 })
    jest.restoreAllMocks()
  })
  it('returns the board for that player and score', async () => {
    await seed([[1, 'a', 900], [2, 'b', 100]])
    const b = await saveEntry({ playerId: ME, score: 500, wave: 3, name: 'Me', city: '', country: '' })
    expect(b).toEqual({
      top: [
        { rank: 1, name: 'a', city: '', country: '', score: 900 },
        { rank: 2, name: 'Me', city: '', country: '', score: 500, me: true },
        { rank: 3, name: 'b', city: '', country: '', score: 100 },
      ],
      total: 3,
      mine: { rank: 2, name: 'Me', city: '', country: '', score: 500, me: true },
      at: 2,
    })
  })
})

describe('the rate limits', () => {
  it('run: 60 an hour per IP, the key gone within the hour', async () => {
    for (let i = 0; i < 60; i++) expect(await limitRun('1.2.3.4')).toBe(true)
    expect(await limitRun('1.2.3.4')).toBe(false)
    expect(await limitRun('5.6.7.8')).toBe(true)
    const key = fakeRedis.keys().find((k) => k.includes(':lim:run:'))!
    expect(key).toMatch(/^sb:development:lim:run:[0-9a-f]{16}:\d{4}-\d\d-\d\dT\d\d$/)
    expect(fakeRedis.ttl(key)).toBe(3600)
  })
  it('save: 20 a day per IP, the key gone within 26 h', async () => {
    for (let i = 0; i < 20; i++) expect(await limitSave('1.2.3.4')).toBe(true)
    expect(await limitSave('1.2.3.4')).toBe(false)
    const key = fakeRedis.keys().find((k) => k.includes(':lim:save:'))!
    expect(key).toMatch(/^sb:development:lim:save:[0-9a-f]{16}:\d{4}-\d\d-\d\d$/)
    expect(fakeRedis.ttl(key)).toBe(93600)
  })
  it('read: 120 an hour per IP (the board is public, but its Redis is the wizard’s too)', async () => {
    for (let i = 0; i < 120; i++) expect(await limitRead('1.2.3.4')).toBe(true)
    expect(await limitRead('1.2.3.4')).toBe(false)
    expect(await limitRead('5.6.7.8')).toBe(true)
    const key = fakeRedis.keys().find((k) => k.includes(':lim:read:'))!
    expect(key).toMatch(/^sb:development:lim:read:[0-9a-f]{16}:\d{4}-\d\d-\d\dT\d\d$/)
    expect(fakeRedis.ttl(key)).toBe(3600)
  })
  it('never stores an IP as-is', async () => {
    await limitRun('203.0.113.7')
    await limitSave('203.0.113.7')
    expect(fakeRedis.keys().join(' ')).not.toContain('203.0.113.7')
    expect(ipHash('203.0.113.7')).toMatch(/^[0-9a-f]{16}$/)
    expect(ipHash('203.0.113.7')).toBe(ipHash('203.0.113.7'))
    expect(ipHash(null)).toBe('unknown')
  })
})

describe('when Redis fails', () => {
  it('every call rejects', async () => {
    for (const call of [() => createRun('r'), () => takeRun('r'), () => readBoard({}), () => limitRun('1.1.1.1'), () => limitSave('1.1.1.1'), () => limitRead('1.1.1.1'),
      () => saveEntry({ playerId: ME, score: 1, wave: 2, name: 'A', city: '', country: '' })]) {
      fakeRedis.failNext = true
      await expect(call()).rejects.toThrow()
    }
  })
  it('so does an unconfigured store', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    await expect(readBoard({})).rejects.toThrow(/not configured/)
  })
})
