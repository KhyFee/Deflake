import { test } from 'node:test'
import assert from 'node:assert/strict'
import { exitCodeForOutcome } from '@khyfee/deflake-core'

test('exit codes', () => {
  assert.equal(exitCodeForOutcome('stable-pass'), 0)
  assert.equal(exitCodeForOutcome('stable-fail'), 1)
  assert.equal(exitCodeForOutcome('flaky', true), 2)
  assert.equal(exitCodeForOutcome('flaky', false), 0)
  assert.equal(exitCodeForOutcome('infrastructure-error'), 3)
})
