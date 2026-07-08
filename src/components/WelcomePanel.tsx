import { Droplet, Download, Spline, X } from 'lucide-react'
import { setPref, WELCOME_SEEN } from '../data/prefs'

interface WelcomePanelProps {
  onClose: () => void
}

/**
 * Écran de bienvenue au premier lancement : la promesse en une phrase et les
 * trois gestes de base. Toute fermeture (bouton ou croix) persiste le flag —
 * l'écran ne revient jamais.
 */
export function WelcomePanel({ onClose }: WelcomePanelProps) {
  const close = () => {
    setPref(WELCOME_SEEN, '1')
    onClose()
  }
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/30 p-3 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-green-800">Survimap</h2>
          <button onClick={close} aria-label="Fermer" className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          L'eau, les abris, le ravitaillement et les sentiers autour de toi —{' '}
          <b>même sans réseau</b>. Gratuit, sans compte.
        </p>
        <ul className="mt-4 space-y-3 text-sm text-slate-700">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
              <Droplet size={15} />
            </span>
            <span>
              <b>Filtre par besoin</b> — boire, manger, dormir, se laver, recharger… dans la barre
              du haut.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-700 text-white">
              <Download size={15} />
            </span>
            <span>
              <b>Télécharge ta zone</b> pour l'avoir hors-ligne (bouton à gauche).
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white">
              <Spline size={15} />
            </span>
            <span>
              <b>Crée un itinéraire</b> qui suit les sentiers, depuis ta position si tu veux.
            </span>
          </li>
        </ul>
        <button
          onClick={close}
          className="mt-5 w-full rounded-xl bg-green-700 py-2.5 font-medium text-white transition hover:bg-green-800"
        >
          C'est parti
        </button>
      </div>
    </div>
  )
}
