import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseOsmId,
  fetchOsmTimestamp,
  formatFreshness,
  clearFreshnessCache,
} from './freshness'

beforeEach(() => clearFreshnessCache())
afterEach(() => vi.restoreAllMocks())

describe('parseOsmId', () => {
  it('décode nœuds et chemins', () => {
    expect(parseOsmId('n123')).toEqual({ type: 'node', ref: 123 })
    expect(parseOsmId('w456')).toEqual({ type: 'way', ref: 456 })
  })

  it('décode les aires (way pair, relation impair)', () => {
    expect(parseOsmId('a888')).toEqual({ type: 'way', ref: 444 })
    expect(parseOsmId('a889')).toEqual({ type: 'relation', ref: 444 })
  })

  it('rejette les ids synthétiques ou invalides', () => {
    expect(parseOsmId('x12')).toBeNull()
    expect(parseOsmId('')).toBeNull()
    expect(parseOsmId('123')).toBeNull()
    expect(parseOsmId('n12x')).toBeNull()
    expect(parseOsmId('n0')).toBeNull()
  })
})

describe('fetchOsmTimestamp', () => {
  it('appelle la bonne URL et extrait le timestamp', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ elements: [{ timestamp: '2024-03-12T09:41:00Z' }] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const ts = await fetchOsmTimestamp('n123')
    expect(ts).toBe('2024-03-12T09:41:00Z')
    expect(fetchMock).toHaveBeenCalledWith('https://api.openstreetmap.org/api/0.6/node/123.json')
  })

  it('met en cache : deux appels même id = un seul fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ elements: [{ timestamp: '2024-01-01T00:00:00Z' }] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    await fetchOsmTimestamp('n42')
    await fetchOsmTimestamp('n42')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('renvoie null sur erreur réseau ou id inconnu, sans lever', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await fetchOsmTimestamp('n99')).toBeNull()
    expect(await fetchOsmTimestamp('x99')).toBeNull()
  })

  it('renvoie null sur réponse non-ok (404, 410, 429)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await fetchOsmTimestamp('w7')).toBeNull()
  })
})

describe('formatFreshness', () => {
  it('formate en date française', () => {
    expect(formatFreshness('2024-03-12T09:41:00Z')).toBe('12/03/2024')
  })

  it('rend la valeur brute si non parsable', () => {
    expect(formatFreshness('n/a')).toBe('n/a')
  })
})
