// Export d'un itinéraire en fichier GPX (trace) téléchargeable.

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function routeToGpx(name: string, geometry: GeoJSON.LineString): string {
  const seg = geometry.coordinates
    .map(([lon, lat]) => `<trkpt lat="${lat}" lon="${lon}"/>`)
    .join('')
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Survival Map" xmlns="http://www.topografix.com/GPX/1/1">
<trk><name>${esc(name || 'Itinéraire')}</name><trkseg>${seg}</trkseg></trk>
</gpx>`
}

export const MAX_GPX_BYTES = 5 * 1024 * 1024
export const MAX_GPX_POINTS = 20000

export interface ParsedGpx {
  name: string
  geometry: GeoJSON.LineString
  elevations: Array<number | null> // altitude (m) par point, null si absente
}

/**
 * Parse un fichier GPX (trace ou itinéraire) en LineString [lon, lat] +
 * altitudes éventuelles (<ele>). Accepte les points de trace (<trkpt>) et
 * d'itinéraire (<rtept>). Renvoie null si invalide ou < 2 points.
 */
export function parseGpx(xml: string): ParsedGpx | null {
  if (xml.length > MAX_GPX_BYTES || new TextEncoder().encode(xml).byteLength > MAX_GPX_BYTES) return null
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) return null
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) return null

  const pts = Array.from(doc.querySelectorAll('trkpt, rtept'))
  if (pts.length > MAX_GPX_POINTS) return null
  const coords: GeoJSON.Position[] = []
  const elevations: Array<number | null> = []
  for (const p of pts) {
    const rawLat = p.getAttribute('lat')?.trim()
    const rawLon = p.getAttribute('lon')?.trim()
    if (!rawLat || !rawLon) continue
    const lat = Number(rawLat)
    const lon = Number(rawLon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 85 || Math.abs(lon) > 180) continue
    coords.push([lon, lat])
    const eleTxt = p.querySelector('ele')?.textContent
    const ele = eleTxt != null ? Number(eleTxt) : NaN
    elevations.push(Number.isFinite(ele) ? ele : null)
  }
  if (coords.length < 2) return null

  const name = doc.querySelector('trk > name, rte > name, metadata > name')
    ?.textContent?.trim()
  return {
    name: name || 'Trace importée',
    geometry: { type: 'LineString', coordinates: coords },
    elevations,
  }
}

export function downloadGpx(name: string, geometry: GeoJSON.LineString): void {
  const blob = new Blob([routeToGpx(name, geometry)], {
    type: 'application/gpx+xml',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = (name || 'itineraire').replace(/[^\w-]+/g, '_') + '.gpx'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
