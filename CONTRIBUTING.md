# Contributing

Thanks for helping Deflake. By [KhyFee](https://github.com/KhyFee).

## Setup

```bash
npm install
npm test
npm run build
PYTHONPATH=packages/triager python -m deflake_triager --selftest
```

## Guidelines

- Keep the CLI useful with zero optional deps (no Python / AI / DB required).
- Prefer Node/Python stdlib before new dependencies.
- Never execute shell strings — argv arrays only.
- Redact secrets before writing artifacts or calling AI.
- Do not auto-apply suggested patches.

## PR checklist

- [ ] Tests updated / added for non-trivial logic
- [ ] `npm test` and `npm run build` pass
- [ ] No secrets in fixtures or docs
