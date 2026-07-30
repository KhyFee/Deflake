# Benchmark methodology

Fixture runs use fixed `--seed 42` and `--grep "seeded flake"`.

Expected: 7/10 pass, exit code 2, timing cluster.

Do not use `math.random presentation flake` for CI assertions — presentation only.

Host saturation tests: 100 attempts with workers=2; assert concurrency never exceeds workers and partial reports write on SIGINT.
