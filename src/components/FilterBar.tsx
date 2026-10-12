import { useEffect, useRef, useState } from 'react'
import { BookOpen, Check, ChevronDown, Croissant, Droplet, HeartPulse, Mountain, Plug, Route, ShieldAlert, SlidersHorizontal, TentTree, Toilet, X, type LucideIcon } from 'lucide-react'
import { categoriesForNeed, type NeedId } from '../data/categories'

interface FilterBarProps {
  active: Set<string>
  onToggle: (id: string) => void
  onToggleGroup: (ids: string[]) => void
  showTrails: boolean
  onToggleTrails: () => void
  showProtected: boolean
  onToggleProtected: () => void
}

const NEEDS: { id: NeedId; label: string; description: string; icon: LucideIcon; color: string }[] = [
  { id: 'drink', label: 'Eau', description: 'Fontaines, sources', icon: Droplet, color: '#2563eb' },
  { id: 'eat', label: 'Manger', description: 'Commerces, tables', icon: Croissant, color: '#b77925' },
  { id: 'sleep', label: 'Dormir', description: 'Refuges, campings', icon: TentTree, color: '#36804a' },
  { id: 'wash', label: 'Sanitaires', description: 'Toilettes, laveries', icon: Toilet, color: '#8063a3' },
  { id: 'charge', label: 'Recharger', description: 'Prises, recharge vélo', icon: Plug, color: '#ab7a26' },
  { id: 'see', label: 'Découvrir', description: 'Sommets, points de vue', icon: Mountain, color: '#527450' },
  { id: 'care', label: 'Se soigner', description: 'Pharmacies', icon: HeartPulse, color: '#c34770' },
  { id: 'read', label: 'Lire', description: 'Boîtes à livres', icon: BookOpen, color: '#26858d' },
]

export function FilterBar({ active, onToggle, onToggleGroup, showTrails, onToggleTrails, showProtected, onToggleProtected }: FilterBarProps) {
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<NeedId | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const details = useRef<HTMLElement>(null)
  const count = active.size + Number(showTrails) + Number(showProtected)

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [open])

  useEffect(() => {
    if (detail && open) details.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
  }, [detail, open])

  const selection = (id: NeedId) => {
    const ids = categoriesForNeed(id).map((category) => category.id)
    const selected = ids.filter((category) => active.has(category)).length
    return { ids, selected, all: selected === ids.length }
  }
  const clear = () => {
    if (active.size) onToggleGroup([...active])
    if (showTrails) onToggleTrails()
    if (showProtected) onToggleProtected()
  }

  return <>
    <nav aria-label="Filtres de la carte" className="pointer-events-none absolute inset-x-0 top-14 z-10 px-2">
      <div className="pointer-events-auto grid max-w-lg grid-cols-4 gap-1.5">
        {NEEDS.slice(0, 3).map(({ id, label, icon: Icon }) => {
          const { ids, selected, all } = selection(id)
          return <button key={id} type="button" aria-label={label} aria-pressed={selected && !all ? 'mixed' : all} onClick={() => onToggleGroup(ids)}
            className={`flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-full border px-1.5 text-xs font-semibold shadow-sm transition ${selected ? 'border-green-300 bg-green-50 text-green-900' : 'border-slate-200 bg-white/95 text-slate-600 hover:bg-white'}`}>
            <Icon size={16} className="shrink-0" /><span>{label}</span>
            {all && <Check size={12} className="hidden shrink-0 min-[360px]:block" />}
            {!!selected && !all && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-700" aria-hidden="true" />}
          </button>
        })}
        <button type="button" onClick={() => setOpen(true)} aria-label="Plus de catégories" aria-haspopup="dialog" aria-expanded={open} aria-controls="map-categories"
          className="relative flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-green-900 px-2 text-xs font-semibold text-white shadow-sm transition hover:bg-green-800">
          <SlidersHorizontal size={16} /><span>Plus</span>
          {count > 0 && <span className="absolute -right-0.5 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-green-100 px-0.5 text-[9px] text-green-950" aria-label={`${count} filtres actifs`}>{count}</span>}
        </button>
      </div>
    </nav>

    <dialog ref={dialog} id="map-categories" aria-labelledby="map-categories-title" aria-describedby="map-categories-description"
      onCancel={() => setOpen(false)} onClose={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const b = event.currentTarget.getBoundingClientRect()
        if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) setOpen(false)
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 mx-auto max-h-[88dvh] w-full max-w-lg overflow-hidden rounded-t-3xl border-0 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/35 sm:bottom-5 sm:rounded-3xl">
      <div className="flex max-h-[88dvh] flex-col">
        <div className="shrink-0 px-5 pb-3 pt-2">
          <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-slate-200" aria-hidden="true" />
          <div className="flex items-start justify-between gap-3">
            <div><p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Explorer autour de vous</p><h2 id="map-categories-title" className="text-xl font-bold tracking-tight text-green-950">Que cherchez-vous ?</h2></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer les catégories" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"><X size={20} /></button>
          </div>
          <p id="map-categories-description" className="mt-2 text-xs text-slate-500">Choisissez vos besoins, puis affinez si vous le souhaitez.</p>
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-4">
          <div className="grid grid-cols-3 gap-2">
            {NEEDS.map(({ id, label, description, icon: Icon, color }) => {
              const { ids, selected, all } = selection(id)
              return <div key={id} className={`overflow-hidden rounded-2xl border transition ${selected ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-slate-50/80'}`}>
                <button type="button" aria-label={`Tout ${label}`} aria-pressed={selected && !all ? 'mixed' : all} onClick={() => onToggleGroup(ids)} className="relative flex w-full flex-col items-center gap-1.5 px-1 pb-2 pt-3 text-center">
                  <Icon size={23} style={{ color }} /><span className="text-xs font-semibold text-slate-700">{label}</span><span className="min-h-6 text-[9px] leading-3 text-slate-500">{description}</span>
                  {selected > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-green-700 px-0.5 text-[9px] text-white">{all ? <Check size={11} /> : selected}</span>}
                </button>
                <button type="button" onClick={() => setDetail(detail === id ? null : id)} aria-label={`Affiner ${label}`} aria-expanded={detail === id} aria-controls={detail === id ? 'category-details' : undefined}
                  className={`flex min-h-9 w-full items-center justify-center gap-1 border-t text-[10px] font-medium ${selected ? 'border-green-200 text-green-800 hover:bg-green-100' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                  Affiner<ChevronDown size={12} className={detail === id ? 'rotate-180' : ''} />
                </button>
              </div>
            })}
          </div>

          {detail && <section ref={details} id="category-details" aria-label={`Détail ${NEEDS.find((need) => need.id === detail)?.label}`} className="mt-3 rounded-2xl border border-green-200 bg-green-50/50 p-3">
            <h3 className="mb-1 text-xs font-semibold text-green-900">{NEEDS.find((need) => need.id === detail)?.label} : choisir les points</h3>
            {categoriesForNeed(detail).map(({ id, label, icon: Icon }) => <label key={id} className="flex min-h-11 cursor-pointer items-center gap-2 border-t border-green-100 py-2 text-xs text-slate-700">
              <Icon size={17} className="shrink-0 text-green-800" /><span className="flex-1">{label}</span><input type="checkbox" checked={active.has(id)} onChange={() => onToggle(id)} className="h-4 w-4 accent-green-700" />
            </label>)}
          </section>}

          <h3 className="mb-1 mt-5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Sur la carte</h3>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 border-b border-slate-100 py-2 text-xs text-slate-700"><Route size={17} className="text-blue-600" /><span className="flex-1">Sentiers & chemins</span><input type="checkbox" checked={showTrails} onChange={onToggleTrails} className="h-4 w-4 accent-green-700" /></label>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 py-2 text-xs text-slate-700"><ShieldAlert size={17} className="text-rose-600" /><span className="flex-1">Bivouac réglementé</span><input type="checkbox" checked={showProtected} onChange={onToggleProtected} className="h-4 w-4 accent-green-700" /></label>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <div className="mb-3 flex items-center justify-between text-xs text-slate-500"><span role="status">{count === 0 ? 'Aucun filtre actif' : `${count} filtre${count > 1 ? 's' : ''} actif${count > 1 ? 's' : ''}`}</span><button type="button" onClick={clear} disabled={count === 0} className="min-h-8 text-green-800 underline underline-offset-2 disabled:opacity-40">Tout effacer</button></div>
          <button type="button" onClick={() => setOpen(false)} className="min-h-12 w-full rounded-xl bg-green-800 px-4 text-sm font-semibold text-white hover:bg-green-900">Voir la carte</button>
        </div>
      </div>
    </dialog>
  </>
}
