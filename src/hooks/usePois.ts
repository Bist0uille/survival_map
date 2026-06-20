import { useState, useCallback, useRef } from 'react'
import { fetchPois, cacheKey } from '../data/overpass'
import { getCache, putCache } from '../data/db'
import { isInsideAude, loadStaticPois, filterStatic } from '../data/staticPois'
import type { Poi } from '../types'
import type { Bounds } from '../map/MapView'

/**
 * Fournit les POI à afficher :
 *  - dans l'Aude : base statique pré-calculée, filtrée en mémoire par
 *    emprise visible → instantané ;
 *  - hors zone (ou si la base échoue) : Overpass en direct, avec cache.
 */
export function usePois() {
  const [pois, setPois] = useState<Poi[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const staticData = useRef<Poi[] | null>(null)
  const lastOverpassKey = useRef<string>('')

  const overpass = useCallback(
    async (activeIds: string[], lat: number, lon: number) => {
      const key = cacheKey(activeIds, lat, lon)
      if (key === lastOverpassKey.current) return
      lastOverpassKey.current = key
      setLoading(true)
      setError(null)
      try {
        const cached = await getCache(key)
        if (cached) {
          setPois(cached.pois)
          return
        }
        const fresh = await fetchPois(activeIds, lat, lon)
        setPois(fresh)
        await putCache({ key, pois: fresh, fetchedAt: Date.now() })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur de chargement')
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const load = useCallback(
    async (
      activeCategoryIds: string[],
      lat: number,
      lon: number,
      bounds: Bounds,
    ) => {
      if (activeCategoryIds.length === 0) {
        setPois([])
        setError(null)
        return
      }

      if (isInsideAude(lat, lon)) {
        try {
          if (!staticData.current) {
            setLoading(true)
            staticData.current = await loadStaticPois()
          }
          setError(null)
          setPois(filterStatic(staticData.current, activeCategoryIds, bounds))
          return
        } catch {
          // base indisponible → on bascule sur Overpass
        } finally {
          setLoading(false)
        }
      }

      await overpass(activeCategoryIds, lat, lon)
    },
    [overpass],
  )

  return { pois, loading, error, load }
}
