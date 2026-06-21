import { useState } from 'react'
import {
  X,
  Undo2,
  Trash2,
  Save,
  Ruler,
  TrendingUp,
  Clock,
  Loader2,
} from 'lucide-react'
import type { ComputedRoute } from '../data/routing'
import { ElevationProfile } from './ElevationProfile'

function fmtMin(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m} min`
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

interface RouteBuilderProps {
  count: number
  draft: ComputedRoute | null
  computing: boolean
  error: string | null
  onUndo: () => void
  onClear: () => void
  onSave: (name: string) => void
  onCancel: () => void
}

export function RouteBuilder({
  count,
  draft,
  computing,
  error,
  onUndo,
  onClear,
  onSave,
  onCancel,
}: RouteBuilderProps) {
  const [name, setName] = useState('')

  return (
    <div className="pointer-events-none absolute bottom-4 left-2 right-2 z-30 flex justify-center">
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-white p-3 shadow-xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            Créer un itinéraire
          </h2>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-2 text-xs text-slate-500">
          {count === 0
            ? 'Touche la carte pour poser le départ, puis les étapes — le tracé suit les chemins.'
            : `${count} point(s) · le tracé suit les sentiers`}
        </p>

        <div className="mb-2 flex items-center gap-3 text-sm">
          {computing ? (
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Loader2 size={14} className="animate-spin" /> calcul…
            </span>
          ) : draft ? (
            <>
              <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                <Ruler size={15} /> {draft.distanceKm} km
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                <TrendingUp size={15} /> D+ {draft.ascent} m
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                <Clock size={15} /> ≈ {fmtMin(draft.durationMin)}
              </span>
            </>
          ) : error ? (
            <span className="text-xs text-red-600">{error}</span>
          ) : (
            <span className="text-xs text-slate-400">
              Ajoute au moins 2 points
            </span>
          )}
        </div>

        {draft && draft.profile.length > 1 && (
          <div className="mb-3">
            <ElevationProfile profile={draft.profile} />
          </div>
        )}

        <div className="mb-2 flex gap-2">
          <button
            onClick={onUndo}
            disabled={count === 0}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-300 py-2 text-xs font-medium text-slate-600 disabled:opacity-40"
          >
            <Undo2 size={14} /> Annuler
          </button>
          <button
            onClick={onClear}
            disabled={count === 0}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-300 py-2 text-xs font-medium text-slate-600 disabled:opacity-40"
          >
            <Trash2 size={14} /> Effacer
          </button>
        </div>

        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de l'itinéraire"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={() => onSave(name.trim() || 'Mon itinéraire')}
            disabled={!draft}
            className="flex shrink-0 items-center justify-center gap-1 rounded-lg bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-40"
          >
            <Save size={15} /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
