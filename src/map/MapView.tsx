import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { Map as MLMap, Marker as MLMarker, GeoJSONSource } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { TOPO_STYLE, NARBONNE } from './style'
import { getCategory } from '../data/categories'
import { addCategoryIcons } from './categoryIcons'
import { poiPopupHtml, personalPopupHtml } from '../components/popupHtml'
import type { Poi, PersonalPoint } from '../types'

export interface Bounds {
  west: number
  south: number
  east: number
  north: number
}

interface MapViewProps {
  pois: Poi[]
  personalPoints: PersonalPoint[]
  addMode: boolean
  onMoveEnd: (lat: number, lon: number, bounds: Bounds) => void
  onMapClick: (lat: number, lon: number) => void
  onDeletePersonal: (id: string) => void
}

const POI_SOURCE = 'pois'
const POI_LAYER = 'pois-icons'

function toFeatureCollection(pois: Poi[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: pois.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: { id: p.id, categoryId: p.categoryId },
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
  pois,
  personalPoints,
  addMode,
  onMoveEnd,
  onMapClick,
  onDeletePersonal,
}: MapViewProps) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MLMap | null>(null)
  const markers = useRef<MLMarker[]>([])
  const ready = useRef(false)
  // Index id -> Poi pour retrouver le détail au clic sur un cercle.
  const poiIndex = useRef<Map<string, Poi>>(new Map())
  const poisRef = useRef<Poi[]>(pois)

  const cbMove = useRef(onMoveEnd)
  const cbClick = useRef(onMapClick)
  const cbDelete = useRef(onDeletePersonal)
  const addModeRef = useRef(addMode)
  cbMove.current = onMoveEnd
  cbClick.current = onMapClick
  cbDelete.current = onDeletePersonal
  addModeRef.current = addMode

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

    m.once('load', async () => {
      m.resize()
      // Enregistre les icônes de catégorie puis la couche symbole GPU
      // (gère des milliers de points).
      await addCategoryIcons(m)
      m.addSource(POI_SOURCE, {
        type: 'geojson',
        data: toFeatureCollection(poisRef.current),
      })
      m.addLayer({
        id: POI_LAYER,
        type: 'symbol',
        source: POI_SOURCE,
        layout: {
          'icon-image': ['get', 'categoryId'],
          'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.42, 13, 0.6, 18, 0.9],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      })
      ready.current = true

      m.on('click', POI_LAYER, (e) => {
        const f = e.features?.[0]
        if (!f) return
        const poi = poiIndex.current.get(String(f.properties?.id))
        if (!poi) return
        new maplibregl.Popup({ offset: 10 })
          .setLngLat([poi.lon, poi.lat])
          .setHTML(poiPopupHtml(poi))
          .addTo(m)
      })
      m.on('mouseenter', POI_LAYER, () => {
        m.getCanvas().style.cursor = 'pointer'
      })
      m.on('mouseleave', POI_LAYER, () => {
        m.getCanvas().style.cursor = addModeRef.current ? 'crosshair' : ''
      })
    })

    const ro = new ResizeObserver(() => m.resize())
    ro.observe(el)

    const emitMove = () => {
      const c = m.getCenter()
      const b = m.getBounds()
      cbMove.current(c.lat, c.lng, {
        west: b.getWest(),
        south: b.getSouth(),
        east: b.getEast(),
        north: b.getNorth(),
      })
    }
    m.on('moveend', emitMove)

    m.on('click', (e) => {
      if (addModeRef.current) cbClick.current(e.lngLat.lat, e.lngLat.lng)
    })

    // Suppression d'un point perso depuis le bouton dans la popup
    m.getContainer().addEventListener('click', (ev) => {
      const id = (ev.target as HTMLElement).getAttribute('data-delete-id')
      if (id) cbDelete.current(id)
    })

    // Premier chargement (après que la carte ait ses dimensions)
    m.once('idle', emitMove)

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

  // Met à jour la couche POI (données GeoJSON) quand la liste change.
  useEffect(() => {
    poisRef.current = pois
    poiIndex.current = new Map(pois.map((p) => [p.id, p]))
    const m = map.current
    if (!m || !ready.current) return
    const src = m.getSource(POI_SOURCE) as GeoJSONSource | undefined
    src?.setData(toFeatureCollection(pois))
  }, [pois])

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

  // Style inline (et non la classe Tailwind `.absolute`) : la classe
  // `.maplibregl-map` ajoutée par MapLibre définit `position:relative` et,
  // chargée après Tailwind, l'emporterait — laissant le conteneur à 0 de
  // hauteur. Le style inline prime sur toute règle de classe.
  return <div ref={container} style={{ position: 'absolute', inset: 0 }} />
}
