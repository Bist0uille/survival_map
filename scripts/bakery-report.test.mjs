import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { bakeryReport, checkDrop } from './bakery-report.mjs'

test('real converter retains bakery nodes, buildings, relations and hours; report deduplicates IDs', async () => {
  const fixture = [
    { id: 'n1', type: 'Point', coordinates: [2, 48] },
    { id: 'a8', type: 'Polygon', coordinates: [[[2, 48], [2.01, 48], [2, 48.01], [2, 48]]] },
    { id: 'a9', type: 'MultiPolygon', coordinates: [[[[2, 48], [2.01, 48], [2, 48.01], [2, 48]]]] },
  ].map(({ id, ...geometry }) => ({ type: 'Feature', geometry,
    properties: { '@id': id, shop: 'bakery', opening_hours: 'Mo-Sa 06:00-19:00', 'check_date:opening_hours': '2026-11-01' } }))
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./osm-to-pmtiles-input.mjs', import.meta.url))],
    { input: fixture.map(f => JSON.stringify(f)).join('\n'), encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  const features = result.stdout.trim().split('\n').map(line => JSON.parse(line))
  assert.equal(features.length, 3)
  assert.ok(features.every(f => f.properties['check_date:opening_hours'] === '2026-11-01'))
  const dir = mkdtempSync(join(tmpdir(), 'bakery-test-'))
  try {
    const input = join(dir, 'input.jsonl')
    writeFileSync(input, result.stdout + JSON.stringify(features[0]) + '\n' + JSON.stringify({ properties: { id: 'n99', iconId: 'grocery' } }))
    const report = await bakeryReport(input)
    assert.equal(report.count, 3)
    assert.equal(report.withHours, 3)
    assert.deepEqual(report.geometries, { node: 1, way: 0, area: 2 })
  } finally { rmSync(dir, { recursive: true }) }
})

test('blocks publication on abrupt count/hours drops or corrupt/empty reports', () => {
  const previous = { schema: 1, count: 53000, withHours: 27000, scope: 'France, Espagne, Italie', generatedAt: new Date().toISOString() }
  assert.doesNotThrow(() => checkDrop({ ...previous, count: 52000 }, previous))
  assert.throws(() => checkDrop({ ...previous, count: 40000 }, previous), /20 %/)
  assert.throws(() => checkDrop({ ...previous, withHours: 18000 }, previous), /30 %/)
  assert.throws(() => checkDrop({ ...previous, count: 0 }, null), /invalide/)
  assert.throws(() => checkDrop(previous, {}), /invalide/)
})
