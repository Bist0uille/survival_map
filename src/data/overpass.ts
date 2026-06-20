import { CATEGORIES, categoryForTags } from './categories'
import type { Poi } from '../types'

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter'

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

interface OverpassResponse {
  elements: OverpassElement[]
}

/**
 * Construit le corps d'une requête Overpass pour les catégories actives,
 * autour de (lat, lon) dans un rayon donné (mètres).
 * On ne requête QUE les catégories cochées (garde-fou de charge).
 */
export function buildQuery(
  activeCategoryIds: string[],
  lat: number,
  lon: number,
  radiusM: number,
): string {
  const active = CATEGORIES.filter((c) => activeCategoryIds.includes(c.id))
  const clauses: string[] = []

  for (const cat of active) {
    for (const t of cat.osm) {
      const filter = `["${t.key}"="${t.value}"](around:${radiusM},${lat},${lon})`
      // nodes ET ways (avec centre) — certains POIs sont des surfaces
      clauses.push(`  node${filter};`)
      clauses.push(`  way${filter};`)
    }
  }

  return `[out:json][timeout:25];\n(\n${clauses.join('\n')}\n);\nout center tags;`
}

/** Clé de cache : zone arrondie (~1 km) + catégories triées */
export function cacheKey(
  activeCategoryIds: string[],
  lat: number,
  lon: number,
): string {
  const rlat = lat.toFixed(2)
  const rlon = lon.toFixed(2)
  const cats = [...activeCategoryIds].sort().join('+')
  return `${rlat},${rlon}|${cats}`
}

/** Interroge Overpass et renvoie des POIs typés. */
export async function fetchPois(
  activeCategoryIds: string[],
  lat: number,
  lon: number,
  radiusM = 3000,
): Promise<Poi[]> {
  if (activeCategoryIds.length === 0) return []

  const query = buildQuery(activeCategoryIds, lat, lon, radiusM)
  const res = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(query),
  })

  if (!res.ok) {
    throw new Error(`Overpass ${res.status}: ${res.statusText}`)
  }

  const data: OverpassResponse = await res.json()
  return parseElements(data.elements)
}

function parseElements(elements: OverpassElement[]): Poi[] {
  const pois: Poi[] = []
  for (const el of elements) {
    const tags = el.tags ?? {}
    const cat = categoryForTags(tags)
    if (!cat) continue

    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (lat == null || lon == null) continue

    pois.push({
      id: `${el.type}/${el.id}`,
      lat,
      lon,
      categoryId: cat.id,
      name: tags.name ?? cat.label,
      tags,
      source: 'osm',
    })
  }
  return pois
}
