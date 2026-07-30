import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createToken, hashToken, signBody, verifyBody } from './signing.ts'

test('token hash', () => {
  const t = createToken()
  assert.equal(hashToken(t), hashToken(t))
})

test('hmac', () => {
  const s = signBody('x', 'body')
  assert.equal(verifyBody('x', 'body', s), true)
})
