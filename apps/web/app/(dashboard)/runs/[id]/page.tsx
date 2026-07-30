import { demoAttempts, demoSummary, demoTriage } from '@/lib/demo-data'
import { AttemptMatrix } from '@/components/AttemptMatrix'

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const suggestion = demoTriage.suggestions[0]
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>
        Run {id} <span className={`pill ${demoSummary.outcome}`}>{demoSummary.outcome}</span>
      </h1>
      <p className="muted">
        Pass {(demoSummary.passRate * 100).toFixed(0)}% · Wilson {(demoSummary.wilson95.low * 100).toFixed(0)}–
        {(demoSummary.wilson95.high * 100).toFixed(0)}% · seed {demoSummary.seed}
      </p>
      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <div className="card">
          <strong>Attempt matrix</strong>
          <AttemptMatrix attempts={demoAttempts} />
          <p className="muted" style={{ fontSize: '.85rem' }}>
            Reproduce: <code>npx @khyfee/deflake run --grep &quot;seeded flake&quot; --seed 42</code>
          </p>
        </div>
        <div className="card">
          <strong>Triage</strong>
          <h3>{suggestion?.hypothesis}</h3>
          <ul>
            {suggestion?.evidence.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{suggestion?.suggested_patch}</pre>
        </div>
      </div>
    </div>
  )
}
