import { demoSummary, demoTriage } from '@/lib/demo-data'

export default function TriagePage() {
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Triage queue</h1>
      {demoTriage.suggestions.map((s) => (
        <div key={s.hypothesis} className="card" style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <strong>{s.hypothesis}</strong>
            <span className="pill flaky">{s.class}</span>
          </div>
          <p className="muted">Confidence {s.confidence} · {s.source}</p>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{s.suggested_patch}</pre>
          <button className="btn ghost">Quarantine</button>{' '}
          <button className="btn ghost">Assign</button>
        </div>
      ))}
      <p className="muted">Related run: {demoSummary.runId}</p>
    </div>
  )
}
