import { useEffect, useState } from 'react'
import { Sunrise, Sunset, Moon, Wind, Droplets, X } from 'lucide-react'
import { getSunInfo, hhmm, type SunInfo } from '../data/sun'
import { fetchWeather, type Weather } from '../data/weather'

interface BivouacPanelProps {
  lat: number
  lon: number
  onClose: () => void
}

/**
 * Panneau « bivouac » : éphémérides soleil/lune (calcul local) + météo
 * (Open-Meteo) pour le centre de la carte. Utile pour décider où/quand camper.
 */
export function BivouacPanel({ lat, lon, onClose }: BivouacPanelProps) {
  const [sun, setSun] = useState<SunInfo | null>(null)
  const [weather, setWeather] = useState<Weather | null>(null)
  const [wError, setWError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setSun(getSunInfo(lat, lon, new Date()))
    let cancelled = false
    setLoading(true)
    setWError(false)
    fetchWeather(lat, lon)
      .then((w) => !cancelled && setWeather(w))
      .catch(() => !cancelled && setWError(true))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [lat, lon])

  return (
    <div className="absolute inset-x-0 bottom-0 z-40 mx-auto max-h-[70vh] w-full max-w-md overflow-auto rounded-t-2xl bg-white p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">Bivouac ici</h2>
        <button onClick={onClose} aria-label="Fermer" className="text-slate-400">
          <X size={20} />
        </button>
      </div>

      {/* Soleil & lune */}
      {sun && (
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <Info icon={<Sunrise size={18} />} label="Lever" value={hhmm(sun.sunrise)} />
          <Info icon={<Sunset size={18} />} label="Coucher" value={hhmm(sun.sunset)} />
          <Info icon={<Moon size={18} />} label="Lune" value={sun.moonLabel} small />
        </div>
      )}
      {sun?.duskNautical && (
        <p className="mb-3 text-center text-xs text-slate-500">
          Nuit noire dès {hhmm(sun.duskNautical)} · jour{' '}
          {sun.dayLengthMin
            ? `${Math.floor(sun.dayLengthMin / 60)} h ${String(
                sun.dayLengthMin % 60,
              ).padStart(2, '0')}`
            : '—'}
        </p>
      )}

      {/* Météo */}
      <div className="border-t border-slate-100 pt-3">
        {loading && <p className="text-center text-sm text-slate-400">Météo…</p>}
        {wError && (
          <p className="text-center text-sm text-slate-400">
            Météo indisponible (hors ligne ?)
          </p>
        )}
        {weather && !loading && (
          <>
            <div className="mb-2 flex items-center justify-center gap-4">
              <span className="text-2xl font-semibold text-slate-800">
                {weather.now.temp}°
              </span>
              <span className="text-sm text-slate-600">{weather.now.label}</span>
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <Wind size={14} /> {weather.now.wind} km/h
              </span>
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <Droplets size={14} /> {weather.now.precip} mm
              </span>
            </div>
            <div className="flex justify-between gap-2">
              {weather.daily.map((d) => (
                <div
                  key={d.date}
                  className="flex-1 rounded-lg bg-slate-50 py-2 text-center"
                >
                  <div className="text-[10px] uppercase text-slate-400">
                    {new Date(d.date).toLocaleDateString('fr-FR', {
                      weekday: 'short',
                    })}
                  </div>
                  <div className="text-sm font-medium text-slate-700">
                    {d.tmax}° / {d.tmin}°
                  </div>
                  <div className="text-[10px] text-slate-400">{d.label}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Info({
  icon,
  label,
  value,
  small,
}: {
  icon: React.ReactNode
  label: string
  value: string
  small?: boolean
}) {
  return (
    <div className="rounded-lg bg-slate-50 py-2">
      <div className="flex justify-center text-slate-500">{icon}</div>
      <div
        className={`mt-1 font-medium text-slate-800 ${small ? 'text-[11px] leading-tight' : 'text-sm'}`}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </div>
    </div>
  )
}
