import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, X, Download, Spline, Footprints, Tent, Satellite, Mountain } from 'lucide-react'
import { MapView } from './map/MapView'
import { FilterBar } from './components/FilterBar'
import { SearchBar } from './components/SearchBar'
import { AddPointForm } from './components/AddPointForm'
import { OfflinePanel } from './components/OfflinePanel'
import { RouteInfo, type RouteProps } from './components/RouteInfo'
import { RouteBuilder } from './components/RouteBuilder'
import { ToastHost } from './components/Toast'
import { ImportGpxButton } from './components/ImportGpxButton'
import { BivouacPanel } from './components/BivouacPanel'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import {
  getPersonalPoints,
  addPersonalPoint,
  deletePersonalPoint,
  getPersonalRoutes,
  addPersonalRoute,
  deletePersonalRoute,
} from './data/db'
import { computeRoute, summarizeRoute, type ComputedRoute } from './data/routing'
import { downloadGpx } from './data/gpx'
import { useTrackRecorder } from './hooks/useTrackRecorder'
import { TrackPanel } from './components/TrackPanel'
import type { GeoBounds } from './data/offline'
import type { PersonalPoint, PersonalRoute, Place } from './types'

function App() {
  // Aucune catégorie active au démarrage : l'utilisateur choisit ses filtres.
  const [active, setActive] = useState<Set<string>>(new Set<string>())
  const [personalPoints, setPersonalPoints] = useState<PersonalPoint[]>([])
  const [personalRoutes, setPersonalRoutes] = useState<PersonalRoute[]>([])
  const [addMode, setAddMode] = useState(false)
  // Compteur d'icônes affichées (alimente MapView.onCount) ; plus affiché.
  const [, setCount] = useState(0)
  const [flyTo, setFlyTo] = useState<Place | null>(null)
  const [showOffline, setShowOffline] = useState(false)
  // Couche unique « Sentiers & chemins » : pilote à la fois les sentiers
  // balisés (routes), les chemins bruts (paths) et les fiches Geotrek (treks,
  // cliquables sans bouton dédié).
  const [showTrails, setShowTrails] = useState(false)
  const [showProtected, setShowProtected] = useState(false)
  // Vue satellite et mode 3D (relief). En ligne uniquement.
  const [satellite, setSatellite] = useState(false)
  const [view3D, setView3D] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<RouteProps | null>(null)
  const [selectedPR, setSelectedPR] = useState<PersonalRoute | null>(null)
  const [pending, setPending] = useState<{ lat: number; lon: number } | null>(
    null,
  )
  // Création d'itinéraire
  const [createMode, setCreateMode] = useState(false)
  const [waypoints, setWaypoints] = useState<Array<[number, number]>>([])
  const [draft, setDraft] = useState<ComputedRoute | null>(null)
  const [computing, setComputing] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [trackMode, setTrackMode] = useState(false)
  const [bivouac, setBivouac] = useState<{ lat: number; lon: number } | null>(
    null,
  )
  const rec = useTrackRecorder()
  const online = useOnlineStatus()

  const viewport = useRef<{ bounds: GeoBounds; zoom: number }>({
    bounds: { west: 2.9, south: 43.1, east: 3.1, north: 43.25 },
    zoom: 12,
  })

  useEffect(() => {
    getPersonalPoints().then(setPersonalPoints)
    getPersonalRoutes().then(setPersonalRoutes)
  }, [])

  // Satellite et 3D nécessitent le réseau : hors-ligne, on repli sur la topo
  // à plat.
  useEffect(() => {
    if (!online) {
      setSatellite(false)
      setView3D(false)
    }
  }, [online])

  // Recalcule le tracé (BRouter) quand les étapes changent (anti-rebond).
  useEffect(() => {
    if (waypoints.length < 2) {
      setDraft(null)
      setRouteError(null)
      return
    }
    let cancelled = false
    setComputing(true)
    setRouteError(null)
    const t = setTimeout(async () => {
      try {
        const r = await computeRoute(waypoints)
        if (!cancelled) setDraft(r)
      } catch {
        if (!cancelled) {
          setDraft(null)
          setRouteError('Pas de chemin trouvé entre ces points')
        }
      } finally {
        if (!cancelled) setComputing(false)
      }
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [waypoints])

  const handleViewport = useCallback((bounds: GeoBounds, zoom: number) => {
    viewport.current = { bounds, zoom }
  }, [])

  const handleRouteSelect = useCallback(
    (props: Record<string, unknown> | null) => {
      setSelectedPR(null)
      // Re-cliquer le même tracé le désélectionne (toggle).
      setSelectedRoute((prev) => {
        const next = props as RouteProps | null
        if (prev && next && prev.id === next.id) return null
        return next
      })
    },
    [],
  )

  const toggleTrails = useCallback(() => {
    setShowTrails((v) => {
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

  // --- Création d'itinéraire ---
  const enterCreate = useCallback(() => {
    setCreateMode(true)
    setAddMode(false)
    setSelectedRoute(null)
    setSelectedPR(null)
    setWaypoints([])
    setDraft(null)
    setRouteError(null)
  }, [])

  const cancelCreate = useCallback(() => {
    setCreateMode(false)
    setWaypoints([])
    setDraft(null)
    setRouteError(null)
  }, [])

  const addWaypoint = useCallback((lat: number, lon: number) => {
    setWaypoints((w) => [...w, [lon, lat]])
  }, [])

  // Ajoute la position GPS actuelle comme étape de l'itinéraire (départ si
  // c'est le premier point, sinon une étape supplémentaire).
  const useMyLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setRouteError('Géolocalisation non supportée par cet appareil')
      return
    }
    setLocating(true)
    setRouteError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        addWaypoint(pos.coords.latitude, pos.coords.longitude)
        setLocating(false)
      },
      (err) => {
        setRouteError(
          err.code === err.PERMISSION_DENIED
            ? "Localisation refusée — autorise l'accès à ta position"
            : 'Position introuvable, réessaie'
        )
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    )
  }, [addWaypoint])

  const saveRoute = useCallback(
    async (name: string) => {
      if (!draft) return
      const route: PersonalRoute = {
        id: 'pr-' + Date.now(),
        name,
        waypoints,
        geometry: draft.geometry,
        distanceKm: draft.distanceKm,
        ascent: draft.ascent,
        descent: draft.descent,
        durationMin: draft.durationMin,
        profile: draft.profile,
        createdAt: Date.now(),
      }
      await addPersonalRoute(route)
      setPersonalRoutes((prev) => [...prev, route])
      cancelCreate()
    },
    [draft, waypoints, cancelCreate],
  )

  const handleDeletePR = useCallback(async (id: string) => {
    await deletePersonalRoute(id)
    setPersonalRoutes((prev) => prev.filter((r) => r.id !== id))
    setSelectedPR(null)
  }, [])

  // --- Suivi de trace en direct ---
  const saveTrack = useCallback(async () => {
    const pts = rec.points
    if (pts.length < 2) return
    const coords = pts.map((p) => [p.lon, p.lat] as [number, number])
    const eles = pts.map((p) => p.ele ?? null)
    const s = summarizeRoute(coords, eles)
    const d = new Date()
    const route: PersonalRoute = {
      id: 'trk-' + d.getTime(),
      name: `Sortie du ${d.toLocaleDateString('fr-FR')}`,
      waypoints: [coords[0], coords[coords.length - 1]],
      geometry: { type: 'LineString', coordinates: coords },
      distanceKm: s.distanceKm,
      ascent: s.ascent,
      descent: s.descent,
      durationMin: s.durationMin,
      profile: s.profile,
      createdAt: d.getTime(),
    }
    await addPersonalRoute(route)
    setPersonalRoutes((prev) => [...prev, route])
    rec.reset()
    setTrackMode(false)
    setSelectedPR(route)
  }, [rec])

  const discardTrack = useCallback(() => {
    rec.reset()
    setTrackMode(false)
  }, [rec])

  const openBivouac = useCallback(() => {
    const b = viewport.current.bounds
    setBivouac({
      lat: (b.south + b.north) / 2,
      lon: (b.west + b.east) / 2,
    })
  }, [])

  const handleImportGpx = useCallback(async (route: PersonalRoute) => {
    await addPersonalRoute(route)
    setPersonalRoutes((prev) => [...prev, route])
    setShowTrails(false)
    setSelectedPR(route)
    // Cadre la carte sur la trace importée.
    const lons = route.geometry.coordinates.map((c) => c[0])
    const lats = route.geometry.coordinates.map((c) => c[1])
    setFlyTo({
      lat: lats[0],
      lon: lons[0],
      bbox: [
        Math.min(...lats),
        Math.max(...lats),
        Math.min(...lons),
        Math.max(...lons),
      ],
      label: route.name,
    })
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapView
        active={active}
        personalPoints={personalPoints}
        addMode={addMode}
        flyTo={flyTo}
        showRoutes={showTrails}
        showTreks={showTrails}
        showPaths={showTrails}
        showProtected={showProtected}
        selectedRouteId={selectedRoute?.id ?? null}
        satellite={satellite}
        view3D={view3D}
        onRouteSelect={handleRouteSelect}
        createMode={createMode}
        waypoints={waypoints}
        draftGeometry={draft?.geometry ?? null}
        liveTrack={rec.geometry}
        personalRoutes={personalRoutes}
        onAddWaypoint={addWaypoint}
        onSelectPersonalRoute={(r) => {
          setSelectedRoute(null)
          // Re-cliquer le même itinéraire perso le désélectionne (toggle).
          setSelectedPR((prev) => (prev && prev.id === r.id ? null : r))
        }}
        onMapClick={handleMapClick}
        onDeletePersonal={handleDeletePersonal}
        onCount={setCount}
        onViewport={handleViewport}
      />

      <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 p-2">
        <SearchBar onSelect={setFlyTo} />
        {!online && (
          <div className="pointer-events-none mx-auto mt-2 w-fit rounded-full bg-amber-500/95 px-3 py-1 text-xs font-medium text-white shadow">
            Hors ligne — données enregistrées uniquement
          </div>
        )}
      </div>

      <ToastHost />

      <FilterBar
        active={active}
        onToggle={toggleCategory}
        showTrails={showTrails}
        onToggleTrails={toggleTrails}
        showProtected={showProtected}
        onToggleProtected={() => setShowProtected((v) => !v)}
      />

      {/* Vue satellite + mode 3D (haut droite). En ligne uniquement. */}
      <button
        onClick={() => setSatellite((v) => !v)}
        disabled={!online}
        className={`absolute right-3 top-28 z-20 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition disabled:opacity-40 ${
          satellite ? 'bg-slate-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
        }`}
        aria-label="Vue satellite"
        title="Vue satellite"
      >
        <Satellite size={20} />
      </button>
      <button
        onClick={() => setView3D((v) => !v)}
        disabled={!online}
        className={`absolute right-3 top-40 z-20 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition disabled:opacity-40 ${
          view3D ? 'bg-slate-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
        }`}
        aria-label="Vue 3D (relief)"
        title="Vue 3D (relief)"
      >
        <Mountain size={20} />
      </button>

      {!createMode && !trackMode && (
        <>
          {/* Infos bivouac : soleil / lune / météo */}
          <button
            onClick={openBivouac}
            className="absolute bottom-[284px] left-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg transition hover:bg-slate-100"
            aria-label="Infos bivouac (soleil, lune, météo)"
            title="Infos bivouac : soleil, lune, météo"
          >
            <Tent size={20} />
          </button>

          {/* Enregistrer une trace (suivi GPS en direct) */}
          <button
            onClick={() => setTrackMode(true)}
            className="absolute bottom-[244px] left-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg transition hover:bg-slate-100"
            aria-label="Enregistrer une trace"
            title="Enregistrer ma trace (GPS en direct)"
          >
            <Footprints size={20} />
          </button>

          {/* Importer une trace GPX */}
          <ImportGpxButton onImport={handleImportGpx} />

          {/* Créer un itinéraire */}
          <button
            onClick={enterCreate}
            className="absolute bottom-[164px] left-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg transition hover:bg-slate-100"
            aria-label="Créer un itinéraire"
            title="Créer un itinéraire (suit les chemins)"
          >
            <Spline size={20} />
          </button>

          {/* Télécharger la zone (hors-ligne) */}
          <button
            onClick={() => setShowOffline(true)}
            className="absolute bottom-24 left-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg transition hover:bg-slate-100"
            aria-label="Télécharger la zone hors-ligne"
            title="Télécharger cette zone pour le hors-ligne"
          >
            <Download size={20} />
          </button>

          {/* Ajouter un point perso */}
          <button
            onClick={() => setAddMode((v) => !v)}
            className={`absolute bottom-6 left-4 z-20 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition ${
              addMode ? 'bg-slate-700' : 'bg-green-700 hover:bg-green-800'
            }`}
            aria-label="Ajouter un point"
          >
            {addMode ? <X size={26} /> : <Plus size={26} />}
          </button>
        </>
      )}

      {addMode && (
        <div className="pointer-events-none absolute bottom-8 left-20 z-20 rounded-lg bg-slate-800/90 px-3 py-2 text-xs text-white shadow">
          Touche la carte pour placer le point
        </div>
      )}

      {createMode && (
        <RouteBuilder
          count={waypoints.length}
          draft={draft}
          computing={computing}
          error={routeError}
          locating={locating}
          onUseMyLocation={useMyLocation}
          onUndo={() => setWaypoints((w) => w.slice(0, -1))}
          onClear={() => setWaypoints([])}
          onSave={saveRoute}
          onCancel={cancelCreate}
        />
      )}

      {trackMode && (
        <TrackPanel
          rec={rec}
          onSave={saveTrack}
          onDiscard={discardTrack}
          onClose={() => setTrackMode(false)}
        />
      )}

      {pending && (
        <AddPointForm
          lat={pending.lat}
          lon={pending.lon}
          onSave={handleSavePoint}
          onCancel={() => setPending(null)}
        />
      )}

      {bivouac && (
        <BivouacPanel
          lat={bivouac.lat}
          lon={bivouac.lon}
          onClose={() => setBivouac(null)}
        />
      )}

      {showOffline && (
        <OfflinePanel
          bounds={viewport.current.bounds}
          zoom={viewport.current.zoom}
          onClose={() => setShowOffline(false)}
        />
      )}

      {showTrails && selectedRoute && (
        <RouteInfo route={selectedRoute} onClose={() => setSelectedRoute(null)} />
      )}

      {selectedPR && (
        <RouteInfo
          route={{
            id: selectedPR.id,
            name: selectedPR.name,
            length: selectedPR.distanceKm,
            ascent: selectedPR.ascent,
            durationMin: selectedPR.durationMin,
            profile: selectedPR.profile,
            perso: '1',
          }}
          onClose={() => setSelectedPR(null)}
          onDelete={() => handleDeletePR(selectedPR.id)}
          onExportGpx={() => downloadGpx(selectedPR.name, selectedPR.geometry)}
        />
      )}
    </div>
  )
}

export default App
