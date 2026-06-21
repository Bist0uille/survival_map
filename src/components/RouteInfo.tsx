import { X, Route as RouteIcon, Ruler, RotateCw, ExternalLink } from 'lucide-react'

export interface RouteProps {
  id?: string
  name?: string
  ref?: string
  network?: string
  distance?: string
  description?: string
  website?: string
  colour?: string
  symbol?: string
  operator?: string
  loop?: string
}

interface RouteInfoProps {
  route: RouteProps
  onClose: () => void
}

function typeLabel(network?: string): string {
  switch (network) {
    case 'iwn':
      return 'Sentier international'
    case 'nwn':
      return 'GR — Grande Randonnée'
    case 'rwn':
      return 'Itinéraire régional'
    case 'lwn':
      return 'PR — Petite Randonnée'
    default:
      return 'Itinéraire de randonnée'
  }
}

// "red", "#ff0000"… → on tente de l'afficher comme pastille de couleur.
const CSS_COLOURS = new Set([
  'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'brown', 'black',
  'white', 'gray', 'grey', 'pink',
])
function colourSwatch(c?: string): string | null {
  if (!c) return null
  const v = c.trim().toLowerCase()
  if (CSS_COLOURS.has(v) || /^#[0-9a-f]{3,6}$/.test(v)) return v
  return null
}

export function RouteInfo({ route, onClose }: RouteInfoProps) {
  const ref = (route.ref ?? '').trim()
  const name = (route.name ?? '').trim()
  const title = ref || name || 'Itinéraire'
  const subtitle = ref && name ? name : typeLabel(route.network)
  const swatch = colourSwatch(route.colour)
  const dist = (route.distance ?? '').trim()

  return (
    <div className="pointer-events-none absolute bottom-4 left-2 right-2 z-30 flex justify-center">
      <div className="pointer-events-auto max-h-[55vh] w-full max-w-sm overflow-auto rounded-2xl bg-white p-3 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            <RouteIcon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-800">
              {title}
            </div>
            <div className="truncate text-xs text-slate-500">{subtitle}</div>
            {ref && name ? (
              <div className="mt-0.5 text-[11px] text-slate-400">
                {typeLabel(route.network)}
              </div>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-slate-400 hover:text-slate-600"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Badges */}
        {(dist || route.loop || swatch || route.operator) && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            {dist && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                <Ruler size={13} /> {dist} km
              </span>
            )}
            {route.loop && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                <RotateCw size={13} /> Boucle
              </span>
            )}
            {swatch && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                <span
                  className="inline-block h-3 w-3 rounded-full border border-slate-300"
                  style={{ backgroundColor: swatch }}
                />
                Balisage
              </span>
            )}
            {route.operator && (
              <span className="truncate rounded-full bg-slate-100 px-2 py-1">
                {route.operator}
              </span>
            )}
          </div>
        )}

        {route.description && (
          <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-600">
            {route.description}
          </p>
        )}

        {route.website && (
          <a
            href={route.website}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
          >
            <ExternalLink size={13} /> Plus d'infos
          </a>
        )}
      </div>
    </div>
  )
}
