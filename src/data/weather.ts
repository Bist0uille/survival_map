// Prévisions météo via Open-Meteo (gratuit, sans clé). Le parsing est séparé
// du fetch pour être testable indépendamment du réseau.

export interface WeatherNow {
  temp: number // °C
  wind: number // km/h
  precip: number // mm
  code: number // code WMO
  label: string
}

export interface WeatherDay {
  date: string // ISO (YYYY-MM-DD)
  tmax: number
  tmin: number
  precipSum: number
  code: number
  label: string
}

export interface Weather {
  now: WeatherNow
  daily: WeatherDay[]
}

// Libellés FR des codes météo WMO (regroupés par familles).
export function weatherCodeLabel(code: number): string {
  if (code === 0) return 'Ciel clair'
  if (code <= 2) return 'Peu nuageux'
  if (code === 3) return 'Couvert'
  if (code <= 48) return 'Brouillard'
  if (code <= 55) return 'Bruine'
  if (code <= 57) return 'Bruine verglaçante'
  if (code <= 65) return 'Pluie'
  if (code <= 67) return 'Pluie verglaçante'
  if (code <= 75) return 'Neige'
  if (code === 77) return 'Grains de neige'
  if (code <= 82) return 'Averses'
  if (code <= 86) return 'Averses de neige'
  if (code <= 99) return 'Orage'
  return 'Inconnu'
}

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number
    wind_speed_10m?: number
    precipitation?: number
    weather_code?: number
  }
  daily?: {
    time?: string[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
    precipitation_sum?: number[]
    weather_code?: number[]
  }
}

/** Transforme une réponse Open-Meteo en structure Weather. */
export function parseWeather(json: OpenMeteoResponse): Weather {
  const c = json.current ?? {}
  const code = c.weather_code ?? 0
  const now: WeatherNow = {
    temp: Math.round(c.temperature_2m ?? 0),
    wind: Math.round(c.wind_speed_10m ?? 0),
    precip: c.precipitation ?? 0,
    code,
    label: weatherCodeLabel(code),
  }
  const d = json.daily ?? {}
  const days = d.time ?? []
  const daily: WeatherDay[] = days.map((date, i) => {
    const dc = d.weather_code?.[i] ?? 0
    return {
      date,
      tmax: Math.round(d.temperature_2m_max?.[i] ?? 0),
      tmin: Math.round(d.temperature_2m_min?.[i] ?? 0),
      precipSum: d.precipitation_sum?.[i] ?? 0,
      code: dc,
      label: weatherCodeLabel(dc),
    }
  })
  return { now, daily }
}

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast'

/** Récupère la météo (actuelle + 3 jours) pour un point. */
export async function fetchWeather(lat: number, lon: number): Promise<Weather> {
  const url =
    `${ENDPOINT}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    '&current=temperature_2m,wind_speed_10m,precipitation,weather_code' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum' +
    '&timezone=auto&forecast_days=3'
  const res = await fetch(url)
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return parseWeather(await res.json())
}
