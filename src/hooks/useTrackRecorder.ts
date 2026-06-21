import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import {
  trackStats,
  trackToLine,
  type TrackPoint,
  type TrackStats,
} from '../data/track'

export type RecorderStatus = 'idle' | 'recording' | 'paused'

export interface TrackRecorder {
  status: RecorderStatus
  stats: TrackStats
  geometry: GeoJSON.LineString | null
  points: TrackPoint[]
  error: string | null
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => void
  reset: () => void
}

/**
 * Enregistre une trace GPS en direct via watchPosition. Accumule les points
 * (filtrés des positions trop imprécises) et expose les stats live + la
 * géométrie pour l'affichage carte. La logique de calcul vit dans data/track.
 */
export function useTrackRecorder(): TrackRecorder {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [points, setPoints] = useState<TrackPoint[]>([])
  const [error, setError] = useState<string | null>(null)
  const watchId = useRef<number | null>(null)
  const paused = useRef(false)

  const clearWatch = useCallback(() => {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
  }, [])

  // Sécurité : on coupe le watch si le composant est démonté.
  useEffect(() => clearWatch, [clearWatch])

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Géolocalisation non supportée')
      return
    }
    setError(null)
    setPoints([])
    paused.current = false
    setStatus('recording')
    clearWatch()
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (paused.current) return
        // On écarte les points trop imprécis (> 50 m) pour ne pas polluer.
        if (pos.coords.accuracy > 50) return
        setPoints((prev) => [
          ...prev,
          {
            lon: pos.coords.longitude,
            lat: pos.coords.latitude,
            ele: pos.coords.altitude ?? undefined,
            t: pos.timestamp,
          },
        ])
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    )
  }, [clearWatch])

  const pause = useCallback(() => {
    paused.current = true
    setStatus('paused')
  }, [])

  const resume = useCallback(() => {
    paused.current = false
    setStatus('recording')
  }, [])

  const stop = useCallback(() => {
    clearWatch()
    paused.current = false
    setStatus('idle')
  }, [clearWatch])

  const reset = useCallback(() => {
    clearWatch()
    paused.current = false
    setPoints([])
    setStatus('idle')
    setError(null)
  }, [clearWatch])

  const stats = useMemo(() => trackStats(points), [points])
  const geometry = useMemo(
    () => (points.length >= 2 ? trackToLine(points) : null),
    [points],
  )

  return {
    status,
    stats,
    geometry,
    points,
    error,
    start,
    pause,
    resume,
    stop,
    reset,
  }
}
