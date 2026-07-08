import { useState } from 'react'
import { LocateFixed, Loader2 } from 'lucide-react'
import { getCategory } from '../data/categories'

/**
 * Besoins vitaux proposés par le bouton « le plus proche » : liste fixe (les
 * filtres actifs sont vides au démarrage — précisément le cas d'urgence).
 */
const VITAL_IDS = ['water', 'toilets', 'refuge', 'power', 'meal', 'bakery', 'pharmacy']

interface NearestMenuProps {
  busy: boolean
  onPick: (categoryId: string) => void
}

export function NearestMenu({ busy, onPick }: NearestMenuProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-label="Le plus proche de moi"
        title="Trouver le point vital le plus proche de ma position"
        className={`absolute bottom-[324px] left-4 z-20 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition disabled:opacity-60 ${
          open ? 'bg-slate-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
        }`}
      >
        {busy ? <Loader2 size={20} className="animate-spin" /> : <LocateFixed size={20} />}
      </button>
      {open && !busy && (
        <div className="absolute bottom-[324px] left-[68px] z-20 flex flex-col gap-0.5 rounded-2xl bg-white p-2 shadow-xl">
          <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Le plus proche
          </div>
          {VITAL_IDS.map((id) => {
            const c = getCategory(id)
            const Icon = c.icon
            return (
              <button
                key={id}
                onClick={() => {
                  setOpen(false)
                  onPick(id)
                }}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: c.color }}
                >
                  <Icon size={14} />
                </span>
                {c.label}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
