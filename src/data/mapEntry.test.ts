import { describe, expect, it } from 'vitest'
import { mapEntry } from './mapEntry'

describe('guide links into the map', () => {
  it('keeps the usual empty map when no filters are requested', () => {
    expect([...mapEntry('').active]).toEqual([])
  })
  it('accepts only known categories and explicit layer switches', () => {
    const entry = mapEntry('?filters=water,bakery,unknown,water&trails=1&protected=false')
    expect([...entry.active]).toEqual(['water', 'bakery'])
    expect(entry.trails).toBe(true)
    expect(entry.protected).toBe(false)
  })
})
