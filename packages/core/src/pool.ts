import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'
import type { AttemptMeta } from './types.js'
import { fingerprintError } from './fingerprint.js'
import { redactText } from './redact.js'

export interface PoolOptions {
  attempts: number
  workers: number
  projectDir: string
  grep?: string
  files?: string[]
  projects?: string[]
  attemptTimeoutMs: number
  seed: number
  runDir: string
  playwrightBin?: string
  onAttempt?: (meta: AttemptMeta) => void
  signal?: AbortSignal
}

export function defaultWorkerCount(cpuCap = 4): number {
  return Math.min(cpuCap, Math.max(1, Math.floor(os.cpus().length / 2)))
}

/** Bounded scheduler: each attempt = isolated Playwright child process. */
export async function runAttemptPool(opts: PoolOptions): Promise<AttemptMeta[]> {
  const results: AttemptMeta[] = []
  let next = 1
  let active = 0
  let stopped = false

  const stop = () => {
    stopped = true
  }
  opts.signal?.addEventListener('abort', stop)

  await mkdir(opts.runDir, { recursive: true })

  return new Promise((resolve) => {
    const maybeSchedule = () => {
      if (stopped && active === 0) return resolve(results.sort((a, b) => a.attemptId - b.attemptId))
      while (!stopped && active < opts.workers && next <= opts.attempts) {
        const attemptId = next++
        active++
        void runOne(attemptId)
          .then((meta) => {
            results.push(meta)
            opts.onAttempt?.(meta)
          })
          .finally(() => {
            active--
            if ((stopped || next > opts.attempts) && active === 0) {
              resolve(results.sort((a, b) => a.attemptId - b.attemptId))
            } else {
              maybeSchedule()
            }
          })
      }
      if (next > opts.attempts && active === 0) {
        resolve(results.sort((a, b) => a.attemptId - b.attemptId))
      }
    }
    maybeSchedule()
  })

  async function runOne(attemptId: number): Promise<AttemptMeta> {
    const attemptDir = path.join(opts.runDir, 'attempts', String(attemptId).padStart(3, '0'))
    await mkdir(attemptDir, { recursive: true })
    const reportPath = path.join(attemptDir, 'report.json')
    const startedAt = new Date()
    const { command, args: baseArgs } = resolvePlaywrightLaunch(opts.playwrightBin, opts.projectDir)
    const args = [
      ...baseArgs,
      'test',
      ...(opts.files || []),
      ...(opts.grep ? ['--grep', opts.grep] : []),
      ...(opts.projects || []).flatMap((p) => ['--project', p]),
      '--reporter=json',
      '--workers=1',
    ]

    return new Promise((resolveAttempt) => {
      // ponytail: no shell — argv arrays only; JSON path via env (Windows-safe)
      const child = spawn(command, args, {
        cwd: opts.projectDir,
        env: {
          ...process.env,
          DEFLAKE_ATTEMPT: String(attemptId),
          DEFLAKE_SEED: String(opts.seed),
          FORCE_COLOR: '0',
          PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath,
        },
        windowsHide: true,
        shell: false,
      })

      let stdout = ''
      let stderr = ''
      let killed = false
      const timer = setTimeout(() => {
        killed = true
        child.kill('SIGTERM')
        setTimeout(() => child.kill('SIGKILL'), 2000)
      }, opts.attemptTimeoutMs)

      const onAbort = () => {
        killed = true
        child.kill('SIGTERM')
      }
      opts.signal?.addEventListener('abort', onAbort)

      child.stdout?.on('data', (d) => {
        stdout += d.toString()
      })
      child.stderr?.on('data', (d) => {
        stderr += d.toString()
      })

      child.on('error', async (err) => {
        clearTimeout(timer)
        opts.signal?.removeEventListener('abort', onAbort)
        const finishedAt = new Date()
        const meta: AttemptMeta = {
          attemptId,
          workerIndex: attemptId % Math.max(1, opts.workers),
          seed: opts.seed + attemptId,
          os: process.platform,
          startedAt: startedAt.toISOString(),
          finishedAt: finishedAt.toISOString(),
          durationMs: finishedAt.getTime() - startedAt.getTime(),
          exitCode: 1,
          status: 'infrastructure-error',
          errorMessage: err.message,
        }
        await writeFile(path.join(attemptDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8')
        resolveAttempt(meta)
      })

      child.on('close', async (code) => {
        clearTimeout(timer)
        opts.signal?.removeEventListener('abort', onAbort)
        const finishedAt = new Date()
        const exitCode = code ?? 1
        const errBlob = redactText(stderr || stdout)
        let status: AttemptMeta['status'] = exitCode === 0 ? 'passed' : 'failed'
        if (killed && opts.signal?.aborted) status = 'interrupted'
        else if (killed) status = 'infrastructure-error'

        let errorMessage =
          status === 'passed' ? undefined : (await readJsonError(reportPath)) || extractError(errBlob)
        if (errorMessage) errorMessage = redactText(errorMessage)
        const meta: AttemptMeta = {
          attemptId,
          workerIndex: attemptId % Math.max(1, opts.workers),
          seed: opts.seed + attemptId,
          os: process.platform,
          startedAt: startedAt.toISOString(),
          finishedAt: finishedAt.toISOString(),
          durationMs: finishedAt.getTime() - startedAt.getTime(),
          exitCode,
          status,
          errorMessage,
          fingerprint: errorMessage ? fingerprintError(errorMessage) : undefined,
          gitSha: process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA,
        }

        await writeFile(path.join(attemptDir, 'stdout.log'), redactText(stdout), 'utf8')
        await writeFile(path.join(attemptDir, 'stderr.log'), redactText(stderr), 'utf8')
        await writeFile(path.join(attemptDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8')
        resolveAttempt(meta)
      })
    })
  }
}

function resolvePlaywrightLaunch(playwrightBin: string | undefined, projectDir: string): { command: string; args: string[] } {
  const require = createRequire(path.join(projectDir, 'package.json'))
  const candidates = [
    playwrightBin && (playwrightBin.endsWith('cli.js') || playwrightBin.endsWith('cli.cjs')) ? playwrightBin : null,
    (() => {
      try {
        return require.resolve('@playwright/test/cli.js')
      } catch {
        return null
      }
    })(),
    playwrightBin,
  ].filter(Boolean) as string[]

  for (const bin of candidates) {
    if (bin.endsWith('cli.js') || bin.endsWith('cli.cjs')) {
      return { command: process.execPath, args: [bin] }
    }
    const fromShim = path.resolve(path.dirname(bin), '..', '@playwright', 'test', 'cli.js')
    if (existsSync(fromShim)) return { command: process.execPath, args: [fromShim] }
  }
  throw new Error('Playwright CLI not found')
}

function extractError(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const hit =
    lines.find(
      (l) =>
        /Timeout waiting|Error:|expect\(/i.test(l) &&
        !/DeprecationWarning|FORCE_COLOR|NO_COLOR|trace-warnings/i.test(l),
    ) || lines.find((l) => /Error:/i.test(l))
  return (
    hit ||
    lines.filter((l) => !/FORCE_COLOR|NO_COLOR|DeprecationWarning/i.test(l)).slice(-5).join(' ') ||
    'Unknown failure'
  ).slice(0, 800)
}

async function readJsonError(reportPath: string): Promise<string | undefined> {
  try {
    const raw = await readFile(reportPath, 'utf8')
    const json = JSON.parse(raw) as { suites?: unknown[] }
    const stack: unknown[] = [...(json.suites || [])]
    while (stack.length) {
      const node = stack.pop() as {
        suites?: unknown[]
        specs?: Array<{ tests?: Array<{ results?: Array<{ error?: { message?: string } }> }> }>
      }
      if (node.suites) stack.push(...node.suites)
      for (const spec of node.specs || []) {
        for (const t of spec.tests || []) {
          for (const r of t.results || []) {
            if (r.error?.message) return r.error.message.split('\n')[0]!.slice(0, 800)
          }
        }
      }
    }
  } catch {
    return undefined
  }
  return undefined
}
