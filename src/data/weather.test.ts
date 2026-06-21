import { describe, it, expect } from 'vitest'
import { parseWeather, weatherCodeLabel } from './weather'

describe('weatherCodeLabel', () => {
  it('mappe les principaux codes WMO', () => {
    expect(weatherCodeLabel(0)).toBe('Ciel clair')
    expect(weatherCodeLabel(3)).toBe('Couvert')
    expect(weatherCodeLabel(61)).toBe('Pluie')
    expect(weatherCodeLabel(75)).toBe('Neige')
    expect(weatherCodeLabel(95)).toBe('Orage')
  })
})

describe('parseWeather', () => {
  const fixture = {
    current: {
      temperature_2m: 18.4,
      wind_speed_10m: 12.7,
      precipitation: 0.2,
      weather_code: 3,
    },
    daily: {
      time: ['2026-06-21', '2026-06-22'],
      temperature_2m_max: [24.6, 26.1],
      temperature_2m_min: [12.2, 13.8],
      precipitation_sum: [1.5, 0],
      weather_code: [61, 0],
    },
  }

  it('extrait la météo actuelle (arrondie)', () => {
    const w = parseWeather(fixture)
    expect(w.now.temp).toBe(18)
    expect(w.now.wind).toBe(13)
    expect(w.now.precip).toBe(0.2)
    expect(w.now.label).toBe('Couvert')
  })

  it('extrait les jours de prévision avec libellés', () => {
    const w = parseWeather(fixture)
    expect(w.daily).toHaveLength(2)
    expect(w.daily[0]).toMatchObject({
      date: '2026-06-21',
      tmax: 25,
      tmin: 12,
      label: 'Pluie',
    })
    expect(w.daily[1].label).toBe('Ciel clair')
  })

  it('résiste à une réponse vide', () => {
    const w = parseWeather({})
    expect(w.now.temp).toBe(0)
    expect(w.daily).toEqual([])
  })
})
