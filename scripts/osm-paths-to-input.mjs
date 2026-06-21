// Transforme l'export GeoJSONSeq des chemins praticables OSM (osmium export)
// en entrée tippecanoe légère (props minimales pour des tuiles compactes).
import { createInterface } from 'node:readline'

// Types de chemins pertinents pour la rando à pied.
const HW = new Set([
  'path',
  'track',
  'footway',
  'bridleway',
  'steps',
  'via_ferrata',
  'cycleway',
  'pedestrian',
])

const rl = createInterface({ input: process.stdin })
let kept = 0
let seen = 0

for await (const line of rl) {
  // GeoJSONSeq préfixe chaque ligne d'un caractère RS (0x1e) à retirer.
  const s = line.replace(/\x1e/g, '').trim()
  if (!s) continue
  seen++
  let f
  try {
    f = JSON.parse(s)
  } catch {
    continue
  }
  const g = f.geometry
  if (!g || (g.type !== 'LineString' && g.type !== 'MultiLineString')) continue
  const t = f.properties ?? {}
  if (!HW.has(t.highway)) continue
  const props = { hw: t.highway }
  if (t.name) props.name = String(t.name).slice(0, 120)
  if (t.sac_scale) props.sac = t.sac_scale // difficulté alpine éventuelle
  process.stdout.write(
    JSON.stringify({ type: 'Feature', geometry: g, properties: props }) + '\n',
  )
  kept++
}

process.stderr.write(`chemins gardés : ${kept} / ${seen} features\n`)
