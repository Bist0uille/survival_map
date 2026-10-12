// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
const mocks = vi.hoisted(() => ({ zrange: vi.fn(), hmget: vi.fn() }))
vi.mock('@upstash/redis', () => ({ Redis: class { zrange = mocks.zrange; hmget = mocks.hmget } }))
import { GET } from './checkins'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example')
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token')
})
describe('bounded public read', () => {
  it('rejects invalid cursors without querying Redis', async () => {
    for (const cursor of ['-1', '5000', 'abc']) expect((await GET(new Request(`https://survimap.com/api/checkins?cursor=${cursor}`))).status).toBe(400)
    expect(mocks.zrange).not.toHaveBeenCalled()
  })
  it('requests at most 100 recent records and supplies a pagination cursor', async () => {
    mocks.zrange.mockResolvedValue(Array.from({ length: 100 }, (_, i) => `n${i + 1}`))
    mocks.hmget.mockResolvedValue({ n1: { ok: 1 }, n2: null })
    const response = await GET(new Request('https://survimap.com/api/checkins'))
    expect(response.status).toBe(200)
    expect(response.headers.get('X-Next-Cursor')).toBe('100')
    expect(mocks.zrange.mock.calls[0][3]).toEqual({ byScore: true, offset: 0, count: 100 })
    expect(await response.json()).toEqual({ n1: { ok: 1 } })
  })
})
