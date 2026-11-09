/** Fixed event names only: never pass coordinates, search terms or POI IDs. */
export function trackActivity(event: 'poi_open' | 'filter_change' | 'route_start' | 'route_saved' | 'gpx_import' | 'offline_start' | 'offline_complete') {
  window.dispatchEvent(new CustomEvent('survimap:activity', { detail: event }))
}
