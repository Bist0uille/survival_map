import { parseOsmId } from './freshness'

export function osmEditUrl(id: string): string | null {
  const ref = parseOsmId(id)
  return ref ? `https://www.openstreetmap.org/edit?editor=id&${ref.type}=${ref.ref}` : null
}

/** Opens the public OSM note form; nothing is submitted by Survimap. */
export function missingBakeryUrl(lon: number, lat: number): string | null {
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90) return null
  return `https://www.openstreetmap.org/note/new#map=19/${lat.toFixed(6)}/${lon.toFixed(6)}`
}
