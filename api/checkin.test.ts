// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
const mocks = vi.hoisted(() => ({ eval: vi.fn(), exists: vi.fn(), resolvePoi: vi.fn() }))
vi.mock('@upstash/redis', () => ({ Redis: class { eval = mocks.eval; exists = mocks.exists } }))
vi.mock('../server/poi.js', () => ({ resolvePoi: mocks.resolvePoi }))
import { POST } from './checkin'

function request(body = '{"id":"n12","verdict":"ok","lon":0,"lat":0}', headers: Record<string, string> = {}) {
  return new Request('https://survimap.com/api/checkin', { method: 'POST', body, headers: { 'Content-Type': 'application/json', Origin: 'https://survimap.com', ...headers } })
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example')
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token')
  mocks.eval.mockResolvedValueOnce(1)
  mocks.exists.mockResolvedValue(0)
  mocks.resolvePoi.mockResolvedValue({ lon: 3, lat: 43 })
})
describe('POST security', () => {
  it('rejects cross-site, non-JSON and oversized requests before database access', async () => {
    expect((await POST(request(undefined, { Origin: 'https://evil.example' }))).status).toBe(403)
    expect((await POST(request(undefined, { 'Content-Type': 'text/plain' }))).status).toBe(415)
    expect((await POST(request('x'.repeat(1025)))).status).toBe(400)
    expect(mocks.eval).not.toHaveBeenCalled()
  })
  it('checks quota before contacting OSM and returns a retry delay', async () => {
    mocks.eval.mockReset().mockResolvedValue(0)
    const response = await POST(request())
    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('3600')
    expect(mocks.resolvePoi).not.toHaveBeenCalled()
  })
  it('rejects fabricated points and duplicate contributions', async () => {
    mocks.resolvePoi.mockResolvedValue(null)
    expect((await POST(request())).status).toBe(400)
    expect(mocks.eval).toHaveBeenCalledTimes(1)
    mocks.eval.mockResolvedValue(1)
    mocks.exists.mockResolvedValue(1)
    expect((await POST(request())).status).toBe(409)
  })
  it('stores only upstream coordinates via the atomic vote script', async () => {
    const record = { ok: 1, gone: 0, lastOk: 123, lastGone: null, lon: 3, lat: 43 }
    mocks.eval.mockResolvedValueOnce(['ok', JSON.stringify(record)])
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: 'n12', record })
    const args = mocks.eval.mock.calls[1][2]
    expect(args.slice(2, 6)).toEqual(['n12', 'ok', 3, 43])
  })
  it('handles concurrent duplicate results and upstream failures safely', async () => {
    mocks.eval.mockResolvedValueOnce(['duplicate'])
    expect((await POST(request())).status).toBe(409)
    mocks.eval.mockResolvedValue(1)
    mocks.resolvePoi.mockRejectedValue(new Error('private upstream detail'))
    const response = await POST(request())
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('private upstream detail')
  })
})
