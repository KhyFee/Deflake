# Deflake

**Flaky Test Auto-Triager** by [KhyFee](https://github.com/KhyFee).

Catch intermittent Playwright failures with parallel isolated attempts, Wilson confidence intervals, offline rules + optional Python triage, and an opt-in AI path that only sees redacted evidence.

Developed privately before this public release — commit history reflects the open packaging of a working tool, not a simulated multi-month timeline.

## Quick start

```bash
npx @khyfee/deflake demo
# exit 2 = flake detected · artifacts under .deflake/runs/
```

In your Playwright project:

```bash
npx @khyfee/deflake init
npx @khyfee/deflake check
npx @khyfee/deflake run --grep "checkout" --attempts 10
```

Zero-config: works without Python, AI keys, or a database. Those enhance output when present.

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Stable pass |
| 1 | Stable (deterministic) fail |
| 2 | Flake detected (or inconclusive with `--fail-on-flake`) |
| 3 | Config / runtime error |

## Commands

- `init` — write `deflake.config.json`
- `check` / `doctor` — environment diagnostics
- `list` — discover tests
- `run` — parallel attempts → summary + triage
- `report` / `compare` — regenerate or diff runs
- `upload` — idempotent dashboard ingest
- `demo` — intentional seeded flake fixture

## Architecture

![Deflake architecture](https://raw.githubusercontent.com/KhyFee/Deflake/main/docs/architecture.svg)

CLI workers launch isolated Playwright children. Aggregation and reporters are TypeScript. Python triage is optional. The Next.js dashboard never runs browsers — it stores signed results.

## Dashboard

```bash
npm install
npm run build
npm run dev -w @deflake/web
```

Open `/demo` for seeded UI. `POST /api/v1/runs` accepts Bearer project tokens.

## Privacy / security

- Argv arrays only — no shell string execution
- Secrets redacted before disk / dashboard / AI
- AI requires `DEFLAKE_AI=1` and never auto-applies patches
- Supabase RLS on tenant tables; tokens hashed at rest

## Monorepo layout

- `packages/cli` — `@khyfee/deflake`
- `packages/core` — pool, stats, fingerprints, rules
- `packages/reporters` — md/html/junit/sarif/github
- `packages/triager` — Python offline triage
- `apps/web` — Next.js dashboard
- `fixtures/*` — intentional flaky + stable suites
- `supabase/` — Auth/RLS schema
- `docker/` — Playwright + triager images

## License

MIT © KhyFee
