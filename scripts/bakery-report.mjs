// Small aggregate report from the exact POI stream passed to tippecanoe.
// No new data source, credentials or database.
import { createReadStream, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { pathToFileURL } from 'node:url'

export async function bakeryReport(path, now = new Date()) {
  const ids = new Set()
  let withHours = 0
  const geometries = { node: 0, way: 0, area: 0 }
  const lines = createInterface({ input: createReadStream(path), crlfDelay: Infinity })
  for await (const line of lines) {
    const text = line.replace(/\x1e/g, '').trim()
    if (!text) continue
    const { properties: p } = JSON.parse(text) // fail closed on a broken stream
    if (p?.iconId !== 'bakery' || ids.has(p.id)) continue
    if (!/^[nwa]\d+$/.test(p.id)) throw new Error('Boulangerie sans identifiant OSM stable')
    ids.add(p.id)
    if (typeof p.opening_hours === 'string' && p.opening_hours.trim()) withHours++
    geometries[{ n: 'node', w: 'way', a: 'area' }[p.id[0]]]++
  }
  return { schema: 1, generatedAt: now.toISOString(), source: 'OpenStreetMap',
    scope: 'France, Espagne, Italie', count: ids.size, withHours,
    hoursPercent: ids.size ? Math.round(withHours / ids.size * 1000) / 10 : 0, geometries }
}

export function validateReport(report) {
  if (report?.schema !== 1 || report.scope !== 'France, Espagne, Italie' ||
      !Number.isSafeInteger(report.count) || report.count < 40000 ||
      !Number.isSafeInteger(report.withHours) || report.withHours < 0 || report.withHours > report.count ||
      !Number.isFinite(Date.parse(report.generatedAt))) throw new Error('Rapport boulangeries invalide ou import incomplet')
}

export function checkDrop(next, previous) {
  validateReport(next)
  if (!previous) return
  validateReport(previous)
  if (next.count < previous.count * 0.8) throw new Error('Baisse de plus de 20 % des boulangeries : publication bloquée, ancienne carte conservée')
  if (next.withHours < previous.withHours * 0.7) throw new Error('Baisse de plus de 30 % des horaires : publication bloquée, ancienne carte conservée')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [mode, input, output] = process.argv.slice(2)
  if (mode === 'generate' && input && output) {
    const report = await bakeryReport(input)
    validateReport(report)
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n')
    console.log(`${report.count} boulangeries, ${report.hoursPercent} % avec horaires (FR/ES/IT)`)
  } else if (mode === 'check' && input) {
    checkDrop(JSON.parse(readFileSync(input, 'utf8')), output ? JSON.parse(readFileSync(output, 'utf8')) : null)
  } else throw new Error('Usage: bakery-report.mjs generate input.geojsonseq report.json | check report.json [previous.json]')
}
