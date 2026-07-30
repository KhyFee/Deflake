export default function DocsPage() {
  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1>Docs</h1>
      <pre className="card">{`npx @khyfee/deflake init
npx @khyfee/deflake check
npx @khyfee/deflake run --grep "checkout" --attempts 10
npx @khyfee/deflake report .deflake/runs/<id>
npx @khyfee/deflake compare runA runB
npx @khyfee/deflake demo`}</pre>
      <p className="muted">Exit codes: 0 stable-pass · 1 stable-fail · 2 flake · 3 error</p>
    </div>
  )
}
