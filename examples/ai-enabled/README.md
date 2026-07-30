# Opt-in AI triage
export DEFLAKE_AI=1
export OPENAI_API_KEY=sk-...
export OPENAI_MODEL=gpt-4o-mini
npx @khyfee/deflake run --grep "flake" --attempts 10
