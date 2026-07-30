import { demoSummary } from '@/lib/demo-data'

export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Test {id}</h1>
      <div className="card">
        <p className="muted">Stability trend (seeded)</p>
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80 }}>
          {[0.9, 0.85, 0.7, 0.72, 0.68].map((v, i) => (
            <div
              key={i}
              style={{
                width: 28,
                height: `${v * 100}%`,
                background: 'var(--accent)',
                borderRadius: 6,
              }}
              title={`${Math.round(v * 100)}%`}
            />
          ))}
        </div>
        <p>
          First seen with run <code>{demoSummary.runId}</code>
        </p>
      </div>
    </div>
  )
}
