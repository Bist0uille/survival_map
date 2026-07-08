import { useState, useCallback } from 'react'

export interface GeoState {
  lat: number
  lon: number
  accuracy: number
}

const GEO_OPTS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }

/** Position GPS one-shot en promesse, messages d'erreur en français. */
export function getCurrentPositionAsync(): Promise<GeoState> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Géolocalisation non supportée par cet appareil'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Localisation refusée — autorise l'accès à ta position"
              : 'Position introuvable, réessaie',
          ),
        ),
      GEO_OPTS,
    )
  })
}

export function useGeolocation() {
  const [position, setPosition] = useState<GeoState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const locate = useCallback(() => {
    setLoading(true)
    setError(null)
    getCurrentPositionAsync()
      .then(setPosition)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { position, error, loading, locate }
}
