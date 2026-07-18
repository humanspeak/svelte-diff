# Guard report — 001 compile expected patterns once

**Recommendation: PASS** — immutable pattern work is compiled once and reused,
with a visible, interactive capability preview and three reproduced browser gates.
**Reviewed at** `4e78385` · 2026-07-17 19:20 · **Plan planned at** `8e3082c`
**Integrated** — [PR #168](https://github.com/humanspeak/svelte-diff/pull/168)
updated for reviewed snapshot commit `4e78385`.

## Done criteria

| Criterion                                                                                                               | Result | Evidence                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The Step 1 test exists, failed before implementation, and passes afterward.                                             | met    | The baseline `ParseResult` has only `groups`/`parts`; the new test requires `matches`, `cleanedText`, compiled line patterns, and regex identity at `src/lib/expectedPatterns.test.ts:48`. The executor recorded the expected initial red exit; guard reproduced the completed suite green. |
| One `findNamedGroups` scan creates all immutable metadata used by extraction.                                           | met    | `parseExpectedPatterns` performs the source scan once at `src/lib/expectedPatterns.ts:336`; retained metadata is assembled through line 364. The other scan belongs only to the standalone `cleanTemplate` export.                                                                          |
| `extractCaptures` does not split/rescan the original template or compile regexes.                                       | met    | The extraction loop consumes `parseResult.linePatterns` directly at `src/lib/expectedPatterns.ts:393`; `rg` finds no scan, split, or regex builder call in extraction.                                                                                                                      |
| Component updates to only `modifiedText` reuse the compiled parse result.                                               | met    | `$derived(parseExpectedPatterns(originalText))` is outside `computeDiff` at `src/lib/SvelteDiff.svelte:91`; rerender coverage is at `src/lib/SvelteDiff.test.ts:122`.                                                                                                                       |
| `/tests/component-performance` visibly reports 001 PASS/FAIL, samples, workload, ceiling, maximum, and failure reasons. | met    | The page paints RUNNING before work at `src/routes/tests/component-performance/+page.svelte:164`, keeps failures visible, and exposes current sample/capture/render details plus the actual mounted component at line 285.                                                                  |
| Diagnostic 001 completes every measured change in `<= 250 ms` and its Chromium E2E test passes.                         | met    | The 250 ms visibility hold is outside sample timing (`src/routes/tests/component-performance/+page.svelte:82` versus line 112). Playwright enforces the ceiling and visible PASS → RUNNING/disabled → PASS transition; guard ran it three consecutive times and all three passed.           |
| Existing capture, fallback, and renderer behavior remains green.                                                        | met    | `pnpm vitest run src/lib --coverage.enabled=false --reporter=default`: 3 files and 55/55 tests passed.                                                                                                                                                                                      |
| Targeted Trunk check, all library tests, `pnpm check`, and `pnpm build` exit 0.                                         | met    | Guard reproduced: Trunk checked 6 files with no issues; Vitest 55/55; Svelte check 0 errors/0 warnings; build, package, and publint all exited 0.                                                                                                                                           |
| No file outside Scope is modified, except the batch README status row.                                                  | met    | Source diffs through reviewed snapshot `4e78385` contain exactly the six allowed source/test paths; the revision changes only the page and its E2E file. Guard alone owns the index, log, and report changes.                                                                               |
| The 001 row in the batch README is updated to DONE.                                                                     | met    | `.agents/.plans/component-performance/README.md` now marks 001 DONE.                                                                                                                                                                                                                        |

## Spirit

The diff removes the repeated immutable-template setup named by the plan rather
than hiding it behind timing or a broad cache. Compiled line regexes and ordered
matches live with the parse result, the component derives that result only from
`originalText`, and extraction consumes it without rescanning. The permanent
identity test proves reuse, while the browser page now makes the real capability
observable: a human sees the actual 750-group mounted component, highlighted
captures, boundary values, and a painted rerun transition. Guard screenshots
confirmed both PASS and RUNNING states rather than relying only on DOM claims.

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
- The 250 ms RUNNING visibility hold is deliberately outside performance
  samples; future plans must preserve this interaction contract.
- Plan 002 must preserve sorted capture ranges and extend the same diagnostic
  page/test instead of replacing the 001 harness.
