import { test, expect } from '@playwright/test'

test('always passes', async () => {
  expect(1 + 1).toBe(2)
})

test('deterministic fail control', async () => {
  expect(false).toBe(true)
})
