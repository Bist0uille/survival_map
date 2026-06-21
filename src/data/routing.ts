// Calcul d'itinéraire piéton qui suit les chemins, via BRouter (gratuit,
// sans clé, CORS ouvert). Renvoie la géométrie + distance + dénivelé +
// profil altimétrique + estimation de durée de marche.

export interface ComputedRoute {
  geometry: GeoJSON.LineString // [lon, lat]
  distanceKm: number
  ascent: number // D+ (m)
  descent: number // D- (m)
  durationMin: number // estimation de marche (min)
  profile: Array<[number, number]> // [distanceKm cumulée, altitude m]
}

const BROUTER = 'https://brouter.de/brouter'

function haversineKm(a: number[], b: number[]): number {
  const R = 6371
  const toR = Math.PI / 180
  const dLat = (b[1] - a[1]) * toR
  const dLon = (b[0] - a[0]) * toR
  const la1 = a[1] * toR
  const la2 = b[1] * toR
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Réduit un profil à ~maxPts points (en gardant le dernier). */
function downsample(
  prof: Array<[number, number]>,
  maxPts = 80,
): Array<[number, number]> {
  if (prof.length <= maxPts) return prof
  const step = Math.ceil(prof.length / maxPts)
  const out: Array<[number, number]> = []
  for (let i = 0; i < prof.length; i += step) out.push(prof[i])
  out.push(prof[prof.length - 1])
  return out
}

/**
 * Estimation de durée de marche (formule type DIN 33466 / Club alpin) :
 * 4,5 km/h à plat, +300 m/h en montée, +500 m/h en descente ; le total
 * combine le plus grand des deux temps + la moitié du plus petit.
 */
function hikingMinutes(km: number, ascent: number, descent: number): number {
  const th = km / 4.5
  const tv = ascent / 300 + descent / 500
  const hours = Math.max(th, tv) + 0.5 * Math.min(th, tv)
  return Math.round(hours * 60)
}

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
  const raw: number[][] = f?.geometry?.coordinates
  if (!raw?.length) throw new Error('Itinéraire introuvable')
  const p = f.properties ?? {}

  // Géométrie 2D pour la carte + profil (distance cumulée / altitude).
  const coords2d: Array<[number, number]> = []
  const prof: Array<[number, number]> = []
  let cum = 0
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]
    coords2d.push([Math.round(c[0] * 1e6) / 1e6, Math.round(c[1] * 1e6) / 1e6])
    if (i > 0) cum += haversineKm(raw[i - 1], c)
    prof.push([Math.round(cum * 100) / 100, Math.round(c[2] ?? 0)])
  }

  const distanceKm =
    Math.round(Number(p['track-length'] ?? cum * 1000) / 100) / 10
  const ascent = Math.max(0, Math.round(Number(p['filtered ascend'] ?? 0)))
  // D- ≈ D+ − dénivelé net (altitude fin − début).
  const net = (raw[raw.length - 1][2] ?? 0) - (raw[0][2] ?? 0)
  const descent = Math.max(0, Math.round(ascent - net))

  return {
    geometry: { type: 'LineString', coordinates: coords2d },
    distanceKm,
    ascent,
    descent,
    durationMin: hikingMinutes(distanceKm, ascent, descent),
    profile: downsample(prof, 80),
  }
}
