import { checkAndReserve, settleUsage, RESERVED_TOKENS } from '../lib/rate-limit'

// Each multi() call records its commands and resolves exec() with the next
// queued result set
const mockExecResults: unknown[][] = []
const mockCommands: [string, ...unknown[]][][] = []
const mockDecrby = jest.fn()
const mockIncrby = jest.fn()

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    multi: () => {
      const cmds: [string, ...unknown[]][] = []
      mockCommands.push(cmds)
      const tx = {
        incr: (...a: unknown[]) => (cmds.push(['incr', ...a]), tx),
        incrby: (...a: unknown[]) => (cmds.push(['incrby', ...a]), tx),
        expire: (...a: unknown[]) => (cmds.push(['expire', ...a]), tx),
        exec: async () => {
          const next = mockExecResults.shift()
          if (next instanceof Error) throw next
          return next
        },
      }
      return tx
    },
    decrby: mockDecrby,
    incrby: mockIncrby,
  })),
}))

describe('rate-limit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockExecResults.length = 0
    mockCommands.length = 0
    mockDecrby.mockResolvedValue(0)
    mockIncrby.mockResolvedValue(0)
    process.env.WIZARD_PER_IP_DAILY_LIMIT = '50'
    process.env.WIZARD_DAILY_BUDGET_TOKENS = '500000'
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
  })

  describe('checkAndReserve', () => {
    it('counts the request and reserves budget up front, in one transaction', async () => {
      mockExecResults.push([10, 1, 100000, 1])

      const result = await checkAndReserve('1.2.3.4')

      expect(result).toEqual({ ok: true })
      const [cmds] = mockCommands
      expect(cmds).toContainEqual(['incr', expect.stringMatching(/^wiz:ip:1\.2\.3\.4:/)])
      expect(cmds).toContainEqual(['incrby', expect.stringMatching(/^wiz:budget:/), RESERVED_TOKENS])
      expect(cmds.filter(([c]) => c === 'expire')).toHaveLength(2)
    })

    it('allows the request that reaches the IP limit exactly', async () => {
      mockExecResults.push([50, 1, 100000, 1])

      expect(await checkAndReserve('1.2.3.4')).toEqual({ ok: true })
    })

    it('returns ip_cap and refunds the reservation once the IP is over its limit', async () => {
      mockExecResults.push([51, 1, 100000, 1])

      const result = await checkAndReserve('1.2.3.4')

      expect(result).toEqual({ ok: false, reason: 'ip_cap' })
      expect(mockDecrby).toHaveBeenCalledWith(expect.stringMatching(/^wiz:budget:/), RESERVED_TOKENS)
    })

    it('returns budget and refunds the reservation when it would exceed the global cap', async () => {
      mockExecResults.push([10, 1, 500001, 1])

      const result = await checkAndReserve('1.2.3.4')

      expect(result).toEqual({ ok: false, reason: 'budget' })
      expect(mockDecrby).toHaveBeenCalledWith(expect.stringMatching(/^wiz:budget:/), RESERVED_TOKENS)
    })

    it('rejects a burst of parallel requests past the IP limit', async () => {
      // The counter increments atomically, so each request sees its own count
      for (let n = 49; n <= 53; n++) mockExecResults.push([n, 1, 100000, 1])

      const results = await Promise.all(
        Array.from({ length: 5 }, () => checkAndReserve('1.2.3.4')),
      )

      expect(results.filter((r) => r.ok)).toHaveLength(2)
    })

    it('returns unreachable when Upstash throws', async () => {
      mockExecResults.push(new Error('ECONNREFUSED') as unknown as unknown[])

      const result = await checkAndReserve('1.2.3.4')

      expect(result).toEqual({ ok: false, reason: 'unreachable' })
    })
  })

  describe('settleUsage', () => {
    it('adjusts the budget by the difference between actual and reserved tokens', async () => {
      mockIncrby.mockResolvedValue(101500)

      await settleUsage(3500)

      expect(mockIncrby).toHaveBeenCalledWith(
        expect.stringMatching(/^wiz:budget:/),
        3500 - RESERVED_TOKENS,
      )
    })

    it('refunds the whole reservation when nothing was spent', async () => {
      await settleUsage(0)

      expect(mockIncrby).toHaveBeenCalledWith(expect.stringMatching(/^wiz:budget:/), -RESERVED_TOKENS)
    })

    it('swallows Upstash errors silently', async () => {
      mockIncrby.mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(settleUsage(1500)).resolves.toBeUndefined()
    })
  })
})
