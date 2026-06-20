export interface OsmTag {
  key: string
  value: string
}

export interface Category {
  id: string
  label: string
  /** Nom de l'icône Lucide (résolu dans categories.ts) */
  color: string
  /** Combinaisons de tags OSM qui appartiennent à cette catégorie */
  osm: OsmTag[]
}

/** Un point d'intérêt issu d'OSM (Overpass) */
export interface Poi {
  id: string
  lat: number
  lon: number
  categoryId: string
  name: string
  tags: Record<string, string>
  source: 'osm'
}

/** Un point ajouté par l'utilisateur, stocké localement */
export interface PersonalPoint {
  id: string
  lat: number
  lon: number
  categoryId: string
  /** Label libre si pas de catégorie précise (ex. "prise mairie") */
  customLabel?: string
  note?: string
  createdAt: number
}

/** Entrée de cache Overpass dans Dexie */
export interface CacheEntry {
  /** clé = zone arrondie + catégories actives */
  key: string
  pois: Poi[]
  fetchedAt: number
}
