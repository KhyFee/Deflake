import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="container">
      <header className="nav">
        <div className="logo">
          Def<span>lake</span>
        </div>
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/security">Security</Link>
          <Link className="btn" href="/demo">
            Live demo
          </Link>
        </nav>
      </header>
      <section style={{ padding: '3.5rem 0 2rem' }}>
        <p className="muted">Flaky Test Auto-Triager</p>
        <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', letterSpacing: '-.04em', margin: '.4rem 0 1rem' }}>
          Catch the flake. Cite the cause. Ship CI trust again.
        </h1>
        <p className="muted" style={{ maxWidth: 560, fontSize: '1.05rem' }}>
          Deflake runs Playwright tests repeatedly in isolated workers, measures statistical flakiness, clusters errors,
          and suggests evidence-based fixes — offline by default, AI only when you opt in.
        </p>
        <pre className="card" style={{ marginTop: '1.5rem', overflow: 'auto' }}>
          {`npx @khyfee/deflake demo
# exit 2 = flake detected · artifacts in .deflake/runs/`}
        </pre>
        <div className="grid-3" style={{ marginTop: '1.5rem' }}>
          {[
            ['Parallel attempts', 'Bounded worker pool · isolated Playwright children'],
            ['Stats you can trust', 'Wilson intervals · flake score · correlations'],
            ['Fixes with evidence', 'Rules + Python triage · optional cited AI'],
          ].map(([t, b]) => (
            <article key={t} className="card">
              <h3 style={{ marginTop: 0 }}>{t}</h3>
              <p className="muted">{b}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
