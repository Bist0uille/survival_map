import { Redis } from '@upstash/redis'
import { validateCheckinBody } from '../src/data/checkinLogic.js'
import { contributorHash, isSameSiteRequest, json, readLimitedJson } from '../server/security.js'
import { resolvePoi } from '../server/poi.js'
import { INDEX, MAX_RECORDS, QUOTA_SCRIPT, RECORDS, RETENTION_MS, VOTE_SCRIPT } from '../server/checkinStore.js'

export async function POST(req: Request): Promise<Response> {
  if (!isSameSiteRequest(req)) return json(403, { error: 'Origine refusée' })
  if (req.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return json(415, { error: 'JSON requis' })
  }
  let body: unknown
  try { body = await readLimitedJson(req.body, 1024) } catch { return json(400, { error: 'Requête invalide' }) }
  const checkin = validateCheckinBody(body)
  if (!checkin) return json(400, { error: 'Requête invalide' })
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  if (!url || !token) return json(503, { error: 'Backend non configuré' })
  try {
    const kv = new Redis({ url, token, automaticDeserialization: false })
    const hash = await contributorHash(req, process.env.CHECKIN_IP_HASH_SECRET ?? token)
    const allowed = await kv.eval<[], number>(QUOTA_SCRIPT, [`rl:v2:${hash}`, 'rl:v2:global'], [])
    if (!allowed) return json(429, { error: 'Trop de signalements pour le moment' }, { 'Retry-After': '3600' })
    const duplicateKey = `vote:v2:${hash}:${checkin.id}`
    if (await kv.exists(duplicateKey)) return json(409, { error: 'Tu as déjà signalé ce point cette semaine' })
    const poi = await resolvePoi(checkin.id)
    if (!poi) return json(400, { error: 'Point inconnu ou non pris en charge' })
    const result = await kv.eval<(string | number)[], string[]>(VOTE_SCRIPT, [RECORDS, INDEX, duplicateKey],
      [Date.now(), RETENTION_MS, checkin.id, checkin.verdict, poi.lon, poi.lat, MAX_RECORDS])
    if (result[0] === 'duplicate') return json(409, { error: 'Tu as déjà signalé ce point cette semaine' })
    if (result[0] === 'full') return json(503, { error: 'Signalements temporairement indisponibles' })
    if (result[0] !== 'ok') throw new Error('Invalid Redis result')
    return json(200, { id: checkin.id, record: JSON.parse(result[1]) })
  } catch {
    return json(503, { error: 'Signalement temporairement indisponible, réessaie plus tard' })
  }
}
