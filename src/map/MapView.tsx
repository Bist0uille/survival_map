import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { Map as MLMap, Marker as MLMarker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { TOPO_STYLE, NARBONNE } from './style'
import { getCategory } from '../data/categories'
import { poiPopupHtml, personalPopupHtml } from '../components/popupHtml'
import type { Poi, PersonalPoint } from '../types'

interface MapViewProps {
  pois: Poi[]
  personalPoints: PersonalPoint[]
  addMode: boolean
  onMoveEnd: (lat: number, lon: number) => void
  onMapClick: (lat: number, lon: number) => void
  onDeletePersonal: (id: string) => void
}

/** Crée un élément DOM de marqueur coloré pour une catégorie. */
function markerEl(color: string, ring: boolean): HTMLDivElement {
  const el = document.createElement('div')
  el.style.width = '16px'
  el.style.height = '16px'
  el.style.borderRadius = '50%'
  el.style.background = color
  el.style.border = ring ? '3px solid #fff' : '2px solid #fff'
  el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.4)'
  el.style.cursor = 'pointer'
  if (ring) el.style.outline = '2px solid ' + color
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
  // Refs vers les callbacks pour éviter de ré-attacher les listeners
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
    if (!container.current || map.current) return
    const m = new maplibregl.Map({
      container: container.current,
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

    m.on('moveend', () => {
      const c = m.getCenter()
      cbMove.current(c.lat, c.lng)
    })

    m.on('click', (e) => {
      if (addModeRef.current) {
        cbClick.current(e.lngLat.lat, e.lngLat.lng)
      }
    })

    // Suppression d'un point perso depuis le bouton dans la popup
    m.getContainer().addEventListener('click', (ev) => {
      const target = ev.target as HTMLElement
      const id = target.getAttribute('data-delete-id')
      if (id) cbDelete.current(id)
    })

    // Premier chargement
    cbMove.current(NARBONNE[1], NARBONNE[0])

    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  // Curseur en mode ajout
  useEffect(() => {
    const m = map.current
    if (!m) return
    m.getCanvas().style.cursor = addMode ? 'crosshair' : ''
  }, [addMode])

  // (Re)dessine les marqueurs quand POIs ou points perso changent
  useEffect(() => {
    const m = map.current
    if (!m) return

    markers.current.forEach((mk) => mk.remove())
    markers.current = []

    for (const poi of pois) {
      const cat = getCategory(poi.categoryId)
      const mk = new maplibregl.Marker({ element: markerEl(cat.color, false) })
        .setLngLat([poi.lon, poi.lat])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(poiPopupHtml(poi)))
        .addTo(m)
      markers.current.push(mk)
    }

    for (const p of personalPoints) {
      const cat = getCategory(p.categoryId)
      const mk = new maplibregl.Marker({ element: markerEl(cat.color, true) })
        .setLngLat([p.lon, p.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 12 }).setHTML(personalPopupHtml(p)),
        )
        .addTo(m)
      markers.current.push(mk)
    }
  }, [pois, personalPoints])

  return <div ref={container} className="absolute inset-0" />
}
