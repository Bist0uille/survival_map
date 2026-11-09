import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const SESSION_SECONDS = 8 * 60 * 60
export function adminSecret() {
  const value = process.env.ADMIN_PASSWORD
  return value && value.length >= 24 && value.length <= 256 ? value : null
}
export function equalSecret(a: string, b: string) {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest())
}
export function createSession(secret: string, now = Date.now()) {
  const payload = `${Math.floor(now / 1000) + SESSION_SECONDS}.${randomBytes(24).toString('hex')}`
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('hex')}`
}
export function authenticated(req: Request, secret: string, now = Date.now()) {
  const authorization = req.headers.get('authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null
  if (!token || !/^\d{10}\.[a-f0-9]{48}\.[a-f0-9]{64}$/.test(token)) return false
  const [expires, nonce, signature] = token.split('.')
  const remaining = Number(expires) - Math.floor(now / 1000)
  return remaining > 0 && remaining <= SESSION_SECONDS && equalSecret(signature, createHmac('sha256', secret).update(`${expires}.${nonce}`).digest('hex'))
}
