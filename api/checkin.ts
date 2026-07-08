import { Redis } from '@upstash/redis'
// Extension .js explicite : requise par le runtime ESM des Vercel Functions
// (l'import extensionless casse au déploiement avec ERR_MODULE_NOT_FOUND).
import { validateCheckinBody, applyCheckin, type CheckinRecord } from '../src/data/checkinLogic.js'

/**
 * POST /api/checkin — enregistre un check-in anonyme { id, verdict, lon, lat }.
 * Handler Web standard (Request/Response), exécuté par Vercel Functions.
 */

const HASH_KEY = 'checkins'
const RL_MAX = 30 // check-ins max par IP et par heure
const RL_TTL_S = 3600

function redis(): Redis | null {
  // Le marketplace Vercel/Upstash injecte UPSTASH_* (ou KV_* en legacy).
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  return url && token ? new Redis({ url, token }) : null
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

/** Empreinte anonyme de l'IP (jamais stockée en clair). */
async function ipHash(req: Request): Promise<string> {
  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip))
  return Array.from(new Uint8Array(buf).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function POST(req: Request): Promise<Response> {
  const kv = redis()
  if (!kv) return json(503, { error: 'Backend non configuré' })

  let body: unknown
  try {
    const raw = await req.text()
    if (raw.length > 1024) return json(400, { error: 'Requête invalide' })
    body = JSON.parse(raw)
  } catch {
    return json(400, { error: 'Requête invalide' })
  }
  const checkin = validateCheckinBody(body)
  if (!checkin) return json(400, { error: 'Requête invalide' })

  // Limite de débit par IP hashée.
  const rlKey = `rl:${await ipHash(req)}`
  const n = await kv.incr(rlKey)
  if (n === 1) await kv.expire(rlKey, RL_TTL_S)
  if (n > RL_MAX) return json(429, { error: 'Trop de signalements pour le moment, réessaie plus tard' })

  const prev = await kv.hget<CheckinRecord>(HASH_KEY, checkin.id)
  const next = applyCheckin(prev ?? null, checkin.verdict, Date.now(), checkin.lon, checkin.lat)
  await kv.hset(HASH_KEY, { [checkin.id]: next })
  return json(200, { id: checkin.id, record: next })
}
