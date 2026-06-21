import { describe, it, expect } from 'vitest'
import { trackStats, trackToLine, type TrackPoint } from './track'

const pt = (lon: number, lat: number, ele: number, t: number): TrackPoint => ({
  lon,
  lat,
  ele,
  t,
})

describe('trackStats', () => {
  it('renvoie des stats nulles sous 2 points', () => {
    expect(trackStats([])).toEqual({
      distanceKm: 0,
      ascent: 0,
      durationMin: 0,
      points: 0,
    })
    expect(trackStats([pt(3, 43, 100, 0)]).distanceKm).toBe(0)
  })

  it('cumule la distance entre les points', () => {
    const s = trackStats([
      pt(0, 0, 0, 0),
      pt(0, 1, 0, 0),
    ])
    expect(s.distanceKm).toBeGreaterThan(110)
    expect(s.distanceKm).toBeLessThan(112)
  })

  it('compte le D+ au-dessus du seuil de bruit', () => {
    const s = trackStats([
      pt(0, 0, 100, 0),
      pt(0, 0.001, 150, 0), // +50 m → compté
      pt(0, 0.002, 148, 0), // -2 m → ignoré (bruit)
      pt(0, 0.003, 200, 0), // +52 m depuis 150 → compté
    ])
    expect(s.ascent).toBe(100)
  })

  it('ignore les micro-variations d’altitude (bruit GPS)', () => {
    const s = trackStats([
      pt(0, 0, 100, 0),
      pt(0, 0.001, 102, 0), // +2 m
      pt(0, 0.002, 101, 0), // -1 m
      pt(0, 0.003, 103, 0), // +1 m
    ])
    expect(s.ascent).toBe(0)
  })

  it('calcule la durée en minutes', () => {
    const s = trackStats([
      pt(0, 0, 0, 0),
      pt(0, 0.01, 0, 30 * 60000),
    ])
    expect(s.durationMin).toBe(30)
  })
})

describe('trackToLine', () => {
  it('produit une LineString [lon, lat]', () => {
    const line = trackToLine([pt(3, 43, 0, 0), pt(3.1, 43.1, 0, 1)])
    expect(line.type).toBe('LineString')
    expect(line.coordinates).toEqual([
      [3, 43],
      [3.1, 43.1],
    ])
  })
})
