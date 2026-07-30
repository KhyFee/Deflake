export type OutcomeClass =
  | 'stable-pass'
  | 'stable-fail'
  | 'flaky'
  | 'inconclusive'
  | 'interrupted'
  | 'infrastructure-error'

export type RootCauseClass =
  | 'timing'
  | 'selector'
  | 'network'
  | 'test-data'
  | 'leaked-state'
  | 'order-dependence'
  | 'resource'
  | 'browser-specific'
  | 'environment'
  | 'deterministic-fail'
  | 'unknown'

export interface DeflakeConfig {
  attempts?: number
  workers?: number
  projectDir?: string
  grep?: string
  projects?: string[]
  timeout?: number
  attemptTimeout?: number
  cpuCap?: number
  memoryMb?: number
  shuffle?: boolean
  seed?: number
  failOnFlake?: boolean
  environmentAllowlist?: string[]
  redact?: string[]
  reporters?: Array<'json' | 'md' | 'html' | 'junit' | 'sarif' | 'github'>
  upload?: { url?: string; tokenEnv?: string }
  ai?: { enabled?: boolean; model?: string }
}

export interface AttemptMeta {
  attemptId: number
  workerIndex: number
  seed: number
  browser?: string
  os: string
  startedAt: string
  finishedAt: string
  durationMs: number
  exitCode: number
  status: 'passed' | 'failed' | 'interrupted' | 'infrastructure-error'
  errorMessage?: string
  fingerprint?: string
  gitSha?: string
}

export interface ErrorCluster {
  fingerprint: string
  count: number
  sampleMessage: string
  class: RootCauseClass
  suggestion: string
  attemptIds: number[]
}

export interface WilsonInterval {
  low: number
  high: number
}

export interface RunSummary {
  schemaVersion: 1
  runId: string
  attempts: number
  completedAttempts: number
  passed: number
  failed: number
  interrupted: number
  infrastructureErrors: number
  passRate: number
  flakeScore: number
  outcome: OutcomeClass
  wilson95: WilsonInterval
  duration: { p50: number; p95: number; max: number; mean: number; cv: number }
  longestFailureStreak: number
  firstFailureAttempt: number | null
  clusters: ErrorCluster[]
  correlations: CorrelationHit[]
  seed: number
  workers: number
  createdAt: string
  incomplete: boolean
}

export interface CorrelationHit {
  factor: string
  value: string
  failRate: number
  support: number
  note: string
}

export interface TriageSuggestion {
  hypothesis: string
  evidence: string[]
  suggested_patch: string
  confidence: number
  caveats: string[]
  class: RootCauseClass
  source: 'rules' | 'python' | 'ai'
}

export interface TriageReport {
  schemaVersion: 1
  suggestions: TriageSuggestion[]
  clusters: ErrorCluster[]
}

export function exitCodeForOutcome(outcome: OutcomeClass, failOnFlake = true): number {
  if (outcome === 'stable-pass') return 0
  if (outcome === 'stable-fail') return 1
  if (outcome === 'flaky') return failOnFlake ? 2 : 0
  if (outcome === 'inconclusive') return failOnFlake ? 2 : 0
  return 3
}
