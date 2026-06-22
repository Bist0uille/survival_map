// Transforme un flux GeoJSONSeq (sortie d'osmium export) en features Point
// taggées avec leur categoryId (filtre) + iconId (icône fine), pour tippecanoe.
// Usage : node scripts/osm-to-pmtiles-input.mjs < filtered.geojsonseq > input.geojsonseq
import { createInterface } from 'node:readline'

// Sous-type (iconId) -> catégorie (categoryId) + tags OSM.
// À GARDER EN PHASE avec SUBTYPES dans src/data/categories.ts.
const SUBTYPES = [
  { iconId: 'water', categoryId: 'water', osm: [['amenity', 'drinking_water'], ['amenity', 'fountain'], ['natural', 'spring'], ['amenity', 'water_point'], ['man_made', 'water_tap']] },
  { iconId: 'toilets', categoryId: 'toilets', osm: [['amenity', 'toilets']] },
  { iconId: 'shower', categoryId: 'toilets', osm: [['amenity', 'shower']] },
  // « Prises » : recharge téléphone/appareils + prises publiques. Les
  // charging_station (souvent voiture) sont traitées à part dans subtypeFor :
  // on ne les garde que si bicycle=yes/designated (VAE), pas le pur-voiture.
  { iconId: 'power', categoryId: 'power', osm: [['amenity', 'device_charging_station'], ['amenity', 'power_supply'], ['power', 'outlet']] },
  { iconId: 'picnic', categoryId: 'picnic', osm: [['leisure', 'picnic_table'], ['tourism', 'picnic_site']] },
  { iconId: 'books', categoryId: 'books', osm: [['amenity', 'public_bookcase']] },
  { iconId: 'bakery', categoryId: 'bakery', osm: [['shop', 'bakery']] },
  { iconId: 'grocery', categoryId: 'bakery', osm: [['shop', 'supermarket'], ['shop', 'convenience'], ['shop', 'grocery']] },
  { iconId: 'food', categoryId: 'bakery', osm: [['amenity', 'cafe'], ['amenity', 'restaurant'], ['amenity', 'fast_food']] },
  { iconId: 'peak', categoryId: 'peak', osm: [['natural', 'peak']] },
  { iconId: 'waterfall', categoryId: 'waterfall', osm: [['waterway', 'waterfall']] },
  { iconId: 'viewpoint', categoryId: 'viewpoint', osm: [['tourism', 'viewpoint']] },
  { iconId: 'rock', categoryId: 'rock', osm: [['natural', 'rock'], ['natural', 'stone']] },
  { iconId: 'hut', categoryId: 'refuge', osm: [['tourism', 'alpine_hut'], ['tourism', 'wilderness_hut']] },
  { iconId: 'camp', categoryId: 'refuge', osm: [['tourism', 'camp_site']] },
  { iconId: 'shelter', categoryId: 'refuge', osm: [['amenity', 'shelter']] },
  { iconId: 'rest_area', categoryId: 'rest_area', osm: [['highway', 'rest_area']] },
  { iconId: 'hostel', categoryId: 'hostel', osm: [['tourism', 'hostel']] },
  { iconId: 'pharmacy', categoryId: 'pharmacy', osm: [['amenity', 'pharmacy']] },
  { iconId: 'laundry', categoryId: 'laundry', osm: [['shop', 'laundry']] },
]
const KEEP_TAGS = ['ele', 'opening_hours', 'access', 'fee', 'description', 'operator', 'website', 'drinking_water']

function subtypeFor(tags) {
  // Recharge : on exclut les bornes uniquement voiture. Une charging_station
  // n'est rangée dans « Prises » que si elle sert aux vélos (VAE).
  if (tags.amenity === 'charging_station') {
    return tags.bicycle === 'yes' || tags.bicycle === 'designated'
      ? { iconId: 'power', categoryId: 'power' }
      : null
  }
  // amenity=shelter sert aussi aux abris de bus : on les écarte.
  if (tags.amenity === 'shelter' && tags.shelter_type === 'public_transport') return null
  for (const s of SUBTYPES) {
    for (const [k, v] of s.osm) if (tags[k] === v) return s
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
  const sub = subtypeFor(tags)
  if (!sub) return
  const c = centroid(f.geometry)
  if (!c) return
  const props = {
    id: String(tags['@id'] ?? f.id ?? 'x' + i++),
    categoryId: sub.categoryId,
    iconId: sub.iconId,
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
