import { useState, useCallback } from 'react'

export interface GeoState {
  lat: number
  lon: number
  accuracy: number
}

export function useGeolocation() {
  const [position, setPosition] = useState<GeoState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Géolocalisation non supportée')
      return
    }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    )
  }, [])

  return { position, error, loading, locate }
}
