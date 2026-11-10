// @vitest-environment node
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { dataStatus, clearDataStatusCache } from './dataStatus'

beforeEach(() => clearDataStatusCache())
afterEach(() => vi.unstubAllGlobals())
const report = { schema: 1, count: 53000, withHours: 27000, scope: 'France, Espagne, Italie',
  generatedAt: new Date().toISOString(), publishedAt: new Date().toISOString() }
describe('data import monitoring', () => {
  it('reports counters, detects a failed import and caches requests', async () => {
    const fetchMock = vi.fn(async (url: string) => Response.json(url.includes('api.github.com') ?
      { workflow_runs: [{ status: 'completed', conclusion: 'failure', created_at: '2026-11-10T12:00:00Z' }] } : report))
    vi.stubGlobal('fetch', fetchMock)
    const result = await dataStatus() as { report: typeof report; alerts: string[] }
    expect(result.report.count).toBe(53000)
    expect(result.alerts.join(' ')).toContain('échoué')
    await dataStatus()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it('shows stale published data before the first report without inventing counts', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('api.github.com')) return Response.json({ workflow_runs: [] })
      if (url.endsWith('.pmtiles')) return new Response(null, { headers: { 'Last-Modified': 'Mon, 12 Oct 2020 12:00:00 GMT' } })
      return new Response(null, { status: 404 })
    }))
    const result = await dataStatus() as { report: unknown; publishedAt: string; alerts: string[] }
    expect(result.report).toBeNull()
    expect(result.publishedAt).toContain('2020-10-12')
    expect(result.alerts.join(' ')).toContain('plus de 10 jours')
  })
  it('degrades gracefully on unavailable sources and rejects malformed counters', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('api.github.com')) throw new Error('rate limit')
      return Response.json({ ...report, withHours: 999999 })
    }))
    const result = await dataStatus() as { report: unknown; alerts: string[] }
    expect(result.report).toBeNull()
    expect(result.alerts.join(' ')).toContain('GitHub indisponible')
  })
})
