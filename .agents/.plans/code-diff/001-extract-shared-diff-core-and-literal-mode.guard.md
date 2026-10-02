# Guard log — 001 extract-shared-diff-core-and-literal-mode

## Checkpoint 1 — 2026-10-02 13:19 — PLAN AMENDED

ae5fe2a · pre-flight baseline

- Fresh main `068080b` includes PR #216, all completed package improvements, and capture DOM metadata. Re-baselined A and preserved all predecessor contracts; no unrelated source drift or public helper exists.
- Execution authorized on `feat/highlighted-code-diff`. Guard owns status records, source snapshots, and reproduced verification.
- Action: amended plan committed before dispatch; step 1 sent to a separate Codex executor.

## Checkpoint 2 — 2026-10-02 13:19 — ON TRACK

04c97bb · step 1 red-first snapshot

- Only `src/lib/SvelteDiff.test.ts` changed. Temporary prop intersection compiles and the ordinary commit hook passed after the executor corrected enum comparisons.
- Guard ran configured Node 24.15 `pnpm exec vitest run src/lib/SvelteDiff.test.ts -t 'literal source' --reporter=dot`: exactly two intended runtime failures, 62 skipped. Identical source became five tuples instead of one equal tuple; source reconstruction returned `const pattern = /<year>/;` instead of the original regex source.
- Tests retain exact tuple/source/DOM/capture assertions; no gates or earlier tests were weakened.
- Action: proceed with scoped implementation steps 2–5 through the executor.

## Checkpoint 3 — 2026-10-02 13:27 — BLOCKED

e73c2cb · executor steps 2–5 stopped; staged tree `3d1b5c0a8cc1693e788ddd89d974d10718ec3fda`

- Executor reached repeated-verification-failure STOP. Guard reproduced Node24 library units: 185 passed / 1 failed; final rerender in the parser-cache test retains false because Testing Library updates supplied props only (`src/lib/SvelteDiff.test.ts:1126–1128`). Explicitly enable the pattern prop on that rerender.
- Root check reproduced four unknown spy-instance type errors at `src/lib/computeDiff.test.ts:91–104`. Narrow test instances to DiffMatchPatch before inspecting configuration.
- Trunk found two enum-comparison errors at `src/lib/SvelteDiff.test.ts:1099` and `src/lib/computeDiff.test.ts:14`. Use shared enum values/types, preserving reconstruction assertions.
- Snapshot commit was rejected by the normal lint hook; no bypass. Exact staged tree recorded as immutable evidence, with reviewed parent e73c2cb. Implementation and guard artifacts remain uncommitted.
- Twelve implementation files are within A scope; no manifest/dependency/workflow edits. Both original literal-source regressions pass. Complete browser/package/docs/performance gates remain unrun because checks are red.
- Separate B install preflight reproduced ERR_PNPM_NO_MATURE_MATCHING_VERSION for @tanstack/highlight@1.0.0 under minimumReleaseAge 2880; eligible 2026-10-02 22:49:52 UTC. Narrow exception question is pending; no policy changed or dependency installed.
- Action: NO-PASS report written; await operator resumption for executor-only test corrections and remaining gates.

## Checkpoint 4 — 2026-10-02 13:51 — ON TRACK

e73c2cb · operator resumed execution

- Operator explicitly authorized continuing A corrections and B after the exact-version exception approval.
- Action: surgical corrections dispatched to a separate executor; no source edits by guard. Previous NO-PASS remains until all gates are reproduced.

## Checkpoint 5 — 2026-10-02 14:05 — ON TRACK

a4f19bc · final close-out after operator resumption

- Normal snapshot hooks passed for b0bccc8 and a4f19bc. Independently reproduced 186 library units, root check 0/0, build/package/publint; docs checks before/after normal build 0/0; authored API pages rendered computeDiff and expectedPatterns.
- New fixture correction through executor: Svelte interpolated {4}, producing an unintended regex. Expression binding preserves the quantifier. Corrected diff-mode suite: 20/20 across five projects, no hydration/runtime errors. Native preview exposes year/2026 metadata after toggle.
- Initial server connection failures were environment-only; fresh owned preview resolved them. Ten-worker browser/docs load exceeded timing limits; unchanged serial performance suite passed all 40 cases. All 35 capture browser cases passed in the broader run. No ceilings/workloads/assertions changed.
- Trunk format check and normal snapshot hook checks pass. Full-tree check reports two pre-existing complexity findings in unchanged diffModes.ts:19 and expectedPatterns.ts:126. No new failures; whitespace check passes.
- Twelve implementation paths are in scope; manifests, lock, workflows, release helpers unchanged. Executor restored incidental generated stats to blob 6269e3dd70f8f541f9ff318c0292abfa6065dddb. Generated worker restored without backup.
- Action: PASS replaces prior NO-PASS, A DONE; re-baseline B to reviewed a4f19bc and continue with approved exact-version exception.
