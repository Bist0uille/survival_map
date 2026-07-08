import type { FilterSpecification } from 'maplibre-gl'
import { haversineKm } from '../data/routing'

/**
 * Recherche du POI le plus proche d'une catégorie autour d'un point.
 * querySourceFeatures ne voit que les tuiles chargées : on saute donc sur la
 * position (zoom serré), on attend `idle`, et on dézoome progressivement tant
 * que rien n'est trouvé. Marche hors-ligne sur la zone en cache
 * (CachedPmtilesSource sert les tuiles locales).
 */

/** Sous-ensemble de maplibregl.Map utilisé — injectable dans les tests. */
export interface NearestMapLike {
  getCenter(): { lng: number; lat: number }
  getZoom(): number
  jumpTo(opts: { center: [number, number]; zoom: number }): void
  once(ev: 'idle', cb: () => void): void
  querySourceFeatures(
    sourceId: string,
    opts: { sourceLayer?: string; filter?: FilterSpecification },
  ): PoiFeature[]
}

export interface PoiFeature {
  properties?: Record<string, unknown> | null
  geometry: GeoJSON.Geometry
}

export interface NearestResult {
  lon: number
  lat: number
  distanceKm: number
  props: Record<string, unknown>
}

/** Une feature peut apparaître sur plusieurs tuiles : dédup par id. */
export function dedupeById(features: PoiFeature[]): PoiFeature[] {
  const seen = new Set<string>()
  const out: PoiFeature[] = []
  for (const f of features) {
    if (f.geometry.type !== 'Point') continue
    const id = String(f.properties?.id ?? '')
    const key = id || f.geometry.coordinates.join(',')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(f)
  }
  return out
}

/** Le point le plus proche de l'origine ([lon, lat]), à vol d'oiseau. */
export function nearestOf(origin: [number, number], features: PoiFeature[]): NearestResult | null {
  let best: NearestResult | null = null
  for (const f of features) {
    if (f.geometry.type !== 'Point') continue
    const [lon, lat] = f.geometry.coordinates
    const d = haversineKm(origin, [lon, lat])
    if (!best || d < best.distanceKm) best = { lon, lat, distanceKm: d, props: f.properties ?? {} }
  }
  return best
}

function waitIdle(map: NearestMapLike): Promise<void> {
  return new Promise((resolve) => map.once('idle', () => resolve()))
}

export interface FindNearestOpts {
  startZoom?: number
  minZoom?: number
  maxAttempts?: number
  sourceId?: string
  /** Nom de couche des tuiles vecteur ; omettre pour une source GeoJSON. */
  sourceLayer?: string
}

export async function findNearestPoi(
  map: NearestMapLike,
  origin: [number, number],
  categoryId: string,
  opts: FindNearestOpts = {},
): Promise<NearestResult | null> {
  const { startZoom = 13, minZoom = 6, maxAttempts = 4, sourceId = 'pois', sourceLayer } = opts
  const saved = { center: map.getCenter(), zoom: map.getZoom() }
  const filter = ['==', ['get', 'categoryId'], categoryId] as FilterSpecification
  let zoom = startZoom
  for (let i = 0; i < maxAttempts; i++) {
    map.jumpTo({ center: origin, zoom })
    await waitIdle(map)
    const feats = map.querySourceFeatures(
      sourceId,
      sourceLayer ? { sourceLayer, filter } : { filter },
    )
    const best = nearestOf(origin, dedupeById(feats))
    if (best) return best
    if (zoom <= minZoom) break
    zoom = Math.max(minZoom, zoom - 2)
  }
  // Rien trouvé : on rend la caméra à l'utilisateur là où il l'avait laissée.
  map.jumpTo({ center: [saved.center.lng, saved.center.lat], zoom: saved.zoom })
  return null
}
