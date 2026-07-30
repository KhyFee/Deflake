import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { RunSummary, TriageReport } from '@khyfee/deflake-core'

export async function runPythonTriager(summary: RunSummary): Promise<TriageReport | null> {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../triager')
  const input = JSON.stringify(summary)
  for (const bin of ['python', 'python3', 'py']) {
    const r = spawnSync(bin, ['-m', 'deflake_triager', '--stdin'], {
      cwd: root,
      input,
      encoding: 'utf8',
      shell: false,
      env: { ...process.env, PYTHONPATH: root },
    })
    if (r.status === 0 && r.stdout.trim()) {
      try {
        return JSON.parse(r.stdout) as TriageReport
      } catch {
        return null
      }
    }
  }
  return null
}
