// Calcul d'itinéraire piéton qui suit les chemins, via BRouter (gratuit,
// sans clé, CORS ouvert). Renvoie la géométrie + distance + dénivelé.

export interface ComputedRoute {
  geometry: GeoJSON.LineString // [lon, lat]
  distanceKm: number
  ascent: number // mètres de montée cumulée
}

const BROUTER = 'https://brouter.de/brouter'

/**
 * Route à pied passant par tous les points (>= 2), profil « trekking ».
 * Lève une erreur si aucun itinéraire n'est trouvé.
 */
export async function computeRoute(
  waypoints: Array<[number, number]>, // [lon, lat]
): Promise<ComputedRoute> {
  if (waypoints.length < 2) throw new Error('Au moins 2 points')
  const lonlats = waypoints.map(([lon, lat]) => `${lon},${lat}`).join('|')
  const url = `${BROUTER}?lonlats=${lonlats}&profile=trekking&alternativeidx=0&format=geojson`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Routage indisponible (' + res.status + ')')
  const data = await res.json()
  const f = data?.features?.[0]
  if (!f?.geometry?.coordinates?.length) throw new Error('Itinéraire introuvable')
  const p = f.properties ?? {}
  const coords2d: Array<[number, number]> = f.geometry.coordinates.map(
    (c: number[]) => [Math.round(c[0] * 1e6) / 1e6, Math.round(c[1] * 1e6) / 1e6],
  )
  return {
    geometry: { type: 'LineString', coordinates: coords2d },
    distanceKm: Math.round(Number(p['track-length'] ?? 0) / 100) / 10,
    ascent: Math.max(0, Math.round(Number(p['filtered ascend'] ?? 0))),
  }
}
