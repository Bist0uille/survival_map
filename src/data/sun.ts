// Infos d'éphémérides utiles au bivouac : lever/coucher du soleil, crépuscule
// et phase de lune, calculés localement (SunCalc, sans réseau) pour un point
// et une date donnés.

import SunCalc from 'suncalc'

export interface SunInfo {
  sunrise: Date | null
  sunset: Date | null
  duskNautical: Date | null // crépuscule nautique (nuit noire installée)
  dawnNautical: Date | null
  dayLengthMin: number | null // durée du jour en minutes
  moonPhase: number // 0..1 (0 = nouvelle lune, 0.5 = pleine lune)
  moonLabel: string // libellé FR de la phase
}

/** Libellé FR d'une phase lunaire (0..1, 0 = nouvelle lune). */
export function moonPhaseLabel(phase: number): string {
  const p = ((phase % 1) + 1) % 1 // normalise dans [0, 1)
  if (p < 0.03 || p > 0.97) return 'Nouvelle lune'
  if (p < 0.22) return 'Premier croissant'
  if (p < 0.28) return 'Premier quartier'
  if (p < 0.47) return 'Gibbeuse croissante'
  if (p < 0.53) return 'Pleine lune'
  if (p < 0.72) return 'Gibbeuse décroissante'
  if (p < 0.78) return 'Dernier quartier'
  return 'Dernier croissant'
}

/** Renvoie une Date valide, ou null si SunCalc renvoie un Invalid Date
 *  (cas des latitudes/époques sans lever ou coucher). */
function valid(d: Date): Date | null {
  return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null
}

/** Éphémérides soleil + lune pour un point (lat, lon) à une date donnée. */
export function getSunInfo(lat: number, lon: number, date: Date): SunInfo {
  const t = SunCalc.getTimes(date, lat, lon)
  const sunrise = valid(t.sunrise)
  const sunset = valid(t.sunset)
  const dayLengthMin =
    sunrise && sunset
      ? Math.round((sunset.getTime() - sunrise.getTime()) / 60000)
      : null
  const phase = SunCalc.getMoonIllumination(date).phase
  return {
    sunrise,
    sunset,
    duskNautical: valid(t.nauticalDusk),
    dawnNautical: valid(t.nauticalDawn),
    dayLengthMin,
    moonPhase: phase,
    moonLabel: moonPhaseLabel(phase),
  }
}

/** Formate une Date en HH:MM (heure locale), ou « — » si absente. */
export function hhmm(d: Date | null): string {
  if (!d) return '—'
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}
