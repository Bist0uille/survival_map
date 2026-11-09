import { Redis } from '@upstash/redis'

export const EVENTS = ['pageview', 'engagement', 'guide_map', 'poi_open', 'filter_change', 'route_start', 'route_saved', 'gpx_import', 'offline_start', 'offline_complete'] as const
export const PATHS = ['/', '/guides/', '/fontaines-eau-potable/', '/ravitaillement-velo/', '/randonnee-bivouac/', '/boulangeries-autour-de-moi/', '/refuges-abris-randonnee/', '/carte-randonnee-hors-ligne/']
export const SOURCES = ['direct', 'internal', 'google', 'bing', 'social', 'other']
export const RETENTION = 183 * 86400
export function redis() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  return url && token ? new Redis({ url, token }) : null
}
export function validateEvent(body: unknown): { event: string; path: string; source: string; seconds?: number } | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const b = body as Record<string, unknown>
  if (Object.keys(b).some(k => !['event', 'path', 'source', 'seconds'].includes(k))) return null
  if (!EVENTS.includes(b.event as typeof EVENTS[number]) || !PATHS.includes(b.path as string) || !SOURCES.includes(b.source as string)) return null
  if (b.event === 'engagement') {
    if (!Number.isInteger(b.seconds) || Number(b.seconds) < 1 || Number(b.seconds) > 15) return null
    return { event: b.event, path: b.path as string, source: b.source as string, seconds: b.seconds as number }
  }
  if ('seconds' in b) return null
  return { event: b.event as string, path: b.path as string, source: b.source as string }
}
// Atomic quotas before writing; no IP, visitor ID, query string or GPS stored.
export const COLLECT = `
local n = redis.call('INCR', KEYS[2])
if n == 1 then redis.call('EXPIRE', KEYS[2], 60) end
if n > 120 then return 0 end
local g = redis.call('INCR', KEYS[3])
if g == 1 then redis.call('EXPIRE', KEYS[3], 60) end
if g > 3000 then return 0 end
if ARGV[1] == 'engagement' then
  redis.call('HINCRBY', KEYS[1], 'visible_seconds', ARGV[5])
else
  redis.call('HINCRBY', KEYS[1], 'event:' .. ARGV[1], 1)
end
if ARGV[1] == 'pageview' then
  redis.call('HINCRBY', KEYS[1], 'page:' .. ARGV[2], 1)
  redis.call('HINCRBY', KEYS[1], 'source:' .. ARGV[3], 1)
end
redis.call('EXPIRE', KEYS[1], ARGV[4])
return 1
`
