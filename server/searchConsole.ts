import { createSign } from 'node:crypto'

type Row = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number }
export async function searchConsole(days: number) {
  const email = process.env.GOOGLE_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
  if (!email || !privateKey) return { connected: false }
  const now = Math.floor(Date.now() / 1000)
  const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url')
  const input = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iss: email, scope: 'https://www.googleapis.com/auth/webmasters.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`
  const signature = createSign('RSA-SHA256').update(input).sign(privateKey.replace(/\\n/g, '\n'), 'base64url')
  const auth = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${input}.${signature}` }), signal: AbortSignal.timeout(10000) })
  if (!auth.ok) throw new Error('Google authentication failed')
  const token = await auth.json() as { access_token: string }
  // Finalized data: leave three days for Google's reporting delay.
  const end = new Date(Date.now() - 3 * 86400000)
  const start = new Date(end.getTime() - (days - 1) * 86400000)
  const endDate = end.toISOString().slice(0, 10), startDate = start.toISOString().slice(0, 10)
  const property = process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY || 'sc-domain:survimap.com'
  async function query(dimensions: string[]) {
    const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`, {
      method: 'POST', headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, dimensions, rowLimit: 100, dataState: 'final', type: 'web' }), signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) throw new Error('Search Console query failed')
    return ((await response.json()) as { rows?: Row[] }).rows ?? []
  }
  const [totals, dates, queries, pages] = await Promise.all([query([]), query(['date']), query(['query']), query(['page'])])
  return { connected: true, startDate, endDate, totals: totals[0] ?? null, dates, queries, pages }
}
