import { useState } from 'react'
import { X } from 'lucide-react'
import { CATEGORIES, CUSTOM_CATEGORY } from '../data/categories'
import type { PersonalPoint } from '../types'

interface AddPointFormProps {
  lat: number
  lon: number
  onSave: (point: PersonalPoint) => void
  onCancel: () => void
}

export function AddPointForm({ lat, lon, onSave, onCancel }: AddPointFormProps) {
  const [categoryId, setCategoryId] = useState<string>(CUSTOM_CATEGORY.id)
  const [customLabel, setCustomLabel] = useState('')
  const [note, setNote] = useState('')

  const isCustom = categoryId === CUSTOM_CATEGORY.id

  function handleSave() {
    onSave({
      id: `perso-${Date.now()}-${Math.round(lat * 1000)}`,
      lat,
      lon,
      categoryId,
      customLabel: isCustom ? customLabel.trim() || 'Point perso' : undefined,
      note: note.trim() || undefined,
      createdAt: Date.now(),
    })
  }

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/30 p-3 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">
            Nouveau point perso
          </h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <p className="mb-3 text-xs text-slate-500">
          {lat.toFixed(5)}, {lon.toFixed(5)}
        </p>

        <label className="mb-1 block text-sm font-medium text-slate-700">
          Catégorie
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value={CUSTOM_CATEGORY.id}>Point perso (libre)</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        {isCustom && (
          <>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nom
            </label>
            <input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="ex. prise fiable mairie"
              className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </>
        )}

        <label className="mb-1 block text-sm font-medium text-slate-700">
          Note (optionnel)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="ex. accès libre, près du banc"
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-lg bg-green-700 py-2 text-sm font-medium text-white hover:bg-green-800"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
