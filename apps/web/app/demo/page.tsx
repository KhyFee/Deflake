import Link from 'next/link'
import { AttemptMatrix } from '@/components/AttemptMatrix'
import { demoAttempts, demoSummary, demoTriage } from '@/lib/demo-data'

export default function DemoPage() {
  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1>Live demo</h1>
      <p className="muted">Seeded 7/10 flake — same data as `deflake demo --seed 42`.</p>
      <div className="card">
        <span className={`pill ${demoSummary.outcome}`}>{demoSummary.outcome}</span>
        <AttemptMatrix attempts={demoAttempts} />
        <pre>{demoTriage.suggestions[0]?.suggested_patch}</pre>
        <Link className="btn" href="/dashboard">
          Open dashboard
        </Link>
      </div>
    </div>
  )
}
