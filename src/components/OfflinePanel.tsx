import { useState, useEffect, useMemo } from 'react'
import { X, Download, CheckCircle2 } from 'lucide-react'
import {
  planTiles,
  estimateBytes,
  formatSize,
  downloadTiles,
  requestPersistent,
  type GeoBounds,
} from '../data/offline'
import { downloadPmtiles } from '../map/cachedSource'
import { hasOfflineBlob } from '../data/db'

interface OfflinePanelProps {
  bounds: GeoBounds
  zoom: number
  onClose: () => void
}

// POI et itinéraires (FR+ES+IT) hébergés sur R2 ; treks restent locaux.
const POIS_URL =
  import.meta.env.VITE_POIS_URL ||
  'https://pub-1cff175e1c4641718e16b36f04ea91b1.r2.dev/pois.pmtiles'
const ROUTES_URL =
  import.meta.env.VITE_ROUTES_URL ||
  'https://pub-1cff175e1c4641718e16b36f04ea91b1.r2.dev/routes.pmtiles'
const TREKS_URL = window.location.origin + '/treks.pmtiles'

export function OfflinePanel({ bounds, zoom, onClose }: OfflinePanelProps) {
  const plan = useMemo(() => planTiles(bounds, zoom), [bounds, zoom])
  const [poiCached, setPoiCached] = useState<boolean | null>(null)
  const [routesCached, setRoutesCached] = useState<boolean | null>(null)
  const [treksCached, setTreksCached] = useState<boolean | null>(null)
  const [phase, setPhase] = useState<'confirm' | 'downloading' | 'done'>(
    'confirm',
  )
  const [step, setStep] = useState<'poi' | 'routes' | 'treks' | 'tiles'>('poi')
  const [bytes, setBytes] = useState({ received: 0, total: 0 })
  const [tiles, setTiles] = useState({ done: 0, total: plan.total })

  useEffect(() => {
    hasOfflineBlob('pois').then(setPoiCached)
    hasOfflineBlob('routes').then(setRoutesCached)
    hasOfflineBlob('treks').then(setTreksCached)
  }, [])

  async function start() {
    setPhase('downloading')
    await requestPersistent()
    const dl = async (
      cached: boolean | null,
      url: string,
      key: string,
      s: 'poi' | 'routes' | 'treks',
    ) => {
      if (cached) return
      setStep(s)
      setBytes({ received: 0, total: 0 })
      try {
        await downloadPmtiles(url, key, (received, total) =>
          setBytes({ received, total }),
        )
      } catch {
        /* pas encore dispo → on continue */
      }
    }
    await dl(poiCached, POIS_URL, 'pois', 'poi')
    await dl(routesCached, ROUTES_URL, 'routes', 'routes')
    await dl(treksCached, TREKS_URL, 'treks', 'treks')
    setStep('tiles')
    await downloadTiles(plan, (done, total) => setTiles({ done, total }))
    setPhase('done')
  }

  const tilePct = tiles.total ? Math.round((tiles.done / tiles.total) * 100) : 0
  const bytePct = bytes.total ? Math.round((bytes.received / bytes.total) * 100) : 0

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/30 p-3 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">
            Carte hors-ligne
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {phase === 'confirm' && (
          <>
            <p className="mb-3 text-sm text-slate-600">
              Télécharger la <b>zone affichée</b> pour l'utiliser sans réseau
              (fond topo jusqu'au zoom {plan.reached}).
            </p>
            <div className="mb-4 space-y-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <div>
                Fond de carte : ≈ <b>{plan.total.toLocaleString('fr-FR')}</b>{' '}
                tuiles (<b>{formatSize(estimateBytes(plan.total))}</b>)
              </div>
              {poiCached === false && (
                <div>
                  Points d'intérêt (France) : ≈ <b>77 Mo</b> (une seule fois)
                </div>
              )}
              {routesCached === false && (
                <div>Itinéraires de rando (France) : une seule fois</div>
              )}
              {poiCached === true && routesCached === true && (
                <div className="text-green-700">
                  Points & itinéraires : déjà hors-ligne ✓
                </div>
              )}
            </div>
            <p className="mb-4 text-xs text-slate-400">
              Pour plus de détail, zoome sur une zone plus petite. Tes points
              perso sont déjà hors-ligne.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600"
              >
                Annuler
              </button>
              <button
                onClick={start}
                disabled={
                  poiCached === null ||
                  routesCached === null ||
                  treksCached === null
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-700 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              >
                <Download size={16} />
                Télécharger
              </button>
            </div>
          </>
        )}

        {phase === 'downloading' && (
          <>
            <p className="mb-3 text-sm text-slate-600">
              {step === 'poi'
                ? 'Points d’intérêt (France)…'
                : step === 'routes'
                  ? 'Sentiers balisés (France)…'
                  : step === 'treks'
                    ? 'Fiches rando (Geotrek)…'
                    : 'Fond de carte de la zone…'}{' '}
              Ne ferme pas l'app.
            </p>
            {step === 'tiles' ? (
              <>
                <Bar pct={tilePct} />
                <p className="text-center text-sm text-slate-500">
                  {tiles.done.toLocaleString('fr-FR')} /{' '}
                  {tiles.total.toLocaleString('fr-FR')} tuiles ({tilePct} %)
                </p>
              </>
            ) : (
              <>
                <Bar pct={bytePct} />
                <p className="text-center text-sm text-slate-500">
                  {formatSize(bytes.received)}
                  {bytes.total ? ` / ${formatSize(bytes.total)} (${bytePct} %)` : ''}
                </p>
              </>
            )}
          </>
        )}

        {phase === 'done' && (
          <div className="py-2 text-center">
            <CheckCircle2 size={40} className="mx-auto mb-2 text-green-600" />
            <p className="mb-1 text-sm font-medium text-slate-800">
              Zone enregistrée !
            </p>
            <p className="mb-4 text-xs text-slate-500">
              Carte, points d'intérêt et itinéraires disponibles sans réseau.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-green-700 py-2 text-sm font-medium text-white"
            >
              Terminé
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Bar({ pct }: { pct: number }) {
  return (
    <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full bg-green-600 transition-all"
        style={{ width: pct + '%' }}
      />
    </div>
  )
}
