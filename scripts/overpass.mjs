import { setTimeout as delay } from 'node:timers/promises'

export const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

/** Failover, then one bounded retry round; never accept partial Overpass output. */
export async function fetchOverpass(query, { fetcher = fetch, sleep = delay, endpoints = ENDPOINTS, log = console.log, timeout = 90000 } = {}) {
  let lastError
  const retry = new Set(endpoints)
  for (let round = 0; round < 2; round++) {
    if (round) await sleep(30000)
    for (const endpoint of endpoints) {
      if (!retry.has(endpoint)) continue
      log(`→ ${endpoint} (essai ${round + 1}/2)`)
      try {
        const response = await fetcher(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'User-Agent': 'Survimap-data-update/1.0 (+https://github.com/Bist0uille/survival_map)' },
          body: new URLSearchParams({ data: query }),
          // Covers response body parsing as well as the headers.
          signal: AbortSignal.timeout(timeout),
        })
        if (!response.ok) {
          await response.body?.cancel()
          if (![408, 429, 500, 502, 503, 504].includes(response.status)) retry.delete(endpoint)
          const retryAfter = response.headers.get('retry-after')
          const seconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : 0
          if (seconds > 0) await sleep(Math.min(seconds, 60) * 1000)
          throw new Error(`HTTP ${response.status}`)
        }
        const data = await response.json()
        if (data.remark || !Array.isArray(data.elements)) throw new Error('Réponse Overpass partielle ou invalide')
        log(`  ${data.elements.length} éléments bruts`)
        return data.elements
      } catch (error) {
        lastError = error
        log(`  échec : ${error.message}`)
      }
    }
    if (!retry.size) break
  }
  throw new Error(`Toutes les instances Overpass ont échoué après bascule et nouvelles tentatives : ${lastError?.message ?? '?'}. La base existante est conservée.`)
}
