import { NextResponse } from 'next/server'
import { demoSummary, demoTriage } from '@/lib/demo-data'
import { signBody } from '@/lib/signing'

export async function POST(req: Request) {
  const url = process.env.DEFLAKE_NOTIFY_URL
  if (!url) return NextResponse.json({ skipped: true, reason: 'DEFLAKE_NOTIFY_URL unset' })
  const payload = JSON.stringify({
    event: 'flake.detected',
    runId: demoSummary.runId,
    outcome: demoSummary.outcome,
    clusters: demoSummary.clusters.length,
    triage: demoTriage.suggestions[0]?.hypothesis,
  })
  const secret = process.env.DEFLAKE_WEBHOOK_SECRET || 'demo'
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-deflake-signature': signBody(secret, payload),
    },
    body: payload,
  })
  return NextResponse.json({ ok: res.ok, status: res.status })
}
