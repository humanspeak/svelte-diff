# Guard log — 006 linearize-rejected-pattern-parsing

## Checkpoint 1 — 2026-10-02 05:58 — PLAN AMENDED

42ff699 · pre-flight

- Source drift since main is reviewed 003 storage and 004 parse/clean validation plus added tests. Scanner function remains byte-identical and cited compatibility behavior remains present.
- Re-baseline Planned at/drift SHA and shifted test anchors; mandate completed rejection/storage policy. Fixed budget/scales/primitive workload/ceiling and all old diagnostics unchanged.
- Executor browser restriction requires two phases: Step 1 tests/fixture only, guard owns historical browser red before any production scanner changes, then Steps 2–3.
- Action: commit amendment before dispatch. Prerequisite 004 is DONE; 006 runnable after current batch 005 PASS.

## Checkpoint 2 — 2026-10-02 06:06 — PLAN AMENDED / Step 1 evidence

9bdf527 · tests/fixture snapshot; production unchanged

- Guard full diff: append-only helper regressions, isolated new route and appended browser test; old tests/ceilings exact prefix. Production blob remains 2b2505a.
- Guard deterministic red: six actual budget excesses, values 55136/55456, 220864/221504, 884096/885376 against 20608/41088/82048; null/fallback assertions pass. Primitive compatibility: all 13 pass.
- Browser command fails before running with No tests found. This is selector/plan defect, not timing evidence. Playwright grep applies to full title; replace anchored ^006 with unique unanchored diagnostic title everywhere, leaving all numerical constraints unchanged.
- Action: commit amendment, retry Chromium one-worker on unchanged production. No production-edit dispatch until genuine primitive browser red.

## Checkpoint 3 — 2026-10-02 06:07 — ON TRACK / browser RED confirmed

9bdf527 · unchanged production/test fixture snapshot; amended selector at 48683d7

- Guard exact corrected Chromium one-worker command executes the intended test and fails at assertDiagnosticPass on status, with actual samples 4737.80 / 4782.00 / 5642.60 ms vs unchanged 2000 ms ceiling.
- All three primitive 80000-character calls return null; failure is timing, not fixture/transport/output. Full command log retained at /tmp/svelte-diff-006-guard-browser-red.log and raw samples recorded here permanently.
- Production byte identity with 202504c verified; both old test files remain exact byte prefixes, so red predates any implementation.
- Deterministic red and 13 primitive compatibility passes independently reproduced. No genuine STOP remains.
- Action: dispatch Steps 2–3 to executor; guard later owns all five-browser green/full diagnostics gates.

## Checkpoint 4 — 2026-10-02 06:19 — ON TRACK / final PASS

88b1b41 · production snapshot; test snapshot 9bdf527

- Guard reads complete scanner delta and prior phase test/fixture diff. Reverse outside/inside entry-state metadata performs constant work per source character; forward name spans are disjoint; only accepted non-overlapping groups allocate substrings. No recursive/suffix/ancestor traversal remains.
- Independent guard differential compares old/new private scanner outputs on 12012 synthetic primitive inputs with deterministic seed0x604006: zero mismatches. All13 named primitive compatibility cases and fixed three-scale traversal budget test pass in 159-unit full suite.
- Guard Node24 check0/0; package/publint All good; trunk fmt/check exit0, one existing issue/no new findings; diff hygiene/source snapshot equality pass.
- Corrected exact browser gates: Chromium isolated1 pass; all five projects isolated one-worker5 passes; full diagnostics two-workers40 passes. Each initial and rerun validates three primitive80000-character null results, finite samples <=2000ms, valid max/metadata/running state. Existing001–005 tests/ceilings unchanged.
- Guard verified tests/fixture exactly match red snapshot and all module code after scanner is byte-identical to prior source. Four implementation paths total, clean final tracked tree.
- Action: 006 DONE; re-baseline 007 to reviewed source and preserve linear discovery/global rejection/storage/callback predecessors.
