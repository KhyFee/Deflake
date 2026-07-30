import type { ErrorCluster, RunSummary, TriageReport, TriageSuggestion } from './types.js'

export function triageFromSummary(summary: RunSummary): TriageReport {
  const suggestions: TriageSuggestion[] = summary.clusters.map((c) => clusterToSuggestion(c, summary))
  if (summary.outcome === 'stable-pass') {
    suggestions.push({
      hypothesis: 'Suite looks stable under the sampled attempts.',
      evidence: [`passRate=${summary.passRate}`, `attempts=${summary.completedAttempts}`],
      suggested_patch: 'No change required. Keep Deflake in CI as a guardrail.',
      confidence: 0.9,
      caveats: ['Sample size may still miss rare flakes.'],
      class: 'unknown',
      source: 'rules',
    })
  }
  if (summary.outcome === 'stable-fail') {
    suggestions.unshift({
      hypothesis: 'Failures look deterministic, not flaky.',
      evidence: summary.clusters.slice(0, 3).map((c) => c.sampleMessage),
      suggested_patch: 'Fix the product/assertion failure before investing in flake tooling.',
      confidence: 0.85,
      caveats: [],
      class: 'deterministic-fail',
      source: 'rules',
    })
  }
  for (const hit of summary.correlations) {
    suggestions.push({
      hypothesis: `Correlation: ${hit.factor}=${hit.value}`,
      evidence: [hit.note, `failRate=${hit.failRate.toFixed(2)}`, `support=${hit.support}`],
      suggested_patch: 'Reproduce with --serial-probe and --isolation-probe to confirm contention vs logic.',
      confidence: 0.55,
      caveats: ['Correlation is not causation.'],
      class: 'resource',
      source: 'rules',
    })
  }
  return { schemaVersion: 1, suggestions, clusters: summary.clusters }
}

function clusterToSuggestion(c: ErrorCluster, summary: RunSummary): TriageSuggestion {
  return {
    hypothesis: `${c.class} cluster (${c.count}/${summary.completedAttempts} fails)`,
    evidence: [c.sampleMessage, `fingerprint=${c.fingerprint}`, `attempts=${c.attemptIds.join(',')}`],
    suggested_patch: c.suggestion,
    confidence: Math.min(0.95, 0.4 + c.count / Math.max(1, summary.completedAttempts)),
    caveats: [],
    class: c.class,
    source: 'rules',
  }
}
