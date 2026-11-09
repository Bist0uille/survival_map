import { createHmac } from 'node:crypto'
import { adminSecret } from '../server/adminAuth.js'
import { COLLECT, redis, RETENTION, validateEvent } from '../server/analytics.js'
import { isSameSiteRequest, json, readLimitedJson } from '../server/security.js'

export async function POST(req: Request) {
  if (!isSameSiteRequest(req) || !req.headers.get('origin')) return json(403, { error: 'Origine refusée' })
  if (req.headers.get('content-type')?.split(';')[0] !== 'application/json') return json(415, { error: 'JSON requis' })
  const secret = adminSecret()
  if (!secret || process.env.ANALYTICS_ENABLED !== 'true') return new Response(null, { status: 204 })
  let event
  try { event = validateEvent(await readLimitedJson(req.body, 512)) } catch { return json(400, { error: 'Requête invalide' }) }
  if (!event) return json(400, { error: 'Requête invalide' })
  if (/bot|spider|crawler|headless/i.test(req.headers.get('user-agent') ?? '')) return new Response(null, { status: 204 })
  const kv = redis()
  if (!kv) return json(503, { error: 'Mesure indisponible' })
  const day = new Date().toISOString().slice(0, 10)
  const minute = Math.floor(Date.now() / 60000)
  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  const hash = createHmac('sha256', secret).update(`${minute}:${ip}`).digest('hex')
  try {
    const ok = await kv.eval(COLLECT, [`analytics:v2:${day}`, `analytics:quota:${minute}:${hash}`, `analytics:global:${minute}`], [event.event, event.path, event.source, RETENTION, event.seconds ?? 0])
    return new Response(null, { status: ok ? 204 : 429, headers: { 'Cache-Control': 'no-store' } })
  } catch { return json(503, { error: 'Mesure indisponible' }) }
}
