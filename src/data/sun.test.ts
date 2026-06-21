import { describe, it, expect } from 'vitest'
import { getSunInfo, moonPhaseLabel, hhmm } from './sun'

// Narbonne, été : le soleil se lève tôt et le jour est long.
const LAT = 43.18
const LON = 3.0

describe('getSunInfo', () => {
  it('donne un lever avant le coucher au solstice d’été', () => {
    const info = getSunInfo(LAT, LON, new Date('2026-06-21T12:00:00Z'))
    expect(info.sunrise).toBeInstanceOf(Date)
    expect(info.sunset).toBeInstanceOf(Date)
    expect(info.sunrise!.getTime()).toBeLessThan(info.sunset!.getTime())
  })

  it('jour plus long en été qu’en hiver', () => {
    const ete = getSunInfo(LAT, LON, new Date('2026-06-21T12:00:00Z'))
    const hiver = getSunInfo(LAT, LON, new Date('2026-12-21T12:00:00Z'))
    expect(ete.dayLengthMin!).toBeGreaterThan(hiver.dayLengthMin!)
    // À cette latitude, ~15 h l'été, ~9 h l'hiver.
    expect(ete.dayLengthMin!).toBeGreaterThan(14 * 60)
    expect(hiver.dayLengthMin!).toBeLessThan(10 * 60)
  })

  it('expose une phase de lune dans [0,1] et un libellé', () => {
    const info = getSunInfo(LAT, LON, new Date('2026-06-21T12:00:00Z'))
    expect(info.moonPhase).toBeGreaterThanOrEqual(0)
    expect(info.moonPhase).toBeLessThanOrEqual(1)
    expect(info.moonLabel.length).toBeGreaterThan(0)
  })
})

describe('moonPhaseLabel', () => {
  it('0 → nouvelle lune, 0.5 → pleine lune', () => {
    expect(moonPhaseLabel(0)).toBe('Nouvelle lune')
    expect(moonPhaseLabel(0.5)).toBe('Pleine lune')
  })

  it('0.25 → premier quartier, 0.75 → dernier quartier', () => {
    expect(moonPhaseLabel(0.25)).toBe('Premier quartier')
    expect(moonPhaseLabel(0.75)).toBe('Dernier quartier')
  })

  it('normalise les valeurs hors [0,1)', () => {
    expect(moonPhaseLabel(1)).toBe('Nouvelle lune')
    expect(moonPhaseLabel(-0.5)).toBe('Pleine lune')
  })
})

describe('hhmm', () => {
  it('formate en HH:MM avec zéros', () => {
    const d = new Date(2026, 5, 21, 6, 5)
    expect(hhmm(d)).toBe('06:05')
  })

  it('renvoie un tiret si la date est nulle', () => {
    expect(hhmm(null)).toBe('—')
  })
})
