import { haversineKm } from './routing'

/**
 * Enrichissement live des fiches refuges/points d'eau via l'API Refuges.info
 * (CC-BY-SA) : consultation au clic uniquement, jamais de redistribution —
 * l'attribution est portée par le lien vers la fiche. Erreurs silencieuses.
 */

export interface RefugeInfo {
  nom: string
  url: string
  type?: string
  places?: number
  eau?: string
  dateMaj?: string
}

const API = 'https://www.refuges.info/api/bbox'
const MAX_DIST_KM = 0.15 // correspondance : point à moins de 150 m du clic

interface RefugesApiFeature {
  geometry?: { type?: string; coordinates?: number[] }
  properties?: {
    nom?: string
    lien?: string
    sym?: string
    type?: { valeur?: string }
    places?: { valeur?: number | string }
    remarque?: { 'valeur_brute'?: string }
    date?: { derniere_modif?: string }
    info_comp?: { eau?: { valeur?: number | string } }
  }
}

/** Interprète la réponse de l'API : le point exploitable le plus proche, ou null. */
export function parseRefugesResponse(
  data: unknown,
  lon: number,
  lat: number,
): RefugeInfo | null {
  const features = (data as { features?: RefugesApiFeature[] })?.features
  if (!Array.isArray(features)) return null
  let best: { d: number; f: RefugesApiFeature } | null = null
  for (const f of features) {
    const c = f.geometry?.coordinates
    if (!Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue
    const d = haversineKm([lon, lat], [c[0], c[1]])
    if (d > MAX_DIST_KM) continue
    if (!best || d < best.d) best = { d, f }
  }
  if (!best) return null
  const p = best.f.properties ?? {}
  if (!p.nom || !p.lien) return null
  const info: RefugeInfo = { nom: String(p.nom), url: String(p.lien) }
  if (p.type?.valeur) info.type = String(p.type.valeur)
  const places = Number(p.places?.valeur)
  if (Number.isFinite(places) && places > 0) info.places = places
  const eau = Number(p.info_comp?.eau?.valeur)
  if (eau === 1) info.eau = 'eau à proximité'
  if (p.date?.derniere_modif) info.dateMaj = String(p.date.derniere_modif).slice(0, 10)
  return info
}

const cache = new Map<string, Promise<RefugeInfo | null>>()

/** Fiche Refuges.info correspondant à un point (± 150 m), ou null. */
export function fetchRefugeInfo(lon: number, lat: number): Promise<RefugeInfo | null> {
  const key = `${lon.toFixed(4)},${lat.toFixed(4)}`
  const hit = cache.get(key)
  if (hit) return hit
  const d = 0.003 // ~300 m de demi-fenêtre
  const bbox = `${lon - d},${lat - d},${lon + d},${lat + d}`
  const p: Promise<RefugeInfo | null> = fetch(
    `${API}?bbox=${bbox}&format=geojson&detail=complet&nb_points=20`,
  )
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => (j ? parseRefugesResponse(j, lon, lat) : null))
    .catch(() => null)
  cache.set(key, p)
  return p
}

/** Vide le cache — uniquement pour les tests. */
export function clearRefugesCache(): void {
  cache.clear()
}
