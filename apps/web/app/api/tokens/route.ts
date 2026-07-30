import { NextResponse } from 'next/server'
import { createToken, hashToken } from '@/lib/signing'

const tokens = new Map<string, string>()

export async function POST() {
  const token = createToken()
  tokens.set(token.slice(0, 12), hashToken(token))
  return NextResponse.json({
    token,
    note: 'Shown once. Store securely. Hashed at rest.',
  })
}
