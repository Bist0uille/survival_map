import { describe, it, expect } from 'vitest'
import { routeToGpx, parseGpx } from './gpx'

const LINE: GeoJSON.LineString = {
  type: 'LineString',
  coordinates: [
    [3.001, 43.18],
    [3.002, 43.181],
    [3.0035, 43.1825],
  ],
}

describe('routeToGpx', () => {
  it('produit un GPX 1.1 valide avec les bons points', () => {
    const gpx = routeToGpx('Ma rando', LINE)
    expect(gpx).toContain('<gpx version="1.1"')
    expect(gpx).toContain('<trkpt lat="43.18" lon="3.001"/>')
    expect(gpx).toContain('<name>Ma rando</name>')
  })

  it('échappe les caractères XML dans le nom', () => {
    const gpx = routeToGpx('A & B <test>', LINE)
    expect(gpx).toContain('A &amp; B &lt;test&gt;')
    expect(gpx).not.toContain('<test>')
  })

  it('utilise un nom par défaut si vide', () => {
    expect(routeToGpx('', LINE)).toContain('<name>Itinéraire</name>')
  })
})

describe('parseGpx', () => {
  it('round-trip : export puis import redonne la même géométrie', () => {
    const parsed = parseGpx(routeToGpx('Boucle', LINE))
    expect(parsed).not.toBeNull()
    expect(parsed!.geometry.coordinates).toEqual(LINE.coordinates)
    expect(parsed!.name).toBe('Boucle')
  })

  it('accepte les points d’itinéraire <rtept>', () => {
    const xml = `<?xml version="1.0"?><gpx version="1.1"><rte><name>R</name>
      <rtept lat="43.1" lon="3.0"/><rtept lat="43.2" lon="3.1"/></rte></gpx>`
    const parsed = parseGpx(xml)
    expect(parsed!.geometry.coordinates).toEqual([
      [3.0, 43.1],
      [3.1, 43.2],
    ])
  })

  it('renvoie null si moins de 2 points', () => {
    const xml = `<?xml version="1.0"?><gpx><trk><trkseg>
      <trkpt lat="43.1" lon="3.0"/></trkseg></trk></gpx>`
    expect(parseGpx(xml)).toBeNull()
  })

  it('renvoie null pour un XML invalide', () => {
    expect(parseGpx('pas du xml <<<')).toBeNull()
  })

  it('ignore les points aux coordonnées non numériques', () => {
    const xml = `<?xml version="1.0"?><gpx><trk><trkseg>
      <trkpt lat="abc" lon="3.0"/>
      <trkpt lat="43.1" lon="3.0"/>
      <trkpt lat="43.2" lon="3.1"/></trkseg></trk></gpx>`
    const parsed = parseGpx(xml)
    expect(parsed!.geometry.coordinates).toHaveLength(2)
  })

  it('capte les altitudes <ele> quand présentes', () => {
    const xml = `<?xml version="1.0"?><gpx><trk><trkseg>
      <trkpt lat="43.1" lon="3.0"><ele>120</ele></trkpt>
      <trkpt lat="43.2" lon="3.1"><ele>180</ele></trkpt></trkseg></trk></gpx>`
    expect(parseGpx(xml)!.elevations).toEqual([120, 180])
  })

  it('met null pour les points sans altitude', () => {
    const parsed = parseGpx(routeToGpx('X', LINE))
    expect(parsed!.elevations).toEqual([null, null, null])
  })

  it('nom par défaut si absent', () => {
    const xml = `<?xml version="1.0"?><gpx><trk><trkseg>
      <trkpt lat="43.1" lon="3.0"/><trkpt lat="43.2" lon="3.1"/></trkseg></trk></gpx>`
    expect(parseGpx(xml)!.name).toBe('Trace importée')
  })
})
