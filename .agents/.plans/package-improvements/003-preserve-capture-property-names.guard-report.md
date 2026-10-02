# Guard report — 003 preserve-capture-property-names

**Recommendation: PASS** — every accepted capture name survives in an ordinary enumerable record and reaches component output intact.
**Reviewed at** 40c286c · 2026-10-02 05:35 · **Plan planned at** b3448d3
**Batch integration** — local snapshot; PR deferred per dispatch instructions.

## Done criteria

| Criterion | Result | Evidence |
| --- | --- | --- |
| The named own-property test exists, has demonstrated baseline failure, and passes. | met | Guard historical replay at 52e1660 fails the named test with Value: [object Object], missing own key, and missing JSON value; current 131-unit suite passes it. |
| Every compatibility capture is an own enumerable string data property; ordinary object prototype remains intact. | met | expectedPatterns.ts:437 uses defineProperty with enumerable/writable/configurable true on {}; helper tests verify descriptors, ordinary prototype, entries, JSON, and mixed names. |
| `pnpm run check` exits 0 with 0 errors/0 warnings. | met | Guard Node-24 pnpm run check: 0 errors, 0 warnings, exit 0. |
| `pnpm exec vitest run src/lib/` exits 0. | met | Guard Node-24 pnpm exec vitest run src/lib/: 4 files, 131 tests passed, exit 0. |
| `pnpm exec playwright test --config=playwright.config.ts tests/expected-patterns.test.ts` exits 0. | met | Guard Node-24 exact expected-patterns Playwright command: 25 passed across all five projects, exit 0. |
| `trunk fmt`, `trunk check`, and `pnpm run package` exit 0. | met | Guard trunk fmt/check exit 0 (one existing issue, no new issues); Node-24 pnpm run package/publint All good, exit 0. |
| Source diff remains within scope; results are sent to the operator for status update. | met | git diff --name-only 52e1660..40c286c contains exactly three scoped files; no source changes after guard gates; conductor records completion. |

## Spirit

Own data-property creation avoids the inherited __proto__ setter without changing the record's prototype or accepted name grammar. Independent baseline replay demonstrates actual value loss; helper and component assertions cover restored string values, descriptors, serialization, markup, and callback tuples. This is capture correctness, with no prototype-pollution claim.

## Scope & conduct

- Only expectedPatterns.ts, its tests, and SvelteDiff.test.ts changed; 002 callback isolation and tests remain intact.
- No STOP condition remains. Plan amendment before dispatch only re-baselined shared tests and line anchors to completed 002.
- Guard reproduced Node-24 unit/browser/package/format/lint gates. One pre-existing Trunk issue is unchanged; no new issue.

## Residual risk / follow-ups

- Duplicate-name policy and repeated-occurrence matching remain owned by 004 and 007. This plan preserves their existing behavior.
