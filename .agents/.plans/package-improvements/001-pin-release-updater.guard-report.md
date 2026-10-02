# Guard report — 001 pin-release-updater

**Recommendation: PASS** — pinned download and credential-free updater execution independently verified, with release ordering preserved.
**Reviewed at** 687b7c4 · 2026-10-02 05:12 · **Plan planned at** 687b7c4 (original implementation baseline fa0cfc9; red replay 7df0857)
**Batch integration** — snapshot committed locally; PR deferred until operator request after batch closure, per dispatch instructions.

## Done criteria

| Criterion | Result | Evidence |
| --- | --- | --- |
| `node --test .github/scripts/refresh-release-readme.test.mjs` exits 0 with all above cases present. | met | Guard: volta run --node 24.15.0 node --test .github/scripts/refresh-release-readme.test.mjs: 7 passed, 0 failed. Baseline temporary replay independently produced the two intended failures. |
| Helper contains the full immutable revision and no moving-branch updater URL. | met | .github/scripts/refresh-release-readme.sh:13 contains the full immutable revision; workflow search shows only the helper invocation and no moving-branch download. |
| Integration assertion proves the helper runs after versioning and before token-bearing remote configuration. | met | Offline integration assertion passes; npm-publish.yml:561 invokes helper before the token-bearing git remote configuration. Checkout persists no credentials. |
| `pnpm run check`, library Vitest, `pnpm run package`, `trunk fmt`, `trunk check`, and `git diff --check` all exit 0. | met | Guard under Node 24.15.0: root check 0/0; units 123 passed; package/publint All good. Trunk fmt/check No issues, exit 0; git diff --check exit 0. |
| Only scoped implementation paths differ from the executor's starting snapshot; operator's plans remain intact. | met | git diff --name-only 7df0857..687b7c4 lists exactly the three implementation paths. git diff HEAD -- .github is empty after guard gates. |
| Report completion and verification to the operator who maintains the batch index; do not commit/push/PR. | met | Completion reported to operator; guard owns DONE row and artifacts. No push, PR, or release performed. |

## Spirit

The workflow runs immutable reviewed updater code before adding Git write authentication. The updater child receives a deliberately minimal environment while authenticated download remains outside that child. Offline tests observe both successful refresh and safe warning paths through the actual workflow-selected implementation, including partially failed downloads. This addresses the original reproducibility and credential-inheritance problems without changing release policy.

## Scope & conduct

- Three implementation paths only; guard's plan/index/log/report edits are separate conductor artifacts.
- Original baseline failures were reproduced independently with fake transport, not a missing helper or broken extraction seam.
- Runtime amendment: Darwin adds one Node-initialized environment key; production PATH-only input and all credential/sentinel checks remain intact.
- Guard verification ran the configured Node 24.15.0 through Volta; executor's local checks used Node 26.10.0.

## Residual risk / follow-ups

- Minimal environment is not an OS sandbox. The immutable external script remains part of the trusted release code and requires review when its pin changes.
- No live release, GitHub write, or registry mutation was exercised. Plans 005 and 008 must preserve updater ordering and offline integration tests.
