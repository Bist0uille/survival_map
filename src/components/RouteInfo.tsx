import { X, Route as RouteIcon } from 'lucide-react'

export interface RouteProps {
  id?: string
  name?: string
  ref?: string
  network?: string
  colour?: string
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

export function RouteInfo({ route, onClose }: RouteInfoProps) {
  const ref = (route.ref ?? '').trim()
  const name = (route.name ?? '').trim()
  const title = ref || name || 'Itinéraire'
  const subtitle = ref && name ? name : typeLabel(route.network)

  return (
    <div className="pointer-events-none absolute bottom-4 left-2 right-2 z-30 flex justify-center">
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-white p-3 shadow-xl">
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
      </div>
    </div>
  )
}
