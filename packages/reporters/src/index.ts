import type { RunSummary, TriageReport } from '@khyfee/deflake-core'

export function renderMarkdown(summary: RunSummary, triage: TriageReport): string {
  const lines = [
    `# Deflake report — ${summary.runId}`,
    '',
    `Created by [KhyFee](https://github.com/KhyFee)`,
    '',
    `## Outcome: **${summary.outcome}**`,
    '',
    `- Attempts: ${summary.completedAttempts}/${summary.attempts}`,
    `- Pass rate: ${(summary.passRate * 100).toFixed(1)}% (Wilson 95%: ${(summary.wilson95.low * 100).toFixed(1)}–${(summary.wilson95.high * 100).toFixed(1)}%)`,
    `- Flake score: ${summary.flakeScore}`,
    `- Duration p50/p95/max: ${summary.duration.p50} / ${summary.duration.p95} / ${summary.duration.max} ms`,
    `- Workers: ${summary.workers} · Seed: ${summary.seed}`,
    summary.incomplete ? '- **Incomplete run** (cancelled or timed out)' : '',
    '',
    '## Error clusters',
    '',
  ]
  if (summary.clusters.length === 0) lines.push('_No failure clusters._')
  for (const c of summary.clusters) {
    lines.push(`### ${c.class} · ${c.count}× · \`${c.fingerprint}\``)
    lines.push('')
    lines.push('```')
    lines.push(c.sampleMessage)
    lines.push('```')
    lines.push('')
    lines.push(`Suggestion: ${c.suggestion}`)
    lines.push('')
  }
  lines.push('## Triage')
  lines.push('')
  for (const s of triage.suggestions) {
    lines.push(`### ${s.hypothesis} (${s.source}, conf ${s.confidence.toFixed(2)})`)
    lines.push('')
    for (const e of s.evidence) lines.push(`- ${e}`)
    lines.push('')
    lines.push('```')
    lines.push(s.suggested_patch)
    lines.push('```')
    lines.push('')
  }
  return lines.filter((l) => l !== undefined).join('\n')
}

export function renderHtml(summary: RunSummary, triage: TriageReport): string {
  const md = renderMarkdown(summary, triage)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Deflake ${summary.runId}</title>
<style>body{font-family:ui-sans-serif,system-ui;background:#0b0d14;color:#eef;max-width:900px;margin:2rem auto;padding:0 1rem}pre{background:#151925;padding:1rem;border-radius:12px;overflow:auto}code{font-family:ui-monospace,monospace}</style>
</head><body><pre>${md}</pre><p style="opacity:.6">Deflake by KhyFee</p></body></html>`
}

export function renderJUnit(summary: RunSummary): string {
  const cases = summary.clusters.length
    ? summary.clusters
        .map(
          (c) =>
            `<testcase classname="deflake" name="${escapeXml(c.fingerprint)}" time="${(summary.duration.mean / 1000).toFixed(3)}"><failure message="${escapeXml(c.class)}">${escapeXml(c.sampleMessage)}</failure></testcase>`,
        )
        .join('')
    : `<testcase classname="deflake" name="suite" time="${(summary.duration.mean / 1000).toFixed(3)}"/>`
  return `<?xml version="1.0"?><testsuite name="deflake" tests="${Math.max(1, summary.clusters.length)}" failures="${summary.failed > 0 ? 1 : 0}">${cases}</testsuite>`
}

export function renderSarif(summary: RunSummary): string {
  const results = summary.clusters.map((c) => ({
    ruleId: c.class,
    level: 'warning',
    message: { text: `${c.sampleMessage} → ${c.suggestion}` },
  }))
  return JSON.stringify(
    {
      version: '2.1.0',
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      runs: [
        {
          tool: { driver: { name: 'Deflake', informationUri: 'https://github.com/KhyFee/Deflake', version: '0.1.0', rules: [] } },
          results,
        },
      ],
    },
    null,
    2,
  )
}

export function renderGithubSummary(summary: RunSummary, triage: TriageReport): string {
  return [
    `### Deflake: ${summary.outcome}`,
    `Pass rate ${(summary.passRate * 100).toFixed(1)}% · flake score ${summary.flakeScore} · attempts ${summary.completedAttempts}`,
    triage.suggestions[0] ? `Top suggestion: ${triage.suggestions[0].hypothesis}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
