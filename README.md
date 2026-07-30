# Deflake

**Flaky Test Auto-Triager** by [KhyFee](https://github.com/KhyFee).

Catch intermittent Playwright failures with parallel isolated attempts, Wilson confidence intervals, offline rules + optional Python triage, and an opt-in AI path that only sees redacted evidence.

Developed privately before this public release â€” commit history reflects the open packaging of a working tool, not a simulated multi-month timeline.

## Quick start

```bash
npx @khyfee/deflake demo
# exit 2 = flake detected Â· artifacts under .deflake/runs/
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

- `init` â€” write `deflake.config.json`
- `check` / `doctor` â€” environment diagnostics
- `list` â€” discover tests
- `run` â€” parallel attempts â†’ summary + triage
- `report` / `compare` â€” regenerate or diff runs
- `upload` â€” idempotent dashboard ingest
- `demo` â€” intentional seeded flake fixture

## Architecture

![Deflake architecture](https://raw.githubusercontent.com/KhyFee/Deflake/main/docs/architecture.svg?v=2)

CLI workers launch isolated Playwright children. Aggregation and reporters are TypeScript. Python triage is optional. The Next.js dashboard never runs browsers â€” it stores signed results.

## Dashboard

```bash
npm install
npm run build
npm run dev -w @deflake/web
```

Open `/demo` for seeded UI. `POST /api/v1/runs` accepts Bearer project tokens.

## Privacy / security

- Argv arrays only â€” no shell string execution
- Secrets redacted before disk / dashboard / AI
- AI requires `DEFLAKE_AI=1` and never auto-applies patches
- Supabase RLS on tenant tables; tokens hashed at rest

## Monorepo layout

- `packages/cli` â€” `@khyfee/deflake`
- `packages/core` â€” pool, stats, fingerprints, rules
- `packages/reporters` â€” md/html/junit/sarif/github
- `packages/triager` â€” Python offline triage
- `apps/web` â€” Next.js dashboard
- `fixtures/*` â€” intentional flaky + stable suites
- `supabase/` â€” Auth/RLS schema
- `docker/` â€” Playwright + triager images

## License

MIT Â© KhyFee
