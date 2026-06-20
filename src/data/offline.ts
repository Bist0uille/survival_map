// Téléchargement hors-ligne des tuiles topo de la zone visible.
// On remplit le cache du service worker en récupérant les tuiles : ensuite,
// sans réseau, MapLibre les ressert depuis ce cache.

export interface GeoBounds {
  west: number
  south: number
  east: number
  north: number
}

interface Level {
  z: number
  x0: number
  x1: number
  y0: number
  y1: number
}

export interface TilePlan {
  levels: Level[]
  total: number
  baseZoom: number
  reached: number
}

const OTM_MAXZOOM = 17

function lon2x(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * 2 ** z)
}
function lat2y(lat: number, z: number): number {
  const r = (lat * Math.PI) / 180
  return Math.floor(
    ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z,
  )
}

/**
 * Planifie les tuiles à télécharger pour l'emprise, du zoom courant jusqu'au
 * plus profond possible sans dépasser le budget (nombre de tuiles).
 */
export function planTiles(
  b: GeoBounds,
  baseZoom: number,
  budget = 2500,
): TilePlan {
  const base = Math.max(1, Math.floor(baseZoom))
  const levels: Level[] = []
  let total = 0
  let reached = base
  for (let z = base; z <= OTM_MAXZOOM; z++) {
    const x0 = lon2x(b.west, z)
    const x1 = lon2x(b.east, z)
    const y0 = lat2y(b.north, z)
    const y1 = lat2y(b.south, z)
    const count = (x1 - x0 + 1) * (y1 - y0 + 1)
    if (z > base && total + count > budget) break
    total += count
    reached = z
    levels.push({ z, x0, x1, y0, y1 })
  }
  return { levels, total, baseZoom: base, reached }
}

/** Estimation grossière de la taille (≈ 28 Ko / tuile topo). */
export function estimateBytes(total: number): number {
  return total * 28 * 1024
}

export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko'
  return (bytes / (1024 * 1024)).toFixed(0) + ' Mo'
}

function tileUrls(plan: TilePlan): string[] {
  // Même hôte unique que le style de carte (clés de cache cohérentes).
  const urls: string[] = []
  for (const L of plan.levels) {
    for (let x = L.x0; x <= L.x1; x++) {
      for (let y = L.y0; y <= L.y1; y++) {
        urls.push(`https://a.tile.opentopomap.org/${L.z}/${x}/${y}.png`)
      }
    }
  }
  return urls
}

/** Demande au navigateur un stockage persistant (réduit l'effacement). */
export async function requestPersistent(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}

/**
 * Télécharge toutes les tuiles du plan (le service worker les met en cache).
 * onProgress(fait, total) est appelé régulièrement.
 */
export async function downloadTiles(
  plan: TilePlan,
  onProgress: (done: number, total: number) => void,
  concurrency = 8,
): Promise<void> {
  const urls = tileUrls(plan)
  let idx = 0
  let done = 0
  // Le service worker (CacheFirst, sans expiration) met chaque tuile en cache
  // au passage du fetch ; on évite un double-write en ne re-cachant pas ici.
  async function worker() {
    while (idx < urls.length) {
      const u = urls[idx++]
      try {
        const r = await fetch(u)
        await r.blob()
      } catch {
        // tuile en échec ignorée
      }
      done++
      onProgress(done, urls.length)
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, urls.length) }, () => worker()),
  )
}
