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
