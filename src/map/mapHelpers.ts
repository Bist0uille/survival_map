// Helpers purs extraits de MapView : détection PMTiles, repli statique,
// expressions de filtre et fabriques d'éléments DOM pour les marqueurs.
import type maplibregl from 'maplibre-gl'
import { getOfflineBlob } from '../data/db'

const STATIC_JSON = '/data/pois.json' // repli : base statique Aude

export const EMPTY_FC = {
  type: 'FeatureCollection',
  features: [],
} as GeoJSON.FeatureCollection

/**
 * Détecte un fichier pmtiles : lit le blob local (hors-ligne) s'il existe —
 * via sa signature "PMTiles" —, sinon teste le réseau (Range 0-6).
 */
export async function detectPmtiles(
  path: string,
  key: string,
): Promise<{ use: boolean; url: string; blob: Blob | null }> {
  const url = window.location.origin + path
  const blob = await getOfflineBlob(key)
  let use = false
  if (blob) {
    const magic = new TextDecoder().decode(await blob.slice(0, 7).arrayBuffer())
    use = magic === 'PMTiles'
  } else {
    try {
      const res = await fetch(path, { headers: { Range: 'bytes=0-6' } })
      if (res.ok || res.status === 206) {
        const bytes = new Uint8Array(await res.arrayBuffer())
        use = String.fromCharCode(...bytes.slice(0, 7)) === 'PMTiles'
      }
    } catch {
      use = false // hors-ligne / 404
    }
  }
  return { use, url, blob }
}

/** Filtre de couche : ne garder que les catégories actives. */
export function filterExpr(active: string[]): maplibregl.FilterSpecification {
  return ['in', ['get', 'categoryId'], ['literal', active]] as unknown as maplibregl.FilterSpecification
}

/** Filtre de surlignage : ne garder que l'élément à l'id donné. */
export function hlFilter(id: string | null): maplibregl.FilterSpecification {
  return ['==', ['get', 'id'], id ?? '__none__'] as unknown as maplibregl.FilterSpecification
}

/** Charge la base statique Aude en FeatureCollection (mode repli). */
export async function loadStaticFC(): Promise<GeoJSON.FeatureCollection> {
  const r = await fetch(STATIC_JSON)
  const data: {
    pois: Array<{
      id: string
      lat: number
      lon: number
      c: string
      n: string
      t: Record<string, string>
    }>
  } = await r.json()
  return {
    type: 'FeatureCollection',
    features: data.pois.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: { id: p.id, categoryId: p.c, name: p.n, ...p.t },
    })),
  }
}

/** Marqueur numéroté pour une étape d'itinéraire en création. */
export function waypointEl(n: number): HTMLDivElement {
  const el = document.createElement('div')
  el.textContent = String(n)
  el.style.width = '22px'
  el.style.height = '22px'
  el.style.borderRadius = '50%'
  el.style.background = '#ea580c'
  el.style.border = '2px solid #fff'
  el.style.color = '#fff'
  el.style.fontSize = '12px'
  el.style.fontWeight = '700'
  el.style.display = 'flex'
  el.style.alignItems = 'center'
  el.style.justifyContent = 'center'
  el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.4)'
  return el
}

/** Élément DOM pour un marqueur de point perso (avec anneau). */
export function personalMarkerEl(color: string): HTMLDivElement {
  const el = document.createElement('div')
  el.style.width = '16px'
  el.style.height = '16px'
  el.style.borderRadius = '50%'
  el.style.background = color
  el.style.border = '3px solid #fff'
  el.style.outline = '2px solid ' + color
  el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.4)'
  el.style.cursor = 'pointer'
  return el
}
