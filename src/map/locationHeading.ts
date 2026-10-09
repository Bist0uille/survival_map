import type { Map, GeolocateControl } from 'maplibre-gl'
import { toast } from '../data/toast'

type CompassEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number
  webkitCompassAccuracy?: number
}

/** Adds a compass beam to the control's existing GPS dot and accuracy circle. */
export function attachLocationHeading(map: Map, control: GeolocateControl) {
  let heading: number | null = null
  let listening = false
  let disposed = false
  const beam = document.createElement('div')
  beam.className = 'location-heading-beam'
  beam.setAttribute('aria-hidden', 'true')

  const render = () => {
    const dot = map.getContainer().querySelector('.maplibregl-user-location-dot')
    if (!dot || heading === null) {
      beam.remove()
      return
    }
    if (beam.parentElement !== dot) dot.appendChild(beam)
    beam.style.transform = `rotate(${heading - map.getBearing()}deg)`
  }

  const onOrientation = (event: DeviceOrientationEvent) => {
    const compass = event as CompassEvent
    let next: number | null = null
    if (typeof compass.webkitCompassHeading === 'number' &&
        (compass.webkitCompassAccuracy === undefined || compass.webkitCompassAccuracy >= 0)) {
      next = compass.webkitCompassHeading
    } else if (event.absolute && event.alpha !== null) {
      next = 360 - event.alpha
    }
    if (next === null || !Number.isFinite(next)) return
    const screenAngle = window.screen.orientation?.angle ??
      (window as Window & { orientation?: number }).orientation ?? 0
    heading = ((next + screenAngle) % 360 + 360) % 360
    render()
  }

  const start = async () => {
    if (listening || !('DeviceOrientationEvent' in window)) return
    listening = true
    const orientation = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: (absolute?: boolean) => Promise<string>
    }
    try {
      if (orientation.requestPermission && await orientation.requestPermission(true) !== 'granted') {
        listening = false
        toast('Boussole non autorisée : la position GPS reste disponible.', 'info')
        return
      }
      if (disposed) return
      window.addEventListener('deviceorientation', onOrientation)
      window.addEventListener('deviceorientationabsolute', onOrientation)
    } catch {
      listening = false
      if (!disposed) toast('Boussole indisponible : la position GPS reste disponible.', 'info')
    }
  }

  // Capture keeps the permission request within the user's GPS button gesture.
  const onClick = (event: MouseEvent) => {
    if ((event.target as Element).closest('.maplibregl-ctrl-geolocate')) void start()
  }
  map.getContainer().addEventListener('click', onClick, true)
  control.on('geolocate', render)
  map.on('rotate', render)

  return () => {
    disposed = true
    map.getContainer().removeEventListener('click', onClick, true)
    window.removeEventListener('deviceorientation', onOrientation)
    window.removeEventListener('deviceorientationabsolute', onOrientation)
    control.off('geolocate', render)
    map.off('rotate', render)
    beam.remove()
  }
}
