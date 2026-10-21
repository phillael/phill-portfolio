/**
 * @jest-environment node
 */
/** The scoreboard's routes (plan §3): POST /api/skills/run, GET and POST /api/skills/scores, on an in-memory Redis. */
import { POST as postRun } from '../app/api/skills/run/route'
import { GET as getScores, POST as postScore } from '../app/api/skills/scores/route'
import { createRun, saveEntry } from '../lib/scoreboard/store'
import { maxScoreFor } from '../lib/skills/rules'
import { fakeRedis } from './helpers/fakeRedis'

jest.mock('@upstash/redis', () => require('./helpers/fakeRedis').upstashModule)

const ORIGIN = 'http://localhost:3000'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const P = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const ME = P(999)
const RUN = '11111111-1111-4111-8111-111111111111'

const runReq = (headers: Record<string, string> = { origin: ORIGIN }) =>
  new Request(`${ORIGIN}/api/skills/run`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-real-ip': '1.2.3.4', ...headers }, body: '{}' })
const scoresGet = (q = '') => new Request(`${ORIGIN}/api/skills/scores${q}`)
const body = (o: Record<string, unknown> = {}) => ({ runId: RUN, playerId: ME, score: 5000, wave: 2, resumes: 0, name: 'Ana', city: 'Lisbon', country: 'PT', ...o })
const saveReq = (b: unknown, headers: Record<string, string> = { origin: ORIGIN }) =>
  new Request(`${ORIGIN}/api/skills/scores`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-real-ip': '1.2.3.4', ...headers }, body: typeof b === 'string' ? b : JSON.stringify(b) })
/** a run that started a minute ago (long enough for wave 4) */
const oldRun = (id = RUN) => createRun(id, Date.now() - 60_000)
/** the routes log Redis failures; the tests that cause them don't need the noise */
const quiet = () => jest.spyOn(console, 'error').mockImplementation(() => {})

beforeEach(() => {
  fakeRedis.reset()
  delete process.env.VERCEL_ENV
  process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
  process.env.WIZARD_ALLOWED_ORIGINS = 'http://localhost:3000,https://www.phillcodes.com'
  quiet()
})
afterEach(() => jest.restoreAllMocks())

describe('POST /api/skills/run', () => {
  it('answers only the site: 403 with no body otherwise', async () => {
    for (const h of [{}, { origin: 'https://evil.example.com' }] as Record<string, string>[]) {
      const res = await postRun(runReq(h))
      expect(res.status).toBe(403)
      expect(await res.text()).toBe('')
      expect(res.headers.get('cache-control')).toBe('no-store')
    }
    expect(fakeRedis.log).toEqual([])
  })
  it('gives a ticket: a fresh run id, stored for 3 hours, and an empty geo locally', async () => {
    const res = await postRun(runReq())
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const t = await res.json()
    expect(t).toEqual({ runId: expect.stringMatching(UUID), geo: { city: '', country: '' } })
    expect(fakeRedis.ttl(`sb:development:run:${t.runId}`)).toBe(10800)
    const t2 = await (await postRun(runReq())).json()
    expect(t2.runId).not.toBe(t.runId)
  })
  it('reads where the visitor is from Vercel’s headers', async () => {
    const res = await postRun(runReq({ origin: ORIGIN, 'x-vercel-ip-city': 'S%C3%A3o%20Paulo', 'x-vercel-ip-country': 'BR' }))
    expect((await res.json()).geo).toEqual({ city: 'São Paulo', country: 'BR' })
    const odd = await postRun(runReq({ origin: ORIGIN, 'x-vercel-ip-city': 'sh1t', 'x-vercel-ip-country': 'EU' }))
    expect((await odd.json()).geo).toEqual({ city: '', country: '' })
  })
  it('429s past 60 runs an hour from one IP', async () => {
    for (let i = 0; i < 60; i++) expect((await postRun(runReq())).status).toBe(200)
    const res = await postRun(runReq())
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: 'rate_limited' })
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
  it('503s when Redis is down or unconfigured', async () => {
    fakeRedis.failNext = true
    let res = await postRun(runReq())
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'unavailable' })
    expect(res.headers.get('cache-control')).toBe('no-store')
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    res = await postRun(runReq())
    expect(res.status).toBe(503)
  })
})

describe('GET /api/skills/scores', () => {
  it('returns the board, public, uncached, with no Origin needed', async () => {
    await saveEntry({ playerId: P(1), score: 9000, wave: 4, name: 'Top', city: 'Austin', country: 'US' })
    await saveEntry({ playerId: ME, score: 3000, wave: 2, name: 'Me', city: '', country: '' })
    const res = await getScores(scoresGet(`?player=${ME}&score=5000`))
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const b = await res.json()
    expect(b).toEqual({
      top: [{ rank: 1, name: 'Top', city: 'Austin', country: 'US', score: 9000 }, { rank: 2, name: 'Me', city: '', country: '', score: 3000, me: true }],
      total: 2,
      mine: { rank: 2, name: 'Me', city: '', country: '', score: 3000, me: true },
      at: 2,
    })
    expect(JSON.stringify(b)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/)
  })
  it('takes both parameters as optional, ignoring bad ones', async () => {
    await saveEntry({ playerId: ME, score: 3000, wave: 2, name: 'Me', city: '', country: '' })
    expect(await (await getScores(scoresGet())).json()).toMatchObject({ total: 1, mine: null, at: null })
    expect(await (await getScores(scoresGet('?player=nope&score=1.5'))).json()).toMatchObject({ total: 1, mine: null, at: null })
    expect(await (await getScores(scoresGet('?score=-3'))).json()).toMatchObject({ at: null })
    expect(await (await getScores(scoresGet('?score=0'))).json()).toMatchObject({ at: 2 })
  })
  it('503s when Redis is down', async () => {
    fakeRedis.failNext = true
    const res = await getScores(scoresGet())
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'unavailable' })
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
})

describe('POST /api/skills/scores', () => {
  const save = async (b: unknown, headers?: Record<string, string>) => {
    const res = await postScore(saveReq(b, headers))
    expect(res.headers.get('cache-control')).toBe('no-store')
    return { status: res.status, json: res.status === 403 ? null : await res.json() }
  }

  it('1. answers only the site: 403 with no body', async () => {
    await oldRun()
    const res = await postScore(saveReq(body(), {}))
    expect(res.status).toBe(403)
    expect(await res.text()).toBe('')
    expect(fakeRedis.log.filter(([c]) => c !== 'set')).toEqual([])
  })
  it('2. 400s bad JSON and each bad field, touching no Redis', async () => {
    const bad = [
      '{nope', 'null', '[]',
      body({ runId: 'x' }), body({ playerId: 'ME' }), body({ playerId: 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA' }),
      body({ score: 1.5 }), body({ score: -1 }), body({ score: 10_000_001 }), body({ score: '5000' }),
      body({ wave: 501 }), body({ wave: 2.5 }), body({ resumes: 10_001 }), body({ resumes: -1 }),
      body({ country: 'EU' }), body({ country: 'pt' }), body({ name: 42 }), body({ city: null }),
    ]
    for (const b of bad) expect(await save(b)).toEqual({ status: 400, json: { ok: false, error: 'bad_request' } })
    expect(await save(body({ score: 10_000_000, wave: 500, resumes: 10_000, country: '' }))).not.toMatchObject({ status: 400 })
    fakeRedis.log = []
    await save(body({ wave: 501 }))
    expect(fakeRedis.log).toEqual([])
  })
  it('3. 422s a bad name or city without touching Redis, so the run is still there to save', async () => {
    await oldRun()
    fakeRedis.log = []
    expect(await save(body({ name: 'sh1t' }))).toEqual({ status: 422, json: { ok: false, error: 'name' } })
    expect(await save(body({ name: '   ' }))).toEqual({ status: 422, json: { ok: false, error: 'name' } })
    expect(await save(body({ city: 'fvck' }))).toEqual({ status: 422, json: { ok: false, error: 'city' } })
    expect(await save(body({ city: '<b>' }))).toEqual({ status: 422, json: { ok: false, error: 'city' } })
    expect(fakeRedis.log).toEqual([])
    const ok = await save(body({ name: '  Ana   B ' }))
    expect(ok.status).toBe(200)
    expect(ok.json.board.mine).toMatchObject({ name: 'Ana B', city: 'Lisbon', country: 'PT', score: 5000, me: true })
  })
  it('4. 429s past 20 saves a day from one IP', async () => {
    for (let i = 0; i < 20; i++) expect((await save(body())).status).toBe(410) // no such run, but each counts
    expect(await save(body())).toEqual({ status: 429, json: { ok: false, error: 'rate_limited' } })
  })
  it('5. 410s a run that doesn’t exist, and one already used', async () => {
    expect(await save(body())).toEqual({ status: 410, json: { ok: false, error: 'run' } })
    await oldRun()
    expect((await save(body())).status).toBe(200)
    expect(await save(body({ score: 6000 }))).toEqual({ status: 410, json: { ok: false, error: 'run' } })
  })
  it('6. 422s a score no real run could reach, and the run is spent', async () => {
    await oldRun()
    expect(await save(body({ score: 999_999, wave: 4 }))).toEqual({ status: 422, json: { ok: false, error: 'score' } })
    expect((await save(body({ score: 100, wave: 4 }))).status).toBe(410)
  })
  it('6. 422s a wave 4 claimed too early, and a game over before the enemies', async () => {
    await createRun(RUN, Date.now() - 5_000)
    expect(await save(body({ score: 1000, wave: 4 }))).toEqual({ status: 422, json: { ok: false, error: 'score' } })
    await oldRun()
    expect(await save(body({ score: 1000, wave: 1 }))).toEqual({ status: 422, json: { ok: false, error: 'score' } })
  })
  it('6. takes the top of the bounds', async () => {
    await oldRun()
    expect((await save(body({ score: maxScoreFor(4, 0), wave: 4 }))).status).toBe(200)
  })
  it('7. 409s a run under the player’s best, with the board', async () => {
    await saveEntry({ playerId: ME, score: 8000, wave: 3, name: 'Ana', city: '', country: '' })
    await oldRun()
    const r = await save(body({ score: 8000 }))
    expect(r.status).toBe(409)
    expect(r.json).toEqual({ ok: false, error: 'not_best', board: { top: [{ rank: 1, name: 'Ana', city: '', country: '', score: 8000, me: true }], total: 1, mine: { rank: 1, name: 'Ana', city: '', country: '', score: 8000, me: true }, at: 1 } })
  })
  it('8. saves a new best and returns the board for the player and score', async () => {
    await saveEntry({ playerId: P(1), score: 20000, wave: 4, name: 'Top', city: '', country: 'US' })
    await saveEntry({ playerId: ME, score: 1000, wave: 2, name: 'Old', city: '', country: '' })
    await oldRun()
    const r = await save(body({ score: 9000, wave: 3, resumes: 2 }))
    expect(r).toEqual({
      status: 200,
      json: {
        ok: true,
        board: {
          top: [{ rank: 1, name: 'Top', city: '', country: 'US', score: 20000 }, { rank: 2, name: 'Ana', city: 'Lisbon', country: 'PT', score: 9000, me: true }],
          total: 2,
          mine: { rank: 2, name: 'Ana', city: 'Lisbon', country: 'PT', score: 9000, me: true },
          at: 2,
        },
      },
    })
    expect(await fakeRedis.hget('sb:development:who', ME)).toMatchObject({ name: 'Ana', wave: 3 })
  })
  it('503s when Redis fails at any step: the limit, the run, the board read, the write', async () => {
    const down = () => Promise.reject(new Error('down'))
    const fails: (() => void)[] = [
      () => { fakeRedis.failNext = true }, // the limit's exec
      () => { jest.spyOn(fakeRedis, 'getdel').mockImplementationOnce(down) },
      () => { jest.spyOn(fakeRedis, 'zrange').mockImplementationOnce(down) }, // step 7's read
      () => { jest.spyOn(fakeRedis, 'zadd').mockImplementationOnce(down) }, // step 8's write
    ]
    for (const fail of fails) {
      fakeRedis.reset()
      await oldRun()
      fail()
      expect(await save(body())).toEqual({ status: 503, json: { ok: false, error: 'unavailable' } })
      jest.restoreAllMocks()
      quiet()
    }
  })
})
