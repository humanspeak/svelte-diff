# Guard report — 002 isolate-processing-callbacks

**Recommendation: PASS** — real consumer-state feedback removed while cached result and callback-identity notifications remain intact.
**Reviewed at** b3448d3 · 2026-10-02 05:24 · **Plan planned at** fa0cfc9
**Batch integration** — local snapshot only; PR deferred per dispatch batch policy.

## Done criteria

| Criterion | Result | Evidence |
| --- | --- | --- |
| Both named new dependency regressions exist and pass after demonstrating baseline failure. | met | Guard temporary historical replay using f7c1dbc component and current fixture/tests independently failed with counts 4 and 2. Current Node-24 full suite passes both tests. |
| Existing replacement callback receives the same diff array; computation input changes still notify. | met | 125-unit guard run passes unchanged callback replacement identity and all computation dependency cases; effect keeps result and callback reads outside untrack (SvelteDiff.svelte:226). |
| `pnpm run check` exits 0 with 0 errors/0 warnings. | met | volta run --node 24.15.0 pnpm run check: 0 errors, 0 warnings, exit 0. |
| `pnpm exec vitest run src/lib/` exits 0. | met | volta run --node 24.15.0 pnpm exec vitest run src/lib/: 4 files, 125 tests passed, exit 0. |
| `pnpm exec playwright test --config=playwright.config.ts tests/component-performance.test.ts` exits 0. | met | volta run --node 24.15.0 pnpm exec playwright test --config=playwright.config.ts tests/component-performance.test.ts: 35 passed across all five projects, exit 0. |
| `trunk fmt`, `trunk check`, and `pnpm run package` exit 0. | met | Guard trunk fmt/check: No issues, exit 0. Node-24 pnpm run package: publint All good, exit 0. |
| `git diff --name-only` contains only scoped source/test paths; ignored generated outputs are not committed. | met | git diff --name-only f7c1dbc..b3448d3 lists exactly the three scoped paths; git diff HEAD -- src .github remains empty after gates. |
| Completion and gate results are sent to the operator for the batch status row. | met | Completion reported and DONE status maintained by conductor; no PR, push, or release. |

## Spirit

Only the consumer callback body is untracked. Reading the result and callback identity in the effect preserves notifications when either changes, while arbitrary synchronous consumer rune reads cannot subscribe that effect. The two bounded real-state tests independently fail the old component and pass this one; the browser suite retains caching, compact rendering, SSR, and existing performance ceilings.

## Scope & conduct

- Exactly three scoped implementation files; no public API, markup, engine, or diagnostic workload edits.
- Baseline counts independently reproduced; bounded fixture terminates; no STOP condition remains.
- No plan amendment. Conductor alone maintains index/log/report and commits.

## Residual risk / follow-ups

- Consumer exceptions still propagate; no catch or deferred notification was introduced.
- Future refactors must keep result and callback reads tracked while excluding only callback execution.
