# Guard report — 002 linearize expected region tagging

**Recommendation: PASS** — the quadratic scans are replaced by a verified forward cursor, exact output behavior is preserved, and every Plan 002 gate was reproduced green.
**Reviewed at** `462cbfa` · 2026-07-18 11:16 · **Plan planned at** `8e3082c`
**Integrated** — PR https://github.com/humanspeak/svelte-diff/pull/170 opened via the `pr` skill for reviewed snapshot commit `462cbfa`.

## Done criteria

| Criterion | Result | Evidence |
| --------- | ------ | -------- |
| The Step 1 test failed against the nested-filter implementation and passes. | met | Executor captured the required red result at 80,000 reads; guard reproduced 80,000 reads for the former 400 × 200 nested-filter pattern and the focused Vitest now passes 1/1. |
| `tagExpectedRegions` performs no full range `.filter` per diff segment. | met | `rg -n "captureRanges\.filter\|captureCursor\|rangeIndex" src/lib/expectedPatterns.ts` finds the forward cursors at lines 484–528 and no filter call. |
| Complexity is O(D + R + actual overlaps) for sorted, non-overlapping ranges. | met | The base cursor advances only at lines 495–500 and per-segment traversal starts from it at lines 502–528; the proxy-count ceiling test passes. |
| Diagnostic 002 visibly passes three 10,000-segment/5,000-range samples, each in `<= 100 ms`, and its Chromium E2E test passes. | met | Guard ran the focused Chromium command three times sequentially; all three exited 0. The fixed workload and three-sample card are at `src/routes/tests/component-performance/+page.svelte:47-50,499-554`. |
| All old/new expected-region output assertions pass exactly. | met | Full library run passed 64/64; boundary assertions are at `src/lib/expectedPatterns.test.ts:372-436`. |
| Trunk, library tests, `pnpm check`, and `pnpm build` exit 0. | met | Trunk format/check passed; Vitest passed 64/64; Svelte check reported 0 errors and 0 warnings; build completed with publint “All good!”. |
| Only in-scope files and the README status row are modified. | met | Executor contribution contains only the four authorized source/test files; guard separately updated only the README status and guard artifacts. |
| The 002 row in the batch README is updated to DONE. | met | `.agents/.plans/component-performance/README.md:14` records DONE. |

## Spirit

The implementation removes the repeated full-array scans named in the plan rather than masking them with caching or weakening the workload. A monotonic base cursor skips expired ranges once, while a local range cursor revisits only ranges that actually overlap later segments. The deterministic proxy test proves the complexity change independently of timing, and the loud browser diagnostic preserves the separate user-facing 100 ms regression ceiling.

## Scope & conduct

- In-scope only? Yes. The executor changed exactly the four authorized source/test files; README and guard artifacts were maintained by guard.
- STOP conditions respected? Yes. Sorted capture ranges remain intact, existing exact arrays pass, no public/component API change was required, and all three ceiling runs passed.
- Plan amendments during execution: none.

## Residual risk / follow-ups

- The cursor relies on capture ranges remaining sorted and non-overlapping, matching the extractor and the plan’s explicit boundary.
- Future capture producers must preserve that ordering contract and keep the proxy-count test as the algorithmic gate.
