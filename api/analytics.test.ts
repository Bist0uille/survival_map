// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
const mocks = vi.hoisted(() => ({ eval: vi.fn() }))
vi.mock('@upstash/redis', () => ({ Redis: class { eval = mocks.eval } }))
import { POST } from './analytics'
const secret = 'test-password-at-least-twenty-four-characters'
const request = (body: unknown, headers = {}) => new Request('https://survimap.com/api/analytics', { method: 'POST', headers: { origin: 'https://survimap.com', 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('ADMIN_PASSWORD', secret); vi.stubEnv('ANALYTICS_ENABLED', 'true'); vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example'); vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token'); mocks.eval.mockResolvedValue(1) })
afterEach(() => vi.unstubAllEnvs())
const valid = { event: 'pageview', path: '/', source: 'direct' }
describe('public analytics collection', () => {
  it('rejects cross-site and private payloads before storage', async () => {
    expect((await POST(request(valid, { origin: 'https://attacker.example' }))).status).toBe(403)
    expect((await POST(request({ ...valid, lat: 44 }))).status).toBe(400)
    expect(mocks.eval).not.toHaveBeenCalled()
  })
  it('ignores events while disabled', async () => {
    vi.stubEnv('ANALYTICS_ENABLED', 'false'); expect((await POST(request(valid))).status).toBe(204)
    expect(mocks.eval).not.toHaveBeenCalled()
  })
  it('stores aggregate-only values and enforces quotas', async () => {
    expect((await POST(request(valid, { 'x-forwarded-for': '192.0.2.12' }))).status).toBe(204)
    expect(JSON.stringify(mocks.eval.mock.calls)).not.toContain('192.0.2.12')
    expect(mocks.eval.mock.calls[0][2]).toEqual(['pageview', '/', 'direct', 183 * 86400, 0])
    mocks.eval.mockResolvedValue(0); expect((await POST(request(valid))).status).toBe(429)
  })
})
