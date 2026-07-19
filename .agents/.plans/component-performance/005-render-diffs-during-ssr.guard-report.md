# Guard report — 005 render diffs during SSR

**Recommendation: PASS** — initial diff markup is server-rendered, callback behavior remains client-only and identity-stable, and every amended gate was independently reproduced green.

**Reviewed at** 8b8473a · 2026-07-19 13:39 · **Plan planned at** 266eb52

**Integrated** — [PR #173](https://github.com/humanspeak/svelte-diff/pull/173) opened via the `pr` skill for the reviewed snapshot commit.

## Done criteria

| Criterion                                                                                                                            | Result | Evidence                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The no-JavaScript test failed before implementation and passes afterward.                                                            | met    | Executor red run showed visible SSR FAIL, all three classes missing, and 90.55 ms navigation; guard source review confirmed the predecessor iterated nullable effect-populated state. Guard then reproduced three consecutive green Chromium runs, 2/2 each. |
| Initial server HTML contains meaningful diff markup.                                                                                 | met    | The no-JavaScript Playwright assertion finds visible equal/remove/insert classes and distinctive amber/cobalt text inside `ssr-diff-probe`; three guard runs passed.                                                                                         |
| Diagnostic 005 visibly flips from red FAIL to green PASS without JavaScript and local preview navigation completes in `<= 3,000 ms`. | met    | `tests/component-performance.test.ts:303-322` asserts the CSS-visible PASS/hidden FAIL, all three visible classes, probe-local text, and the Node navigation ceiling; repeated 005 runs passed.                                                              |
| With JavaScript, the 005 page banner shows diagnostic 005 PASS.                                                                      | met    | `tests/component-performance.test.ts:325-349` asserts `data-status="pass"`, `005: PASS`, navigation diagnostics, exact hydrated text/counts, and no runtime errors; targeted and five-project matrices passed.                                               |
| Pure computation is `$derived`; no calculation `$effect` remains.                                                                    | met    | `src/lib/SvelteDiff.svelte:177-207` computes `processingResult` with `$derived.by`, and markup consumes `processingResult.displayDiffs` at line 225. The only processing effect is callback notification.                                                    |
| `onProcessing` remains client-only and receives unchanged arguments.                                                                 | met    | `src/lib/SvelteDiff.svelte:209-212` invokes the callback from `$effect` with timing, raw diffs, and captures; all 28 component tests and 78 library tests passed.                                                                                            |
| Callback-only changes reuse the same raw diff array.                                                                                 | met    | The existing callback-only identity assertion in `src/lib/SvelteDiff.test.ts:55-84` passed within the 28/28 component and 78/78 library runs.                                                                                                                |
| The compact default and `compact={false}` legacy DOM both hydrate without duplication/errors.                                        | met    | Targeted Chromium passed 17/17, including diagnostic 004's default/legacy preview, and three complete 110-test matrices passed across all five projects with 005 hydration error capture green.                                                              |
| Trunk, all library tests, `pnpm check`, `pnpm build`, and the two-worker full Playwright matrix exit 0.                              | met    | Scoped Trunk format/lint reported no issues; library tests passed 78/78; Svelte check reported 0 errors/0 warnings; build/publint passed; complete matrices passed 110/110 in 59.3, 50.7, and 51.6 seconds.                                                  |
| No route except the dedicated 005 diagnostic page, public API, docs app, or other out-of-scope file is modified.                     | met    | Executor diff `e9a6241...8b8473a` changes only `src/lib/SvelteDiff.svelte`, the dedicated 005 route, shared performance test, and the authorized batch status row. No public type, docs, or unrelated route changed.                                         |
| The 005 row in the batch README is updated to DONE.                                                                                  | met    | `.agents/.plans/component-performance/README.md` records Plan 005 as DONE in this close-out.                                                                                                                                                                 |

## Spirit

The result delivers the plan's purpose rather than merely satisfying its test shape: server rendering now consumes a pure derived result, so equal, removed, and inserted content exists in the initial response, while external callback notification remains isolated in a client effect. The loud page proves that capability with scripts disabled and verifies hydration parity afterward. No cross-runtime caching or CPU-savings claim was introduced.

## Scope & conduct

- In-scope only? Yes. Source changes are limited to the published component, dedicated 005 diagnostic, shared performance coverage, and authorized status artifacts.
- STOP conditions respected? Yes. The executor stopped after two unconstrained full-matrix failures and did not weaken ceilings or improvise around them; guard reproduced the contention defect before amendment.
- Plan amendments during execution: on 2026-07-19, the operator approved aligning the predecessor contract with merged `compact=true`; later the operator approved capping the unchanged complete matrix at two workers after ten-worker failures and serial/two-worker controls isolated scheduler contention.

## Residual risk / follow-ups

- Server and client still compute independently; SSR improves initial content and hydration stability but does not reduce cross-runtime CPU.
- Large server-side diffs consume request CPU up to the configured timeout. Cross-request caching or an SSR opt-out remains a separate API/data-isolation design.
- The full browser matrix should retain its two-worker cap while 25–100 ms wall-clock diagnostics share the suite. A future test-infrastructure change could split parallel functional coverage from an isolated benchmark lane.
