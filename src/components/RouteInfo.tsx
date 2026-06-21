import type { ReactNode } from 'react'
import {
  X,
  Route as RouteIcon,
  Mountain,
  Spline,
  Ruler,
  Clock,
  TrendingUp,
  RotateCw,
  ExternalLink,
  Download,
  Trash2,
} from 'lucide-react'
import { ElevationProfile } from './ElevationProfile'

function fmtMinutes(min?: number): string | null {
  if (!min || min <= 0) return null
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m} min`
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

export interface RouteProps {
  id?: string
  name?: string
  ref?: string
  network?: string
  // OSM enrichi
  distance?: string | number
  description?: string
  website?: string
  colour?: string
  symbol?: string
  operator?: string
  loop?: string
  // Geotrek
  geotrek?: string
  source?: string
  difficulty?: string
  duration?: string | number
  ascent?: string | number
  length?: string | number
  teaser?: string
  // Itinéraire perso
  perso?: string
  durationMin?: number
  profile?: Array<[number, number]>
}

interface RouteInfoProps {
  route: RouteProps
  onClose: () => void
  onDelete?: () => void
  onExportGpx?: () => void
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

function fmtDuration(h?: string | number): string | null {
  const n = Number(h)
  if (!h || Number.isNaN(n) || n <= 0) return null
  const hh = Math.floor(n)
  const mm = Math.round((n - hh) * 60)
  if (hh === 0) return `${mm} min`
  return mm ? `${hh} h ${String(mm).padStart(2, '0')}` : `${hh} h`
}

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

export function RouteInfo({
  route,
  onClose,
  onDelete,
  onExportGpx,
}: RouteInfoProps) {
  const isGeotrek = route.geotrek === '1'
  const isPerso = route.perso === '1'
  const ref = (route.ref ?? '').trim()
  const name = (route.name ?? '').trim()

  const title = isGeotrek || isPerso ? name || 'Itinéraire' : ref || name || 'Itinéraire'
  const subtitle = isPerso
    ? 'Mon itinéraire'
    : isGeotrek
      ? route.source || 'Fiche rando'
      : ref && name
        ? name
        : typeLabel(route.network)

  const dist = route.length ?? route.distance // km
  const distNum = dist != null ? Number(dist) : NaN
  const duration = fmtDuration(route.duration)
  const ascent = route.ascent != null ? Number(route.ascent) : NaN
  const swatch = colourSwatch(route.colour)
  const desc = isGeotrek ? route.teaser : route.description

  return (
    <div className="pointer-events-none absolute bottom-4 left-2 right-2 z-30 flex justify-center">
      <div className="pointer-events-auto max-h-[55vh] w-full max-w-sm overflow-auto rounded-2xl bg-white p-3 shadow-xl">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${
              isPerso ? 'bg-green-600' : isGeotrek ? 'bg-violet-600' : 'bg-blue-600'
            }`}
          >
            {isPerso ? (
              <Spline size={18} />
            ) : isGeotrek ? (
              <Mountain size={18} />
            ) : (
              <RouteIcon size={18} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-800">
              {title}
            </div>
            <div className="truncate text-xs text-slate-500">{subtitle}</div>
            {!isGeotrek && ref && name ? (
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

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          {route.difficulty && (
            <span className="rounded-full bg-violet-100 px-2 py-1 font-medium text-violet-700">
              {route.difficulty}
            </span>
          )}
          {!Number.isNaN(distNum) && distNum > 0 && (
            <Badge icon={<Ruler size={13} />}>{distNum} km</Badge>
          )}
          {duration && <Badge icon={<Clock size={13} />}>{duration}</Badge>}
          {route.durationMin ? (
            <Badge icon={<Clock size={13} />}>
              ≈ {fmtMinutes(route.durationMin)}
            </Badge>
          ) : null}
          {!Number.isNaN(ascent) && ascent > 0 && (
            <Badge icon={<TrendingUp size={13} />}>D+ {ascent} m</Badge>
          )}
          {route.loop && <Badge icon={<RotateCw size={13} />}>Boucle</Badge>}
          {swatch && (
            <Badge
              icon={
                <span
                  className="inline-block h-3 w-3 rounded-full border border-slate-300"
                  style={{ backgroundColor: swatch }}
                />
              }
            >
              Balisage
            </Badge>
          )}
          {route.operator && (
            <span className="truncate rounded-full bg-slate-100 px-2 py-1">
              {route.operator}
            </span>
          )}
        </div>

        {route.profile && route.profile.length > 1 && (
          <ElevationProfile profile={route.profile} />
        )}

        {desc && (
          <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-600">
            {desc}
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

        {(onExportGpx || onDelete) && (
          <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
            {onExportGpx && (
              <button
                onClick={onExportGpx}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-300 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <Download size={14} /> GPX
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-200 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 size={14} /> Supprimer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Badge({
  icon,
  children,
}: {
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
      {icon} {children}
    </span>
  )
}
