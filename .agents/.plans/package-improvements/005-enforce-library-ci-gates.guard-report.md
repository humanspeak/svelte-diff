# Guard report — 005 enforce-library-ci-gates

**Recommendation: PASS** — dependency-only PRs now trigger library CI; root type errors block verification and publication.
**Reviewed at** 42ff699 · 2026-10-02 05:58 · **Plan planned at** 7068933
**Batch integration** — local snapshot; PR deferred per dispatch instructions.

## Done criteria

| Criterion | Result | Evidence |
| --- | --- | --- |
| Step 1 path assertion exits 0; pnpm dependency files, test setup, and ESLint config are watched. | met | Independent Python assertion verifies all four paths and absence of obsolete npm lock input. |
| Both workflows contain one unconditional blocking pnpm run check step before library build/tests. | met | Exact one step per file; guard verifies install/check/build-test ordering and full diff contains no skip/suppression. |
| pnpm run check, pnpm exec vitest run src/lib/, node --test .github/scripts/refresh-release-readme.test.mjs, pnpm run build, trunk fmt, trunk check, and git diff --check exit 0. | met | Independent Node-24 check 0/0; 145 units; seven offline updater tests; build/package/publint All good; format/lint/hygiene exit 0. One existing Trunk issue/no new findings. |
| No source/config/policy changes outside the two workflow files are introduced by this plan. | met | Only two scoped files in f180119..42ff699; reversal of intended additions yields exact previous bytes, preserving all other policy. |
| Report outcomes to the operator who maintains the index; do not commit/push/PR. | met | Executor left source uncommitted; conductor captured review snapshot and maintains status. No push, PR or workflow dispatch. |

## Spirit

The existing root check is now a real blocking CI step, and actual dependency/test inputs trigger the PR workflow. Exact byte-preservation comparison protects prior release isolation and policy rather than relying on a narrow search.

## Scope & conduct

- Declaration-only red exemption followed; no new tools, mirrored YAML tests or library fixes.
- Source unchanged after independent verification; all criteria met and no STOP remains.

## Residual risk / follow-ups

Hosted GitHub Actions was not dispatched. Later release choreography in 008 must retain both typecheck gates and the reviewed updater isolation.
