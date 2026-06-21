import { useRef } from 'react'
import { Upload } from 'lucide-react'
import { parseGpx } from '../data/gpx'
import { summarizeRoute } from '../data/routing'
import { toast } from '../data/toast'
import type { PersonalRoute } from '../types'

interface ImportGpxButtonProps {
  onImport: (route: PersonalRoute) => void
}

/** Bouton d'import d'une trace GPX → itinéraire perso (réutilise le pipeline). */
export function ImportGpxButton({ onImport }: ImportGpxButtonProps) {
  const input = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    try {
      const parsed = parseGpx(await file.text())
      if (!parsed) {
        toast('GPX illisible (aucune trace trouvée)', 'error')
        return
      }
      const coords = parsed.geometry.coordinates.map(
        ([lon, lat]) => [lon, lat] as [number, number],
      )
      const s = summarizeRoute(coords, parsed.elevations)
      const route: PersonalRoute = {
        id: 'pr-' + file.name + '-' + coords.length,
        name: parsed.name,
        waypoints: [coords[0], coords[coords.length - 1]],
        geometry: parsed.geometry,
        distanceKm: s.distanceKm,
        ascent: s.ascent,
        descent: s.descent,
        durationMin: s.durationMin,
        profile: s.profile,
        createdAt: Date.now(),
      }
      onImport(route)
      toast(`« ${parsed.name} » importé (${s.distanceKm} km)`, 'success')
    } catch {
      toast('Échec de l’import GPX', 'error')
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".gpx,application/gpx+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = '' // permet de réimporter le même fichier
        }}
      />
      <button
        onClick={() => input.current?.click()}
        className="absolute bottom-[204px] left-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg transition hover:bg-slate-100"
        aria-label="Importer une trace GPX"
        title="Importer une trace GPX"
      >
        <Upload size={20} />
      </button>
    </>
  )
}
