import { describe, it, expect } from 'vitest'
import {
  validateCheckinBody,
  applyCheckin,
  freshnessOf,
  freshnessLabel,
  agoLabel,
  checkinsToFC,
  SIX_MONTHS_MS,
  type CheckinRecord,
} from './checkinLogic'

const NOW = 1_800_000_000_000
const DAY = 24 * 60 * 60 * 1000

function rec(over: Partial<CheckinRecord> = {}): CheckinRecord {
  return { ok: 1, gone: 0, lastOk: NOW - DAY, lastGone: null, lon: 3, lat: 43, ...over }
}

describe('validateCheckinBody', () => {
  it('accepte un corps valide', () => {
    expect(validateCheckinBody({ id: 'n123', verdict: 'ok', lon: 3.0, lat: 43.1 })).toEqual({
      id: 'n123',
      verdict: 'ok',
      lon: 3.0,
      lat: 43.1,
    })
    expect(validateCheckinBody({ id: 'a888', verdict: 'gone', lon: -1, lat: 42 })).not.toBeNull()
  })

  it('rejette id, verdict ou coordonnées invalides', () => {
    expect(validateCheckinBody(null)).toBeNull()
    expect(validateCheckinBody({ id: 'x12', verdict: 'ok', lon: 0, lat: 0 })).toBeNull()
    expect(validateCheckinBody({ id: 'n1', verdict: 'maybe', lon: 0, lat: 0 })).toBeNull()
    expect(validateCheckinBody({ id: 'n1', verdict: 'ok', lon: 999, lat: 0 })).toBeNull()
    expect(validateCheckinBody({ id: 'n1', verdict: 'ok', lon: 0, lat: 'a' })).toBeNull()
    expect(validateCheckinBody({ id: 'n' + '9'.repeat(20), verdict: 'ok', lon: 0, lat: 0 })).toBeNull()
  })
})

describe('applyCheckin', () => {
  it('crée un enregistrement au premier check-in', () => {
    expect(applyCheckin(null, 'ok', NOW, 3, 43)).toEqual({
      ok: 1,
      gone: 0,
      lastOk: NOW,
      lastGone: null,
      lon: 3,
      lat: 43,
    })
  })

  it('incrémente et met à jour le bon timestamp', () => {
    const r1 = applyCheckin(rec(), 'gone', NOW, 3, 43)
    expect(r1.gone).toBe(1)
    expect(r1.ok).toBe(1)
    expect(r1.lastGone).toBe(NOW)
    expect(r1.lastOk).toBe(NOW - DAY)
  })
})

describe('freshnessOf', () => {
  it('vert si confirmé récemment', () => {
    expect(freshnessOf(rec(), NOW)).toBe('confirmed')
  })

  it('gris si la confirmation date de plus de 6 mois', () => {
    expect(freshnessOf(rec({ lastOk: NOW - SIX_MONTHS_MS - DAY }), NOW)).toBe('stale')
  })

  it('rouge si le dernier verdict est « disparu »', () => {
    expect(freshnessOf(rec({ lastGone: NOW }), NOW)).toBe('gone')
  })

  it('une confirmation postérieure réhabilite le point', () => {
    expect(freshnessOf(rec({ lastGone: NOW - 2 * DAY, lastOk: NOW - DAY }), NOW)).toBe('confirmed')
  })
})

describe('freshnessLabel / agoLabel', () => {
  it('formate les durées', () => {
    expect(agoLabel(NOW, NOW)).toBe("aujourd'hui")
    expect(agoLabel(NOW - 3 * DAY, NOW)).toBe('il y a 3 j')
    expect(agoLabel(NOW - 150 * DAY, NOW)).toBe('il y a 5 mois')
  })

  it('décrit chaque état', () => {
    expect(freshnessLabel(rec({ ok: 3 }), NOW)).toBe('✓ Confirmé il y a 1 j (3 confirmations)')
    expect(freshnessLabel(rec({ lastGone: NOW }), NOW)).toBe("⚠ Signalé disparu aujourd'hui")
    expect(freshnessLabel(rec({ lastOk: NOW - SIX_MONTHS_MS - DAY }), NOW)).toContain('à revérifier')
  })
})

describe('checkinsToFC', () => {
  it('produit un point par enregistrement avec sa fraîcheur', () => {
    const fc = checkinsToFC({ n1: rec(), n2: rec({ lastGone: NOW }) }, NOW)
    expect(fc.features).toHaveLength(2)
    const byId = Object.fromEntries(fc.features.map((f) => [f.properties!.id, f]))
    expect(byId.n1.properties!.freshness).toBe('confirmed')
    expect(byId.n2.properties!.freshness).toBe('gone')
    expect((byId.n1.geometry as GeoJSON.Point).coordinates).toEqual([3, 43])
  })
})
