// @vitest-environment node
import { readFileSync } from 'node:fs'
// @ts-expect-error jsdom has no bundled declarations; used only as a test browser.
import { JSDOM } from 'jsdom'
import { describe, it, expect, vi } from 'vitest'

const source = (file: string) => readFileSync(new URL('../public/' + file, import.meta.url), 'utf8')
const tick = () => new Promise(resolve => setTimeout(resolve, 0))
describe('cookieless measurement', () => {
  it('counts a visible page without cookies, storage or sensitive fields', () => {
    const dom = new JSDOM('<body></body>', { url: 'https://survimap.com/?lat=44&search=private', runScripts: 'outside-only', pretendToBeVisual: true })
    const fetch = vi.fn().mockResolvedValue({ status: 204 }); dom.window.fetch = fetch
    for (const name of ['localStorage', 'sessionStorage']) Object.defineProperty(dom.window, name, { get() { throw new Error('Storage forbidden') } })
    Object.defineProperty(dom.window.document, 'cookie', { get() { throw new Error('Cookie forbidden') }, set() { throw new Error('Cookie forbidden') } })
    dom.window.eval(source('activity.js'))
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ event: 'pageview', path: '/', source: 'direct' })
    expect(fetch.mock.calls[0][1].credentials).toBe('omit')
    expect(dom.window.document.querySelector('button')).toBeNull()
    dom.window.close()
  })
  it('counts visible time, caps suspension and excludes hidden time', () => {
    const dom = new JSDOM('<body></body>', { url: 'https://survimap.com/', runScripts: 'outside-only', pretendToBeVisual: true })
    const fetch = vi.fn().mockResolvedValue({ status: 204 }); dom.window.fetch = fetch
    let now = 0, interval: () => void = () => {}, state = 'visible'
    dom.window.performance.now = () => now
    dom.window.setInterval = (callback: () => void) => { interval = callback; return 1 }
    Object.defineProperty(dom.window.document, 'visibilityState', { get: () => state })
    dom.window.eval(source('activity.js'))
    now = 15000; interval()
    expect(JSON.parse(fetch.mock.calls[1][1].body).seconds).toBe(15)
    now = 20000; state = 'hidden'; dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'))
    expect(JSON.parse(fetch.mock.calls[2][1].body).seconds).toBe(5)
    now = 200000; interval(); expect(fetch).toHaveBeenCalledTimes(3)
    state = 'visible'; dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'))
    now = 500000; interval()
    expect(JSON.parse(fetch.mock.calls[3][1].body).seconds).toBe(15)
    expect(fetch.mock.calls.filter(call => JSON.parse(call[1].body).event === 'pageview')).toHaveLength(1)
    dom.window.close()
  })
  it('respects Do Not Track', () => {
    const dom = new JSDOM('<body></body>', { url: 'https://survimap.com/', runScripts: 'outside-only' })
    const fetch = vi.fn(); dom.window.fetch = fetch
    Object.defineProperty(dom.window.navigator, 'doNotTrack', { value: '1' })
    dom.window.eval(source('activity.js'))
    expect(fetch).not.toHaveBeenCalled(); dom.window.close()
  })
})
describe('admin interface', () => {
  it('keeps the dashboard hidden when the server requires login', async () => {
    const dom = new JSDOM(source('admin/index.html'), { url: 'https://survimap.com/admin/', runScripts: 'outside-only' })
    dom.window.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'Connexion requise' }) })
    dom.window.eval(source('admin/admin.js')); await tick()
    expect((dom.window.document.getElementById('dashboard') as HTMLElement).hidden).toBe(true)
    expect(dom.window.document.getElementById('metrics')?.textContent).toBe('')
    dom.window.close()
  })
  it('renders authenticated counters without executing query content as HTML', async () => {
    const dom = new JSDOM(source('admin/index.html'), { url: 'https://survimap.com/admin/', runScripts: 'outside-only' })
    dom.window.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ enabled: true, daily: [{ date: '2026-11-09', counts: { 'event:pageview': 4, 'page:/': 4 } }], google: { connected: true, startDate: '2026-10-10', endDate: '2026-11-06', totals: { clicks: 2, impressions: 135, ctr: 2/135, position: 16.1 }, queries: [{ keys: ['<img src=x onerror=alert(1)>'], clicks: 0, impressions: 1, position: 10 }], pages: [] }, baseline: { source: 'Captures', clicks: 2, impressions: 135, ctr: 1.5, position: 16.1, queries: [] } }) })
    dom.window.eval(source('admin/admin.js')); await tick()
    expect((dom.window.document.getElementById('dashboard') as HTMLElement).hidden).toBe(false)
    expect(dom.window.document.querySelector('#metrics strong')?.textContent).toBe('4')
    expect(dom.window.document.querySelector('#queries img')).toBeNull()
    expect(dom.window.document.getElementById('queries')?.textContent).toContain('<img')
    dom.window.close()
  })
})
