# Demo scripts

## 30-second (clone path — works today)

```bash
git clone https://github.com/KhyFee/Deflake.git
cd Deflake
npm install
npm run demo
```

Expect exit code `2` and a timing / flake cluster in `.deflake/runs/` (often citing something like a checkout path depending on fixture).

> `npx @khyfee/deflake demo` is the target UX after npm publish — package is monorepo-local for now.

## Recruiter (2 minutes)

1. Run demo above; show exit code 2.
2. Open latest `.deflake/runs/*/summary` or HTML artifact.
3. Optional: `npm run dev -w @deflake/web` → `/demo` attempt matrix.
4. Explain Wilson buckets: stable pass / stable fail / flake.

## Technical

1. `npm run build` then CLI via workspace package  
2. `doctor` / `check` style diagnostics from the CLI help  
3. `run --grep "…flake…" --attempts 10` against fixtures  
4. Inspect `.deflake/runs/*/summary.json` + SARIF  
5. Optional: `PYTHONPATH=packages/triager python -m deflake_triager --selftest`
