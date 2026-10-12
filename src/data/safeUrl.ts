/** Untrusted data may only create HTTPS links, without embedded credentials. */
export function safeExternalUrl(value: unknown, host?: string): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    if (host && url.hostname !== host && url.hostname !== `www.${host}`) return null
    return url.href
  } catch { return null }
}
