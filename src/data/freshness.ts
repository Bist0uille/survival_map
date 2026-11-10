/**
 * Fraîcheur d'un POI : à défaut de métadonnées temporelles dans les tuiles,
 * on interroge l'API OSM en direct (au clic, en ligne seulement) pour afficher
 * la date de dernière modification de l'objet. Les tags `check_date` /
 * `survey:date`, eux, voyagent dans les tuiles (voir osm-to-pmtiles-input.mjs)
 * et fonctionnent hors-ligne.
 */
const OSM_API = 'https://api.openstreetmap.org/api/0.6'

export interface OsmRef {
  type: 'node' | 'way' | 'relation'
  ref: number
}

/**
 * Décode l'id produit par `osmium export --add-unique-id=type_id` :
 * `n<id>` = nœud, `w<id>` = chemin, `a<id>` = aire, dont l'id vaut
 * way_id*2 (pair) ou relation_id*2+1 (impair). Tout le reste (ids
 * synthétiques `x…` du repli statique, vide…) → null.
 */
export function parseOsmId(id: string): OsmRef | null {
  const direct = /^(node|way|relation)\/(\d+)$/.exec(id)
  if (direct) {
    const ref = Number(direct[2])
    return Number.isSafeInteger(ref) && ref > 0 ? { type: direct[1] as OsmRef['type'], ref } : null
  }
  const m = /^([nwa])(\d+)$/.exec(id)
  if (!m) return null
  const n = Number(m[2])
  if (!Number.isSafeInteger(n) || n <= 0) return null
  if (m[1] === 'n') return { type: 'node', ref: n }
  if (m[1] === 'w') return { type: 'way', ref: n }
  return n % 2 === 0 ? { type: 'way', ref: n / 2 } : { type: 'relation', ref: (n - 1) / 2 }
}

// Cache des lookups (promesses) : dédoublonne les clics répétés et évite de
// re-frapper l'API après une erreur (la promesse résolue null reste en cache).
export interface OsmDetails {
  timestamp: string | null
  openingHours: string | null
  hoursChecked: string | null
}
const cache = new Map<string, Promise<OsmDetails | null>>()

/** One request shared by freshness and bakery hours; never required offline. */
export function fetchOsmDetails(id: string): Promise<OsmDetails | null> {
  const parsed = parseOsmId(id)
  if (!parsed) return Promise.resolve(null)
  const key = `${parsed.type}/${parsed.ref}`
  const hit = cache.get(key)
  if (hit) return hit
  const p = fetch(`${OSM_API}/${key}.json`, { signal: AbortSignal.timeout(6000), credentials: 'omit' })
    .then((r) => r.ok ? r.json() : null)
    .then((j): OsmDetails | null => {
      const el = j?.elements?.[0]
      if (!el || el.visible === false) return null
      const tags = el.tags ?? {}
      return {
        timestamp: typeof el.timestamp === 'string' ? el.timestamp : null,
        openingHours: typeof tags.opening_hours === 'string' ? tags.opening_hours : null,
        hoursChecked: typeof tags['check_date:opening_hours'] === 'string' ? tags['check_date:opening_hours'] : null,
      }
    }).catch(() => null)
  cache.set(key, p)
  return p
}

/** Timestamp ISO de dernière modification OSM, ou null (offline, 404, id inconnu…). */
export async function fetchOsmTimestamp(id: string): Promise<string | null> {
  return (await fetchOsmDetails(id))?.timestamp ?? null
}

/** Vide le cache — uniquement pour les tests. */
export function clearFreshnessCache(): void {
  cache.clear()
}

/** "2024-03-12T09:41:00Z" → "12/03/2024" (valeur brute si non parsable). */
export function formatFreshness(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR')
}
