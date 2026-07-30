#!/usr/bin/env node
import { accessSync } from 'node:fs'
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  aggregateAttempts,
  defaultWorkerCount,
  exitCodeForOutcome,
  runAttemptPool,
  triageFromSummary,
  type DeflakeConfig,
  type RunSummary,
  type TriageReport,
} from '@khyfee/deflake-core'
import {
  renderGithubSummary,
  renderHtml,
  renderJUnit,
  renderMarkdown,
  renderSarif,
} from '@khyfee/deflake-reporters'
import { runPythonTriager } from './python-bridge.js'
import { maybeAiEnhance } from './ai.js'

const BANNER = 'Deflake by KhyFee · https://github.com/KhyFee/Deflake'
const [cmd, ...rest] = process.argv.slice(2)

async function main() {
  switch (cmd) {
    case 'init':
      return initCmd()
    case 'check':
      return checkCmd()
    case 'list':
      return listCmd(rest)
    case 'run':
      return runCmd(rest)
    case 'report':
      return reportCmd(rest[0])
    case 'compare':
      return compareCmd(rest[0], rest[1])
    case 'upload':
      return uploadCmd(rest[0])
    case 'doctor':
      return doctorCmd()
    case 'demo':
      return demoCmd(rest)
    case 'help':
    case undefined:
      return help()
    default:
      console.error(`Unknown command: ${cmd}`)
      help()
      process.exit(3)
  }
}

function help() {
  console.log(`${BANNER}

Usage:
  deflake init
  deflake check
  deflake list [--grep <pattern>]
  deflake run [files...] [--grep <p>] [--attempts N] [--workers N] [--seed N] [--fail-on-flake=false]
  deflake report <runDir>
  deflake compare <runA> <runB>
  deflake upload <runDir>
  deflake doctor
  deflake demo [--attempts N]

Exit codes: 0 stable-pass · 1 stable-fail · 2 flake · 3 config/runtime error
`)
}

async function initCmd() {
  const target = path.resolve('deflake.config.json')
  const cfg: DeflakeConfig = {
    attempts: 10,
    workers: defaultWorkerCount(),
    failOnFlake: true,
    attemptTimeout: 120_000,
    reporters: ['json', 'md', 'html', 'junit', 'sarif'],
    ai: { enabled: false },
  }
  await writeFile(target, JSON.stringify(cfg, null, 2) + '\n')
  console.log(`Wrote ${target}`)
}

async function loadConfig(cwd = process.cwd()): Promise<DeflakeConfig> {
  try {
    const raw = await readFile(path.join(cwd, 'deflake.config.json'), 'utf8')
    return JSON.parse(raw) as DeflakeConfig
  } catch {
    return {}
  }
}

function parseArgs(args: string[]) {
  const out: {
    files: string[]
    grep?: string
    attempts?: number
    workers?: number
    seed?: number
    failOnFlake?: boolean
    projectDir?: string
    quiet?: boolean
  } = { files: [] }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!
    if (a === '--grep') out.grep = args[++i]
    else if (a === '--attempts') out.attempts = Number(args[++i])
    else if (a === '--workers') out.workers = Number(args[++i])
    else if (a === '--seed') out.seed = Number(args[++i])
    else if (a === '--project-dir') out.projectDir = args[++i]
    else if (a === '--fail-on-flake=false') out.failOnFlake = false
    else if (a === '--quiet') out.quiet = true
    else if (a.startsWith('-')) {
      console.error(`Unknown flag: ${a}`)
      process.exit(3)
    } else out.files.push(a)
  }
  return out
}

async function checkCmd() {
  const cfg = await loadConfig()
  const projectDir = path.resolve(cfg.projectDir || process.cwd())
  const checks = [
    ['node', process.version],
    ['playwright.bin', (await findPlaywright(projectDir)) || 'MISSING'],
    ['python', pythonVersion()],
    ['config', 'ok'],
  ]
  for (const [k, v] of checks) console.log(`${k}\t${v}`)
  if (!(await findPlaywright(projectDir))) process.exit(3)
}

async function listCmd(args: string[]) {
  const opts = parseArgs(args)
  const cfg = await loadConfig()
  const projectDir = path.resolve(opts.projectDir || cfg.projectDir || process.cwd())
  const bin = await findPlaywright(projectDir)
  if (!bin) {
    console.error('Playwright not found')
    process.exit(3)
  }
  const r = spawnSync(process.execPath, [bin, 'test', '--list', ...(opts.grep ? ['--grep', opts.grep] : []), ...opts.files], {
    cwd: projectDir,
    encoding: 'utf8',
    shell: false,
  })
  process.stdout.write(r.stdout || '')
  process.stderr.write(r.stderr || '')
  process.exit(r.status ?? 3)
}

async function runCmd(args: string[]) {
  console.error(BANNER)
  const opts = parseArgs(args)
  const cfg = await loadConfig()
  const projectDir = path.resolve(opts.projectDir || cfg.projectDir || process.cwd())
  const attempts = opts.attempts ?? cfg.attempts ?? 10
  const workers = Math.min(cfg.cpuCap ?? 4, opts.workers ?? cfg.workers ?? defaultWorkerCount(cfg.cpuCap ?? 4))
  const seed = opts.seed ?? cfg.seed ?? Math.floor(Math.random() * 1e9)
  const failOnFlake = opts.failOnFlake ?? cfg.failOnFlake ?? true
  const bin = await findPlaywright(projectDir)
  if (!bin) {
    console.error('Playwright CLI not found in project. Install @playwright/test.')
    process.exit(3)
  }

  const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8)
  const runDir = path.join(projectDir, '.deflake', 'runs', runId)
  await mkdir(runDir, { recursive: true })

  const ac = new AbortController()
  const onSig = () => ac.abort()
  process.on('SIGINT', onSig)
  process.on('SIGTERM', onSig)

  if (!opts.quiet) console.error(`Running ${attempts} attempts with ${workers} workers (seed=${seed})`)

  const attemptMetas = await runAttemptPool({
    attempts,
    workers,
    projectDir,
    grep: opts.grep ?? cfg.grep,
    files: opts.files,
    projects: cfg.projects,
    attemptTimeoutMs: cfg.attemptTimeout ?? 120_000,
    seed,
    runDir,
    playwrightBin: bin,
    signal: ac.signal,
    onAttempt: (m) => {
      if (!opts.quiet) console.error(`  attempt ${m.attemptId}: ${m.status} (${m.durationMs}ms)`)
    },
  })

  process.off('SIGINT', onSig)
  process.off('SIGTERM', onSig)

  const summary = aggregateAttempts({
    runId,
    attempts: attemptMetas,
    seed,
    workers,
    incomplete: ac.signal.aborted,
  })
  let triage = triageFromSummary(summary)
  const py = await runPythonTriager(summary)
  if (py) triage = py
  triage = await maybeAiEnhance(summary, triage)

  await writeArtifacts(runDir, summary, triage, cfg.reporters)
  console.log(renderMarkdown(summary, triage))
  console.error(`\nArtifacts: ${runDir}`)
  process.exit(exitCodeForOutcome(summary.outcome, failOnFlake))
}

async function writeArtifacts(
  runDir: string,
  summary: RunSummary,
  triage: TriageReport,
  reporters: DeflakeConfig['reporters'] = ['json', 'md', 'html', 'junit', 'sarif'],
) {
  const list = reporters || ['json', 'md']
  await writeFile(path.join(runDir, 'summary.json'), JSON.stringify(summary, null, 2))
  await writeFile(path.join(runDir, 'triage.json'), JSON.stringify(triage, null, 2))
  if (list.includes('md')) await writeFile(path.join(runDir, 'report.md'), renderMarkdown(summary, triage))
  if (list.includes('html')) await writeFile(path.join(runDir, 'report.html'), renderHtml(summary, triage))
  if (list.includes('junit')) await writeFile(path.join(runDir, 'junit.xml'), renderJUnit(summary))
  if (list.includes('sarif')) await writeFile(path.join(runDir, 'results.sarif'), renderSarif(summary))
  if (list.includes('github') || process.env.GITHUB_STEP_SUMMARY) {
    const gh = renderGithubSummary(summary, triage)
    if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, gh + '\n', { flag: 'a' })
  }
  const checksum = createHash('sha256').update(JSON.stringify(summary)).digest('hex')
  await writeFile(
    path.join(runDir, 'manifest.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        complete: !summary.incomplete,
        checksum,
        files: ['summary.json', 'triage.json', 'report.md'],
      },
      null,
      2,
    ),
  )
}

async function reportCmd(runDir?: string) {
  if (!runDir) {
    console.error('Usage: deflake report <runDir>')
    process.exit(3)
  }
  const summary = JSON.parse(await readFile(path.join(runDir, 'summary.json'), 'utf8')) as RunSummary
  let triage = JSON.parse(await readFile(path.join(runDir, 'triage.json'), 'utf8')) as TriageReport
  triage = triageFromSummary(summary)
  const py = await runPythonTriager(summary)
  if (py) triage = py
  await writeArtifacts(runDir, summary, triage)
  console.log(renderMarkdown(summary, triage))
}

async function compareCmd(a?: string, b?: string) {
  if (!a || !b) {
    console.error('Usage: deflake compare <runA> <runB>')
    process.exit(3)
  }
  const sa = JSON.parse(await readFile(path.join(a, 'summary.json'), 'utf8')) as RunSummary
  const sb = JSON.parse(await readFile(path.join(b, 'summary.json'), 'utf8')) as RunSummary
  const delta = sb.passRate - sa.passRate
  const overlap = !(sb.wilson95.low > sa.wilson95.high || sa.wilson95.low > sb.wilson95.high)
  console.log(
    JSON.stringify(
      {
        a: { runId: sa.runId, passRate: sa.passRate, outcome: sa.outcome },
        b: { runId: sb.runId, passRate: sb.passRate, outcome: sb.outcome },
        passRateDelta: delta,
        improved: delta > 0 && !overlap,
        regressed: delta < 0 && !overlap,
        inconclusive: overlap,
      },
      null,
      2,
    ),
  )
}

async function uploadCmd(runDir?: string) {
  if (!runDir) {
    console.error('Usage: deflake upload <runDir>')
    process.exit(3)
  }
  const cfg = await loadConfig()
  const url = (cfg.upload?.url || process.env.DEFLAKE_API_URL || 'http://localhost:3000').replace(/\/$/, '')
  const token = process.env[cfg.upload?.tokenEnv || 'DEFLAKE_PROJECT_TOKEN'] || process.env.DEFLAKE_PROJECT_TOKEN
  if (!token) {
    console.error('DEFLAKE_PROJECT_TOKEN required')
    process.exit(3)
  }
  const summary = JSON.parse(await readFile(path.join(runDir, 'summary.json'), 'utf8'))
  const triage = JSON.parse(await readFile(path.join(runDir, 'triage.json'), 'utf8'))
  const res = await fetch(`${url}/api/v1/runs`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      'idempotency-key': summary.runId,
    },
    body: JSON.stringify({ summary, triage }),
  })
  if (!res.ok) {
    console.error(await res.text())
    process.exit(3)
  }
  console.log(JSON.stringify(await res.json()))
}

async function doctorCmd() {
  const cfg = await loadConfig()
  console.log(
    JSON.stringify(
      {
        banner: BANNER,
        node: process.version,
        platform: process.platform,
        cwd: process.cwd(),
        configKeys: Object.keys(cfg),
        python: pythonVersion(),
        ai: process.env.DEFLAKE_AI === '1',
      },
      null,
      2,
    ),
  )
}

async function demoCmd(args: string[]) {
  const opts = parseArgs(args)
  const repoRoot = findRepoRoot(path.dirname(fileURLToPath(import.meta.url)))
  const resolved = path.join(repoRoot, 'fixtures', 'flaky-suite')
  process.chdir(resolved)
  await runCmd([
    '--grep',
    'seeded flake',
    '--attempts',
    String(opts.attempts ?? 10),
    '--workers',
    String(opts.workers ?? 2),
    '--seed',
    '42',
  ])
}

function findRepoRoot(start: string): string {
  let cur = start
  for (let i = 0; i < 8; i++) {
    try {
      accessSync(path.join(cur, 'fixtures', 'flaky-suite', 'package.json'))
      return cur
    } catch {
      cur = path.dirname(cur)
    }
  }
  return path.resolve(start, '../../..')
}

async function findPlaywright(projectDir: string): Promise<string | null> {
  let cur = projectDir
  for (let i = 0; i < 6; i++) {
    const cli = path.join(cur, 'node_modules', '@playwright', 'test', 'cli.js')
    try {
      await access(cli)
      return cli
    } catch {
      /* continue */
    }
    const parent = path.dirname(cur)
    if (parent === cur) break
    cur = parent
  }
  return null
}

function pythonVersion(): string {
  for (const bin of process.platform === 'win32' ? ['py', 'python', 'python3'] : ['python3', 'python']) {
    const r = spawnSync(bin, ['--version'], { encoding: 'utf8', shell: false })
    if (r.status === 0) return (r.stdout || r.stderr || '').trim()
  }
  return 'unavailable'
}

main().catch((err) => {
  console.error(err)
  process.exit(3)
})
