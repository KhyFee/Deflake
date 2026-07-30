import Link from 'next/link'

const LINKS = [
  ['/dashboard', 'Overview'],
  ['/runs/demo-seeded-flake', 'Demo run'],
  ['/triage', 'Triage queue'],
  ['/projects', 'Projects'],
  ['/tests/seeded-flake', 'Test trend'],
  ['/settings', 'Settings'],
  ['/', 'Marketing'],
]

export default function DashLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo" style={{ marginBottom: '1rem' }}>
          Def<span>lake</span>
        </div>
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
