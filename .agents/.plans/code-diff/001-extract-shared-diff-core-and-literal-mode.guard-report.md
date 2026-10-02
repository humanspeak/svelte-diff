# Guard report — 001 extract-shared-diff-core-and-literal-mode

**Recommendation: PASS** — literal fidelity and existing component behavior verified.
**Reviewed at** `a4f19bc` · 2026-10-02 14:05 · **Plan planned at** `068080b`

No PR mid-batch; B follows on the feature branch. Source snapshots passed normal hooks before judgment. Operator resumed after the earlier test-only NO-PASS.

## Done criteria

| Criterion | Result | Evidence |
| --- | --- | --- |
| Formerly red literal-source component test and all core unit tests pass. | met | Node24 library run: 186 passed, including both independently reproduced red-first regressions. |
| Root `computeDiff`/types exist; defaults differ only as explicitly specified. | met | Root export/type and helper option tests; helper false/component true, character/timeout/cleanup defaults preserved. |
| No duplicate algorithm/cleanup implementation remains in the component. | met | Full diff: shared core owns preprocessing/algorithm/cleanup/timing/tagging; component retains engine/parser/result caches. |
| Root check/package/Trunk and specified browser gates pass. | met | Root check 0/0, build/package/publint pass; Trunk format and normal hooks pass; full-tree check only unchanged baseline complexity issues; diff-modes 20/20. |
| Existing callback identities, SSR, compact nodes, and performance ceilings survive. | met | Retained units and no-JS/hydration assertions; unchanged performance suite 40/40 serially across five projects; capture browsers 35/35. |
| No package export/dependency changes or framework-agnostic claims were added. | met | Manifests/lock/workflows unchanged; docs explicitly require Svelte-aware tooling. |
| Scoped diff is clean and batch README status is updated. | met | Twelve scoped implementation paths; whitespace check passes; A DONE. |

## Spirit

Svelte applications can obtain synchronous literal diff tuples without mounting a component. Named regex source stays intact with expectedPatterns false, while template defaults, capture DOM metadata, callback isolation, compact nodes and per-component caches survive extraction. Docs distinguish helper and component defaults and render successfully.

## Scope & conduct

- Separate executors authored source. Guard wrote plans/records, committed snapshots and reproduced gates.
- Earlier repeated-failure STOP honored; operator resumed surgical test corrections. Later fixture correction preserved browser assertions.
- Pre-flight preserved merged improvements; B re-baselines after this PASS.
- Normal docs build and source checks before/after passed. Executor restored stats baseline blob; generated worker restored with no backup. Authored API/types/guide served successfully.
- No publishing/deploying, release workflow edits or PR creation.

## Residual risk / follow-ups

- Timing diagnostics need an idle machine or serial workers: ten-worker run alongside docs build exceeded ceilings, all unchanged serial cases passed.
- Full-tree Trunk retains complexity findings in unchanged diffModes.ts:19 and expectedPatterns.ts:126; no new failures.
- B must prove optional packaged consumer isolation. Release-age exception approved only for @tanstack/highlight@1.0.0.
