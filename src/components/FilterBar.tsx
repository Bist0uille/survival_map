import {
  Route as RouteIcon,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'
import { NEEDS, categoriesForNeed } from '../data/categories'

interface FilterBarProps {
  active: Set<string>
  onToggle: (id: string) => void
  onToggleGroup: (categoryIds: string[]) => void
  showTrails: boolean
  onToggleTrails: () => void
  showProtected: boolean
  onToggleProtected: () => void
}

interface ChipProps {
  icon: LucideIcon
  label: string
  active: boolean
  color: string // couleur de fond quand actif
  onClick: () => void
}

/**
 * Pastille de filtre : icône + libellé toujours visibles (la valeur des
 * catégories doit se lire sans cliquer), fond coloré quand active.
 */
function Chip({ icon: Icon, label, active, color, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-8 shrink-0 items-center gap-1 rounded-full border px-2.5 text-xs shadow-sm transition ${
        active
          ? 'border-transparent font-medium text-white'
          : 'border-slate-300 bg-white/90 text-slate-600 hover:bg-white'
      }`}
      style={active ? { backgroundColor: color } : undefined}
    >
      <Icon size={14} strokeWidth={2.2} />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  )
}

export function FilterBar({
  active,
  onToggle,
  onToggleGroup,
  showTrails,
  onToggleTrails,
  showProtected,
  onToggleProtected,
}: FilterBarProps) {
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-14 z-10 flex flex-col gap-2 p-2">
      <div className="pointer-events-auto flex items-center gap-2 overflow-x-auto pb-1">
        <Chip
          icon={RouteIcon}
          label="Sentiers & chemins"
          active={showTrails}
          color="#2563eb"
          onClick={onToggleTrails}
        />
        <Chip
          icon={ShieldAlert}
          label="Bivouac réglementé"
          active={showProtected}
          color="#be123c"
          onClick={onToggleProtected}
        />
        {NEEDS.map((need) => {
          const cats = categoriesForNeed(need.id)
          if (cats.length === 0) return null
          const allOn = cats.every((c) => active.has(c.id))
          return (
            <div
              key={need.id}
              className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200/80 bg-white/60 p-0.5 pl-1.5"
            >
              <button
                onClick={() => onToggleGroup(cats.map((c) => c.id))}
                aria-pressed={allOn}
                aria-label={`Tout « ${need.label} »`}
                title={`Tout « ${need.label} »`}
                className={`shrink-0 rounded-full px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                  allOn ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {need.label}
              </button>
              {cats.map((cat) => (
                <Chip
                  key={cat.id}
                  icon={cat.icon}
                  label={cat.label}
                  active={active.has(cat.id)}
                  color={cat.color}
                  onClick={() => onToggle(cat.id)}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
