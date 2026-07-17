/**
 * @jest-environment node
 */
import { GET } from '../app/api/wizard/keepalive/route'

const mockSet = jest.fn()

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    set: mockSet,
  })),
}))

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/wizard/keepalive', {
    method: 'GET',
    headers,
  })
}

describe('GET /api/wizard/keepalive', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CRON_SECRET = 'test-cron-secret'
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    mockSet.mockResolvedValue('OK')
  })

  it('touches Redis and returns ok with the correct cron secret', async () => {
    const res = await GET(makeRequest({ authorization: 'Bearer test-cron-secret' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(mockSet).toHaveBeenCalledWith('wiz:keepalive', expect.any(String))
  })

  it('returns 401 without an authorization header', async () => {
    const res = await GET(makeRequest())

    expect(res.status).toBe(401)
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('returns 401 with a wrong secret', async () => {
    const res = await GET(makeRequest({ authorization: 'Bearer wrong' }))

    expect(res.status).toBe(401)
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('returns 500 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET

    const res = await GET(makeRequest({ authorization: 'Bearer test-cron-secret' }))

    expect(res.status).toBe(500)
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('returns 503 when Redis is unreachable', async () => {
    mockSet.mockRejectedValue(new Error('ECONNREFUSED'))

    const res = await GET(makeRequest({ authorization: 'Bearer test-cron-secret' }))

    expect(res.status).toBe(503)
  })
})
