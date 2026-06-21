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

export interface RouteSummary {
  distanceKm: number
  ascent: number
  descent: number
  durationMin: number
  profile: Array<[number, number]>
}

/**
 * Résume un itinéraire à partir de ses coordonnées [lon, lat] et d'altitudes
 * éventuelles (ex. trace GPX importée) : distance, D+/D-, durée estimée et
 * profil. Sans altitudes, le profil est vide et D+/D- valent 0.
 */
export function summarizeRoute(
  coords: Array<[number, number]>,
  elevations?: Array<number | null>,
): RouteSummary {
  let cum = 0
  let ascent = 0
  let descent = 0
  const prof: Array<[number, number]> = []
  const hasEle = !!elevations && elevations.some((e) => e != null)
  let prevEle: number | null = null
  for (let i = 0; i < coords.length; i++) {
    if (i > 0) cum += haversineKm(coords[i - 1], coords[i])
    const ele = elevations?.[i] ?? null
    if (hasEle && ele != null) {
      if (prevEle != null) {
        const d = ele - prevEle
        if (d > 0) ascent += d
        else descent -= d
      }
      prevEle = ele
      prof.push([Math.round(cum * 100) / 100, Math.round(ele)])
    }
  }
  const distanceKm = Math.round(cum * 10) / 10
  return {
    distanceKm,
    ascent: Math.round(ascent),
    descent: Math.round(descent),
    durationMin: hikingMinutes(distanceKm, ascent, descent),
    profile: downsample(prof, 80),
  }
}

export function haversineKm(a: number[], b: number[]): number {
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
export function downsample(
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
export function hikingMinutes(
  km: number,
  ascent: number,
  descent: number,
): number {
  const th = km / 4.5
  const tv = ascent / 300 + descent / 500
  const hours = Math.max(th, tv) + 0.5 * Math.min(th, tv)
  return Math.round(hours * 60)
}

// Profil prioritaire : « hiking-mountain » privilégie fortement les sentiers
// (chemins/sentes) plutôt que les routes. Repli « trekking » si pas de tracé.
const PROFILES = ['hiking-mountain', 'trekking']

interface BrouterFeature {
  geometry: { coordinates: number[][] }
  properties: Record<string, unknown>
}

async function fetchRoute(
  lonlats: string,
  profile: string,
): Promise<BrouterFeature> {
  const url = `${BROUTER}?lonlats=${lonlats}&profile=${profile}&alternativeidx=0&format=geojson`
  const res = await fetch(url)
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const data = await res.json()
  const f = data?.features?.[0]
  if (!f?.geometry?.coordinates?.length) throw new Error('no route')
  return f
}

export async function computeRoute(
  waypoints: Array<[number, number]>, // [lon, lat]
): Promise<ComputedRoute> {
  if (waypoints.length < 2) throw new Error('Au moins 2 points')
  const lonlats = waypoints.map(([lon, lat]) => `${lon},${lat}`).join('|')
  let f: BrouterFeature | null = null
  for (const profile of PROFILES) {
    try {
      f = await fetchRoute(lonlats, profile)
      break
    } catch {
      /* on tente le profil suivant */
    }
  }
  if (!f) throw new Error('Itinéraire introuvable')
  const raw: number[][] = f.geometry.coordinates
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
