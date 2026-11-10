import { readLimitedJson } from './security.js'

const BASE = 'https://pub-1cff175e1c4641718e16b36f04ea91b1.r2.dev'
const RUNS = 'https://api.github.com/repos/Bist0uille/survival_map/actions/workflows/build-pmtiles.yml/runs?branch=main&per_page=5'
export const DATA_WORKFLOW_URL = 'https://github.com/Bist0uille/survival_map/actions/workflows/build-pmtiles.yml'
interface Report { count: number; withHours: number; generatedAt: string; publishedAt: string; scope: string }
interface Run { status: string; conclusion: string | null; created_at: string }
let cached: { until: number; value: Promise<unknown> } | undefined

async function loadStatus() {
  const alerts: string[] = []
  const [manifest, activity] = await Promise.allSettled([
    fetch(`${BASE}/bakery-status.json`, { cache: 'no-store', signal: AbortSignal.timeout(6000) }).then(async r => {
      if (r.status === 404) return null
      if (!r.ok) throw new Error('report unavailable')
      const p = await readLimitedJson(r.body, 16384) as Report & { schema: number }
      if (p.schema !== 1 || p.scope !== 'France, Espagne, Italie' || !Number.isSafeInteger(p.count) || p.count < 40000 ||
        !Number.isSafeInteger(p.withHours) || p.withHours < 0 || p.withHours > p.count ||
        !Number.isFinite(Date.parse(p.publishedAt)) || !Number.isFinite(Date.parse(p.generatedAt))) throw new Error('invalid report')
      return { count: p.count, withHours: p.withHours, generatedAt: p.generatedAt, publishedAt: p.publishedAt, scope: p.scope }
    }),
    fetch(RUNS, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Survimap-data-monitor' }, signal: AbortSignal.timeout(6000) })
      .then(async r => {
        if (!r.ok) throw new Error('workflow unavailable')
        const data = await readLimitedJson(r.body, 262144) as { workflow_runs?: Run[] }
        const run = data.workflow_runs?.[0]
        return run ? { status: run.status, conclusion: run.conclusion, createdAt: run.created_at } : null
      }),
  ])
  const report = manifest.status === 'fulfilled' ? manifest.value : null
  const latestRun = activity.status === 'fulfilled' ? activity.value : null
  if (manifest.status === 'rejected') alerts.push('Rapport de publication indisponible. Réessaie plus tard.')
  if (activity.status === 'rejected') alerts.push('État GitHub indisponible : impossible de vérifier le dernier import.')
  if (latestRun?.status === 'completed' && latestRun.conclusion !== 'success') alerts.push('Le dernier import a échoué ou a été annulé. Consulte le journal GitHub.')
  let publishedAt = report?.publishedAt ?? null
  if (!report) {
    // Bootstrap: the existing tiles predate this report. Do not invent counters.
    try {
      const r = await fetch(`${BASE}/pois.pmtiles`, { method: 'HEAD', signal: AbortSignal.timeout(4000) })
      const date = r.ok ? r.headers.get('last-modified') : null
      if (date && Number.isFinite(Date.parse(date))) publishedAt = new Date(date).toISOString()
    } catch { /* The report and workflow warnings above remain visible. */ }
    alerts.push('Compteurs disponibles après la première publication du nouveau rapport.')
  }
  if (publishedAt && Date.now() - Date.parse(publishedAt) > 10 * 86400000) alerts.push('La base publiée date de plus de 10 jours.')
  return { report, publishedAt, latestRun, alerts, workflowUrl: DATA_WORKFLOW_URL }
}

/** Public aggregate sources, fetched only after admin authentication; 5 min cache. */
export function dataStatus(): Promise<unknown> {
  if (!cached || cached.until < Date.now()) cached = { until: Date.now() + 300000, value: loadStatus() }
  return cached.value
}

export function clearDataStatusCache() { cached = undefined }
