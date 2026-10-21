/** The board's client (src/lib/skills/scoreboard-api.ts): the routes' shapes, failure mappings, the player id and profile. */
import { fetchBoard, loadProfile, playerId, saveProfile, saveScore, startRun } from '@/lib/skills/scoreboard-api'
import type { Board, SaveBody } from '@/lib/scoreboard/types'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const BOARD: Board = { top: [{ rank: 1, name: 'Ana', city: 'Lisbon', country: 'PT', score: 9000, me: true }], total: 1, mine: null, at: 2 }
const BODY: SaveBody = { runId: 'r', playerId: 'p', score: 100, wave: 2, resumes: 0, name: 'Ana', city: '', country: '' }

const reply = (status: number, json?: unknown) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => (json === undefined ? Promise.reject(new SyntaxError('empty')) : Promise.resolve(json)) } as Response)
let fetchMock: jest.Mock
const realFetch = global.fetch

beforeEach(() => {
  fetchMock = jest.fn()
  global.fetch = fetchMock
  localStorage.clear()
})
afterEach(() => {
  global.fetch = realFetch
  jest.restoreAllMocks()
})

describe('startRun', () => {
  it('POSTs {} to /api/skills/run and returns the ticket', async () => {
    fetchMock.mockReturnValue(reply(200, { runId: 'abc', geo: { city: 'Lisbon', country: 'PT' } }))
    expect(await startRun()).toEqual({ runId: 'abc', geo: { city: 'Lisbon', country: 'PT' } })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/skills/run')
    expect(init).toMatchObject({ method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } })
  })
  it('is null on any failure', async () => {
    fetchMock.mockReturnValueOnce(reply(503, { error: 'unavailable' }))
    expect(await startRun()).toBeNull()
    fetchMock.mockReturnValueOnce(reply(429, { error: 'rate_limited' }))
    expect(await startRun()).toBeNull()
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    expect(await startRun()).toBeNull()
    fetchMock.mockReturnValueOnce(reply(200, { nope: 1 }))
    expect(await startRun()).toBeNull()
    fetchMock.mockReturnValueOnce(reply(200, { runId: 'abc' }))
    expect(await startRun()).toBeNull()
  })
  it('is null with no fetch (an old browser, a test)', async () => {
    // @ts-expect-error: the guard is for runtimes without fetch
    delete global.fetch
    expect(await startRun()).toBeNull()
  })
})

describe('fetchBoard', () => {
  it('GETs the board for the player and score, uncached', async () => {
    fetchMock.mockReturnValue(reply(200, BOARD))
    expect(await fetchBoard('p-1', 4200)).toEqual(BOARD)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/skills/scores?player=p-1&score=4200')
    expect(init).toMatchObject({ cache: 'no-store' })
  })
  it('throws when it can’t load', async () => {
    fetchMock.mockReturnValueOnce(reply(503, { error: 'unavailable' }))
    await expect(fetchBoard('p', 1)).rejects.toThrow()
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    await expect(fetchBoard('p', 1)).rejects.toThrow()
    fetchMock.mockReturnValueOnce(reply(200, { top: 'no' }))
    await expect(fetchBoard('p', 1)).rejects.toThrow()
  })
})

describe('saveScore', () => {
  it('POSTs the body as JSON and returns the saved board', async () => {
    fetchMock.mockReturnValue(reply(200, { ok: true, board: BOARD }))
    expect(await saveScore(BODY)).toEqual({ ok: true, board: BOARD })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/skills/scores')
    expect(init).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' } })
    expect(JSON.parse(init.body)).toEqual(BODY)
  })
  it('passes the server’s errors through, with a board when there is one', async () => {
    for (const [status, error] of [[400, 'bad_request'], [422, 'name'], [422, 'city'], [410, 'run'], [422, 'score'], [429, 'rate_limited'], [503, 'unavailable']] as const) {
      fetchMock.mockReturnValueOnce(reply(status, { ok: false, error }))
      expect(await saveScore(BODY)).toEqual({ ok: false, error })
    }
    fetchMock.mockReturnValueOnce(reply(409, { ok: false, error: 'not_best', board: BOARD }))
    expect(await saveScore(BODY)).toEqual({ ok: false, error: 'not_best', board: BOARD })
  })
  it('maps a network failure, an empty or odd answer and no fetch to unavailable', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    expect(await saveScore(BODY)).toEqual({ ok: false, error: 'unavailable' })
    fetchMock.mockReturnValueOnce(reply(403))
    expect(await saveScore(BODY)).toEqual({ ok: false, error: 'unavailable' })
    fetchMock.mockReturnValueOnce(reply(500, { ok: false, error: 'teapot' }))
    expect(await saveScore(BODY)).toEqual({ ok: false, error: 'unavailable' })
    // @ts-expect-error: the guard is for runtimes without fetch
    delete global.fetch
    expect(await saveScore(BODY)).toEqual({ ok: false, error: 'unavailable' })
  })
})

describe('the player id', () => {
  it('is made once and kept in localStorage', () => {
    const id = playerId()
    expect(id).toMatch(UUID)
    expect(localStorage.getItem('skill-blaster-player')).toBe(id)
    expect(playerId()).toBe(id)
  })
  it('keeps one that’s there, and replaces junk', () => {
    localStorage.setItem('skill-blaster-player', '11111111-1111-4111-8111-111111111111')
    expect(playerId()).toBe('11111111-1111-4111-8111-111111111111')
    localStorage.setItem('skill-blaster-player', '<b>nope')
    const id = playerId()
    expect(id).toMatch(UUID)
    expect(localStorage.getItem('skill-blaster-player')).toBe(id)
  })
  it('lasts the page when storage throws', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    const id = playerId()
    expect(id).toMatch(UUID)
    expect(playerId()).toBe(id)
  })
})

describe('the profile', () => {
  it('round-trips name, city and country', () => {
    expect(loadProfile()).toBeNull()
    saveProfile({ name: 'Ana', city: 'Lisbon', country: 'PT' })
    expect(JSON.parse(localStorage.getItem('skill-blaster-profile')!)).toEqual({ name: 'Ana', city: 'Lisbon', country: 'PT' })
    expect(loadProfile()).toEqual({ name: 'Ana', city: 'Lisbon', country: 'PT' })
  })
  it('ignores junk', () => {
    for (const junk of ['{', '"x"', 'null', '{"name":1,"city":"","country":""}', '[]']) {
      localStorage.setItem('skill-blaster-profile', junk)
      expect(loadProfile()).toBeNull()
    }
  })
  it('never throws when storage does', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(loadProfile()).toBeNull()
    expect(() => saveProfile({ name: 'Ana', city: '', country: '' })).not.toThrow()
  })
})
