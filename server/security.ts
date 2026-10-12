export function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } })
}

export function isSameSiteRequest(req: Request): boolean {
  if (req.headers.get('sec-fetch-site') === 'cross-site') return false
  const origin = req.headers.get('origin')
  if (!origin) return true // Direct clients still require validation and quotas.
  const allowed = new Set(['https://survimap.com', 'https://www.survimap.com'])
  if (process.env.VERCEL_URL) allowed.add(`https://${process.env.VERCEL_URL}`)
  if (process.env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:5173')
    allowed.add('http://127.0.0.1:5173')
  }
  return allowed.has(origin)
}

/** Enforce a byte limit during reading, before allocating the full body. */
export async function readLimitedJson(body: ReadableStream<Uint8Array> | null, limit: number): Promise<unknown> {
  if (!body) throw new Error('Empty body')
  const reader = body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let size = 0
  let text = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) throw new Error('Body too large')
      text += decoder.decode(value, { stream: true })
    }
    return JSON.parse(text + decoder.decode())
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  } finally { reader.releaseLock() }
}

export async function contributorHash(req: Request, secret: string): Promise<string> {
  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}
