import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, X, Download } from 'lucide-react'
import { MapView } from './map/MapView'
import { FilterBar } from './components/FilterBar'
import { SearchBar } from './components/SearchBar'
import { AddPointForm } from './components/AddPointForm'
import { OfflinePanel } from './components/OfflinePanel'
import { RouteInfo, type RouteProps } from './components/RouteInfo'
import {
  getPersonalPoints,
  addPersonalPoint,
  deletePersonalPoint,
} from './data/db'
import type { GeoBounds } from './data/offline'
import type { PersonalPoint, Place } from './types'

const DEFAULT_ACTIVE = ['water']

function App() {
  const [active, setActive] = useState<Set<string>>(new Set(DEFAULT_ACTIVE))
  const [personalPoints, setPersonalPoints] = useState<PersonalPoint[]>([])
  const [addMode, setAddMode] = useState(false)
  const [count, setCount] = useState(0)
  const [flyTo, setFlyTo] = useState<Place | null>(null)
  const [showOffline, setShowOffline] = useState(false)
  const [showRoutes, setShowRoutes] = useState(false)
  const [showTreks, setShowTreks] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<RouteProps | null>(null)
  const [pending, setPending] = useState<{ lat: number; lon: number } | null>(
    null,
  )
  // Emprise + zoom courants (pour le téléchargement hors-ligne).
  const viewport = useRef<{ bounds: GeoBounds; zoom: number }>({
    bounds: { west: 2.9, south: 43.1, east: 3.1, north: 43.25 },
    zoom: 12,
  })

  // Charge les points perso au démarrage
  useEffect(() => {
    getPersonalPoints().then(setPersonalPoints)
  }, [])

  const handleViewport = useCallback((bounds: GeoBounds, zoom: number) => {
    viewport.current = { bounds, zoom }
  }, [])

  const handleRouteSelect = useCallback(
    (props: Record<string, unknown> | null) => {
      setSelectedRoute(props as RouteProps | null)
    },
    [],
  )

  const toggleRoutes = useCallback(() => {
    setShowRoutes((v) => {
      if (v) setSelectedRoute(null) // on masque → désélectionne
      return !v
    })
  }, [])

  const toggleTreks = useCallback(() => {
    setShowTreks((v) => {
      if (v) setSelectedRoute(null)
      return !v
    })
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
        flyTo={flyTo}
        showRoutes={showRoutes}
        showTreks={showTreks}
        selectedRouteId={selectedRoute?.id ?? null}
        onRouteSelect={handleRouteSelect}
        onMapClick={handleMapClick}
        onDeletePersonal={handleDeletePersonal}
        onCount={setCount}
        onViewport={handleViewport}
      />

      {/* Recherche de lieu (au-dessus des filtres) */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 p-2">
        <SearchBar onSelect={setFlyTo} />
      </div>

      <FilterBar
        active={active}
        onToggle={toggleCategory}
        showRoutes={showRoutes}
        onToggleRoutes={toggleRoutes}
        showTreks={showTreks}
        onToggleTreks={toggleTreks}
        resultCount={count + personalPoints.length}
        loading={false}
        error={null}
      />

      {/* Bouton télécharger la zone (hors-ligne) */}
      <button
        onClick={() => setShowOffline(true)}
        className="absolute bottom-24 left-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg transition hover:bg-slate-100"
        aria-label="Télécharger la zone hors-ligne"
        title="Télécharger cette zone pour le hors-ligne"
      >
        <Download size={20} />
      </button>

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
        <div className="pointer-events-none absolute bottom-8 left-20 z-20 rounded-lg bg-slate-800/90 px-3 py-2 text-xs text-white shadow">
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

      {showOffline && (
        <OfflinePanel
          bounds={viewport.current.bounds}
          zoom={viewport.current.zoom}
          onClose={() => setShowOffline(false)}
        />
      )}

      {(showRoutes || showTreks) && selectedRoute && (
        <RouteInfo route={selectedRoute} onClose={() => setSelectedRoute(null)} />
      )}
    </div>
  )
}

export default App
