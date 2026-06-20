import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { Map as MLMap, Marker as MLMarker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from 'pmtiles'
import { TOPO_STYLE, NARBONNE } from './style'
import { getCategory } from '../data/categories'
import { addCategoryIcons } from './categoryIcons'
import { featurePopupHtml, personalPopupHtml } from '../components/popupHtml'
import type { PersonalPoint } from '../types'

// Enregistre le protocole pmtiles auprès de MapLibre (une seule fois).
const pmtilesProtocol = new Protocol()
maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile)

const POI_SOURCE = 'pois'
const POI_LAYER = 'pois-icons'
const PMTILES_PATH = '/pois.pmtiles'
const SOURCE_LAYER = 'pois' // nom de couche produit par tippecanoe (-l pois)
const STATIC_JSON = '/data/pois.json' // repli : base statique Aude

interface MapViewProps {
  active: Set<string>
  personalPoints: PersonalPoint[]
  addMode: boolean
  onMapClick: (lat: number, lon: number) => void
  onDeletePersonal: (id: string) => void
  onCount: (n: number) => void
}

/** Filtre de couche : ne garder que les catégories actives. */
function filterExpr(active: string[]): maplibregl.FilterSpecification {
  return ['in', ['get', 'categoryId'], ['literal', active]] as unknown as maplibregl.FilterSpecification
}

const ICON_LAYOUT = {
  'icon-image': ['get', 'categoryId'],
  'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.42, 13, 0.6, 18, 0.9],
  'icon-allow-overlap': true,
  'icon-ignore-placement': true,
} as unknown as maplibregl.SymbolLayerSpecification['layout']

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
  onMapClick,
  onDeletePersonal,
  onCount,
}: MapViewProps) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MLMap | null>(null)
  const markers = useRef<MLMarker[]>([])
  const ready = useRef(false)
  const activeRef = useRef(active)

  const cbClick = useRef(onMapClick)
  const cbDelete = useRef(onDeletePersonal)
  const cbCount = useRef(onCount)
  const addModeRef = useRef(addMode)
  cbClick.current = onMapClick
  cbDelete.current = onDeletePersonal
  cbCount.current = onCount
  addModeRef.current = addMode
  activeRef.current = active

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

    const recomputeCount = () => {
      if (!ready.current) return
      const feats = m.queryRenderedFeatures({ layers: [POI_LAYER] })
      const ids = new Set(feats.map((f) => String(f.properties?.id ?? f.id)))
      cbCount.current(ids.size)
    }

    m.once('load', async () => {
      m.resize()
      await addCategoryIcons(m)

      // PMTiles (France) si le fichier existe, sinon GeoJSON statique (Aude).
      let usePmtiles = false
      try {
        usePmtiles = (await fetch(PMTILES_PATH, { method: 'HEAD' })).ok
      } catch {
        usePmtiles = false
      }

      if (usePmtiles) {
        m.addSource(POI_SOURCE, {
          type: 'vector',
          url: 'pmtiles://' + window.location.origin + PMTILES_PATH,
        })
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

      recomputeCount()
    })

    const ro = new ResizeObserver(() => m.resize())
    ro.observe(el)

    m.on('idle', recomputeCount)

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

  // Filtre par catégories actives (instantané via la couche).
  useEffect(() => {
    const m = map.current
    if (!m || !ready.current) return
    m.setFilter(POI_LAYER, filterExpr([...active]))
    const feats = m.queryRenderedFeatures({ layers: [POI_LAYER] })
    cbCount.current(new Set(feats.map((f) => String(f.properties?.id ?? f.id))).size)
  }, [active])

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
