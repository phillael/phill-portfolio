import { Redis } from '@upstash/redis'

export type CheckResult =
  | { ok: true }
  | { ok: false; reason: 'ip_cap' | 'budget' | 'unreachable' }

/**
 * Tokens reserved against the daily budget before each model call. The real
 * usage is settled afterwards with settleUsage().
 */
export const RESERVED_TOKENS = 2000

const TTL_SECONDS = 26 * 60 * 60

function getRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function budgetKey(): string {
  return `wiz:budget:${todayKey()}`
}

/**
 * Count this request against the IP's daily cap and reserve tokens against
 * the global daily budget, then check both limits.
 *
 * Increment first, check second: the counters update atomically in one
 * transaction, so a burst of parallel requests each sees its own count and
 * can't all slip past the limit (reading the counters and writing them only
 * after the model replied allowed exactly that).
 */
export async function checkAndReserve(ip: string): Promise<CheckResult> {
  const ipLimit = parseInt(process.env.WIZARD_PER_IP_DAILY_LIMIT ?? '50', 10)
  const budgetLimit = parseInt(process.env.WIZARD_DAILY_BUDGET_TOKENS ?? '500000', 10)
  const ipKey = `wiz:ip:${ip}:${todayKey()}`
  const budget = budgetKey()

  try {
    const redis = getRedis()
    const [ipCount, , budgetUsed] = (await redis
      .multi()
      .incr(ipKey)
      .expire(ipKey, TTL_SECONDS)
      .incrby(budget, RESERVED_TOKENS)
      .expire(budget, TTL_SECONDS)
      .exec()) as [number, number, number, number]

    const reason = ipCount > ipLimit ? 'ip_cap' : budgetUsed > budgetLimit ? 'budget' : null
    if (reason) {
      // Rejected requests don't spend tokens; give the reservation back
      await redis.decrby(budget, RESERVED_TOKENS).catch(() => {})
      return { ok: false, reason }
    }
    return { ok: true }
  } catch {
    return { ok: false, reason: 'unreachable' }
  }
}

/**
 * Replace a request's reservation with what it actually used (0 if the model
 * call failed).
 */
export async function settleUsage(tokens: number): Promise<void> {
  try {
    await getRedis().incrby(budgetKey(), tokens - RESERVED_TOKENS)
  } catch {
    // Fail silently — the reservation already gated this request; don't crash
    // the response because Upstash hiccuped
  }
}
