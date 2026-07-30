import type { RootCauseClass } from './types.js'

const PATH_RE = /(?:[A-Za-z]:)?(?:[\\/][\w.-]+)+/g
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi
const TS_RE = /\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g
const PORT_RE = /:\d{4,5}\b/g
const ANSI_RE = /\u001b\[[0-9;]*m/g
const LINE_RE = /:\d+(?::\d+)?/g

export function fingerprintError(message: string): string {
  const norm = message
    .replace(ANSI_RE, '')
    .replace(TS_RE, '<ts>')
    .replace(UUID_RE, '<uuid>')
    .replace(PATH_RE, '<path>')
    .replace(PORT_RE, ':<port>')
    .replace(LINE_RE, ':<line>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400)
  return simpleHash(norm)
}

export function classifyMessage(message: string): RootCauseClass {
  const m = message.toLowerCase()
  if (m.includes('timeout') || m.includes('waiting for') || m.includes('networkidle')) return 'timing'
  if (m.includes('strict mode') || m.includes('locator') || m.includes('detached') || m.includes('not found')) return 'selector'
  if (m.includes('net::') || m.includes('econnrefused') || m.includes('fetch failed') || m.includes('status=')) return 'network'
  if (m.includes('unique') || m.includes('duplicate') || m.includes('already exists')) return 'test-data'
  if (m.includes('order') || m.includes('previous test')) return 'order-dependence'
  if (m.includes('oom') || m.includes('ENOMEM') || m.includes('resource')) return 'resource'
  if (m.includes('chromium') || m.includes('firefox') || m.includes('webkit')) return 'browser-specific'
  if (m.includes('env') || m.includes('config')) return 'environment'
  if (m.includes('expect(') || m.includes('assertion')) return 'deterministic-fail'
  return 'unknown'
}

export function suggestionFor(cls: RootCauseClass): string {
  switch (cls) {
    case 'timing':
      return 'Replace fixed sleeps with explicit waits (locator/state/URL) or wait for the specific network response.'
    case 'selector':
      return 'Prefer role/text locators and re-query after navigation; avoid stale element handles.'
    case 'network':
      return 'Await the critical API response (page.waitForResponse) or mock unstable backends in the test.'
    case 'test-data':
      return 'Scope fixtures per worker/attempt (unique emails, isolated DB schemas).'
    case 'leaked-state':
      return 'Reset storageState/cookies between attempts; avoid shared mutable globals.'
    case 'order-dependence':
      return 'Make tests independent; clean up side effects in afterEach; avoid relying on prior specs.'
    case 'resource':
      return 'Lower Deflake workers or isolate heavy browser projects; check host CPU/memory pressure.'
    case 'browser-specific':
      return 'Reproduce with the failing Playwright project only; avoid generic timeout increases.'
    case 'environment':
      return 'Pin locale/timezone and required env vars; document CI vs local differences.'
    case 'deterministic-fail':
      return 'This looks product-deterministic — fix the assertion/product bug rather than retrying.'
    default:
      return 'Inspect clustered evidence and add a readiness wait around the failing step.'
  }
}

function simpleHash(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return `fp_${(h >>> 0).toString(16)}`
}
