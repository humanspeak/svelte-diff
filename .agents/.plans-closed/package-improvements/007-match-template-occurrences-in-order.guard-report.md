# Guard report — 007 match-template-occurrences-in-order

**Recommendation: PASS** — repeated contexts consume distinct target occurrences while cached regex search state is reset after every use.
**Reviewed at** 1c8e197 · 2026-10-02 06:34 · **Plan planned at** 88b1b41
**Batch integration** — local snapshot; PR deferred per dispatch instructions.

## Done criteria

| Criterion                                                                                                       | Result | Evidence                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| The repeated-context red test demonstrated baseline failure and now passes with exact ranges 6–11 and 18–22.    | met    | Guard historical f50eb23 replay fails on second Alpha; current full suite checks Beta, resolved text and exact ranges.                  |
| Missing/reversed occurrences fail extraction; component retains cleaned fallback for valid unmatched templates. | met    | Focused helper cases plus component raw-tuple fallback tests pass.                                                                      |
| Cached compiled regex references stay identical and lastIndex resets after success/failure.                     | met    | Reusable metadata tests retain references and require lastIndex 0 through success, failure and recovery; throw spy also verifies reset. |
| Empty captures, whole-input anchor/lookbehind behavior, Unicode/CRLF absolute offsets pass.                     | met    | Independent 171-unit suite includes exact zero-width shared boundary, whole-target ^/lookbehind and UTF-16 slice assertions.            |
| 004 duplicate/error policy and 006 parser regression tests remain green.                                        | met    | All prior helper tests and unchanged 006 test/fixture pass in units and full browser diagnostics.                                       |
| pnpm run check exits 0 with 0 errors/0 warnings.                                                                | met    | Guard Node 24 check exit 0, zero errors/warnings.                                                                                       |
| pnpm exec vitest run src/lib/ exits 0.                                                                          | met    | Guard Node 24 exact command: 171 tests/four files, exit 0.                                                                              |
| Both listed root Playwright suite commands exit 0.                                                              | met    | Guard exact expected-patterns suite 35 passes and component-performance suite 40 passes, all five projects.                             |
| trunk fmt, trunk check, pnpm run package exit 0.                                                                | met    | Independent commands exit 0; publint All good; Trunk one existing issue/no new findings.                                                |
| Scoped tracked-file diff only; completion and gate results delivered to operator for index update.              | met    | Exactly four source paths from f50eb23..1c8e197; source matches immutable snapshot; conductor maintains status.                         |

## Spirit

The search cursor consumes each complete matched occurrence, so a later template line cannot reuse an earlier target. Whole-target exec preserves native anchor/lookbehind semantics and absolute UTF-16 offsets. A finally boundary resets cached regex state before validation or propagation; one finite exec per line keeps zero-width matches safe.

## Scope & conduct

- Regex flags/extraction and related JSDoc only in production; three scoped behavioral test files. All parser, capture-storage, callback, renderer, tagging, public type and completed diagnostic contracts retained.
- Independent red replay and every final gate pass. No STOP remains; executor left commits/status with guard.

## Residual risk / follow-ups

Trusted regex execution remains outside diff timeout. Any future reentrancy/concurrency over reused metadata must preserve per-use search-state ownership.
