import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { Map as MLMap, Marker as MLMarker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol, PMTiles } from 'pmtiles'
import { TOPO_STYLE, NARBONNE } from './style'
import { getCategory } from '../data/categories'
import { addCategoryIcons } from './categoryIcons'
import { CachedPmtilesSource } from './cachedSource'
import { getOfflineBlob } from '../data/db'
import { featurePopupHtml, personalPopupHtml } from '../components/popupHtml'
import type { GeoBounds } from '../data/offline'
import type { PersonalPoint, Place } from '../types'

// Enregistre le protocole pmtiles auprès de MapLibre (une seule fois).
const pmtilesProtocol = new Protocol()
maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile)

const POI_SOURCE = 'pois'
const POI_LAYER = 'pois-icons'
const PMTILES_PATH = '/pois.pmtiles'
const SOURCE_LAYER = 'pois' // nom de couche produit par tippecanoe (-l pois)
const STATIC_JSON = '/data/pois.json' // repli : base statique Aude

const ROUTES_SOURCE = 'routes'
const ROUTES_LAYER = 'routes-line'
const ROUTES_HL = 'routes-highlight'
const ROUTES_HIT = 'routes-hit' // ligne transparente large = cible de clic
const ROUTES_PATH = '/routes.pmtiles'
const ROUTES_SL = 'routes' // couche tippecanoe (-l routes)

/**
 * Détecte un fichier pmtiles : lit le blob local (hors-ligne) s'il existe —
 * via sa signature "PMTiles" —, sinon teste le réseau (Range 0-6).
 */
async function detectPmtiles(
  path: string,
  key: string,
): Promise<{ use: boolean; url: string; blob: Blob | null }> {
  const url = window.location.origin + path
  const blob = await getOfflineBlob(key)
  let use = false
  if (blob) {
    const magic = new TextDecoder().decode(await blob.slice(0, 7).arrayBuffer())
    use = magic === 'PMTiles'
  } else {
    try {
      const res = await fetch(path, { headers: { Range: 'bytes=0-6' } })
      if (res.ok || res.status === 206) {
        const bytes = new Uint8Array(await res.arrayBuffer())
        use = String.fromCharCode(...bytes.slice(0, 7)) === 'PMTiles'
      }
    } catch {
      use = false // hors-ligne / 404
    }
  }
  return { use, url, blob }
}

interface MapViewProps {
  active: Set<string>
  personalPoints: PersonalPoint[]
  addMode: boolean
  flyTo: Place | null
  showRoutes: boolean
  selectedRouteId: string | null
  onRouteSelect: (props: Record<string, unknown> | null) => void
  onMapClick: (lat: number, lon: number) => void
  onDeletePersonal: (id: string) => void
  onCount: (n: number) => void
  onViewport: (bounds: GeoBounds, zoom: number) => void
}

/** Filtre de couche : ne garder que les catégories actives. */
function filterExpr(active: string[]): maplibregl.FilterSpecification {
  return ['in', ['get', 'categoryId'], ['literal', active]] as unknown as maplibregl.FilterSpecification
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
  'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.4, 12, 2.6, 16, 4.5],
  'line-opacity': 0.8,
} as unknown as maplibregl.LineLayerSpecification['paint']

const ROUTE_HL_PAINT = {
  'line-color': '#1d4ed8',
  'line-width': ['interpolate', ['linear'], ['zoom'], 8, 4, 16, 9],
  'line-opacity': 0.9,
} as unknown as maplibregl.LineLayerSpecification['paint']

const LINE_LAYOUT = {
  'line-join': 'round',
  'line-cap': 'round',
} as unknown as maplibregl.LineLayerSpecification['layout']

function hlFilter(id: string | null): maplibregl.FilterSpecification {
  return ['==', ['get', 'id'], id ?? '__none__'] as unknown as maplibregl.FilterSpecification
}

/** Charge la base statique Aude en FeatureCollection (mode repli). */
async function loadStaticFC(): Promise<GeoJSON.FeatureCollection> {
  const r = await fetch(STATIC_JSON)
  const data: { pois: Array<{ id: string; lat: number; lon: number; c: string; n: string; t: Record<string, string> }> } =
    await r.json()
  return {
    type: 'FeatureCollection',
    features: data.pois.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: { id: p.id, categoryId: p.c, name: p.n, ...p.t },
    })),
  }
}

/** Élément DOM pour un marqueur de point perso (avec anneau). */
function personalMarkerEl(color: string): HTMLDivElement {
  const el = document.createElement('div')
  el.style.width = '16px'
  el.style.height = '16px'
  el.style.borderRadius = '50%'
  el.style.background = color
  el.style.border = '3px solid #fff'
  el.style.outline = '2px solid ' + color
  el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.4)'
  el.style.cursor = 'pointer'
  return el
}

export function MapView({
  active,
  personalPoints,
  addMode,
  flyTo,
  showRoutes,
  selectedRouteId,
  onRouteSelect,
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
  const activeRef = useRef(active)
  const showRoutesRef = useRef(showRoutes)
  const selectedRouteRef = useRef(selectedRouteId)
  const recomputeRef = useRef<() => void>(() => {})

  const cbClick = useRef(onMapClick)
  const cbDelete = useRef(onDeletePersonal)
  const cbCount = useRef(onCount)
  const cbViewport = useRef(onViewport)
  const cbRouteSelect = useRef(onRouteSelect)
  const addModeRef = useRef(addMode)
  cbClick.current = onMapClick
  cbDelete.current = onDeletePersonal
  cbCount.current = onCount
  cbViewport.current = onViewport
  cbRouteSelect.current = onRouteSelect
  addModeRef.current = addMode
  activeRef.current = active
  showRoutesRef.current = showRoutes
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

    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    m.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'bottom-right',
    )

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

    m.once('load', async () => {
      m.resize()
      await addCategoryIcons(m)

      // --- Itinéraires (lignes) : ajoutés EN PREMIER → restent SOUS les POI.
      const routes = await detectPmtiles(ROUTES_PATH, 'routes')
      if (routes.use) {
        pmtilesProtocol.add(
          new PMTiles(new CachedPmtilesSource(routes.url, routes.blob)),
        )
        m.addSource(ROUTES_SOURCE, {
          type: 'vector',
          url: 'pmtiles://' + routes.url,
        })
        const vis = showRoutesRef.current ? 'visible' : 'none'
        m.addLayer({
          id: ROUTES_LAYER,
          type: 'line',
          source: ROUTES_SOURCE,
          'source-layer': ROUTES_SL,
          layout: { ...LINE_LAYOUT, visibility: vis },
          paint: ROUTE_LINE_PAINT,
        })
        m.addLayer({
          id: ROUTES_HL,
          type: 'line',
          source: ROUTES_SOURCE,
          'source-layer': ROUTES_SL,
          layout: { ...LINE_LAYOUT, visibility: vis },
          paint: ROUTE_HL_PAINT,
          filter: hlFilter(selectedRouteRef.current),
        })
        // Ligne transparente large : élargit la cible de clic (doigt / souris).
        m.addLayer({
          id: ROUTES_HIT,
          type: 'line',
          source: ROUTES_SOURCE,
          'source-layer': ROUTES_SL,
          layout: { ...LINE_LAYOUT, visibility: vis },
          paint: { 'line-color': '#000', 'line-opacity': 0, 'line-width': 16 },
        })
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
      }

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
      if (addModeRef.current) cbClick.current(e.lngLat.lat, e.lngLat.lng)
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

  // Curseur en mode ajout
  useEffect(() => {
    const m = map.current
    if (!m) return
    m.getCanvas().style.cursor = addMode ? 'crosshair' : ''
  }, [addMode])

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

  // Affichage/masquage des itinéraires.
  useEffect(() => {
    const m = map.current
    if (!m || !routesReady.current) return
    const v = showRoutes ? 'visible' : 'none'
    m.setLayoutProperty(ROUTES_LAYER, 'visibility', v)
    m.setLayoutProperty(ROUTES_HL, 'visibility', v)
    m.setLayoutProperty(ROUTES_HIT, 'visibility', v)
  }, [showRoutes])

  // Surlignage de l'itinéraire sélectionné (filtre sur l'id).
  useEffect(() => {
    const m = map.current
    if (!m || !routesReady.current) return
    m.setFilter(ROUTES_HL, hlFilter(selectedRouteId))
  }, [selectedRouteId])

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
