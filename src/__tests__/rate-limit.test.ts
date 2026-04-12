import { checkAndReserve, recordUsage } from '../lib/rate-limit'

const mockGet = jest.fn()
const mockIncr = jest.fn()
const mockIncrby = jest.fn()
const mockExpire = jest.fn()

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: mockGet,
    incr: mockIncr,
    incrby: mockIncrby,
    expire: mockExpire,
  })),
}))

describe('rate-limit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.WIZARD_PER_IP_DAILY_LIMIT = '50'
    process.env.WIZARD_DAILY_BUDGET_TOKENS = '500000'
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
  })

  describe('checkAndReserve', () => {
    it('returns ok when both counters are under cap', async () => {
      mockGet
        .mockResolvedValueOnce('10')
        .mockResolvedValueOnce('100000')

      const result = await checkAndReserve('1.2.3.4')

      expect(result).toEqual({ ok: true })
    })

    it('returns ip_cap when IP counter has hit the limit', async () => {
      mockGet
        .mockResolvedValueOnce('50')
        .mockResolvedValueOnce('100000')

      const result = await checkAndReserve('1.2.3.4')

      expect(result).toEqual({ ok: false, reason: 'ip_cap' })
    })

    it('returns budget when projected tokens would exceed global cap', async () => {
      mockGet
        .mockResolvedValueOnce('10')
        .mockResolvedValueOnce('499000')

      const result = await checkAndReserve('1.2.3.4')

      expect(result).toEqual({ ok: false, reason: 'budget' })
    })

    it('returns unreachable when Upstash throws', async () => {
      mockGet.mockRejectedValue(new Error('ECONNREFUSED'))

      const result = await checkAndReserve('1.2.3.4')

      expect(result).toEqual({ ok: false, reason: 'unreachable' })
    })
  })

  describe('recordUsage', () => {
    it('increments both counters and sets TTL', async () => {
      mockIncr.mockResolvedValue(11)
      mockIncrby.mockResolvedValue(101500)
      mockExpire.mockResolvedValue(1)

      await recordUsage('1.2.3.4', 1500)

      expect(mockIncr).toHaveBeenCalledWith(expect.stringMatching(/^wiz:ip:1\.2\.3\.4:/))
      expect(mockIncrby).toHaveBeenCalledWith(expect.stringMatching(/^wiz:budget:/), 1500)
      expect(mockExpire).toHaveBeenCalledTimes(2)
    })

    it('swallows Upstash errors silently', async () => {
      mockIncr.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(recordUsage('1.2.3.4', 1500)).resolves.toBeUndefined()
    })
  })
})
