import { test, expect } from '@playwright/test'

// Deterministic seeded flake for demos (seed 42 → known pattern via DEFLAKE_ATTEMPT)
test('seeded flake timeout', async () => {
  const attempt = Number(process.env.DEFLAKE_ATTEMPT || '1')
  // Fail attempts 2,5,8 for seed demos — intermittent, not 0/100
  if ([2, 5, 8].includes(attempt)) {
    throw new Error('Timeout waiting for network response /api/checkout')
  }
  expect(true).toBe(true)
})

test('math.random presentation flake', async () => {
  // Presentation-only; not used for CI assertions of exact rates
  if (Math.random() < 0.35) {
    throw new Error('Error: expect(locator).toBeVisible() failed — element detached from DOM')
  }
  expect(true).toBe(true)
})

test('order dependent when shuffled', async () => {
  // ponytail: shared global simulates leaked state
  const g = globalThis as unknown as { __deflakeDirty?: boolean }
  if (g.__deflakeDirty) throw new Error('Order dependence: previous test leaked state')
  g.__deflakeDirty = process.env.DEFLAKE_ATTEMPT === '3'
  expect(true).toBe(true)
})
