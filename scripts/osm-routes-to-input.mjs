// Transforme la sortie GeoJSONSeq d'ogr2ogr (couche multilinestrings du
// driver OSM) en lignes d'itinéraires taggées pour tippecanoe.
// Usage : node scripts/osm-routes-to-input.mjs < routes.geojsonseq > input.geojsonseq
import { createInterface } from 'node:readline'

// GDAL met les tags non standard dans une chaîne hstore :
//   "ref"=>"GR 36","network"=>"nwn","osmc:symbol"=>"red:..."
function parseOtherTags(s) {
  const o = {}
  if (!s) return o
  const re = /"([^"]+)"=>"((?:[^"\\]|\\.)*)"/g
  let m
  while ((m = re.exec(s))) o[m[1]] = m[2].replace(/\\"/g, '"')
  return o
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity })
let kept = 0
rl.on('line', (line) => {
  const s = line.replace(/\x1e/g, '').trim()
  if (!s) return
  let f
  try {
    f = JSON.parse(s)
  } catch {
    return
  }
  const g = f.geometry
  if (!g || (g.type !== 'LineString' && g.type !== 'MultiLineString')) return
  const p = f.properties ?? {}
  const ot = parseOtherTags(p.other_tags)
  // L'extrait est déjà filtré route=hiking, mais on double-vérifie.
  if (ot.route && ot.route !== 'hiking') return
  const props = {
    id: String(p.osm_id ?? f.id ?? 'x' + kept),
    name: p.name ?? '',
    ref: ot.ref ?? '',
    network: ot.network ?? '', // iwn/nwn/rwn/lwn
    colour: ot.colour ?? ot['osmc:symbol'] ?? '',
  }
  process.stdout.write(
    JSON.stringify({ type: 'Feature', geometry: g, properties: props }) + '\n',
  )
  kept++
})
rl.on('close', () => process.stderr.write(`${kept} itinéraires conservés\n`))
