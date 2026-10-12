// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import { canonicalPoi, eligiblePoi, parsePoiId, resolvePoi } from './poi'

afterEach(() => vi.unstubAllGlobals())
describe('official point validation', () => {
  const node = { type: 'node', id: 12, lon: 3, lat: 43, tags: { amenity: 'drinking_water' } }
  it('resolves nodes and encoded way/relation identifiers', () => {
    expect(parsePoiId('a24')).toEqual({ type: 'way', ref: 12 })
    expect(parsePoiId('a25')).toEqual({ type: 'relation', ref: 12 })
    expect(parsePoiId('n0')).toBeNull()
    expect(parsePoiId('n12/../../secret')).toBeNull()
    expect(canonicalPoi({ elements: [node] }, 'n12')).toEqual({ lon: 3, lat: 43 })
    expect(canonicalPoi({ elements: [node] }, 'n99')).toBeNull()
  })
  it('rejects deleted points, unsupported tags and invalid coordinates', () => {
    for (const over of [{ visible: false }, { tags: { highway: 'motorway' } }, { lon: 200 }]) {
      expect(canonicalPoi({ elements: [{ ...node, ...over }] }, 'n12')).toBeNull()
    }
    expect(eligiblePoi({ amenity: 'shelter', shelter_type: 'public_transport' })).toBe(false)
    expect(eligiblePoi({ amenity: 'charging_station' })).toBe(false)
    expect(eligiblePoi({ amenity: 'charging_station', bicycle: 'yes' })).toBe(true)
  })
  it('uses official geometry instead of caller coordinates', () => {
    const way = { type: 'way', id: 9, nodes: [1, 2], tags: node.tags }
    expect(canonicalPoi({ elements: [way, { type: 'node', id: 1, lon: 2, lat: 42 }, { type: 'node', id: 2, lon: 4, lat: 44 }] }, 'w9')).toEqual({ lon: 3, lat: 43 })
  })
  it('uses only a fixed HTTPS upstream, and handles missing objects', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(resolvePoi('n12')).resolves.toBeNull()
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.openstreetmap.org/api/0.6/node/12.json')
    await expect(resolvePoi('https://evil.example')).resolves.toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
