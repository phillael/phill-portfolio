import { Redis } from '@upstash/redis'

export const runtime = 'nodejs'

// Upstash deletes free-tier databases after 14 days without commands. This
// route exists solely to be hit by the Vercel cron in vercel.json so the
// wizard's rate-limiter database always sees recent activity.
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return Response.json({ error: 'cron_secret_not_configured' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 })
  }

  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    await redis.set('wiz:keepalive', new Date().toISOString())
    return Response.json({ ok: true })
  } catch (err) {
    console.error('wizard keepalive: Redis unreachable', err)
    return Response.json({ error: 'redis_unreachable' }, { status: 503 })
  }
}
