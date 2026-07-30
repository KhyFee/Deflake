# Demo scripts

## 30-second

```bash
npx @khyfee/deflake demo
```

Expect exit code `2` and a timing cluster citing `/api/checkout`.

## Recruiter

1. Open the dashboard `/demo` page.
2. Show attempt matrix (7 green / 3 red).
3. Show triage suggestion with reproduction command.

## Technical

1. `deflake check` + `deflake doctor`
2. `deflake run --grep "seeded flake" --seed 42`
3. Inspect `.deflake/runs/*/summary.json` + `results.sarif`
4. `PYTHONPATH=packages/triager python -m deflake_triager --selftest`
