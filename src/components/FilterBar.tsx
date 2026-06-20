import { Route as RouteIcon } from 'lucide-react'
import { CATEGORIES } from '../data/categories'

interface FilterBarProps {
  active: Set<string>
  onToggle: (id: string) => void
  showRoutes: boolean
  onToggleRoutes: () => void
  resultCount: number
  loading: boolean
  error: string | null
}

export function FilterBar({
  active,
  onToggle,
  showRoutes,
  onToggleRoutes,
  resultCount,
  loading,
  error,
}: FilterBarProps) {
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-14 z-10 flex flex-col gap-2 p-2">
      <div className="pointer-events-auto flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={onToggleRoutes}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition ${
            showRoutes
              ? 'border-transparent bg-blue-600 text-white'
              : 'border-slate-300 bg-white/90 text-slate-600 hover:bg-white'
          }`}
        >
          <RouteIcon size={16} strokeWidth={2.2} />
          Sentiers
        </button>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon
          const on = active.has(cat.id)
          return (
            <button
              key={cat.id}
              onClick={() => onToggle(cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition ${
                on
                  ? 'border-transparent text-white'
                  : 'border-slate-300 bg-white/90 text-slate-600 hover:bg-white'
              }`}
              style={on ? { backgroundColor: cat.color } : undefined}
            >
              <Icon size={16} strokeWidth={2.2} />
              {cat.label}
            </button>
          )
        })}
      </div>
      <div className="pointer-events-none">
        <span
          className={`pointer-events-auto inline-block rounded-full px-3 py-1 text-xs font-medium shadow-sm ${
            error ? 'bg-red-600 text-white' : 'bg-white/90 text-slate-600'
          }`}
        >
          {loading
            ? 'Chargement…'
            : error
              ? '⚠︎ Données indisponibles — réessaie'
              : `${resultCount} point(s)`}
        </span>
      </div>
    </div>
  )
}
