// Logique pure du suivi de trace en direct : à partir des points GPS
// accumulés, calcule distance parcourue, dénivelé positif et géométrie.
// Le hook useTrackRecorder (composant) s'appuie dessus.

import { haversineKm } from './routing'

export interface TrackPoint {
  lon: number
  lat: number
  ele?: number // altitude (m) si disponible
  t: number // timestamp (ms)
}

export interface TrackStats {
  distanceKm: number
  ascent: number // D+ cumulé (m)
  durationMin: number // temps écoulé entre le 1er et le dernier point
  points: number
}

// Seuil de bruit altimétrique : on ignore les micro-variations du GPS pour
// ne pas gonfler le D+ (le bruit vertical d'un GPS grand public est élevé).
const ELE_NOISE_M = 4

/** Calcule les stats cumulées d'une trace (distance, D+, durée). */
export function trackStats(points: TrackPoint[]): TrackStats {
  if (points.length < 2) {
    return { distanceKm: 0, ascent: 0, durationMin: 0, points: points.length }
  }
  let dist = 0
  let ascent = 0
  let refEle = points[0].ele
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    dist += haversineKm([a.lon, a.lat], [b.lon, b.lat])
    // D+ filtré : on n'ajoute que les montées dépassant le seuil de bruit.
    if (b.ele != null && refEle != null) {
      const gain = b.ele - refEle
      if (gain >= ELE_NOISE_M) {
        ascent += gain
        refEle = b.ele
      } else if (gain <= -ELE_NOISE_M) {
        refEle = b.ele // on redescend la référence sans compter la descente
      }
    } else if (b.ele != null) {
      refEle = b.ele
    }
  }
  const durationMin = Math.round((points[points.length - 1].t - points[0].t) / 60000)
  return {
    distanceKm: Math.round(dist * 100) / 100,
    ascent: Math.round(ascent),
    durationMin,
    points: points.length,
  }
}

/** Convertit une trace en LineString [lon, lat] (pour la carte / l'export GPX). */
export function trackToLine(points: TrackPoint[]): GeoJSON.LineString {
  return {
    type: 'LineString',
    coordinates: points.map((p) => [p.lon, p.lat]),
  }
}
