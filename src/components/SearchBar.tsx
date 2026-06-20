import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import type { Place } from '../types'

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
  boundingbox?: string[]
}

interface SearchBarProps {
  onSelect: (place: Place) => void
}

/** Recherche de lieu via Nominatim (géocodage OSM), limitée à la France. */
export function SearchBar({ onSelect }: SearchBarProps) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ctrl = useRef<AbortController | null>(null)
  const justPicked = useRef(false)

  // Recherche déclenchée après une courte pause (respecte la charge Nominatim).
  useEffect(() => {
    // Ne pas relancer la recherche quand le champ est rempli par une sélection.
    if (justPicked.current) {
      justPicked.current = false
      return
    }
    const query = q.trim()
    if (query.length < 3) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      ctrl.current?.abort()
      const c = new AbortController()
      ctrl.current = c
      setLoading(true)
      try {
        const url =
          'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=fr&q=' +
          encodeURIComponent(query)
        const res = await fetch(url, {
          signal: c.signal,
          headers: { 'Accept-Language': 'fr' },
        })
        const data: NominatimResult[] = await res.json()
        setResults(
          data.map((d) => ({
            lat: Number(d.lat),
            lon: Number(d.lon),
            bbox: d.boundingbox
              ? ([
                  Number(d.boundingbox[0]),
                  Number(d.boundingbox[1]),
                  Number(d.boundingbox[2]),
                  Number(d.boundingbox[3]),
                ] as [number, number, number, number])
              : undefined,
            label: d.display_name,
          })),
        )
        setOpen(true)
      } catch {
        // requête annulée ou erreur réseau : on ignore
      } finally {
        setLoading(false)
      }
    }, 450)
    return () => clearTimeout(timer)
  }, [q])

  function pick(p: Place) {
    justPicked.current = true
    onSelect(p)
    setOpen(false)
    setQ(p.label.split(',')[0])
  }

  return (
    <div className="pointer-events-auto relative">
      <div className="flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 shadow">
        <Search size={16} className="shrink-0 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Rechercher un lieu…"
          className="w-full bg-transparent text-sm text-slate-700 outline-none"
        />
        {loading && <span className="shrink-0 text-xs text-slate-400">…</span>}
        {q && (
          <button
            onClick={() => {
              setQ('')
              setResults([])
              setOpen(false)
            }}
            className="shrink-0 text-slate-400 hover:text-slate-600"
            aria-label="Effacer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 mt-1 max-h-72 overflow-auto rounded-xl bg-white shadow-lg">
          {results.map((r, i) => (
            <li key={i}>
              <button
                onClick={() => pick(r)}
                className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 last:border-0 hover:bg-slate-100"
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
