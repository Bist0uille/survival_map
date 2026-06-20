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
import { hasPmtilesBlob } from '../data/db'

interface OfflinePanelProps {
  bounds: GeoBounds
  zoom: number
  onClose: () => void
}

const POIS_URL = window.location.origin + '/pois.pmtiles'

export function OfflinePanel({ bounds, zoom, onClose }: OfflinePanelProps) {
  const plan = useMemo(() => planTiles(bounds, zoom), [bounds, zoom])
  const [poiCached, setPoiCached] = useState<boolean | null>(null)
  const [phase, setPhase] = useState<'confirm' | 'downloading' | 'done'>(
    'confirm',
  )
  const [step, setStep] = useState<'poi' | 'tiles'>('poi')
  const [poi, setPoi] = useState({ received: 0, total: 0 })
  const [tiles, setTiles] = useState({ done: 0, total: plan.total })

  useEffect(() => {
    hasPmtilesBlob().then(setPoiCached)
  }, [])

  async function start() {
    setPhase('downloading')
    await requestPersistent()
    if (!poiCached) {
      setStep('poi')
      try {
        await downloadPmtiles(POIS_URL, (received, total) =>
          setPoi({ received, total }),
        )
      } catch {
        // si les POI échouent, on continue quand même avec le fond de carte
      }
    }
    setStep('tiles')
    await downloadTiles(plan, (done, total) => setTiles({ done, total }))
    setPhase('done')
  }

  const tilePct = tiles.total ? Math.round((tiles.done / tiles.total) * 100) : 0
  const poiPct = poi.total ? Math.round((poi.received / poi.total) * 100) : 0

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
              (fond topo jusqu'au zoom {plan.reached}
              {poiCached === false ? ' + tous les points de France' : ''}).
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
              {poiCached === true && (
                <div className="text-green-700">
                  Points d'intérêt : déjà disponibles hors-ligne ✓
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
                disabled={poiCached === null}
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
                : 'Fond de carte de la zone…'}{' '}
              Ne ferme pas l'app.
            </p>
            {step === 'poi' ? (
              <>
                <Bar pct={poiPct} />
                <p className="text-center text-sm text-slate-500">
                  {formatSize(poi.received)}
                  {poi.total ? ` / ${formatSize(poi.total)} (${poiPct} %)` : ''}
                </p>
              </>
            ) : (
              <>
                <Bar pct={tilePct} />
                <p className="text-center text-sm text-slate-500">
                  {tiles.done.toLocaleString('fr-FR')} /{' '}
                  {tiles.total.toLocaleString('fr-FR')} tuiles ({tilePct} %)
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
              Carte + points d'intérêt disponibles sans réseau. Tu peux passer
              en mode avion.
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
