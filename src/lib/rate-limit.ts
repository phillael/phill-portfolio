import { Redis } from '@upstash/redis'

export type CheckResult =
  | { ok: true }
  | { ok: false; reason: 'ip_cap' | 'budget' | 'unreachable' }

function getRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function checkAndReserve(ip: string): Promise<CheckResult> {
  const ipLimit = parseInt(process.env.WIZARD_PER_IP_DAILY_LIMIT ?? '50', 10)
  const budgetLimit = parseInt(process.env.WIZARD_DAILY_BUDGET_TOKENS ?? '500000', 10)
  const date = todayKey()
  const ipKey = `wiz:ip:${ip}:${date}`
  const budgetKey = `wiz:budget:${date}`

  try {
    const redis = getRedis()
    const [ipCountRaw, budgetRaw] = await Promise.all([
      redis.get<string>(ipKey),
      redis.get<string>(budgetKey),
    ])

    const ipCount = parseInt(ipCountRaw ?? '0', 10)
    const budget = parseInt(budgetRaw ?? '0', 10)

    if (ipCount >= ipLimit) return { ok: false, reason: 'ip_cap' }
    if (budget + 2000 > budgetLimit) return { ok: false, reason: 'budget' }
    return { ok: true }
  } catch {
    return { ok: false, reason: 'unreachable' }
  }
}

export async function recordUsage(ip: string, tokens: number): Promise<void> {
  const date = todayKey()
  const ipKey = `wiz:ip:${ip}:${date}`
  const budgetKey = `wiz:budget:${date}`
  const ttlSeconds = 26 * 60 * 60

  try {
    const redis = getRedis()
    await Promise.all([
      redis.incr(ipKey),
      redis.expire(ipKey, ttlSeconds),
      redis.incrby(budgetKey, tokens),
      redis.expire(budgetKey, ttlSeconds),
    ])
  } catch {
    // Fail silently — pre-check already gated; don't crash response because Upstash hiccuped
  }
}
