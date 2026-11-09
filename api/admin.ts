import { createHmac } from 'node:crypto'
import { adminSecret, authenticated, createSession, equalSecret } from '../server/adminAuth.js'
import { redis } from '../server/analytics.js'
import { isSameSiteRequest, json, readLimitedJson } from '../server/security.js'
import { searchConsole } from '../server/searchConsole.js'

const headers = { 'X-Robots-Tag': 'noindex, nofollow, noarchive', Vary: 'Authorization' }
const reply = (status: number, data: unknown, extra = {}) => json(status, data, { ...headers, ...extra })
const LOGIN_QUOTA = `local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],900) end; return n`

export async function POST(req: Request) {
  if (!isSameSiteRequest(req) || !req.headers.get('origin')) return reply(403, { error: 'Origine refusée' })
  const secret = adminSecret()
  if (!secret) return reply(503, { error: 'Accès admin non configuré. Définir ADMIN_PASSWORD côté serveur (24 caractères minimum).' })
  if (req.headers.get('content-type')?.split(';')[0] !== 'application/json') return reply(415, { error: 'JSON requis' })
  let body: { action?: string; password?: string }
  try { body = await readLimitedJson(req.body, 2048) as typeof body } catch { return reply(400, { error: 'Requête invalide' }) }
  if (!body || typeof body !== 'object') return reply(400, { error: 'Requête invalide' })
  if (body.action === 'logout') return reply(200, { ok: true })
  if (body.action !== 'login' || typeof body.password !== 'string') return reply(400, { error: 'Requête invalide' })
  const kv = redis()
  if (!kv) return reply(503, { error: 'Stockage de sécurité non configuré' })
  try {
    const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
    const hash = createHmac('sha256', secret).update(ip).digest('hex')
    const attempts = Number(await kv.eval(LOGIN_QUOTA, [`admin:login:${hash}`], []))
    if (attempts > 10) return reply(429, { error: 'Trop de tentatives. Réessaie dans 15 minutes.' }, { 'Retry-After': '900' })
    if (!equalSecret(body.password, secret)) return reply(401, { error: 'Mot de passe incorrect' })
    return reply(200, { ok: true, token: createSession(secret) })
  } catch { return reply(503, { error: 'Connexion temporairement indisponible' }) }
}

export async function GET(req: Request) {
  const secret = adminSecret()
  if (!secret) return reply(503, { error: 'Accès admin non configuré. Définir ADMIN_PASSWORD côté serveur (24 caractères minimum).' })
  if (!authenticated(req, secret)) return reply(401, { error: 'Connexion requise' })
  const days = Number(new URL(req.url).searchParams.get('days') ?? 28)
  if (![7, 28, 90].includes(days)) return reply(400, { error: 'Période invalide' })
  const kv = redis()
  if (!kv) return reply(503, { error: 'Statistiques non configurées' })
  try {
    const dates = Array.from({ length: days }, (_, i) => new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10))
    const pipeline = kv.pipeline()
    for (const date of dates) pipeline.hgetall(`analytics:v2:${date}`)
    const values = await pipeline.exec<(Record<string, number> | null)[]>()
    let google
    try { google = await searchConsole(days) } catch { google = { connected: false, error: 'Connexion Google indisponible. Vérifie les identifiants, l’API et les droits Search Console.' } }
    return reply(200, {
      enabled: process.env.ANALYTICS_ENABLED === 'true',
      daily: dates.map((date, i) => ({ date, counts: values[i] ?? {} })), google,
      baseline: { source: 'Captures fournies le 9 novembre 2026, fenêtre affichée : 3 mois (dates exactes non confirmées)', clicks: 2, impressions: 135, ctr: 1.5, position: 16.1,
        queries: [['boulangerie autour de moi', 16], ['sources eau potable', 6], ['survival map', 3], ['où trouver une boulangerie autour de moi', 3], ['robinet d’eau autour de moi', 3], ['boulangerie à proximité ouvert actuellement maps', 2], ['point d’eau autour de moi', 2]] },
    })
  } catch { return reply(503, { error: 'Statistiques temporairement indisponibles' }) }
}
