export default function SecurityPage() {
  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1>Security</h1>
      <ul className="card">
        <li>No shell string execution — argv arrays only</li>
        <li>Secret redaction before disk / dashboard / AI</li>
        <li>Project tokens hashed · RLS on tenant tables</li>
        <li>AI opt-in · evidence-cited · never auto-applies patches</li>
      </ul>
    </div>
  )
}
