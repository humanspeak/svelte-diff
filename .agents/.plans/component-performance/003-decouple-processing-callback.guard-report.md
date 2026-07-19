# Guard report — 003 decouple processing callback

**Recommendation: PASS** — callback notification is separated from computation, exact result identity is preserved, and every gate reproduced green.
**Reviewed at** `a8e06de` · 2026-07-18 18:23 · **Plan planned at** `8e3082c`
**Integrated** — [PR #171](https://github.com/humanspeak/svelte-diff/pull/171) opened via the `pr` skill for snapshot commit `a8e06de`.

## Done criteria

| Criterion                                                                                                                               | Result | Evidence                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The callback-only identity test failed before implementation and passes.                                                                | met    | Baseline `main` calls `onProcessing` inside `computeDiff`; the added regression uses exact `toBe` identity at `src/lib/SvelteDiff.test.ts:83`, and the guard's targeted run passed 1/1. |
| `computeDiff` returns data and does not read callbacks or write state.                                                                  | met    | `src/lib/SvelteDiff.svelte:110-167`; the guard search over that body found no `onProcessing`, `latestResult`, or `$state`.                                                              |
| Calculation and notification are separate reactive effects.                                                                             | met    | Calculation is at `src/lib/SvelteDiff.svelte:169-197`; notification is at `src/lib/SvelteDiff.svelte:199-203`.                                                                          |
| Callback identity changes do not allocate a new raw diff array.                                                                         | met    | Exact identity assertion at `src/lib/SvelteDiff.test.ts:55-84` and the guard's targeted Vitest run passed.                                                                              |
| Diagnostic 003 visibly reports identity results, five samples, ceiling, maximum, and failure reasons; all swaps complete in `<= 75 ms`. | met    | `src/routes/tests/component-performance/003/+page.svelte:232-365`; three isolated guard Chromium runs passed, each enforcing the shared ceiling and 5/5 identity assertions.            |
| Actual computation prop changes still recompute.                                                                                        | met    | Table-driven identity and DOM assertions cover both texts and both cleanup props at `src/lib/SvelteDiff.test.ts:86-135`; all 20 component tests passed within the 70/70 library run.    |
| Trunk, all library tests, `pnpm check`, and `pnpm build` exit 0.                                                                        | met    | Scoped Trunk checks passed; library tests passed 70/70; Svelte check reported 0 errors and 0 warnings; build passed with publint “All good”.                                            |
| No out-of-scope file is modified.                                                                                                       | met    | `git diff --name-only main...a8e06de` lists only the four source/test paths and README status path allowed by the plan.                                                                 |
| The 003 row in the batch README is updated to DONE.                                                                                     | met    | `.agents/.plans/component-performance/README.md:15`.                                                                                                                                    |

## Spirit

The implementation removes the callback from the expensive calculation effect's synchronous dependency chain instead of masking the work with timing tricks. A callback-only rerender now notifies from the stored result and preserves exact raw-array identity, while actual algorithm inputs still replace the result. The dedicated page makes both the capability and its ceiling visible without pulling computation into SSR, which also establishes the state boundary Plan 005 expects.

## Scope & conduct

- In-scope only? Yes; exactly the five allowed paths changed in the executor snapshot.
- STOP conditions respected? Yes; rerender works, callback arguments and captures remain covered, no reactive loop or SSR computation was introduced, and all three fixed-workload runs passed.
- Plan amendments during execution: none.

## Residual risk / follow-ups

- Browser callback timings are close to timer-resolution limits, so the exact raw-array identity assertion remains the primary deterministic regression signal.
- Plan 005 should preserve the notification-effect boundary when moving computation into an SSR-visible derived result.
