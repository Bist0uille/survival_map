import {
  Route as RouteIcon,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'
import { CATEGORIES } from '../data/categories'

interface FilterBarProps {
  active: Set<string>
  onToggle: (id: string) => void
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
 * Pastille de filtre : icône seule quand inactive (barre compacte), icône +
 * libellé coloré quand active. Le survol souris affiche le nom (title).
 */
function Chip({ icon: Icon, label, active, color, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex shrink-0 items-center justify-center rounded-full border shadow-sm transition ${
        active
          ? 'gap-1.5 border-transparent px-3 py-1.5 text-sm font-medium text-white'
          : 'h-9 w-9 border-slate-300 bg-white/90 text-slate-600 hover:bg-white'
      }`}
      style={active ? { backgroundColor: color } : undefined}
    >
      <Icon size={active ? 16 : 18} strokeWidth={2.2} />
      {active && <span>{label}</span>}
    </button>
  )
}

export function FilterBar({
  active,
  onToggle,
  showTrails,
  onToggleTrails,
  showProtected,
  onToggleProtected,
}: FilterBarProps) {
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-14 z-10 flex flex-col gap-2 p-2">
      <div className="pointer-events-auto flex gap-1.5 overflow-x-auto pb-1">
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
        {CATEGORIES.map((cat) => (
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
    </div>
  )
}
