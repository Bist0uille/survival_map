import { useState, useCallback, useRef } from 'react'
import { fetchPois, cacheKey } from '../data/overpass'
import { getCache, putCache } from '../data/db'
import type { Poi } from '../types'

/**
 * Orchestre la récupération des POIs : lit d'abord le cache Dexie,
 * sinon interroge Overpass puis met en cache. Garde-fou de charge.
 */
export function usePois() {
  const [pois, setPois] = useState<Poi[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastKey = useRef<string>('')

  const load = useCallback(
    async (activeCategoryIds: string[], lat: number, lon: number) => {
      if (activeCategoryIds.length === 0) {
        setPois([])
        setError(null)
        return
      }

      const key = cacheKey(activeCategoryIds, lat, lon)
      if (key === lastKey.current && pois.length > 0) return
      lastKey.current = key

      setLoading(true)
      setError(null)
      try {
        const cached = await getCache(key)
        if (cached) {
          setPois(cached.pois)
          setLoading(false)
          return
        }

        const fresh = await fetchPois(activeCategoryIds, lat, lon)
        setPois(fresh)
        await putCache({ key, pois: fresh, fetchedAt: Date.now() })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur de chargement')
      } finally {
        setLoading(false)
      }
    },
    [pois.length],
  )

  return { pois, loading, error, load }
}
