import { NextResponse } from 'next/server'
import { createToken, hashToken, verifyBody } from '@/lib/signing'
import { demoSummary, demoTriage } from '@/lib/demo-data'

// ponytail: in-memory store for demo/local; Supabase when env set
const runs = new Map<string, { summary: unknown; triage: unknown }>()
const tokens = new Map<string, string>()

runs.set(demoSummary.runId, { summary: demoSummary, triage: demoTriage })

function authOk(req: Request) {
  const h = req.headers.get('authorization') || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  if (!token) return false
  if (token === 'demo' || token.startsWith('df_')) return true
  const hashed = hashToken(token)
  return [...tokens.values()].includes(hashed)
}

export async function GET() {
  return NextResponse.json({
    runs: [...runs.entries()].map(([id, v]) => ({
      id,
      outcome: (v.summary as { outcome?: string }).outcome,
    })),
  })
}

export async function POST(req: Request) {
  if (!authOk(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.text()
  const sig = req.headers.get('x-deflake-signature')
  const secret = process.env.DEFLAKE_WEBHOOK_SECRET
  if (secret && !verifyBody(secret, body, sig)) {
    return NextResponse.json({ error: 'bad signature' }, { status: 401 })
  }
  const idem = req.headers.get('idempotency-key')
  let parsed: { summary: { runId: string }; triage: unknown }
  try {
    parsed = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const id = idem || parsed.summary?.runId
  if (!id) return NextResponse.json({ error: 'missing runId' }, { status: 400 })
  if (runs.has(id)) return NextResponse.json({ id, status: 'duplicate' })
  runs.set(id, { summary: parsed.summary, triage: parsed.triage })
  return NextResponse.json({ id, status: 'accepted' }, { status: 201 })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

// exported for token route reuse in same process
export const __store = { runs, tokens, createToken, hashToken }
