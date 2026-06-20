// Génère la base statique des POI pour le département de l'Aude :
// interroge Overpass UNE fois pour toutes les catégories → public/data/pois.json.
// Lancé en local (npm run fetch-osm) et par la GitHub Action planifiée.
import { writeFileSync, mkdirSync } from 'node:fs'

// Bounding box généreuse couvrant le département de l'Aude (S, W, N, E).
export const AUDE_BBOX = { south: 42.62, west: 1.65, north: 43.47, east: 3.27 }

// Catégorie -> tags OSM. À GARDER EN PHASE avec src/data/categories.ts.
const CATEGORIES = [
  { id: 'water', osm: [['amenity', 'drinking_water'], ['amenity', 'fountain']] },
  { id: 'toilets', osm: [['amenity', 'toilets']] },
  { id: 'power', osm: [['amenity', 'charging_station']] },
  { id: 'picnic', osm: [['leisure', 'picnic_table'], ['tourism', 'picnic_site']] },
  { id: 'books', osm: [['amenity', 'public_bookcase']] },
  { id: 'bakery', osm: [['shop', 'bakery']] },
  { id: 'peak', osm: [['natural', 'peak']] },
  { id: 'waterfall', osm: [['waterway', 'waterfall']] },
  { id: 'viewpoint', osm: [['tourism', 'viewpoint']] },
  { id: 'rock', osm: [['natural', 'rock'], ['natural', 'stone']] },
  { id: 'refuge', osm: [['tourism', 'alpine_hut'], ['tourism', 'wilderness_hut']] },
  { id: 'rest_area', osm: [['highway', 'rest_area']] },
]

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

// Tags conservés dans la sortie (popups), pour garder le fichier léger.
const KEEP_TAGS = ['ele', 'opening_hours', 'access', 'fee', 'description', 'operator', 'website']

function buildQuery() {
  const { south, west, north, east } = AUDE_BBOX
  const bbox = `(${south},${west},${north},${east})`
  const clauses = []
  for (const cat of CATEGORIES) {
    for (const [k, v] of cat.osm) {
      clauses.push(`  node["${k}"="${v}"]${bbox};`)
      clauses.push(`  way["${k}"="${v}"]${bbox};`)
    }
  }
  return `[out:json][timeout:180];\n(\n${clauses.join('\n')}\n);\nout center tags;`
}

function categoryFor(tags) {
  for (const cat of CATEGORIES) {
    for (const [k, v] of cat.osm) if (tags[k] === v) return cat.id
  }
  return null
}

async function fetchOverpass(query) {
  let lastErr
  for (const ep of ENDPOINTS) {
    try {
      console.log(`→ ${ep}`)
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 200000)
      const res = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: ctrl.signal,
      })
      clearTimeout(timer)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      console.log(`  ${data.elements.length} éléments bruts`)
      return data.elements
    } catch (e) {
      console.log(`  échec : ${e.message}`)
      lastErr = e
    }
  }
  throw new Error('Toutes les instances Overpass ont échoué : ' + (lastErr?.message ?? '?'))
}

function parse(elements) {
  const pois = []
  const seen = new Set()
  for (const el of elements) {
    const tags = el.tags ?? {}
    const cat = categoryFor(tags)
    if (!cat) continue
    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (lat == null || lon == null) continue
    const id = `${el.type}/${el.id}`
    if (seen.has(id)) continue
    seen.add(id)
    const kept = {}
    for (const t of KEEP_TAGS) if (tags[t]) kept[t] = tags[t]
    pois.push({
      id,
      lat: Math.round(lat * 1e6) / 1e6,
      lon: Math.round(lon * 1e6) / 1e6,
      c: cat, // categoryId (clé courte pour alléger)
      n: tags.name ?? '',
      t: kept,
    })
  }
  return pois
}

const elements = await fetchOverpass(buildQuery())
const pois = parse(elements)
const out = {
  generatedAt: new Date().toISOString(),
  bbox: AUDE_BBOX,
  count: pois.length,
  pois,
}
mkdirSync('public/data', { recursive: true })
writeFileSync('public/data/pois.json', JSON.stringify(out))
console.log(`✅ ${pois.length} POI écrits dans public/data/pois.json`)
// Répartition par catégorie
const byCat = {}
for (const p of pois) byCat[p.c] = (byCat[p.c] ?? 0) + 1
console.log(byCat)
