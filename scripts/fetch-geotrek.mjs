// Récupère les itinéraires « fiches » (treks) des instances Geotrek-admin
// (API v2) et les écrit en GeoJSONSeq pour tippecanoe.
// Usage : node scripts/fetch-geotrek.mjs > treks.geojsonseq
import { stdout, stderr } from 'node:process'

// Instances Geotrek confirmées (extensible : ajouter { code, name, host }).
const INSTANCES = [
  { code: 'ecr', name: 'Parc national des Écrins', host: 'geotrek-admin.ecrins-parcnational.fr' },
  { code: 'cev', name: 'Parc national des Cévennes', host: 'geotrek-admin.cevennes-parcnational.net' },
  { code: 'loz', name: 'Lozère', host: 'admin48.openig.org' },
  { code: 'pcr', name: 'Parc national de Port-Cros', host: 'geotrek-admin.portcros-parcnational.fr' },
]

async function getJson(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error(r.status + ' ' + url)
  return r.json()
}

async function fetchAll(host, path) {
  let url = `https://${host}/api/v2/${path}?format=json&language=fr&page_size=100`
  const all = []
  let guard = 0
  while (url && guard++ < 300) {
    const d = await getJson(url)
    all.push(...(d.results || []))
    url = d.next
  }
  return all
}

async function diffMap(host) {
  try {
    const rows = await fetchAll(host, 'trek_difficulty/')
    const m = {}
    for (const r of rows)
      m[r.id] = (typeof r.label === 'string' ? r.label : r.label?.fr) ?? r.name ?? ''
    return m
  } catch {
    return {}
  }
}

function round(v, p = 1) {
  const f = 10 ** p
  return Math.round(Number(v) * f) / f
}

function strip2d(geom) {
  if (!geom) return null
  const f = (c) => [round(c[0], 6), round(c[1], 6)]
  if (geom.type === 'LineString') return { type: 'LineString', coordinates: geom.coordinates.map(f) }
  if (geom.type === 'MultiLineString')
    return { type: 'MultiLineString', coordinates: geom.coordinates.map((l) => l.map(f)) }
  return null
}

let total = 0
for (const inst of INSTANCES) {
  let kept = 0
  try {
    const dm = await diffMap(inst.host)
    const treks = await fetchAll(inst.host, 'trek/')
    for (const t of treks) {
      const g = strip2d(t.geometry)
      if (!g) continue
      const props = {
        id: inst.code + '-' + t.id,
        name: typeof t.name === 'string' ? t.name : (t.name?.fr ?? ''),
        source: inst.name,
        geotrek: '1',
      }
      if (t.difficulty != null && dm[t.difficulty]) props.difficulty = dm[t.difficulty]
      if (t.duration != null) props.duration = round(t.duration, 1)
      if (t.ascent != null) props.ascent = Math.round(Number(t.ascent))
      if (t.length_2d != null) props.length = round(Number(t.length_2d) / 1000, 1) // km
      if (t.description_teaser) {
        const s = String(t.description_teaser).replace(/<[^>]+>/g, '').trim()
        if (s) props.teaser = s.slice(0, 600)
      }
      stdout.write(JSON.stringify({ type: 'Feature', geometry: g, properties: props }) + '\n')
      kept++
      total++
    }
  } catch (e) {
    stderr.write(`! ${inst.name} : échec (${e.message})\n`)
  }
  stderr.write(`${inst.name} : ${kept} treks\n`)
}
stderr.write(`TOTAL ${total} treks\n`)
