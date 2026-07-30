import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export function createToken() {
  return `df_${randomBytes(24).toString('hex')}`
}

export function hashToken(token: string) {
  return createHmac('sha256', 'deflake-token').update(token).digest('hex')
}

export function signBody(secret: string, body: string) {
  return createHmac('sha256', secret).update(body).digest('hex')
}

export function verifyBody(secret: string, body: string, sig: string | null) {
  if (!sig) return false
  const expected = signBody(secret, body)
  const a = Buffer.from(expected)
  const b = Buffer.from(sig)
  return a.length === b.length && timingSafeEqual(a, b)
}
