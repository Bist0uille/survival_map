import { Redis } from '@upstash/redis'
import type { CheckinRecord } from '../src/data/checkinLogic.js'

/**
 * GET /api/checkins — tous les check-ins agrégés { [poiId]: CheckinRecord }.
 * Mis en cache par le CDN (s-maxage) : la lecture ne coûte quasi rien.
 */

const HASH_KEY = 'checkins'

export async function GET(): Promise<Response> {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  if (!url || !token) {
    return new Response(JSON.stringify({ error: 'Backend non configuré' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const kv = new Redis({ url, token })
  const all = (await kv.hgetall<Record<string, CheckinRecord>>(HASH_KEY)) ?? {}
  return new Response(JSON.stringify(all), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=300, stale-while-revalidate=3600',
    },
  })
}
