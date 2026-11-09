// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
const mocks = vi.hoisted(() => ({ eval: vi.fn(), hgetall: vi.fn(), exec: vi.fn() }))
vi.mock('@upstash/redis', () => ({ Redis: class { eval = mocks.eval; pipeline() { return { hgetall: mocks.hgetall, exec: mocks.exec } } } }))
vi.mock('../server/searchConsole.js', () => ({ searchConsole: vi.fn().mockResolvedValue({ connected: false }) }))
import { GET, POST } from './admin'
import { createSession } from '../server/adminAuth'
const secret = 'private-test-admin-password-at-least-24-chars'
const post = (body: unknown, origin = 'https://survimap.com') => new Request('https://survimap.com/api/admin', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('ADMIN_PASSWORD', secret); vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example'); vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token'); mocks.eval.mockResolvedValue(1)
})
afterEach(() => vi.unstubAllEnvs())
describe('private statistics API', () => {
  it('never queries storage for unauthenticated statistics', async () => {
    const response = await GET(new Request('https://survimap.com/api/admin'))
    expect(response.status).toBe(401); expect(mocks.exec).not.toHaveBeenCalled(); expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
  it('refuses cross-site login and incorrect passwords', async () => {
    expect((await POST(post({ action: 'login', password: secret }, 'https://attacker.example'))).status).toBe(403)
    expect((await POST(post({ action: 'login', password: 'wrong' }))).status).toBe(401)
  })
  it('returns a bearer session without setting a cookie and enforces login quotas', async () => {
    const response = await POST(post({ action: 'login', password: secret }))
    expect(response.status).toBe(200)
    expect(response.headers.get('Set-Cookie')).toBeNull()
    expect((await response.json()).token).toMatch(/^\d{10}\.[a-f0-9]{48}\.[a-f0-9]{64}$/)
    mocks.eval.mockResolvedValue(11)
    expect((await POST(post({ action: 'login', password: secret }))).status).toBe(429)
  })
  it('reads a bounded date range after authentication and refuses unsupported ranges', async () => {
    const headers = { Authorization: `Bearer ${createSession(secret)}` }; mocks.exec.mockResolvedValue(Array(7).fill(null))
    const response = await GET(new Request('https://survimap.com/api/admin?days=7', { headers }))
    expect(response.status).toBe(200); expect((await response.json()).daily).toHaveLength(7); expect(mocks.hgetall).toHaveBeenCalledTimes(7)
    expect((await GET(new Request('https://survimap.com/api/admin?days=10000', { headers }))).status).toBe(400)
  })
  it('fails closed when the security store fails and does not create cookies on logout', async () => {
    mocks.eval.mockRejectedValue(new Error('offline'))
    expect((await POST(post({ action: 'login', password: secret }))).status).toBe(503)
    const response = await POST(post({ action: 'logout' })); expect(response.headers.get('Set-Cookie')).toBeNull()
  })
})
