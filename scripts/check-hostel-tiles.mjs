// Read-only production smoke test. Run after the PMTiles publication workflow.
import assert from 'node:assert/strict'
import { PMTiles } from 'pmtiles'
import { VectorTile } from '@mapbox/vector-tile'
import { PbfReader } from 'pbf'

const archive = new PMTiles(process.env.VITE_POIS_URL || 'https://pub-1cff175e1c4641718e16b36f04ea91b1.r2.dev/pois.pmtiles')
async function nearby(lon, lat) {
  const z = 14, scale = 2 ** z
  const x = Math.floor((lon + 180) / 360 * scale)
  const angle = lat * Math.PI / 180
  const y = Math.floor((1 - Math.asinh(Math.tan(angle)) / Math.PI) / 2 * scale)
  const found = new Map()
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const tile = await archive.getZxy(z, x + dx, y + dy)
    if (!tile) continue
    const layer = new VectorTile(new PbfReader(tile.data)).layers.pois
    if (!layer) continue
    for (let i = 0; i < layer.length; i++) {
      const props = layer.feature(i).properties
      if (props.categoryId === 'hostel') found.set(props.id, props)
    }
  }
  return [...found.values()]
}

const narbonne = await nearby(3.0031675, 43.1856765)
const cis = narbonne.filter((p) => String(p.name).includes('SÉJOUR DE NARBONNE'))
assert.equal(cis.length, 1, 'Narbonne CIS must appear once')
assert.equal(cis[0].source, 'DATAtourisme')
assert.ok(cis[0].dt_producer && cis[0].dt_updated && cis[0].dt_records)

const rennes = await nearby(-1.67098, 48.10927)
assert.equal(rennes.filter((p) => /chouettes/i.test(String(p.name))).length, 1, 'Chouettes Hostel must appear once')

const paris = await nearby(2.3629243, 48.88862)
const robert = paris.filter((p) => /yves robert/i.test(String(p.name)))
assert.equal(robert.length, 1, 'Yves Robert must remain a single OSM point')
assert.equal(robert[0].id, 'n2311230666')
assert.equal(JSON.parse(String(robert[0].dt_records)).length, 2, 'Both DATAtourisme source records must be credited')

console.log(JSON.stringify({ narbonne: cis[0].name, rennes: 'Chouettes Hostel present once', paris: 'Yves Robert present once, both source credits retained' }))
