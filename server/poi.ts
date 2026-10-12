import { readLimitedJson } from './security.js'

interface OsmElement {
  type: string; id: number; lat?: number; lon?: number; visible?: boolean
  nodes?: number[]; tags?: Record<string, string>
}

const TAGS: Record<string, string[]> = {
  amenity: ['drinking_water', 'fountain', 'water_point', 'toilets', 'shower', 'device_charging_station', 'power_supply', 'public_bookcase', 'cafe', 'restaurant', 'fast_food', 'shelter', 'pharmacy'],
  natural: ['spring', 'peak', 'rock', 'stone'], man_made: ['water_tap'], power: ['outlet'], leisure: ['picnic_table'],
  tourism: ['picnic_site', 'viewpoint', 'alpine_hut', 'wilderness_hut', 'camp_site', 'hostel'],
  shop: ['bakery', 'supermarket', 'convenience', 'grocery', 'laundry'], waterway: ['waterfall'], highway: ['rest_area'],
}

export function eligiblePoi(tags: Record<string, string>): boolean {
  if (tags.amenity === 'shelter' && tags.shelter_type === 'public_transport') return false
  if (tags.amenity === 'charging_station') return ['yes', 'designated'].includes(tags.bicycle)
  return Object.entries(TAGS).some(([key, values]) => values.includes(tags[key]))
}

export function parsePoiId(id: string): { type: 'node' | 'way' | 'relation'; ref: number } | null {
  if (!/^[nwa][1-9]\d{0,11}$/.test(id)) return null
  const ref = Number(id.slice(1))
  if (id[0] === 'n') return { type: 'node', ref }
  if (id[0] === 'w') return { type: 'way', ref }
  return ref % 2 === 0 ? { type: 'way', ref: ref / 2 } : { type: 'relation', ref: (ref - 1) / 2 }
}

export function canonicalPoi(data: unknown, id: string): { lon: number; lat: number } | null {
  const ref = parsePoiId(id)
  const elements = (data as { elements?: OsmElement[] })?.elements
  if (!ref || !Array.isArray(elements)) return null
  const target = elements.find((el) => el.type === ref.type && el.id === ref.ref)
  if (!target || target.visible === false || !target.tags || !eligiblePoi(target.tags)) return null
  const nodes = target.type === 'node' ? [target] : elements.filter((el) => el.type === 'node' && (target.nodes ? target.nodes.includes(el.id) : true))
  if (!nodes.length || nodes.some((n) => !Number.isFinite(n.lon) || !Number.isFinite(n.lat))) return null
  const lon = nodes.reduce((sum, n) => sum + n.lon!, 0) / nodes.length
  const lat = nodes.reduce((sum, n) => sum + n.lat!, 0) / nodes.length
  if (Math.abs(lon) > 180 || Math.abs(lat) > 85) return null
  return { lon, lat }
}

export async function resolvePoi(id: string): Promise<{ lon: number; lat: number } | null> {
  const ref = parsePoiId(id)
  if (!ref) return null
  const suffix = ref.type === 'node' ? '' : '/full'
  const response = await fetch(`https://api.openstreetmap.org/api/0.6/${ref.type}/${ref.ref}${suffix}.json`, {
    signal: AbortSignal.timeout(6000), redirect: 'error',
    headers: { Accept: 'application/json', 'User-Agent': 'Survimap/1.0 (https://survimap.com)' },
  })
  if (response.status === 404 || response.status === 410) return null
  if (!response.ok) throw new Error('OSM unavailable')
  return canonicalPoi(await readLimitedJson(response.body, 512 * 1024), id)
}
