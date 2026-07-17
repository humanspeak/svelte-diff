# Guard report — 001 compile expected patterns once

**Recommendation: PASS** — immutable pattern work is compiled once and reused,
with deterministic identity coverage and three reproduced browser-ceiling passes.
**Reviewed at** `c1645fe` · 2026-07-17 18:53 · **Plan planned at** `8e3082c`
**Integrated** — [PR #168](https://github.com/humanspeak/svelte-diff/pull/168)
opened via the `pr` skill for reviewed snapshot commit `c1645fe`.

## Done criteria

| Criterion                                                                                                               | Result | Evidence                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The Step 1 test exists, failed before implementation, and passes afterward.                                             | met    | The baseline `ParseResult` has only `groups`/`parts`; the new test requires `matches`, `cleanedText`, compiled line patterns, and regex identity at `src/lib/expectedPatterns.test.ts:48`. The executor recorded the expected initial red exit; guard reproduced the completed suite green. |
| One `findNamedGroups` scan creates all immutable metadata used by extraction.                                           | met    | `parseExpectedPatterns` performs the source scan once at `src/lib/expectedPatterns.ts:336`; retained metadata is assembled through line 364. The other scan belongs only to the standalone `cleanTemplate` export.                                                                          |
| `extractCaptures` does not split/rescan the original template or compile regexes.                                       | met    | The extraction loop consumes `parseResult.linePatterns` directly at `src/lib/expectedPatterns.ts:393`; `rg` finds no scan, split, or regex builder call in extraction.                                                                                                                      |
| Component updates to only `modifiedText` reuse the compiled parse result.                                               | met    | `$derived(parseExpectedPatterns(originalText))` is outside `computeDiff` at `src/lib/SvelteDiff.svelte:91`; rerender coverage is at `src/lib/SvelteDiff.test.ts:122`.                                                                                                                       |
| `/tests/component-performance` visibly reports 001 PASS/FAIL, samples, workload, ceiling, maximum, and failure reasons. | met    | Visible state and diagnostics are rendered at `src/routes/tests/component-performance/+page.svelte:172`; failed runs remain painted by the catch path at line 152.                                                                                                                          |
| Diagnostic 001 completes every measured change in `<= 250 ms` and its Chromium E2E test passes.                         | met    | The route uses five samples and a 250 ms ceiling at `src/routes/tests/component-performance/+page.svelte:19`; Playwright enforces `elapsed <= ceiling` at `tests/component-performance.test.ts:21`. Guard ran the command three consecutive times; all three passed.                        |
| Existing capture, fallback, and renderer behavior remains green.                                                        | met    | `pnpm vitest run src/lib --coverage.enabled=false --reporter=default`: 3 files and 55/55 tests passed.                                                                                                                                                                                      |
| Targeted Trunk check, all library tests, `pnpm check`, and `pnpm build` exit 0.                                         | met    | Guard reproduced: Trunk checked 6 files with no issues; Vitest 55/55; Svelte check 0 errors/0 warnings; build, package, and publint all exited 0.                                                                                                                                           |
| No file outside Scope is modified, except the batch README status row.                                                  | met    | `git diff --name-status origin/main...c1645fe` lists exactly the six allowed source/test paths; guard alone updates this status row and guard artifacts after PASS.                                                                                                                         |
| The 001 row in the batch README is updated to DONE.                                                                     | met    | `.agents/.plans/component-performance/README.md` now marks 001 DONE.                                                                                                                                                                                                                        |

## Spirit

The diff removes the repeated immutable-template setup named by the plan rather
than hiding it behind timing or a broad cache. Compiled line regexes and ordered
matches live with the parse result, the component derives that result only from
`originalText`, and extraction consumes it without rescanning. The permanent
identity test proves reuse while the loud browser page independently guards the
real mounted-component change path and its wall-clock ceiling.

## Scope & conduct

- In-scope only? Yes. The reviewed source snapshot changes exactly the six
  allowed files; this report, guard log, and index status are guard-owned.
- STOP conditions respected? Yes. None were observed; behavior, public API,
  capture ordering, SSR diff rendering, and the fixed workload/ceiling remain
  intact.
- Plan amendments during execution: none.

## Residual risk / follow-ups

- Browser time is environment-sensitive by design; deterministic regex-object
  identity and full capture assertions remain the primary optimization proof.
- Plan 002 must preserve sorted capture ranges and extend the same diagnostic
  page/test instead of replacing the 001 harness.
