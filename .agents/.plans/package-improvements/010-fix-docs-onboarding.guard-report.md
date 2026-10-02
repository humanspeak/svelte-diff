# Guard report — 010 fix-docs-onboarding

**Recommendation: NO-PASS — STOP**. Authored onboarding is verified, but the required docs build regenerated a tracked statistics file, triggering the plan's explicit scope STOP.
**Reviewed source** a0d024d · 2026-10-02 · **Plan planned at** fa0cfc9.
**Integration**: docs README snapshot committed via ordinary hook; regenerated stats preserved uncommitted. No push, PR or deployment.

## Done criteria

| Criterion | Result | Guard evidence |
| --- | --- | --- |
| Setup order, port, pinned versions and both development alternatives are correct. | met | Post-format and post-build assertions; actual package/dev scripts and Vite 8523 config match. |
| Existing watcher/docs-only alternatives documented without tooling changes. | met | Full one-file README diff; install -> package -> dev:all; docs-only after package. |
| Safe wrapper preserves worker and propagates exit status before/after build. | met | Exact Python body matches CI byte-for-byte; both actual checks 0/0; post-build worker restored byte-for-byte and no backup remains. |
| Root package/check/tests, docs build, Trunk and whitespace gates pass. | met | Guard publint All good, root check 0/0, 171 units/four files, normal docs build/favicons success, Trunk fmt/check exit 0 (one existing/no new issue), whitespace clean. |
| Only docs README authored changes; incidental generated drift reported. | met as reporting; clean final scope pending | Source commit contains only docs/README.md. Build changed tracked docs/src/lib/github-stats.json; it is not accepted, discarded or committed. |
| Named STOP conditions not triggered. | not met | Build regeneration modifies tracked output, exactly the plan's explicit STOP. |

## Spirit and scope

Contributors now see why packaging is required, how to choose watchers, the real port, and the existing safe source-check procedure. All authored changes serve that purpose; generated-artifact list and deployment section remain byte-identical. The executor respected docs README scope and delegated actual docs execution to guard. Documentation red-first exemption applies.

The build side effect is not an implementation failure: docs-kit intentionally refreshes tracked GitHub star data. The plan nevertheless explicitly says to STOP and report it, so no PASS or batch closure is claimed.

## Exact remaining decision

`docs/src/lib/github-stats.json` changed stars from 7 to 10 and updatedAt from 2026-07-17T20:23:35.783Z to 2026-10-02T12:29:46.778Z. Old blob: `6269e3dd70f8f541f9ff318c0292abfa6065dddb`; generated blob: `0ad229ffbf7f951fc5be391614f931516a2933fa`.

An operator decision may authorize restoring those exact pre-build bytes, retaining final README-only scope, or explicitly including the generated data. Guard must not silently decide past this named STOP. Any restoration is performed through the executor, with hash proof and reviewed final hygiene; guard never authors source. No tooling fix or live deployment is necessary. Plans 001–009 are DONE; 010 remains BLOCKED; code-diff A/B remain TODO.
