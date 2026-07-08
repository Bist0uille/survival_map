import { describe, it, expect, vi } from 'vitest'
import {
  dedupeById,
  nearestOf,
  findNearestPoi,
  type NearestMapLike,
  type PoiFeature,
} from './nearest'

function pt(lon: number, lat: number, id?: string): PoiFeature {
  return {
    properties: id ? { id } : {},
    geometry: { type: 'Point', coordinates: [lon, lat] },
  }
}

describe('dedupeById', () => {
  it('supprime les doublons inter-tuiles par id', () => {
    const out = dedupeById([pt(3, 43, 'a'), pt(3, 43, 'a'), pt(3.1, 43, 'b')])
    expect(out).toHaveLength(2)
  })

  it('déduplique par coordonnées quand l’id manque', () => {
    const out = dedupeById([pt(3, 43), pt(3, 43), pt(3.2, 43)])
    expect(out).toHaveLength(2)
  })

  it('ignore les géométries non ponctuelles', () => {
    const line: PoiFeature = {
      properties: { id: 'l' },
      geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
    }
    expect(dedupeById([line, pt(3, 43, 'a')])).toHaveLength(1)
  })
})

describe('nearestOf', () => {
  it('renvoie le point le plus proche avec sa distance', () => {
    const res = nearestOf([3.0, 43.0], [pt(3.5, 43.0, 'loin'), pt(3.01, 43.0, 'près')])
    expect(res?.props.id).toBe('près')
    expect(res!.distanceKm).toBeGreaterThan(0.5)
    expect(res!.distanceKm).toBeLessThan(1.5)
  })

  it('renvoie null sans candidats', () => {
    expect(nearestOf([3, 43], [])).toBeNull()
  })
})

/** Faux MapLibre : idle immédiat, résultats scriptés par tentative. */
function fakeMap(resultsByAttempt: PoiFeature[][]) {
  let attempt = -1
  const jumps: Array<{ center: [number, number]; zoom: number }> = []
  const map: NearestMapLike = {
    getCenter: () => ({ lng: 1.5, lat: 42.5 }),
    getZoom: () => 10,
    jumpTo: (o) => {
      jumps.push(o)
    },
    once: (_ev, cb) => cb(),
    querySourceFeatures: vi.fn(() => {
      attempt += 1
      return resultsByAttempt[attempt] ?? []
    }),
  }
  return { map, jumps }
}

describe('findNearestPoi', () => {
  it('trouve au premier zoom et ne restaure pas la caméra', async () => {
    const { map, jumps } = fakeMap([[pt(3.01, 43, 'x')]])
    const res = await findNearestPoi(map, [3, 43], 'water')
    expect(res?.props.id).toBe('x')
    expect(jumps).toEqual([{ center: [3, 43], zoom: 13 }])
  })

  it('dézoome progressivement puis trouve', async () => {
    const { map, jumps } = fakeMap([[], [], [pt(3.2, 43, 'y')]])
    const res = await findNearestPoi(map, [3, 43], 'water')
    expect(res?.props.id).toBe('y')
    expect(jumps.map((j) => j.zoom)).toEqual([13, 11, 9])
  })

  it('restaure la caméra après échec complet', async () => {
    const { map, jumps } = fakeMap([[], [], [], []])
    const res = await findNearestPoi(map, [3, 43], 'water')
    expect(res).toBeNull()
    // 4 tentatives (13, 11, 9, 7) + restauration de la position de départ.
    expect(jumps.map((j) => j.zoom)).toEqual([13, 11, 9, 7, 10])
    expect(jumps[jumps.length - 1].center).toEqual([1.5, 42.5])
  })

  it('interroge la source avec le filtre de catégorie et la sourceLayer', async () => {
    const { map } = fakeMap([[pt(3, 43, 'z')]])
    await findNearestPoi(map, [3, 43], 'toilets', { sourceLayer: 'pois' })
    expect(map.querySourceFeatures).toHaveBeenCalledWith('pois', {
      sourceLayer: 'pois',
      filter: ['==', ['get', 'categoryId'], 'toilets'],
    })
  })

  it('omet la sourceLayer pour une source GeoJSON', async () => {
    const { map } = fakeMap([[pt(3, 43, 'z')]])
    await findNearestPoi(map, [3, 43], 'water')
    expect(map.querySourceFeatures).toHaveBeenCalledWith('pois', {
      filter: ['==', ['get', 'categoryId'], 'water'],
    })
  })
})
