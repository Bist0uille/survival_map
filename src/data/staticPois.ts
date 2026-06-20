import { getCategory } from './categories'
import type { Poi } from '../types'
import type { Bounds } from '../map/MapView'

/** Zone couverte par la base statique (département de l'Aude). */
export const AUDE_BBOX = { south: 42.62, west: 1.65, north: 43.47, east: 3.27 }

export function isInsideAude(lat: number, lon: number): boolean {
  return (
    lat >= AUDE_BBOX.south &&
    lat <= AUDE_BBOX.north &&
    lon >= AUDE_BBOX.west &&
    lon <= AUDE_BBOX.east
  )
}

interface RawPoi {
  id: string
  lat: number
  lon: number
  c: string
  n: string
  t: Record<string, string>
}

let cache: Poi[] | null = null
let loading: Promise<Poi[]> | null = null

/** Charge (une seule fois) la base statique des POI de l'Aude. */
export function loadStaticPois(): Promise<Poi[]> {
  if (cache) return Promise.resolve(cache)
  if (loading) return loading
  loading = fetch('/data/pois.json')
    .then((r) => {
      if (!r.ok) throw new Error(`pois.json ${r.status}`)
      return r.json()
    })
    .then((data: { pois: RawPoi[] }) => {
      cache = data.pois.map((p) => ({
        id: p.id,
        lat: p.lat,
        lon: p.lon,
        categoryId: p.c,
        name: p.n || getCategory(p.c).label,
        tags: p.t ?? {},
        source: 'osm' as const,
      }))
      return cache
    })
    .finally(() => {
      loading = null
    })
  return loading
}

/** Filtre la base par catégories actives et emprise visible (+ petite marge). */
export function filterStatic(
  pois: Poi[],
  activeCategoryIds: string[],
  bounds: Bounds,
): Poi[] {
  const active = new Set(activeCategoryIds)
  const margin = 0.02 // ~2 km de marge autour de la vue
  const s = bounds.south - margin
  const n = bounds.north + margin
  const w = bounds.west - margin
  const e = bounds.east + margin
  return pois.filter(
    (p) =>
      active.has(p.categoryId) &&
      p.lat >= s &&
      p.lat <= n &&
      p.lon >= w &&
      p.lon <= e,
  )
}
