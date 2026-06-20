import { useState, useMemo } from 'react'
import { X, Download, CheckCircle2 } from 'lucide-react'
import {
  planTiles,
  estimateBytes,
  formatSize,
  downloadTiles,
  requestPersistent,
  type GeoBounds,
} from '../data/offline'

interface OfflinePanelProps {
  bounds: GeoBounds
  zoom: number
  onClose: () => void
}

export function OfflinePanel({ bounds, zoom, onClose }: OfflinePanelProps) {
  const plan = useMemo(() => planTiles(bounds, zoom), [bounds, zoom])
  const [phase, setPhase] = useState<'confirm' | 'downloading' | 'done'>(
    'confirm',
  )
  const [progress, setProgress] = useState({ done: 0, total: plan.total })

  async function start() {
    setPhase('downloading')
    await requestPersistent()
    await downloadTiles(plan, (done, total) => setProgress({ done, total }))
    setPhase('done')
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

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
              (fond de carte topo, jusqu'au zoom {plan.reached}).
            </p>
            <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <div>
                ≈ <b>{plan.total.toLocaleString('fr-FR')}</b> tuiles
              </div>
              <div>
                ≈ <b>{formatSize(estimateBytes(plan.total))}</b> à télécharger
              </div>
            </div>
            <p className="mb-4 text-xs text-slate-400">
              Pour plus de détail, zoome/recadre sur une zone plus petite avant
              de télécharger. Tes points perso sont déjà disponibles hors-ligne.
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
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-700 py-2 text-sm font-medium text-white hover:bg-green-800"
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
              Téléchargement… ne ferme pas l'app.
            </p>
            <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-green-600 transition-all"
                style={{ width: pct + '%' }}
              />
            </div>
            <p className="text-center text-sm text-slate-500">
              {progress.done.toLocaleString('fr-FR')} /{' '}
              {progress.total.toLocaleString('fr-FR')} ({pct} %)
            </p>
          </>
        )}

        {phase === 'done' && (
          <div className="py-2 text-center">
            <CheckCircle2 size={40} className="mx-auto mb-2 text-green-600" />
            <p className="mb-1 text-sm font-medium text-slate-800">
              Zone enregistrée !
            </p>
            <p className="mb-4 text-xs text-slate-500">
              Tu peux passer en mode avion : cette zone restera affichable.
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
