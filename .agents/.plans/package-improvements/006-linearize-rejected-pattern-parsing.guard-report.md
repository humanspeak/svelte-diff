# Guard report — 006 linearize-rejected-pattern-parsing

**Recommendation: PASS** — rejected-pattern discovery is bounded to linear source traversal with legacy candidate-local behavior preserved.
**Reviewed at** 88b1b41 · 2026-10-02 06:19 · **Plan planned at** 9bdf527
**Baseline tests/fixture** 9bdf527; original source through f719580.
**Batch integration** — local snapshots; PR deferred per dispatch instructions.

## Done criteria

| Criterion | Result | Evidence |
| --- | --- | --- |
| The named Step1 regression exists, its red failure was recorded, and it passes all three fixed scales under the fixed loose linear budget. | met | Guard baseline six parse/clean budget failures at64/128/256 markers; independent final159-unit run passes unchanged64*N+128 test. |
| Primitive compatibility cases pass through both public helpers; closed and unclosed rejected outers retain valid inner groups exactly as before. | met | Guard13 primitive cases pass before production and in full green suite; additional private-scanner differential12012 inputs has zero mismatch. |
| The006 fixture contains three primitive80k-character samples, each at most2000ms, and validates null output; five-browser isolated test and rerun assertions pass. | met | Guard Chromium1 pass, five-project one-worker5 passes; exact fixture assertions verify all initial/rerun samples, null validity, input length, running state and fixed ceiling. Baseline samples4737.80/4782.00/5642.60ms recorded. |
| Existing001–005 diagnostic tests and numerical ceilings are unchanged and pass. | met | Existing test file is exact byte prefix; all40 full diagnostic cases pass with two workers across five projects. |
| pnpm check, pnpm test:only, pnpm run package, trunk check, and git diff --check all exit0. | met | Independent Node24 check0/0;159 units/four files; publintAll good; format/check/hygiene exit0, no new Trunk findings. |
| git status --short contains only scoped executor changes; no public types/exports/instrumentation props, dependency changes, or DONE plan edits. | met | Four implementation paths since202504c; production delta scanner/comment only; tests/fixture unchanged after red, module suffix byte-identical; clean final tree. |
| Reviewer receives red/green evidence, browser samples, and brief account of candidate-local boundary semantics; status row updated if delegated. | met | Guard log records raw browser red samples and all green sample assertions; structural proof and differential evidence above; conductor maintains index. |

## Spirit

Precomputed reverse boundary metadata has outside/inside class entry states, so every candidate starts with the same local semantics as before. Constant-time balanced-child composition avoids ancestor rescans. Forward marker discovery still finds valid inner groups from rejected outers, and accepted groups consume their inner-looking text. Substrings are delayed until acceptance; name scans cover disjoint runs.

## Scope & conduct

- Source change confined to private scanner and complexity comment. Compilation/extraction/storage/tagging/callback contracts unchanged.
- Original browser selector matched no tests; guard amended its unique title selector before collecting timing evidence. Fixed budgets, workload, samples, ceilings and STOP policy unchanged.
- Root independently reproduces deterministic red, primitive browser red, all compatibility/green gates and extra differential verification. No genuine STOP remains.

## Residual risk / follow-ups

Boundary metadata uses O(n) memory. Compilation and trusted regex execution are outside the discovery guarantee. Ordered target occurrence matching remains plan007.
