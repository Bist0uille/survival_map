import { CATEGORIES } from '../data/categories'

interface FilterBarProps {
  active: Set<string>
  onToggle: (id: string) => void
  resultCount: number
  loading: boolean
}

export function FilterBar({
  active,
  onToggle,
  resultCount,
  loading,
}: FilterBarProps) {
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex flex-col gap-2 p-2">
      <div className="pointer-events-auto flex gap-1.5 overflow-x-auto pb-1">
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
        <span className="pointer-events-auto inline-block rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
          {loading ? 'Chargement…' : `${resultCount} point(s)`}
        </span>
      </div>
    </div>
  )
}
