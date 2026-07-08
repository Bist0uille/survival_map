import { describe, it, expect, vi, beforeEach } from 'vitest'

// On mocke la couche Dexie : pas d'IndexedDB en jsdom.
const blobs = new Map<string, Blob>()
vi.mock('./db', () => ({
  getOfflineBlob: vi.fn(async (k: string) => blobs.get(k) ?? null),
  saveOfflineBlob: vi.fn(async (k: string, b: Blob) => {
    blobs.set(k, b)
  }),
}))

import { fetchAllCheckins, postCheckin } from './checkins'

const RECORD = { ok: 2, gone: 0, lastOk: 1000, lastGone: null, lon: 3, lat: 43 }

beforeEach(() => {
  blobs.clear()
  vi.unstubAllGlobals()
})

describe('fetchAllCheckins', () => {
  it('lit /api/checkins et garde une copie hors-ligne', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ n1: RECORD }) }),
    )
    const all = await fetchAllCheckins()
    expect(all.n1.ok).toBe(2)
    // La copie offline a été posée (best-effort, laisser la microtâche passer).
    await new Promise((r) => setTimeout(r, 0))
    expect(blobs.has('checkins')).toBe(true)
  })

  it('retombe sur la copie locale en échec réseau', async () => {
    blobs.set('checkins', new Blob([JSON.stringify({ n9: RECORD })]))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const all = await fetchAllCheckins()
    expect(all.n9.lon).toBe(3)
  })

  it('renvoie {} sans réseau ni copie locale', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await fetchAllCheckins()).toEqual({})
  })
})

describe('postCheckin', () => {
  it('poste le corps attendu et renvoie le record', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ record: RECORD }) })
    vi.stubGlobal('fetch', fetchMock)
    const rec = await postCheckin('n1', 'ok', 3, 43)
    expect(rec.ok).toBe(2)
    expect(fetchMock).toHaveBeenCalledWith('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'n1', verdict: 'ok', lon: 3, lat: 43 }),
    })
  })

  it('message dédié sur 429, générique sinon', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }))
    await expect(postCheckin('n1', 'ok', 3, 43)).rejects.toThrow(/Trop de signalements/)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(postCheckin('n1', 'ok', 3, 43)).rejects.toThrow(/impossible/)
  })
})
