// @vitest-environment node
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it } from 'vitest'
import { QUOTA_SCRIPT, VOTE_SCRIPT } from './checkinStore'

// Only an isolated, local CI Redis instance is used; never cloud credentials.
const port = process.env.REDIS_TEST_PORT
const enabled = !!port && /^\d{4,5}$/.test(port)
const prefix = `survimap-test:${randomUUID()}:`
const keys = new Set<string>()
const exec = promisify(execFile)
async function redis(...args: (string | number)[]): Promise<unknown> {
  const { stdout } = await exec('redis-cli', ['--json', '-h', '127.0.0.1', '-p', port!, ...args.map(String)])
  return JSON.parse(stdout)
}
function key(name: string) { const value = prefix + name; keys.add(value); return value }
async function vote(id: string, voter: string, verdict = 'ok', now = 1800000000000, max = 5000) {
  return redis('EVAL', VOTE_SCRIPT, 3, key('records'), key('index'), key(`voter:${voter}:${id}`), now, 183 * 86400000, id, verdict, 3, 43, max) as Promise<string[]>
}
afterAll(async () => { if (enabled && keys.size) await redis('DEL', ...keys) })

describe.skipIf(!enabled)('atomic Redis scripts against isolated Redis', () => {
  it('sets expiry atomically and stops the 31st vote per IP', async () => {
    const ip = key('ip'); const global = key('global')
    for (let i = 0; i < 30; i++) expect(await redis('EVAL', QUOTA_SCRIPT, 2, ip, global)).toBe(1)
    expect(await redis('EVAL', QUOTA_SCRIPT, 2, ip, global)).toBe(0)
    expect(Number(await redis('TTL', ip))).toBeGreaterThan(0)
    const limited = key('global-limited')
    await redis('SET', limited, 1000)
    expect(await redis('EVAL', QUOTA_SCRIPT, 2, key('other-ip'), limited)).toBe(0)
    expect(Number(await redis('TTL', limited))).toBeGreaterThan(0)
  }, 20000)

  it('preserves all concurrent votes and refuses repeated contributions', async () => {
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => vote('n12', `v${i}`)))
    expect(results.every((result) => result[0] === 'ok')).toBe(true)
    const record = JSON.parse(await redis('HGET', key('records'), 'n12') as string)
    expect(record.ok).toBe(10)
    expect(record.lon).toBe(3)
    expect((await vote('n12', 'v0'))[0]).toBe('duplicate')
  })

  it('requires at least two recent independent disappearance reports', async () => {
    const first = JSON.parse((await vote('n13', 'a', 'gone'))[1])
    expect(first.goneVerified).toBe(false)
    const second = JSON.parse((await vote('n13', 'b', 'gone'))[1])
    expect(second.goneVerified).toBe(true)
    const later = JSON.parse((await vote('n13', 'c', 'ok', 1800000000000 + 8 * 86400000))[1])
    expect(later.goneVerified).toBe(false)
  })

  it('caps persistent records and prunes expired records before admission', async () => {
    expect((await vote('n99', 'a', 'ok', 1800000000000, 1))[0]).toBe('full')
    // n13 was refreshed eight days later in the preceding scenario.
    const now = 1800000000000 + 192 * 86400000
    expect((await vote('n99', 'b', 'ok', now, 1))[0]).toBe('ok')
    expect(await redis('HLEN', key('records'))).toBe(1)
  })
})
