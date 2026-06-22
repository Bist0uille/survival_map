import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { Map as MLMap, Marker as MLMarker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol, PMTiles } from 'pmtiles'
import { TOPO_STYLE, NARBONNE } from './style'
import { getCategory } from '../data/categories'
import { addCategoryIcons } from './categoryIcons'
import { CachedPmtilesSource } from './cachedSource'
import {
  EMPTY_FC,
  detectPmtiles,
  filterExpr,
  hlFilter,
  loadStaticFC,
  waypointEl,
  personalMarkerEl,
} from './mapHelpers'
import { toast } from '../data/toast'
import { featurePopupHtml, personalPopupHtml } from '../components/popupHtml'
import type { GeoBounds } from '../data/offline'
import type { PersonalPoint, PersonalRoute, Place } from '../types'

// Enregistre le protocole pmtiles auprès de MapLibre (une seule fois).
const pmtilesProtocol = new Protocol()
maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile)

const POI_SOURCE = 'pois'
const POI_LAYER = 'pois-icons'
// POI FR+ES+IT hébergés sur R2 (>100 Mo → hors repo), comme paths/protected.
const PMTILES_PATH =
  import.meta.env.VITE_POIS_URL ||
  'https://pub-1cff175e1c4641718e16b36f04ea91b1.r2.dev/pois.pmtiles'
const SOURCE_LAYER = 'pois' // nom de couche produit par tippecanoe (-l pois)

const ROUTES_SOURCE = 'routes'
const ROUTES_LAYER = 'routes-line'
const ROUTES_HL = 'routes-highlight'
const ROUTES_HIT = 'routes-hit' // ligne transparente large = cible de clic
const ROUTES_PATH =
  import.meta.env.VITE_ROUTES_URL ||
  'https://pub-1cff175e1c4641718e16b36f04ea91b1.r2.dev/routes.pmtiles'
const ROUTES_SL = 'routes' // couche tippecanoe (-l routes)

const TREKS_SOURCE = 'treks'
const TREKS_LAYER = 'treks-line'
const TREKS_HL = 'treks-highlight'
const TREKS_HIT = 'treks-hit'
const TREKS_PATH = '/treks.pmtiles'
const TREKS_SL = 'treks'

// Chemins praticables OSM (tous), hébergés sur Cloudflare R2 (gros fichier).
const PATHS_URL =
  import.meta.env.VITE_PATHS_URL ||
  'https://pub-1cff175e1c4641718e16b36f04ea91b1.r2.dev/paths.pmtiles'
const PATHS_SOURCE = 'paths'
const PATHS_LAYER = 'paths-line'
const PATHS_HIT = 'paths-hit' // cible de clic élargie
const PATHS_HL_SOURCE = 'paths-hl' // segment cliqué surligné (copie geojson)
const PATHS_HL_LAYER = 'paths-hl-line'
const PATHS_SL = 'paths'

// Aires protégées (bivouac réglementé), hébergées sur R2 comme les chemins.
const PROTECTED_URL =
  import.meta.env.VITE_PROTECTED_URL ||
  'https://pub-1cff175e1c4641718e16b36f04ea91b1.r2.dev/protected.pmtiles'
const PROTECTED_SOURCE = 'protected'
const PROTECTED_FILL = 'protected-fill'
const PROTECTED_LINE = 'protected-outline'
const PROTECTED_SL = 'protected'

const PR_SOURCE = 'perso-routes' // itinéraires créés par l'utilisateur
const PR_LAYER = 'perso-routes-line'
const PR_HIT = 'perso-routes-hit'
const DRAFT_SOURCE = 'draft-route' // tracé en cours de création
const DRAFT_LAYER = 'draft-route-line'
const LIVE_SOURCE = 'live-track' // trace GPS en cours d'enregistrement
const LIVE_LAYER = 'live-track-line'

interface MapViewProps {
  active: Set<string>
  personalPoints: PersonalPoint[]
  addMode: boolean
  flyTo: Place | null
  showRoutes: boolean
  showTreks: boolean
  showPaths: boolean
  showProtected: boolean
  selectedRouteId: string | null
  satellite: boolean
  view3D: boolean
  onRouteSelect: (props: Record<string, unknown> | null) => void
  createMode: boolean
  waypoints: Array<[number, number]>
  draftGeometry: GeoJSON.LineString | null
  liveTrack: GeoJSON.LineString | null
  personalRoutes: PersonalRoute[]
  onAddWaypoint: (lat: number, lon: number) => void
  onSelectPersonalRoute: (route: PersonalRoute) => void
  onMapClick: (lat: number, lon: number) => void
  onDeletePersonal: (id: string) => void
  onCount: (n: number) => void
  onViewport: (bounds: GeoBounds, zoom: number) => void
}

const ICON_LAYOUT = {
  'icon-image': ['get', 'categoryId'],
  'icon-size': ['interpolate', ['linear'], ['zoom'], 6, 0.22, 9, 0.38, 13, 0.6, 18, 0.9],
  'icon-allow-overlap': true,
  'icon-ignore-placement': true,
} as unknown as maplibregl.SymbolLayerSpecification['layout']

// Couleur de l'itinéraire selon son réseau (GR rouge, PR jaune/vert…).
const ROUTE_LINE_PAINT = {
  'line-color': [
    'match',
    ['get', 'network'],
    'iwn', '#d62828',
    'nwn', '#d62828',
    'rwn', '#e8a000',
    'lwn', '#2a9d3a',
    '#e07a00',
  ],
  // Largeur selon l'importance : GR/international (iwn/nwn) > régional (rwn)
  // > PR/local. Les GR ressortent nettement.
  'line-width': [
    'interpolate',
    ['linear'],
    ['zoom'],
    8,
    ['match', ['get', 'network'], ['iwn', 'nwn'], 2.2, 'rwn', 1.4, 1],
    12,
    ['match', ['get', 'network'], ['iwn', 'nwn'], 4, 'rwn', 2.6, 1.8],
    16,
    ['match', ['get', 'network'], ['iwn', 'nwn'], 7, 'rwn', 4.5, 3.2],
  ],
  'line-opacity': 0.85,
} as unknown as maplibregl.LineLayerSpecification['paint']

const ROUTE_HL_PAINT = {
  'line-color': '#1d4ed8',
  'line-width': ['interpolate', ['linear'], ['zoom'], 8, 4, 16, 9],
  'line-opacity': 0.9,
} as unknown as maplibregl.LineLayerSpecification['paint']

// Fiches Geotrek : violet pointillé, pour les distinguer des sentiers OSM.
const TREK_LINE_PAINT = {
  'line-color': '#7c3aed',
  'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2, 12, 3, 16, 4.5],
  'line-dasharray': [2, 1.5],
  'line-opacity': 0.85,
} as unknown as maplibregl.LineLayerSpecification['paint']

const HIT_PAINT = {
  'line-color': '#000',
  'line-opacity': 0,
  'line-width': 16,
} as unknown as maplibregl.LineLayerSpecification['paint']

// Itinéraires perso (vert) et tracé en cours (orange pointillé).
const PR_LINE_PAINT = {
  'line-color': '#16a34a',
  'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2.5, 14, 4.5],
  'line-opacity': 0.9,
} as unknown as maplibregl.LineLayerSpecification['paint']

const DRAFT_LINE_PAINT = {
  'line-color': '#ea580c',
  'line-width': ['interpolate', ['linear'], ['zoom'], 8, 3, 14, 5],
  'line-dasharray': [1.5, 1],
} as unknown as maplibregl.LineLayerSpecification['paint']

// Chemins OSM : tracé orange franc (pointillé « sentier »), bien visible —
// remplit les régions sans itinéraire balisé.
const PATH_LINE_PAINT = {
  'line-color': '#ea580c',
  'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.8, 13, 1.5, 16, 2.8],
  'line-dasharray': [2, 1.2],
  'line-opacity': 0.85,
} as unknown as maplibregl.LineLayerSpecification['paint']

// Trace GPS enregistrée en direct : rouge vif et épaisse, au-dessus de tout.
const LIVE_LINE_PAINT = {
  'line-color': '#dc2626',
  'line-width': ['interpolate', ['linear'], ['zoom'], 8, 3.5, 14, 5.5],
  'line-opacity': 0.95,
} as unknown as maplibregl.LineLayerSpecification['paint']

// Aires protégées : remplissage rose translucide + contour. Sous tout le reste.
const PROTECTED_FILL_PAINT = {
  'fill-color': '#e11d48',
  'fill-opacity': 0.12,
} as unknown as maplibregl.FillLayerSpecification['paint']

const PROTECTED_LINE_PAINT = {
  'line-color': '#be123c',
  'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 12, 2],
  'line-dasharray': [3, 2],
  'line-opacity': 0.7,
} as unknown as maplibregl.LineLayerSpecification['paint']

// Surbrillance d'un chemin cliqué (segment recopié en geojson).
const PATH_HL_PAINT = {
  'line-color': '#1d4ed8',
  'line-width': ['interpolate', ['linear'], ['zoom'], 8, 4, 16, 8],
  'line-opacity': 0.85,
} as unknown as maplibregl.LineLayerSpecification['paint']

const LINE_LAYOUT = {
  'line-join': 'round',
  'line-cap': 'round',
} as unknown as maplibregl.LineLayerSpecification['layout']

export function MapView({
  active,
  personalPoints,
  addMode,
  flyTo,
  showRoutes,
  showTreks,
  showPaths,
  showProtected,
  selectedRouteId,
  satellite,
  view3D,
  onRouteSelect,
  createMode,
  waypoints,
  draftGeometry,
  liveTrack,
  personalRoutes,
  onAddWaypoint,
  onSelectPersonalRoute,
  onMapClick,
  onDeletePersonal,
  onCount,
  onViewport,
}: MapViewProps) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MLMap | null>(null)
  const markers = useRef<MLMarker[]>([])
  const ready = useRef(false)
  const routesReady = useRef(false)
  const treksReady = useRef(false)
  const pathsReady = useRef(false)
  const activeRef = useRef(active)
  const showRoutesRef = useRef(showRoutes)
  const showTreksRef = useRef(showTreks)
  const showPathsRef = useRef(showPaths)
  const selectedRouteRef = useRef(selectedRouteId)
  const recomputeRef = useRef<() => void>(() => {})
  // Couches lourdes chargées à la demande (lazy) : fonctions d'init + garde
  // anti-course (init unique même si load + toggle déclenchent en même temps).
  const ensureRoutesRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const ensureTreksRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const ensurePathsRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const ensureProtectedRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const routesInit = useRef<Promise<void> | null>(null)
  const treksInit = useRef<Promise<void> | null>(null)
  const pathsInit = useRef<Promise<void> | null>(null)
  const protectedInit = useRef<Promise<void> | null>(null)
  const protectedReady = useRef(false)
  const showProtectedRef = useRef(showProtected)

  const waypointMarkers = useRef<MLMarker[]>([])
  const prReady = useRef(false)
  const personalRoutesRef = useRef(personalRoutes)
  personalRoutesRef.current = personalRoutes
  const cbClick = useRef(onMapClick)
  const cbDelete = useRef(onDeletePersonal)
  const cbCount = useRef(onCount)
  const cbViewport = useRef(onViewport)
  const cbRouteSelect = useRef(onRouteSelect)
  const cbAddWaypoint = useRef(onAddWaypoint)
  const cbSelectPR = useRef(onSelectPersonalRoute)
  const addModeRef = useRef(addMode)
  const createModeRef = useRef(createMode)
  cbClick.current = onMapClick
  cbDelete.current = onDeletePersonal
  cbCount.current = onCount
  cbViewport.current = onViewport
  cbRouteSelect.current = onRouteSelect
  cbAddWaypoint.current = onAddWaypoint
  cbSelectPR.current = onSelectPersonalRoute
  addModeRef.current = addMode
  createModeRef.current = createMode
  activeRef.current = active
  showRoutesRef.current = showRoutes
  showTreksRef.current = showTreks
  showPathsRef.current = showPaths
  showProtectedRef.current = showProtected
  selectedRouteRef.current = selectedRouteId

  // Init carte (une seule fois)
  useEffect(() => {
    const el = container.current
    if (!el || map.current) return
    const m = new maplibregl.Map({
      container: el,
      style: TOPO_STYLE,
      center: NARBONNE,
      zoom: 12,
    })
    map.current = m

    // Boussole : un clic réoriente au nord (bearing 0) et remet la carte à plat
    // (pitch 0) grâce à visualizePitch.
    m.addControl(
      new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }),
      'bottom-right',
    )
    m.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'bottom-right',
    )
    // Échelle : repère rapide des distances selon le niveau de zoom.
    m.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-right')

    // Compte les icônes réellement affichées des catégories actives, pour
    // coller à ce que l'utilisateur voit. queryRenderedFeatures respecte le
    // filtre de la couche ; on déduplique par id (une feature peut apparaître
    // sur plusieurs tuiles). Recalculé en anti-rebond une fois les tuiles
    // posées (icon-allow-overlap => toutes les icônes sont placées).
    const recomputeCount = () => {
      if (!ready.current) return
      const feats = m.queryRenderedFeatures({ layers: [POI_LAYER] })
      const ids = new Set<string>()
      for (const f of feats) ids.add(String(f.properties?.id ?? f.id))
      cbCount.current(ids.size)
    }
    // Anti-rebond : les tuiles vecteur arrivent par paquets, on recalcule
    // 200 ms après la dernière mise à jour pour avoir un total complet.
    let countTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleCount = () => {
      if (countTimer) clearTimeout(countTimer)
      countTimer = setTimeout(recomputeCount, 200)
    }
    recomputeRef.current = scheduleCount

    const emitViewport = () => {
      const b = m.getBounds()
      cbViewport.current(
        { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() },
        m.getZoom(),
      )
    }

    // Renvoie le 1er id de couche existant parmi `ids` (du bas vers le haut
    // de la pile cible) → sert de `beforeId` pour insérer une couche lazy au
    // bon niveau Z, quel que soit l'ordre d'activation par l'utilisateur.
    const beforeOf = (ids: string[]): string | undefined =>
      ids.find((id) => m.getLayer(id))

    // --- Chemins OSM (tous), depuis R2 — sous tout le reste. En ligne
    // uniquement (gros fichier non mis hors-ligne). Chargé à la demande.
    const ensurePaths = (): Promise<void> => {
      if (pathsReady.current || !PATHS_URL) return Promise.resolve()
      if (pathsInit.current) return pathsInit.current
      pathsInit.current = (async () => {
        let ok = false
        try {
          const res = await fetch(PATHS_URL, { headers: { Range: 'bytes=0-6' } })
          if (res.ok || res.status === 206) {
            const bytes = new Uint8Array(await res.arrayBuffer())
            ok = String.fromCharCode(...bytes.slice(0, 7)) === 'PMTiles'
          }
        } catch {
          ok = false
        }
        if (!ok) {
          pathsInit.current = null // réseau absent : réessai possible plus tard
          return
        }
        pmtilesProtocol.add(new PMTiles(new CachedPmtilesSource(PATHS_URL, null)))
        m.addSource(PATHS_SOURCE, { type: 'vector', url: 'pmtiles://' + PATHS_URL })
        const before = beforeOf([ROUTES_LAYER, TREKS_LAYER, PR_LAYER, POI_LAYER])
        m.addLayer(
          {
            id: PATHS_LAYER,
            type: 'line',
            source: PATHS_SOURCE,
            'source-layer': PATHS_SL,
            minzoom: 12,
            layout: {
              ...LINE_LAYOUT,
              visibility: showPathsRef.current ? 'visible' : 'none',
            },
            paint: PATH_LINE_PAINT,
          },
          before,
        )
        // Surbrillance du chemin cliqué : source geojson dédiée (le chemin n'a
        // pas d'id stable → on recopie la géométrie cliquée). Pas de panneau.
        const hlVis = showPathsRef.current ? 'visible' : 'none'
        m.addSource(PATHS_HL_SOURCE, { type: 'geojson', data: EMPTY_FC })
        m.addLayer(
          {
            id: PATHS_HL_LAYER,
            type: 'line',
            source: PATHS_HL_SOURCE,
            layout: { ...LINE_LAYOUT, visibility: hlVis },
            paint: PATH_HL_PAINT,
          },
          before,
        )
        // Cible de clic élargie (les chemins sont fins).
        m.addLayer(
          {
            id: PATHS_HIT,
            type: 'line',
            source: PATHS_SOURCE,
            'source-layer': PATHS_SL,
            minzoom: 12,
            layout: { ...LINE_LAYOUT, visibility: hlVis },
            paint: { 'line-color': '#000', 'line-opacity': 0, 'line-width': 10 },
          },
          before,
        )
        pathsReady.current = true
        m.on('click', PATHS_HIT, (e) => {
          if (addModeRef.current || createModeRef.current) return
          const f = e.features?.[0]
          if (!f) return
          ;(m.getSource(PATHS_HL_SOURCE) as maplibregl.GeoJSONSource | undefined)?.setData(
            { type: 'Feature', geometry: f.geometry, properties: {} },
          )
        })
        m.on('mouseenter', PATHS_HIT, () => {
          m.getCanvas().style.cursor = 'pointer'
        })
        m.on('mouseleave', PATHS_HIT, () => {
          m.getCanvas().style.cursor = addModeRef.current ? 'crosshair' : ''
        })
      })()
      return pathsInit.current
    }
    ensurePathsRef.current = ensurePaths

    // --- Aires protégées (polygones) : tout en bas, sous les chemins/lignes.
    const ensureProtected = (): Promise<void> => {
      if (protectedReady.current || !PROTECTED_URL) return Promise.resolve()
      if (protectedInit.current) return protectedInit.current
      protectedInit.current = (async () => {
        let ok = false
        try {
          const res = await fetch(PROTECTED_URL, {
            headers: { Range: 'bytes=0-6' },
          })
          if (res.ok || res.status === 206) {
            const bytes = new Uint8Array(await res.arrayBuffer())
            ok = String.fromCharCode(...bytes.slice(0, 7)) === 'PMTiles'
          }
        } catch {
          ok = false
        }
        if (!ok) {
          protectedInit.current = null
          return
        }
        pmtilesProtocol.add(
          new PMTiles(new CachedPmtilesSource(PROTECTED_URL, null)),
        )
        m.addSource(PROTECTED_SOURCE, {
          type: 'vector',
          url: 'pmtiles://' + PROTECTED_URL,
        })
        const vis = showProtectedRef.current ? 'visible' : 'none'
        // Sous toutes les autres couches (chemins, lignes, POI).
        const before = beforeOf([
          PATHS_LAYER,
          ROUTES_LAYER,
          TREKS_LAYER,
          PR_LAYER,
          POI_LAYER,
        ])
        m.addLayer(
          {
            id: PROTECTED_FILL,
            type: 'fill',
            source: PROTECTED_SOURCE,
            'source-layer': PROTECTED_SL,
            layout: { visibility: vis },
            paint: PROTECTED_FILL_PAINT,
          },
          before,
        )
        m.addLayer(
          {
            id: PROTECTED_LINE,
            type: 'line',
            source: PROTECTED_SOURCE,
            'source-layer': PROTECTED_SL,
            layout: { ...LINE_LAYOUT, visibility: vis },
            paint: PROTECTED_LINE_PAINT,
          },
          before,
        )
        protectedReady.current = true
      })()
      return protectedInit.current
    }
    ensureProtectedRef.current = ensureProtected

    // --- Itinéraires balisés (lignes) : sous les POI. Chargé à la demande.
    const ensureRoutes = (): Promise<void> => {
      if (routesReady.current) return Promise.resolve()
      if (routesInit.current) return routesInit.current
      routesInit.current = (async () => {
        const routes = await detectPmtiles(ROUTES_PATH, 'routes')
        if (!routes.use) {
          routesInit.current = null
          return
        }
        pmtilesProtocol.add(
          new PMTiles(new CachedPmtilesSource(routes.url, routes.blob)),
        )
        m.addSource(ROUTES_SOURCE, {
          type: 'vector',
          url: 'pmtiles://' + routes.url,
        })
        const vis = showRoutesRef.current ? 'visible' : 'none'
        const before = beforeOf([TREKS_LAYER, PR_LAYER, POI_LAYER])
        m.addLayer(
          {
            id: ROUTES_LAYER,
            type: 'line',
            source: ROUTES_SOURCE,
            'source-layer': ROUTES_SL,
            layout: { ...LINE_LAYOUT, visibility: vis },
            paint: ROUTE_LINE_PAINT,
          },
          before,
        )
        m.addLayer(
          {
            id: ROUTES_HL,
            type: 'line',
            source: ROUTES_SOURCE,
            'source-layer': ROUTES_SL,
            layout: { ...LINE_LAYOUT, visibility: vis },
            paint: ROUTE_HL_PAINT,
            filter: hlFilter(selectedRouteRef.current),
          },
          before,
        )
        // Ligne transparente large : élargit la cible de clic (doigt / souris).
        m.addLayer(
          {
            id: ROUTES_HIT,
            type: 'line',
            source: ROUTES_SOURCE,
            'source-layer': ROUTES_SL,
            layout: { ...LINE_LAYOUT, visibility: vis },
            paint: { 'line-color': '#000', 'line-opacity': 0, 'line-width': 16 },
          },
          before,
        )
        routesReady.current = true
        m.on('click', ROUTES_HIT, (e) => {
          if (addModeRef.current) return
          const f = e.features?.[0]
          if (f) cbRouteSelect.current(f.properties as Record<string, unknown>)
        })
        m.on('mouseenter', ROUTES_HIT, () => {
          m.getCanvas().style.cursor = 'pointer'
        })
        m.on('mouseleave', ROUTES_HIT, () => {
          m.getCanvas().style.cursor = addModeRef.current ? 'crosshair' : ''
        })
      })()
      return routesInit.current
    }
    ensureRoutesRef.current = ensureRoutes

    // --- Fiches Geotrek (treks) : couche distincte, même mécanique.
    const ensureTreks = (): Promise<void> => {
      if (treksReady.current) return Promise.resolve()
      if (treksInit.current) return treksInit.current
      treksInit.current = (async () => {
        const treks = await detectPmtiles(TREKS_PATH, 'treks')
        if (!treks.use) {
          treksInit.current = null
          return
        }
        pmtilesProtocol.add(
          new PMTiles(new CachedPmtilesSource(treks.url, treks.blob)),
        )
        m.addSource(TREKS_SOURCE, {
          type: 'vector',
          url: 'pmtiles://' + treks.url,
        })
        const tvis = showTreksRef.current ? 'visible' : 'none'
        const before = beforeOf([PR_LAYER, POI_LAYER])
        m.addLayer(
          {
            id: TREKS_LAYER,
            type: 'line',
            source: TREKS_SOURCE,
            'source-layer': TREKS_SL,
            layout: { ...LINE_LAYOUT, visibility: tvis },
            paint: TREK_LINE_PAINT,
          },
          before,
        )
        m.addLayer(
          {
            id: TREKS_HL,
            type: 'line',
            source: TREKS_SOURCE,
            'source-layer': TREKS_SL,
            layout: { ...LINE_LAYOUT, visibility: tvis },
            paint: ROUTE_HL_PAINT,
            filter: hlFilter(selectedRouteRef.current),
          },
          before,
        )
        m.addLayer(
          {
            id: TREKS_HIT,
            type: 'line',
            source: TREKS_SOURCE,
            'source-layer': TREKS_SL,
            layout: { ...LINE_LAYOUT, visibility: tvis },
            paint: HIT_PAINT,
          },
          before,
        )
        treksReady.current = true
        m.on('click', TREKS_HIT, (e) => {
          if (addModeRef.current) return
          const f = e.features?.[0]
          if (f) cbRouteSelect.current(f.properties as Record<string, unknown>)
        })
        m.on('mouseenter', TREKS_HIT, () => {
          m.getCanvas().style.cursor = 'pointer'
        })
        m.on('mouseleave', TREKS_HIT, () => {
          m.getCanvas().style.cursor = addModeRef.current ? 'crosshair' : ''
        })
      })()
      return treksInit.current
    }
    ensureTreksRef.current = ensureTreks

    m.once('load', async () => {
      m.resize()
      await addCategoryIcons(m)

      // --- Itinéraires perso (vert) + tracé en cours de création (orange).
      m.addSource(PR_SOURCE, { type: 'geojson', data: EMPTY_FC })
      m.addLayer({
        id: PR_LAYER,
        type: 'line',
        source: PR_SOURCE,
        layout: LINE_LAYOUT,
        paint: PR_LINE_PAINT,
      })
      m.addLayer({
        id: PR_HIT,
        type: 'line',
        source: PR_SOURCE,
        layout: LINE_LAYOUT,
        paint: HIT_PAINT,
      })
      m.addSource(DRAFT_SOURCE, { type: 'geojson', data: EMPTY_FC })
      m.addLayer({
        id: DRAFT_LAYER,
        type: 'line',
        source: DRAFT_SOURCE,
        layout: LINE_LAYOUT,
        paint: DRAFT_LINE_PAINT,
      })
      m.addSource(LIVE_SOURCE, { type: 'geojson', data: EMPTY_FC })
      m.addLayer({
        id: LIVE_LAYER,
        type: 'line',
        source: LIVE_SOURCE,
        layout: LINE_LAYOUT,
        paint: LIVE_LINE_PAINT,
      })
      prReady.current = true
      m.on('click', PR_HIT, (e) => {
        if (addModeRef.current || createModeRef.current) return
        const id = e.features?.[0]?.properties?.id
        const route = personalRoutesRef.current.find((r) => r.id === id)
        if (route) cbSelectPR.current(route)
      })
      m.on('mouseenter', PR_HIT, () => {
        if (!createModeRef.current) m.getCanvas().style.cursor = 'pointer'
      })
      m.on('mouseleave', PR_HIT, () => {
        m.getCanvas().style.cursor = createModeRef.current
          ? 'crosshair'
          : addModeRef.current
            ? 'crosshair'
            : ''
      })

      // --- POI (icônes) : au-dessus des itinéraires. Fichier local si présent
      // (détection par signature "PMTiles"), sinon réseau, sinon repli Aude.
      const poi = await detectPmtiles(PMTILES_PATH, 'pois')
      if (poi.use) {
        pmtilesProtocol.add(new PMTiles(new CachedPmtilesSource(poi.url, poi.blob)))
        m.addSource(POI_SOURCE, { type: 'vector', url: 'pmtiles://' + poi.url })
        m.addLayer({
          id: POI_LAYER,
          type: 'symbol',
          source: POI_SOURCE,
          'source-layer': SOURCE_LAYER,
          layout: ICON_LAYOUT,
          filter: filterExpr([...activeRef.current]),
        })
      } else {
        m.addSource(POI_SOURCE, { type: 'geojson', data: await loadStaticFC() })
        m.addLayer({
          id: POI_LAYER,
          type: 'symbol',
          source: POI_SOURCE,
          layout: ICON_LAYOUT,
          filter: filterExpr([...activeRef.current]),
        })
        // Base complète indisponible : on est retombé sur le repli local (Aude).
        toast('Points limités à l’Aude (base FR/ES/IT indisponible ou hors-ligne)', 'info')
      }
      ready.current = true

      m.on('click', POI_LAYER, (e) => {
        const f = e.features?.[0]
        if (!f || f.geometry.type !== 'Point') return
        const [lon, lat] = f.geometry.coordinates
        new maplibregl.Popup({ offset: 10 })
          .setLngLat([lon, lat])
          .setHTML(featurePopupHtml(f.properties))
          .addTo(m)
      })
      m.on('mouseenter', POI_LAYER, () => {
        m.getCanvas().style.cursor = 'pointer'
      })
      m.on('mouseleave', POI_LAYER, () => {
        m.getCanvas().style.cursor = addModeRef.current ? 'crosshair' : ''
      })

      scheduleCount()

      // Couches lourdes : on ne les charge qu'au démarrage si déjà activées.
      // En séquentiel pour garantir l'empilement protected < paths < routes < treks.
      if (showProtectedRef.current) await ensureProtected()
      if (showPathsRef.current) await ensurePaths()
      if (showRoutesRef.current) await ensureRoutes()
      if (showTreksRef.current) await ensureTreks()
    })

    const ro = new ResizeObserver(() => m.resize())
    ro.observe(el)

    m.on('idle', scheduleCount)
    m.on('moveend', () => {
      scheduleCount()
      emitViewport()
    })
    m.on('sourcedata', (e) => {
      if (e.sourceId === POI_SOURCE) scheduleCount()
    })
    m.once('idle', emitViewport)

    m.on('click', (e) => {
      if (createModeRef.current) {
        cbAddWaypoint.current(e.lngLat.lat, e.lngLat.lng)
      } else if (addModeRef.current) {
        cbClick.current(e.lngLat.lat, e.lngLat.lng)
      }
    })

    // Suppression d'un point perso depuis le bouton dans la popup
    m.getContainer().addEventListener('click', (ev) => {
      const id = (ev.target as HTMLElement).getAttribute('data-delete-id')
      if (id) cbDelete.current(id)
    })

    return () => {
      ro.disconnect()
      m.remove()
      map.current = null
      ready.current = false
    }
  }, [])

  // Curseur en mode ajout / création
  useEffect(() => {
    const m = map.current
    if (!m) return
    m.getCanvas().style.cursor = addMode || createMode ? 'crosshair' : ''
  }, [addMode, createMode])

  // Itinéraires perso enregistrés (ligne verte).
  useEffect(() => {
    const m = map.current
    if (!m || !prReady.current) return
    const fc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: personalRoutes.map((r) => ({
        type: 'Feature',
        geometry: r.geometry,
        properties: {
          id: r.id,
          name: r.name,
          length: r.distanceKm,
          ascent: r.ascent,
          perso: '1',
        },
      })),
    }
    ;(m.getSource(PR_SOURCE) as maplibregl.GeoJSONSource | undefined)?.setData(fc)
  }, [personalRoutes])

  // Tracé en cours de création (ligne orange pointillée).
  useEffect(() => {
    const m = map.current
    if (!m || !prReady.current) return
    const data: GeoJSON.GeoJSON = draftGeometry
      ? { type: 'Feature', geometry: draftGeometry, properties: {} }
      : EMPTY_FC
    ;(m.getSource(DRAFT_SOURCE) as maplibregl.GeoJSONSource | undefined)?.setData(data)
  }, [draftGeometry])

  // Trace GPS en cours d'enregistrement (ligne rouge live).
  useEffect(() => {
    const m = map.current
    if (!m || !prReady.current) return
    const data: GeoJSON.GeoJSON = liveTrack
      ? { type: 'Feature', geometry: liveTrack, properties: {} }
      : EMPTY_FC
    ;(m.getSource(LIVE_SOURCE) as maplibregl.GeoJSONSource | undefined)?.setData(data)
  }, [liveTrack])

  // Marqueurs numérotés des étapes.
  useEffect(() => {
    const m = map.current
    if (!m) return
    waypointMarkers.current.forEach((mk) => mk.remove())
    waypointMarkers.current = []
    waypoints.forEach(([lon, lat], i) => {
      const mk = new maplibregl.Marker({ element: waypointEl(i + 1) })
        .setLngLat([lon, lat])
        .addTo(m)
      waypointMarkers.current.push(mk)
    })
  }, [waypoints])

  // Déplacement de la carte sur le lieu recherché.
  useEffect(() => {
    const m = map.current
    if (!m || !flyTo) return
    if (flyTo.bbox) {
      const [s, n, w, e] = flyTo.bbox
      m.fitBounds(
        [
          [w, s],
          [e, n],
        ],
        { maxZoom: 15, padding: 40, duration: 900 },
      )
    } else {
      m.flyTo({ center: [flyTo.lon, flyTo.lat], zoom: 14, duration: 900 })
    }
  }, [flyTo])

  // Filtre par catégories actives (instantané via la couche).
  useEffect(() => {
    const m = map.current
    if (!m || !ready.current) return
    m.setFilter(POI_LAYER, filterExpr([...active]))
    recomputeRef.current()
  }, [active])

  // Affichage/masquage des itinéraires (charge la couche à la 1re activation).
  useEffect(() => {
    const m = map.current
    if (!m || !ready.current) return
    let cancelled = false
    ;(async () => {
      if (showRoutes && !routesReady.current) await ensureRoutesRef.current()
      if (cancelled || !routesReady.current) return
      const v = showRoutes ? 'visible' : 'none'
      m.setLayoutProperty(ROUTES_LAYER, 'visibility', v)
      m.setLayoutProperty(ROUTES_HL, 'visibility', v)
      m.setLayoutProperty(ROUTES_HIT, 'visibility', v)
    })()
    return () => {
      cancelled = true
    }
  }, [showRoutes])

  // Affichage/masquage des fiches Geotrek (idem : chargement à la demande).
  useEffect(() => {
    const m = map.current
    if (!m || !ready.current) return
    let cancelled = false
    ;(async () => {
      if (showTreks && !treksReady.current) await ensureTreksRef.current()
      if (cancelled || !treksReady.current) return
      const v = showTreks ? 'visible' : 'none'
      m.setLayoutProperty(TREKS_LAYER, 'visibility', v)
      m.setLayoutProperty(TREKS_HL, 'visibility', v)
      m.setLayoutProperty(TREKS_HIT, 'visibility', v)
    })()
    return () => {
      cancelled = true
    }
  }, [showTreks])

  // Affichage/masquage des chemins OSM (idem : chargement à la demande).
  useEffect(() => {
    const m = map.current
    if (!m || !ready.current) return
    let cancelled = false
    ;(async () => {
      if (showPaths && !pathsReady.current) await ensurePathsRef.current()
      if (cancelled || !pathsReady.current) return
      const v = showPaths ? 'visible' : 'none'
      m.setLayoutProperty(PATHS_LAYER, 'visibility', v)
      m.setLayoutProperty(PATHS_HIT, 'visibility', v)
      m.setLayoutProperty(PATHS_HL_LAYER, 'visibility', v)
      // On efface la surbrillance quand on masque la couche.
      if (!showPaths)
        (m.getSource(PATHS_HL_SOURCE) as maplibregl.GeoJSONSource | undefined)?.setData(EMPTY_FC)
    })()
    return () => {
      cancelled = true
    }
  }, [showPaths])

  // Affichage/masquage des aires protégées (chargement à la demande).
  useEffect(() => {
    const m = map.current
    if (!m || !ready.current) return
    let cancelled = false
    ;(async () => {
      if (showProtected && !protectedReady.current)
        await ensureProtectedRef.current()
      if (cancelled || !protectedReady.current) return
      const v = showProtected ? 'visible' : 'none'
      m.setLayoutProperty(PROTECTED_FILL, 'visibility', v)
      m.setLayoutProperty(PROTECTED_LINE, 'visibility', v)
    })()
    return () => {
      cancelled = true
    }
  }, [showProtected])

  // Surlignage de l'itinéraire/fiche sélectionné (filtre sur l'id, sur les
  // deux couches : seul l'id correspondant s'allume).
  useEffect(() => {
    const m = map.current
    if (!m) return
    if (routesReady.current) m.setFilter(ROUTES_HL, hlFilter(selectedRouteId))
    if (treksReady.current) m.setFilter(TREKS_HL, hlFilter(selectedRouteId))
  }, [selectedRouteId])

  // Vue satellite : bascule la visibilité de la couche raster Esri.
  useEffect(() => {
    const m = map.current
    if (!m || !ready.current) return
    m.setLayoutProperty('satellite', 'visibility', satellite ? 'visible' : 'none')
  }, [satellite])

  // Mode 3D : terrain (relief) + caméra inclinée. Désactivé → on remet à plat
  // puis on retire le terrain. Le bearing est laissé tel quel (géré par la
  // boussole).
  useEffect(() => {
    const m = map.current
    if (!m || !ready.current) return
    if (view3D) {
      m.setTerrain({ source: 'terrain-dem', exaggeration: 1.3 })
      m.easeTo({ pitch: 60, duration: 800 })
    } else {
      m.easeTo({ pitch: 0, duration: 600 })
      m.setTerrain(null)
    }
  }, [view3D])

  // Points perso : marqueurs DOM (peu nombreux).
  useEffect(() => {
    const m = map.current
    if (!m) return
    markers.current.forEach((mk) => mk.remove())
    markers.current = []
    for (const p of personalPoints) {
      const cat = getCategory(p.categoryId)
      const mk = new maplibregl.Marker({ element: personalMarkerEl(cat.color) })
        .setLngLat([p.lon, p.lat])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(personalPopupHtml(p)))
        .addTo(m)
      markers.current.push(mk)
    }
  }, [personalPoints])

  // Style inline (pas la classe Tailwind `.absolute`) : la classe
  // `.maplibregl-map` (position:relative, chargée après Tailwind)
  // l'emporterait, laissant le conteneur à 0 de hauteur.
  return <div ref={container} style={{ position: 'absolute', inset: 0 }} />
}
