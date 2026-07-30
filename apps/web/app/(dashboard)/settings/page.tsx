'use client'

import { useState } from 'react'

export default function SettingsPage() {
  const [token, setToken] = useState<string | null>(null)
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Settings</h1>
      <div className="grid-2">
        <div className="card">
          <h3>Project tokens</h3>
          <p className="muted">Shown once · hashed at rest</p>
          <button
            className="btn"
            onClick={async () => {
              const res = await fetch('/api/tokens', { method: 'POST' })
              const json = (await res.json()) as { token: string }
              setToken(json.token)
            }}
          >
            Generate token
          </button>
          {token && <pre style={{ overflow: 'auto' }}>{token}</pre>}
        </div>
        <div className="card">
          <h3>AI consent</h3>
          <p className="muted">Off by default. Only redacted clusters are sent when enabled.</p>
          <label>
            <input type="checkbox" disabled /> Enable organization AI triage
          </label>
        </div>
      </div>
    </div>
  )
}
