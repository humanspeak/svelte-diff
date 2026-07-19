# Guard log — 004 add compact DOM rendering

## Checkpoint 1 — 2026-07-19 05:20 — DRIFTING

08badc1 · independent review of the executor's completed implementation and all plan gates

- The implementation is in scope and independently passes the full targeted suite (40/40), library suite (78/78), `pnpm check`, `pnpm build`, scoped Trunk checks, three repeated 004 browser runs, and the combined 001–004 browser run.
- The Step 1/Step 3 anchor command does not exercise its intended tripwire: `pnpm vitest run src/lib/SvelteDiff.test.ts --coverage.enabled=false --reporter=default -t "renders multiline equal text without wrapper elements in compact mode"` exits 0 with 28 tests skipped and zero tests run because the test is named `renders unstyled equal multiline text without span wrappers` in `src/lib/SvelteDiff.test.ts`.
- Action: reported to the operator; return to the executor for the exact planned test-name correction and re-run before close-out.

## Checkpoint 2 — 2026-07-19 05:24 — ON TRACK

773b6a9 · final close-out after executor correction and independent reproduction

- The exact Step 1/Step 3 anchor command now runs one test and passes (1 passed, 27 skipped); the only executor revision was the planned test-name alignment.
- The reviewed snapshot independently passes 40 targeted tests, 78 library tests, `pnpm check` with zero diagnostics, `pnpm build` including publint, and scoped Trunk format/lint.
- Diagnostic 004 passes three consecutive Chromium runs at the fixed 2,000-line workload, and the combined 001–004 Chromium regression run passes 4/4.
- Diff review against `c70380e` confirms the opt-in compact path removes only unstyled built-in equal wrappers, retains renderer/class precedence and default DOM, documents the public prop, and touches only plan-authorized source/test/docs paths plus guard artifacts.
- Action: approved for PR; batch README row updated to DONE and final close-out report to record the integration.

## Checkpoint 3 — 2026-07-19 05:29 — PLAN AMENDED

ded1d12 · maintainer-requested post-approval ceiling hardening

- Repeated 004 samples peaked near 10 ms, leaving the original 300 ms ceiling too loose to act as a useful regression guard.
- The operator explicitly requested a lower ceiling; the plan now requires 25 ms with the same fixed 2,000-line workload and exact DOM assertions, and its planning/drift baseline is re-stamped at `ded1d12`.
- Action: plan amended in place; executor instructed to change only diagnostic 004's ceiling and run the isolated Chromium test three times before guard re-approval.

## Checkpoint 4 — 2026-07-19 05:38 — ON TRACK

ded1d12 + working tree · final close-out of the tightened ceiling

- Executor contribution is exactly `CEILING_MS = 300` to `25` in the dedicated 004 route; workload, measurement boundaries, DOM assertions, and public component code are unchanged.
- Executor runs passed three times with a 13.60 ms maximum; guard independently reproduced three isolated 004 Chromium passes and the combined 001–004 pass at the 25 ms ceiling.
- Scoped Trunk check and `git diff --check` pass; the live page exposes `data-ceiling-ms="25"` while retaining zero-span and 1,999-break assertions.
- Local CodeRabbit CLI completed its uncommitted review with no findings. A second source-directory-only attempt was terminated after stalling in analysis without output; it produced no contradictory finding.
- Action: approved for an updated snapshot and PR #172 push; overwrite the close-out report with the tightened evidence.
