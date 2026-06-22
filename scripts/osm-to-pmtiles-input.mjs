// Transforme un flux GeoJSONSeq (sortie d'osmium export) en features Point
// taggées avec leur categoryId, prêtes pour tippecanoe.
// Usage : node scripts/osm-to-pmtiles-input.mjs < filtered.geojsonseq > input.geojsonseq
import { createInterface } from 'node:readline'

// Catégorie -> tags OSM. À GARDER EN PHASE avec src/data/categories.ts.
const CATEGORIES = [
  { id: 'water', osm: [['amenity', 'drinking_water'], ['amenity', 'fountain']] },
  { id: 'toilets', osm: [['amenity', 'toilets']] },
  // « Prises » : recharge téléphone/appareils + prises publiques. Les
  // charging_station (souvent voiture) sont traitées à part dans categoryFor :
  // on ne les garde que si bicycle=yes/designated (VAE), pas le pur-voiture.
  { id: 'power', osm: [['amenity', 'device_charging_station'], ['amenity', 'power_supply'], ['power', 'outlet']] },
  { id: 'picnic', osm: [['leisure', 'picnic_table'], ['tourism', 'picnic_site']] },
  { id: 'books', osm: [['amenity', 'public_bookcase']] },
  { id: 'bakery', osm: [['shop', 'bakery']] },
  { id: 'peak', osm: [['natural', 'peak']] },
  { id: 'waterfall', osm: [['waterway', 'waterfall']] },
  { id: 'viewpoint', osm: [['tourism', 'viewpoint']] },
  { id: 'rock', osm: [['natural', 'rock'], ['natural', 'stone']] },
  { id: 'refuge', osm: [['tourism', 'alpine_hut'], ['tourism', 'wilderness_hut']] },
  { id: 'rest_area', osm: [['highway', 'rest_area']] },
  { id: 'hostel', osm: [['tourism', 'hostel']] },
]
const KEEP_TAGS = ['ele', 'opening_hours', 'access', 'fee', 'description', 'operator', 'website']

function categoryFor(tags) {
  // Recharge : on exclut les bornes uniquement voiture. Une charging_station
  // n'est rangée dans « Prises » que si elle sert aux vélos (VAE).
  if (tags.amenity === 'charging_station') {
    return tags.bicycle === 'yes' || tags.bicycle === 'designated' ? 'power' : null
  }
  for (const cat of CATEGORIES) {
    for (const [k, v] of cat.osm) if (tags[k] === v) return cat.id
  }
  return null
}

function avg(coords) {
  let x = 0, y = 0
  for (const c of coords) {
    x += c[0]
    y += c[1]
  }
  return [
    Math.round((x / coords.length) * 1e6) / 1e6,
    Math.round((y / coords.length) * 1e6) / 1e6,
  ]
}

function centroid(g) {
  if (!g) return null
  switch (g.type) {
    case 'Point':
      return [Math.round(g.coordinates[0] * 1e6) / 1e6, Math.round(g.coordinates[1] * 1e6) / 1e6]
    case 'LineString':
      return avg(g.coordinates)
    case 'Polygon':
      return avg(g.coordinates[0])
    case 'MultiPolygon':
      return avg(g.coordinates[0][0])
    case 'MultiLineString':
      return avg(g.coordinates[0])
    default:
      return null
  }
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity })
let i = 0
let kept = 0
rl.on('line', (line) => {
  // GeoJSONSeq peut préfixer chaque ligne d'un caractère RS (0x1e).
  const s = line.replace(/\x1e/g, '').trim()
  if (!s) return
  let f
  try {
    f = JSON.parse(s)
  } catch {
    return
  }
  const tags = f.properties ?? {}
  const cat = categoryFor(tags)
  if (!cat) return
  const c = centroid(f.geometry)
  if (!c) return
  const props = {
    id: String(tags['@id'] ?? f.id ?? 'x' + i++),
    categoryId: cat,
    name: tags.name ?? '',
  }
  for (const k of KEEP_TAGS) if (tags[k]) props[k] = tags[k]
  process.stdout.write(
    JSON.stringify({ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: props }) + '\n',
  )
  kept++
})
rl.on('close', () => {
  process.stderr.write(`${kept} POI conservés\n`)
})
