import { test } from 'node:test'
import assert from 'node:assert/strict'
import { redactText } from './redact.js'
import { fingerprintError, classifyMessage } from './fingerprint.js'
import { wilsonInterval, flakeScore, classifyOutcome } from './stats.js'
import type { AttemptMeta } from './types.js'

test('redacts bearer and jwt', () => {
  const s = redactText('Authorization: Bearer abc.def.ghi eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.sig')
  assert.match(s, /REDACTED/)
  assert.doesNotMatch(s, /eyJhbGci/)
})

test('fingerprint strips noise', () => {
  const a = fingerprintError('Timeout at C:\\Users\\x\\proj\\test.ts:12 waiting for #ok')
  const b = fingerprintError('Timeout at /home/x/proj/test.ts:99 waiting for #ok')
  assert.equal(a, b)
})

test('wilson and flake score', () => {
  const w = wilsonInterval(7, 10)
  assert.ok(w.low < 0.7 && w.high > 0.7)
  assert.equal(flakeScore(5, 5), 1)
  assert.equal(flakeScore(10, 0), 0)
})

test('classify flaky vs stable', () => {
  const mk = (status: AttemptMeta['status'], id: number): AttemptMeta => ({
    attemptId: id,
    workerIndex: 0,
    seed: 1,
    os: 'test',
    startedAt: '',
    finishedAt: '',
    durationMs: 1,
    exitCode: status === 'passed' ? 0 : 1,
    status,
  })
  const flaky = [1, 2, 3, 4, 5].map((i) => mk(i % 2 ? 'passed' : 'failed', i))
  assert.equal(classifyOutcome(flaky), 'flaky')
  assert.equal(classifyMessage('Timeout waiting for networkidle'), 'timing')
})
