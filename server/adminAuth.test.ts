// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import { adminSecret, authenticated, createSession, SESSION_SECONDS } from './adminAuth'
import { validateEvent } from './analytics'

afterEach(() => vi.unstubAllEnvs())
const secret = 'a-test-secret-with-at-least-24-characters'
const request = (token: string) => new Request('https://survimap.com/api/admin', { headers: { Authorization: `Bearer ${token}` } })
describe('admin sessions', () => {
  it('fails closed without a sufficiently long secret', () => {
    vi.stubEnv('ADMIN_PASSWORD', 'short'); expect(adminSecret()).toBeNull()
    vi.stubEnv('ADMIN_PASSWORD', ''); expect(adminSecret()).toBeNull()
  })
  it('accepts a signed session and rejects missing, forged, expired and old-secret sessions', () => {
    const now = Date.now(), token = createSession(secret, now)
    expect(authenticated(request(token), secret, now)).toBe(true)
    expect(authenticated(new Request('https://survimap.com/api/admin'), secret, now)).toBe(false)
    expect(authenticated(new Request('https://survimap.com/api/admin', { headers: { cookie: `admin=${token}` } }), secret, now)).toBe(false)
    expect(authenticated(request(token.slice(0, -1) + (token.endsWith('0') ? '1' : '0')), secret, now)).toBe(false)
    expect(authenticated(request(token), secret, now + SESSION_SECONDS * 1000)).toBe(false)
    expect(authenticated(request(token), 'another-secret', now)).toBe(false)
  })
})
describe('bounded anonymous counters', () => {
  it('accepts fixed event fields only and refuses private data, admin paths and unknown sources', () => {
    const valid = { event: 'pageview', path: '/', source: 'google' }
    expect(validateEvent(valid)).toEqual(valid)
    for (const body of [{ ...valid, lat: 44 }, { ...valid, path: '/admin/' }, { ...valid, path: '/?lat=44' }, { ...valid, source: 'personal.example.com' }, { ...valid, event: 'search:my-address' }, null]) expect(validateEvent(body)).toBeNull()
  })
  it('bounds visible time samples and rejects duration attached to other events', () => {
    const sample = { event: 'engagement', path: '/', source: 'direct', seconds: 15 }
    expect(validateEvent(sample)).toEqual(sample)
    for (const seconds of [0, -1, 16, 1000, 1.5, '15', null]) expect(validateEvent({ ...sample, seconds })).toBeNull()
    expect(validateEvent({ ...sample, event: 'pageview' })).toBeNull()
  })
})
