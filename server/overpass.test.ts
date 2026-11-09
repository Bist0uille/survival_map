// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
// @ts-expect-error This script is plain ESM without declaration files.
import { fetchOverpass } from '../scripts/overpass.mjs'

describe('Overpass resilience', () => {
  it('fails over on overload and retries after respecting bounded Retry-After', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After': '300' } })).mockResolvedValueOnce(new Response('', { status: 504 })).mockResolvedValueOnce(Response.json({ elements: [{ id: 1 }] }))
    const sleep = vi.fn().mockResolvedValue(undefined)
    expect(await fetchOverpass('query', { fetcher, sleep, endpoints: ['https://a.example', 'https://b.example'], log: vi.fn() })).toEqual([{ id: 1 }])
    expect(sleep.mock.calls).toEqual([[60000], [30000]])
    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  })
  it('does not retry permanent errors and refuses partial results', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('', { status: 406 })).mockResolvedValueOnce(Response.json({ elements: [], remark: 'runtime error: Query timed out' })).mockResolvedValueOnce(Response.json({ elements: [{ id: 2 }] }))
    expect(await fetchOverpass('query', { fetcher, sleep: vi.fn(), endpoints: ['https://a.example', 'https://b.example'], log: vi.fn() })).toEqual([{ id: 2 }])
    expect(fetcher.mock.calls.map(call => call[0])).toEqual(['https://a.example', 'https://b.example', 'https://b.example'])
  })
  it('reports final unavailability as a failure rather than replacing existing data', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('', { status: 503 }))
    await expect(fetchOverpass('query', { fetcher, sleep: vi.fn(), endpoints: ['https://a.example'], log: vi.fn() })).rejects.toThrow('base existante est conservée')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
