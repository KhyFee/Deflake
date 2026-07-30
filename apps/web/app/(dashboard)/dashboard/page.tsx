import Link from 'next/link'
import { demoSummary } from '@/lib/demo-data'

export default function DashboardPage() {
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Overview</h1>
      <p className="muted">Seeded demo project · no Supabase required</p>
      <div className="grid-3" style={{ margin: '1rem 0' }}>
        <div className="card">
          <div className="muted">Health</div>
          <div style={{ fontSize: '2rem', fontWeight: 900 }}>{Math.round(demoSummary.passRate * 100)}%</div>
        </div>
        <div className="card">
          <div className="muted">Flake score</div>
          <div style={{ fontSize: '2rem', fontWeight: 900 }}>{demoSummary.flakeScore}</div>
        </div>
        <div className="card">
          <div className="muted">Open clusters</div>
          <div style={{ fontSize: '2rem', fontWeight: 900 }}>{demoSummary.clusters.length}</div>
        </div>
      </div>
      <div className="card">
        <strong>Latest run</strong>
        <p>
          <Link href={`/runs/${demoSummary.runId}`}>
            {demoSummary.runId}{' '}
            <span className={`pill ${demoSummary.outcome}`}>{demoSummary.outcome}</span>
          </Link>
        </p>
      </div>
    </div>
  )
}
