import { demoSummary } from '@/lib/demo-data'

export default function ProjectsPage() {
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Projects</h1>
      <div className="card">
        <strong>demo-seeded</strong>
        <p className="muted">Retention 30d · AI off · tokens hashed</p>
        <p>
          Latest outcome: <span className={`pill ${demoSummary.outcome}`}>{demoSummary.outcome}</span>
        </p>
      </div>
    </div>
  )
}
