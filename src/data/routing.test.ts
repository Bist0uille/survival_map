import { describe, it, expect } from 'vitest'
import {
  haversineKm,
  hikingMinutes,
  downsample,
  summarizeRoute,
} from './routing'

describe('haversineKm', () => {
  it('renvoie 0 pour deux points identiques', () => {
    expect(haversineKm([3, 43], [3, 43])).toBeCloseTo(0, 6)
  })

  it('≈ 111 km pour 1° de latitude', () => {
    // 1° de méridien ≈ 111,2 km.
    expect(haversineKm([0, 0], [0, 1])).toBeGreaterThan(110)
    expect(haversineKm([0, 0], [0, 1])).toBeLessThan(112)
  })

  it('distance Paris–Marseille ≈ 660 km (±20)', () => {
    const d = haversineKm([2.3522, 48.8566], [5.3698, 43.2965])
    expect(d).toBeGreaterThan(640)
    expect(d).toBeLessThan(680)
  })

  it('est symétrique', () => {
    const a = [1, 2]
    const b = [4, 6]
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 9)
  })
})

describe('hikingMinutes (DIN 33466)', () => {
  it('terrain plat : 4,5 km/h → 9 km en ~120 min', () => {
    expect(hikingMinutes(9, 0, 0)).toBe(120)
  })

  it('combine le plus grand des deux temps + moitié du plus petit', () => {
    // 4,5 km à plat = 1 h (th) ; 300 m D+ = 1 h (tv). max=1 + 0,5*min=0,5 → 1,5 h.
    expect(hikingMinutes(4.5, 300, 0)).toBe(90)
  })

  it('la montée allonge la durée', () => {
    expect(hikingMinutes(5, 600, 0)).toBeGreaterThan(hikingMinutes(5, 0, 0))
  })

  it('renvoie un entier (minutes arrondies)', () => {
    expect(Number.isInteger(hikingMinutes(3.7, 213, 87))).toBe(true)
  })
})

describe('downsample', () => {
  const make = (n: number): Array<[number, number]> =>
    Array.from({ length: n }, (_, i) => [i, i * 10])

  it('laisse le profil intact sous le seuil', () => {
    const p = make(10)
    expect(downsample(p, 80)).toEqual(p)
  })

  it('réduit au plus à ~maxPts points', () => {
    const out = downsample(make(1000), 80)
    expect(out.length).toBeLessThanOrEqual(82)
  })

  it('conserve toujours le dernier point (fin du parcours)', () => {
    const p = make(1000)
    const out = downsample(p, 80)
    expect(out[out.length - 1]).toEqual(p[p.length - 1])
  })

  it('conserve le premier point', () => {
    const out = downsample(make(1000), 80)
    expect(out[0]).toEqual([0, 0])
  })
})

describe('summarizeRoute', () => {
  const coords: Array<[number, number]> = [
    [0, 0],
    [0, 0.5],
    [0, 1],
  ]

  it('calcule la distance sans altitudes', () => {
    const s = summarizeRoute(coords)
    expect(s.distanceKm).toBeGreaterThan(110)
    expect(s.ascent).toBe(0)
    expect(s.descent).toBe(0)
    expect(s.profile).toEqual([])
  })

  it('calcule D+/D- et le profil avec altitudes', () => {
    const s = summarizeRoute(coords, [100, 300, 250])
    expect(s.ascent).toBe(200) // 100→300
    expect(s.descent).toBe(50) // 300→250
    expect(s.profile.length).toBe(3)
    expect(s.profile[0][1]).toBe(100)
  })

  it('ignore les altitudes manquantes (null) sans planter', () => {
    const s = summarizeRoute(coords, [100, null, 200])
    expect(s.ascent).toBe(100)
    expect(s.profile.length).toBe(2)
  })

  it('durée cohérente avec la distance', () => {
    const s = summarizeRoute(coords)
    expect(s.durationMin).toBeGreaterThan(0)
  })
})
