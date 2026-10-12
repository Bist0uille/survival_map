// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { isSameSiteRequest, readLimitedJson, contributorHash } from './security'

describe('request security', () => {
  it('rejects foreign origins, null origins and cross-site metadata', () => {
    for (const headers of [{ origin: 'https://evil.example' }, { origin: 'null' }, { origin: 'https://survimap.com', 'sec-fetch-site': 'cross-site' }] as Record<string, string>[]) {
      expect(isSameSiteRequest(new Request('https://survimap.com/api/checkin', { headers }))).toBe(false)
    }
    expect(isSameSiteRequest(new Request('https://survimap.com/api/checkin', { headers: { origin: 'https://survimap.com' } }))).toBe(true)
  })
  it('bounds streamed bytes, not Content-Length or character count', async () => {
    const stream = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode('"ééé"')); c.close() } })
    await expect(readLimitedJson(stream, 5)).rejects.toThrow('too large')
    await expect(readLimitedJson(new Response('{"ok":true}').body, 32)).resolves.toEqual({ ok: true })
    await expect(readLimitedJson(new Response('{bad}').body, 32)).rejects.toThrow()
  })
  it('uses a keyed pseudonym and never includes the plaintext IP', async () => {
    const request = new Request('https://survimap.com', { headers: { 'x-forwarded-for': '192.0.2.1' } })
    const a = await contributorHash(request, 'first-secret')
    expect(a).toMatch(/^[a-f0-9]{64}$/)
    expect(await contributorHash(request, 'first-secret')).toBe(a)
    expect(await contributorHash(request, 'second-secret')).not.toBe(a)
  })
})
