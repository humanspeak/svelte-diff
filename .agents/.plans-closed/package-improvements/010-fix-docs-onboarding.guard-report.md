# Guard report — 010 fix-docs-onboarding

**Recommendation: PASS** — verified onboarding and docs-check instructions; generated statistics restored exactly with operator authorization.
**Reviewed source** a0d024d · 2026-10-02 · **Plan planned at** fa0cfc9.
**Integration**: docs README snapshot committed through ordinary hook. Prior STOP history is retained in the guard log. No push, PR or deployment.

## Done criteria

| Criterion                                                                         | Result | Guard evidence                                                                                                                                                       |
| --------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup order, actual port, pinned versions and both dev alternatives are correct.  | met    | Post-format/build assertions; actual package/dev scripts and Vite 8523 config match.                                                                                 |
| Existing watcher/docs-only alternatives documented without tooling changes.       | met    | Full README-only source diff; install -> package -> dev:all; docs-only after packaging.                                                                              |
| Safe wrapper preserves worker and propagates status before/after build.           | met    | Python body exactly matches CI; actual before/after-build checks 0/0; worker restored byte-for-byte and no backup. Final check after stats restoration also 0/0.     |
| Root package/check/tests, docs build, Trunk and whitespace gates pass.            | met    | Guard publint All good, root check 0/0, 171 units/four files, normal docs build/favicons pass; Trunk fmt/check exit 0 (one existing/no new issue), whitespace clean. |
| Only docs README authored changes; tracked generated drift reported and resolved. | met    | Stats regeneration was reported at STOP. Operator authorized restoration; executor restored exact original blob, guard verifies empty stats diff and clean tree.     |
| Completed result delivered to index-owning conductor.                             | met    | All ten plans DONE; conductor closes and archives batch.                                                                                                             |

## Spirit and scope

Contributors see why packaging is required, how to choose watchers, the real port and the existing safe source-check procedure. Generated-artifact list and deployment section remain byte-identical. Executor respected README-only scope; actual docs execution and independent proof were guard-owned. Documentation red-first exemption applies.

## STOP resolution and limitations

The normal docs build refreshed the tracked GitHub statistics, triggering the explicit STOP. With operator approval, the correction executor restored pre-build bytes from blob 6269e3dd70f8f541f9ff318c0292abfa6065dddb. Guard verified the exact hash and clean tree; no generated drift remains. Earlier NO-PASS is preserved in the append-only log; this report supersedes it.

No tooling, source/API, dependency, generated data, deploy or IndexNow changes ship with this plan. Fresh dependency installation and long-lived dev startup were unnecessary; script/port claims were checked against actual configuration. No remaining STOP. The docs build will normally refresh stats again; future verification should preserve/report generated side effects deliberately.
