export default function A11yPage() {
  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1>Accessibility</h1>
      <ul className="card">
        <li>Attempt matrix exposes aria-labels per dot</li>
        <li><code>prefers-reduced-motion</code> and <code>?motion=off</code> disable Anime.js</li>
        <li>In-app motion toggle persisted in localStorage</li>
      </ul>
    </div>
  )
}
