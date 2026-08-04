# Show HN / share post (copy-paste ready)

Use this after you’re happy with `npm run demo` locally. Don’t buy engagement — post once where your audience already is.

## One-liner

**Deflake** — parallel Playwright attempts + Wilson stats so you can tell “flaky” from “broken” and keep evidence packs (no AI required).

## Short post

```
Show HN: Deflake – catch flaky Playwright tests with parallel isolated attempts

Tired of CI that fails once and passes on re-run?

Deflake runs N isolated Playwright attempts in parallel, scores them with Wilson confidence intervals, and dumps markdown/HTML/JUnit/SARIF evidence.

Demo (no keys / no DB):

  git clone https://github.com/KhyFee/Deflake.git
  cd Deflake && npm install && npm run demo
  # exit 2 = flake detected → .deflake/runs/

Optional AI sees only redacted evidence and never auto-patches.

GitHub: https://github.com/KhyFee/Deflake
MIT · Node 20+ · built for Playwright teams

Feedback welcome — especially the flake that still haunts your suite.
```

## Reddit / Dev.to title options

1. I built a CLI to stop guessing whether Playwright tests are flaky  
2. Parallel retries + statistics, not “retries: 3 forever”  
3. Deflake: evidence pack when CI gaslights you  

## Good places to post (pick 1–2 max)

- [Hacker News – Show HN](https://news.ycombinator.com/submit)  
- r/programming / r/Playwright / r/webdev (follow each community’s self-promo rules)  
- Dev.to / Hashnode long-form (expand with a small case study)  
- LinkedIn: one screenshot of the architecture SVG + clone command  

## Do / don’t

- **Do** confirm `npm run demo` exits 2 on a clean install first  
- **Do** answer every critical comment in the first hour  
- **Don’t** multi-post identically to 10 subs the same hour  
- **Don’t** buy stars/upvotes  

## What to answer

| Question | Honest answer |
|----------|----------------|
| On npm? | Not yet — monorepo path; npm publish is on the roadmap |
| Why not built-in Playwright retries? | Retries hide flakes; Deflake **measures** them |
| Does AI rewrite my tests? | Only optional, redacted, never auto-applies |
