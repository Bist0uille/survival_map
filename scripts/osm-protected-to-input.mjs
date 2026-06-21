// Transforme l'export GeoJSONSeq des aires protégées OSM (parcs nationaux,
// réserves naturelles, aires protégées) en entrée tippecanoe légère. Ces zones
// sont celles où le bivouac est souvent interdit ou réglementé : la couche est
// purement informative (vérifier la réglementation locale).
import { createInterface } from 'node:readline'

// Détermine la « famille » de protection à partir des tags OSM.
function kindOf(t) {
  if (t.boundary === 'national_park') return 'national_park'
  if (t.leisure === 'nature_reserve' || t.boundary === 'nature_reserve')
    return 'nature_reserve'
  if (t.boundary === 'protected_area') return 'protected_area'
  return null
}

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
  if (!g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) continue
  const t = f.properties ?? {}
  const kind = kindOf(t)
  if (!kind) continue
  const props = { kind }
  if (t.name) props.name = String(t.name).slice(0, 120)
  // protect_class OSM (ex. « 2 » = parc national au sens UICN) si présent.
  if (t.protect_class) props.pc = String(t.protect_class)
  process.stdout.write(
    JSON.stringify({ type: 'Feature', geometry: g, properties: props }) + '\n',
  )
  kept++
}

process.stderr.write(`aires protégées gardées : ${kept} / ${seen} features\n`)
