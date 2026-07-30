import { NextResponse } from 'next/server'
import { demoSummary } from '@/lib/demo-data'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const a = url.searchParams.get('a') || demoSummary.runId
  const b = url.searchParams.get('b') || demoSummary.runId
  // ponytail: seeded compare — real runs use ingested summaries when present
  const delta = 0
  return NextResponse.json({
    a: { runId: a, passRate: demoSummary.passRate, outcome: demoSummary.outcome },
    b: { runId: b, passRate: demoSummary.passRate, outcome: demoSummary.outcome },
    passRateDelta: delta,
    improved: false,
    regressed: false,
    inconclusive: true,
  })
}
