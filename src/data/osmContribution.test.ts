import { describe, it, expect } from 'vitest'
import { osmEditUrl, missingBakeryUrl } from './osmContribution'

describe('OSM contribution links', () => {
  it('targets real nodes, ways and encoded multipolygon relations', () => {
    expect(osmEditUrl('n123')).toContain('node=123')
    expect(osmEditUrl('a888')).toContain('way=444')
    expect(osmEditUrl('a889')).toContain('relation=444')
    expect(osmEditUrl('dt-123')).toBeNull()
    expect(osmEditUrl('n9999999999999999999')).toBeNull()
  })
  it('opens an unsent OSM note at the requested position and rejects invalid coordinates', () => {
    expect(missingBakeryUrl(2.35, 48.85)).toBe('https://www.openstreetmap.org/note/new#map=19/48.850000/2.350000')
    expect(missingBakeryUrl(NaN, 48)).toBeNull()
    expect(missingBakeryUrl(0, 91)).toBeNull()
  })
})
