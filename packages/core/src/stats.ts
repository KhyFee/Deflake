import type { AttemptMeta, CorrelationHit, ErrorCluster, OutcomeClass, RunSummary, WilsonInterval } from './types.js'
import { classifyMessage, fingerprintError, suggestionFor } from './fingerprint.js'

export function wilsonInterval(successes: number, n: number, z = 1.96): WilsonInterval {
  if (n <= 0) return { low: 0, high: 1 }
  const p = successes / n
  const z2 = z * z
  const denom = 1 + z2 / n
  const center = p + z2 / (2 * n)
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)
  return {
    low: Math.max(0, (center - margin) / denom),
    high: Math.min(1, (center + margin) / denom),
  }
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]!
}

export function flakeScore(passed: number, failed: number): number {
  const n = passed + failed
  if (n < 2) return 0
  if (passed === 0 || failed === 0) return 0
  // peak at 50/50
  const rate = failed / n
  return Number((1 - Math.abs(0.5 - rate) * 2).toFixed(4))
}

export function classifyOutcome(attempts: AttemptMeta[]): OutcomeClass {
  const done = attempts.filter((a) => a.status === 'passed' || a.status === 'failed')
  if (done.length < 5) return 'inconclusive'
  const passed = done.filter((a) => a.status === 'passed').length
  const failed = done.filter((a) => a.status === 'failed').length
  if (attempts.some((a) => a.status === 'infrastructure-error') && passed + failed === 0) return 'infrastructure-error'
  if (attempts.some((a) => a.status === 'interrupted') && passed + failed === 0) return 'interrupted'
  if (failed === 0) return 'stable-pass'
  if (passed === 0) return 'stable-fail'
  return 'flaky'
}

export function longestFailureStreak(attempts: AttemptMeta[]): number {
  let best = 0
  let cur = 0
  for (const a of attempts) {
    if (a.status === 'failed') {
      cur++
      best = Math.max(best, cur)
    } else if (a.status === 'passed') {
      cur = 0
    }
  }
  return best
}

export function buildClusters(attempts: AttemptMeta[]): ErrorCluster[] {
  const map = new Map<string, ErrorCluster>()
  for (const a of attempts) {
    if (a.status !== 'failed' || !a.errorMessage) continue
    const fp = a.fingerprint || fingerprintError(a.errorMessage)
    const cls = classifyMessage(a.errorMessage)
    const existing = map.get(fp)
    if (existing) {
      existing.count++
      existing.attemptIds.push(a.attemptId)
    } else {
      map.set(fp, {
        fingerprint: fp,
        count: 1,
        sampleMessage: a.errorMessage.slice(0, 500),
        class: cls,
        suggestion: suggestionFor(cls),
        attemptIds: [a.attemptId],
      })
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}

export function correlations(attempts: AttemptMeta[]): CorrelationHit[] {
  const hits: CorrelationHit[] = []
  const byWorker = groupBy(attempts, (a) => String(a.workerIndex))
  for (const [worker, list] of byWorker) {
    const fails = list.filter((a) => a.status === 'failed').length
    const rate = fails / Math.max(1, list.length)
    if (list.length >= 3 && rate >= 0.7 && fails >= 2) {
      hits.push({
        factor: 'workerIndex',
        value: worker,
        failRate: rate,
        support: list.length,
        note: 'Failures concentrate on one worker — possible resource or shared-state contention.',
      })
    }
  }
  return hits
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    const arr = m.get(k) || []
    arr.push(item)
    m.set(k, arr)
  }
  return m
}

export function aggregateAttempts(opts: {
  runId: string
  attempts: AttemptMeta[]
  seed: number
  workers: number
  incomplete?: boolean
}): RunSummary {
  const attempts = opts.attempts
  const passed = attempts.filter((a) => a.status === 'passed').length
  const failed = attempts.filter((a) => a.status === 'failed').length
  const interrupted = attempts.filter((a) => a.status === 'interrupted').length
  const infrastructureErrors = attempts.filter((a) => a.status === 'infrastructure-error').length
  const completed = passed + failed
  const durations = attempts.map((a) => a.durationMs).sort((a, b) => a - b)
  const mean = durations.length ? durations.reduce((s, n) => s + n, 0) / durations.length : 0
  const variance =
    durations.length > 1 ? durations.reduce((s, n) => s + (n - mean) ** 2, 0) / (durations.length - 1) : 0
  const stdev = Math.sqrt(variance)
  const firstFail = attempts.find((a) => a.status === 'failed')?.attemptId ?? null

  return {
    schemaVersion: 1,
    runId: opts.runId,
    attempts: attempts.length,
    completedAttempts: completed,
    passed,
    failed,
    interrupted,
    infrastructureErrors,
    passRate: completed ? passed / completed : 0,
    flakeScore: flakeScore(passed, failed),
    outcome: classifyOutcome(attempts),
    wilson95: wilsonInterval(passed, completed),
    duration: {
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      max: durations.at(-1) ?? 0,
      mean,
      cv: mean ? stdev / mean : 0,
    },
    longestFailureStreak: longestFailureStreak(attempts),
    firstFailureAttempt: firstFail,
    clusters: buildClusters(attempts),
    correlations: correlations(attempts),
    seed: opts.seed,
    workers: opts.workers,
    createdAt: new Date().toISOString(),
    incomplete: Boolean(opts.incomplete),
  }
}
