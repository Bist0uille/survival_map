import { useState, useEffect, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { MapView } from './map/MapView'
import { FilterBar } from './components/FilterBar'
import { AddPointForm } from './components/AddPointForm'
import {
  getPersonalPoints,
  addPersonalPoint,
  deletePersonalPoint,
} from './data/db'
import type { PersonalPoint } from './types'

const DEFAULT_ACTIVE = ['water']

function App() {
  const [active, setActive] = useState<Set<string>>(new Set(DEFAULT_ACTIVE))
  const [personalPoints, setPersonalPoints] = useState<PersonalPoint[]>([])
  const [addMode, setAddMode] = useState(false)
  const [count, setCount] = useState(0)
  const [pending, setPending] = useState<{ lat: number; lon: number } | null>(
    null,
  )

  // Charge les points perso au démarrage
  useEffect(() => {
    getPersonalPoints().then(setPersonalPoints)
  }, [])

  const toggleCategory = useCallback((id: string) => {
    setActive((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleMapClick = useCallback((lat: number, lon: number) => {
    setPending({ lat, lon })
    setAddMode(false)
  }, [])

  const handleSavePoint = useCallback(async (point: PersonalPoint) => {
    await addPersonalPoint(point)
    setPersonalPoints((prev) => [...prev, point])
    setPending(null)
  }, [])

  const handleDeletePersonal = useCallback(async (id: string) => {
    await deletePersonalPoint(id)
    setPersonalPoints((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapView
        active={active}
        personalPoints={personalPoints}
        addMode={addMode}
        onMapClick={handleMapClick}
        onDeletePersonal={handleDeletePersonal}
        onCount={setCount}
      />

      <FilterBar
        active={active}
        onToggle={toggleCategory}
        resultCount={count + personalPoints.length}
        loading={false}
        error={null}
      />

      {/* Bouton d'ajout de point perso */}
      <button
        onClick={() => setAddMode((v) => !v)}
        className={`absolute bottom-6 left-4 z-20 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition ${
          addMode ? 'bg-slate-700' : 'bg-green-700 hover:bg-green-800'
        }`}
        aria-label="Ajouter un point"
      >
        {addMode ? <X size={26} /> : <Plus size={26} />}
      </button>

      {addMode && (
        <div className="pointer-events-none absolute bottom-24 left-4 z-20 rounded-lg bg-slate-800/90 px-3 py-2 text-xs text-white shadow">
          Touche la carte pour placer le point
        </div>
      )}

      {pending && (
        <AddPointForm
          lat={pending.lat}
          lon={pending.lon}
          onSave={handleSavePoint}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}

export default App
