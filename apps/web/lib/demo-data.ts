import type { RunSummary, TriageReport } from '@khyfee/deflake-core'

export const demoSummary: RunSummary = {
  schemaVersion: 1,
  runId: 'demo-seeded-flake',
  attempts: 10,
  completedAttempts: 10,
  passed: 7,
  failed: 3,
  interrupted: 0,
  infrastructureErrors: 0,
  passRate: 0.7,
  flakeScore: 0.6,
  outcome: 'flaky',
  wilson95: { low: 0.39, high: 0.89 },
  duration: { p50: 420, p95: 890, max: 920, mean: 510, cv: 0.35 },
  longestFailureStreak: 1,
  firstFailureAttempt: 2,
  clusters: [
    {
      fingerprint: 'fp_timeout_network',
      count: 3,
      sampleMessage: 'Timeout waiting for network response /api/checkout',
      class: 'timing',
      suggestion: 'Await the specific response instead of networkidle.',
      attemptIds: [2, 5, 8],
    },
  ],
  correlations: [],
  seed: 42,
  workers: 2,
  createdAt: new Date().toISOString(),
  incomplete: false,
}

export const demoTriage: TriageReport = {
  schemaVersion: 1,
  clusters: demoSummary.clusters,
  suggestions: [
    {
      hypothesis: 'timing cluster (3/10 fails)',
      evidence: ['Timeout waiting for network response /api/checkout', 'attempts=2,5,8'],
      suggested_patch: 'await page.waitForResponse(r => r.url().includes("/api/checkout") && r.ok())',
      confidence: 0.82,
      caveats: [],
      class: 'timing',
      source: 'rules',
    },
  ],
}

export const demoAttempts = Array.from({ length: 10 }, (_, i) => ({
  attemptId: i + 1,
  status: [2, 5, 8].includes(i + 1) ? 'failed' : 'passed',
}))
