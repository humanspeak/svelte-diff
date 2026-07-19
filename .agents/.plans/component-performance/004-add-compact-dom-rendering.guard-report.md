# Guard report — 004 add compact DOM rendering

**Recommendation: PASS** — opt-in compact rendering removes only unstyled equal wrappers, with compatibility, DOM-count, timing, and regression gates independently reproduced green
**Reviewed at** 773b6a9 · 2026-07-19 05:25 · **Plan planned at** 8e3082c
**Integrated** — PR https://github.com/humanspeak/svelte-diff/pull/172 opened via the `pr` skill for the reviewed snapshot commit

## Done criteria

| Criterion | Result | Evidence |
| --------- | ------ | -------- |
| The Step 1 compact DOM test failed before implementation and passes. | met | The pre-implementation component at `c70380e` had no `compact` prop/path and always selected `equalFallback`; the executor's red run observed 100 spans. Guard reproduced the final exact anchor at `src/lib/SvelteDiff.test.ts:317`: 1 passed, 27 skipped, with zero spans and 99 breaks asserted at lines 327–328. |
| `compact` is typed and documented with default `false`. | met | Public type/JSDoc at `src/lib/index.ts:164-182`, component default/JSDoc at `src/lib/SvelteDiff.svelte:53,80`, and README prop/performance guidance at `README.md:126,317-321`; `pnpm check` returned 0 errors and 0 warnings. |
| Qualifying equal text creates no wrapper elements in compact mode. | met | Gate derived at `src/lib/SvelteDiff.svelte:217` and raw text paths at lines 235 and 243; exact anchor asserts zero spans at `src/lib/SvelteDiff.test.ts:328`. |
| Default DOM and custom renderer/class behavior are unchanged. | met | Compatibility cases at `src/lib/SvelteDiff.test.ts:331-395`; independently reproduced targeted suite passed 40/40. |
| Newline break counts and text content are exact. | met | Multiline and edge coverage at `src/lib/SvelteDiff.test.ts:317-328,397-424`; exact anchor and full library suite passed 78/78. |
| Diagnostic 004 visibly reports five samples, ceiling, maximum, and DOM counts; all 2,000-line settled renders complete in `<= 300 ms`. | met | Ceiling/workload at `src/routes/tests/component-performance/004/+page.svelte:38`; E2E asserts five samples, zero spans, 1,999 breaks, PASS, and visible capability comparison at `tests/component-performance.test.ts:265-293`. Guard reproduced three consecutive isolated Chromium passes. |
| Trunk, all library tests, `pnpm check`, and `pnpm build` exit 0. | met | Scoped `trunk fmt`/`trunk check` passed; library tests 78/78; Svelte check 0 errors/0 warnings; build and publint completed with `All good!`; combined Chromium regression passed 4/4. |
| No out-of-scope file is modified. | met | `git diff --name-only c70380e..773b6a9` contains only the seven allowed implementation/docs/test paths plus the guard log; later batch README/report edits are reviewer-owned plan artifacts. |
| The 004 row in the batch README is updated to DONE. | met | `.agents/.plans/component-performance/README.md:16` is `DONE`. |

## Spirit

The diff directly delivers the plan's DOM-weight goal without disguising the existing public markup contract: compact mode is explicit, default rendering is untouched, and any equal renderer, snippet, or class keeps control of its markup. The permanent unit tripwire counts actual wrappers and breaks, while the dedicated browser page makes the DOM reduction and settled-render timing visible instead of treating a timing-only pass as proof. This is faithful to both the performance intent and the compatibility boundary.

## Scope & conduct

- In-scope only? Yes. Source, public docs, unit/type tests, the dedicated 004 route, and its shared E2E file are the only implementation paths touched; guard artifacts and the batch status row are reviewer-owned.
- STOP conditions respected? Yes. No default behavior, snippet signatures, computation behavior, or thresholds were changed; all three fixed-workload runs stayed within the ceiling.
- Plan amendments during execution: none.
- Revision rounds: one. Guard rejected a mismatched anchor-test name because the exact plan command ran zero tests; the executor changed only that name, after which guard reproduced a real 1/1 pass.

## Residual risk / follow-ups

- Compact rendering remains opt-in, so existing consumers receive no DOM reduction until they enable it.
- Initial diff computation is still client-first; plan 005 owns SSR rendering and should preserve both compact and default paths.
- The 300 ms browser ceiling is intentionally generous across CI hardware; exact zero-span/1,999-break assertions prevent a timing pass from masking restored DOM weight.
