export default function RoadmapPage() {
  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1>Roadmap</h1>
      <ul className="card">
        <li>v0.2 — richer compare UI + quarantine expiry jobs</li>
        <li>v0.3 — monorepo project discovery helpers</li>
        <li>Later — non-Playwright adapters (explicitly not v0.1)</li>
      </ul>
    </div>
  )
}
