import { Redis } from '@upstash/redis'
import type { CheckinRecord } from '../src/data/checkinLogic.js'
import { INDEX, MAX_RECORDS, PAGE_SIZE, RECORDS, RETENTION_MS } from '../server/checkinStore.js'
import { json } from '../server/security.js'

export async function GET(req: Request): Promise<Response> {
  const cursor = new URL(req.url).searchParams.get('cursor') ?? '0'
  if (!/^\d{1,4}$/.test(cursor) || Number(cursor) >= MAX_RECORDS) return json(400, { error: 'Curseur invalide' })
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  if (!url || !token) return json(503, { error: 'Backend non configuré' })
  try {
    const kv = new Redis({ url, token })
    const offset = Number(cursor)
    const ids = await kv.zrange<string[]>(INDEX, Date.now() - RETENTION_MS, '+inf', { byScore: true, offset, count: PAGE_SIZE })
    const records = ids.length ? await kv.hmget<Record<string, CheckinRecord | null>>(RECORDS, ...ids) : {}
    const all = Object.fromEntries(Object.entries(records ?? {}).filter(([, record]) => record !== null))
    return json(200, all, {
      'Cache-Control': 's-maxage=300, stale-while-revalidate=3600',
      'X-Next-Cursor': ids.length === PAGE_SIZE && offset + PAGE_SIZE < MAX_RECORDS ? String(offset + PAGE_SIZE) : '',
    })
  } catch { return json(503, { error: 'Signalements temporairement indisponibles' }) }
}
