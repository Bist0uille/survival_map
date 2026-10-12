import assert from 'node:assert/strict'
import { readdir, readFile, stat } from 'node:fs/promises'

// Fail the build if Vite stops emitting or precaching MapLibre's worker.
const assets = await readdir('dist/assets')
const workers = assets.filter((name) => /^maplibre-gl-worker-.+\.mjs$/.test(name))
assert.equal(workers.length, 1, 'Expected one emitted MapLibre worker')
const worker = workers[0]
assert.ok((await stat(`dist/assets/${worker}`)).size > 0, 'Worker must not be empty')
const bundles = await Promise.all(assets.filter((name) => name.endsWith('.js')).map((name) => readFile(`dist/assets/${name}`, 'utf8')))
assert.ok(bundles.some((bundle) => bundle.includes(worker)), 'Map bundle must reference the emitted worker')
const serviceWorker = await readFile('dist/sw.js', 'utf8')
assert.ok(serviceWorker.includes(worker), 'Worker must be precached for offline maps')
console.log('MapLibre : worker émis, référencé et inclus dans le cache hors ligne.')
