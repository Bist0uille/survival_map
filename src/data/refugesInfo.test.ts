import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseRefugesResponse, fetchRefugeInfo, clearRefugesCache } from './refugesInfo'

beforeEach(() => clearRefugesCache())
afterEach(() => vi.restoreAllMocks())

function apiFeature(lon: number, lat: number, over: Record<string, unknown> = {}) {
  return {
    geometry: { type: 'Point', coordinates: [lon, lat] },
    properties: {
      nom: 'Cabane du Test',
      lien: 'https://www.refuges.info/point/123',
      type: { valeur: 'cabane non gardée' },
      places: { valeur: 6 },
      info_comp: { eau: { valeur: 1 } },
      date: { derniere_modif: '2026-05-14' },
      ...over,
    },
  }
}

describe('parseRefugesResponse', () => {
  it('retient le point le plus proche sous 150 m avec ses infos', () => {
    const data = { features: [apiFeature(3.001, 43.0001), apiFeature(3.01, 43.01, { nom: 'Loin' })] }
    const info = parseRefugesResponse(data, 3.001, 43.0)
    expect(info).toMatchObject({
      nom: 'Cabane du Test',
      url: 'https://www.refuges.info/point/123',
      type: 'cabane non gardée',
      places: 6,
      eau: 'eau à proximité',
      dateMaj: '2026-05-14',
    })
  })

  it('renvoie null si tout est trop loin ou sans nom/lien', () => {
    expect(parseRefugesResponse({ features: [apiFeature(3.01, 43.01)] }, 3.0, 43.0)).toBeNull()
    expect(
      parseRefugesResponse({ features: [apiFeature(3.0, 43.0, { nom: undefined })] }, 3.0, 43.0),
    ).toBeNull()
    expect(parseRefugesResponse({ pas: 'geojson' }, 3, 43)).toBeNull()
  })
})

describe('fetchRefugeInfo', () => {
  it('appelle l’API avec une bbox autour du point et met en cache', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [apiFeature(3.0, 43.0)] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const info = await fetchRefugeInfo(3.0, 43.0)
    expect(info?.nom).toBe('Cabane du Test')
    expect(String(fetchMock.mock.calls[0][0])).toContain('refuges.info/api/bbox?bbox=2.997,42.997,3.003,43.003')
    await fetchRefugeInfo(3.0, 43.0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('null silencieux sur erreur réseau', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await fetchRefugeInfo(3, 43)).toBeNull()
  })
})
