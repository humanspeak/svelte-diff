# Guard report — 004 handle-invalid-pattern-compilation

**Recommendation: PASS** — rejected templates compare literally without rendering failures; valid unmatched templates retain cleaned placeholders.
**Reviewed at** 7068933 · 2026-10-02 05:50 · **Plan planned at** 40c286c
**Batch integration** — local snapshot; PR deferred per dispatch instructions.

## Done criteria

| Criterion                                                                                                                                                                    | Result | Evidence                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All named invalid-template tests demonstrated baseline failures and now pass.                                                                                                | met    | Historical isolated 15f6b9f replay: 12 failures, including bad bodies, same/cross-line and equal duplicates, mixed rejection, literal cleaning; current suite green.       |
| Duplicate names anywhere produce null parse and unchanged cleanTemplate input.                                                                                               | met    | Global Set before compilation; helper matrix includes same-line, cross-line and equal-value duplicates.                                                                    |
| Invalid regex SyntaxError is rejected; sentinel TypeError is rethrown.                                                                                                       | met    | Compilation-only catch with instanceof SyntaxError; constructable Proxy test asserts exact sentinel identity and restores global in finally.                               |
| Component callbacks reconstruct literal invalid sources; valid unmatched/matched behaviors remain distinct and documented.                                                   | met    | Rerender test reconstructs both tuple sides through invalid/duplicate/unmatched/matched transitions; 30 browser cases include no page errors and restored capture styling. |
| pnpm run check exits 0 with 0 errors/0 warnings.                                                                                                                             | met    | Independent Node-24 check exit 0, 0/0.                                                                                                                                     |
| pnpm exec vitest run src/lib/ exits 0.                                                                                                                                       | met    | Independent Node-24 run: 145 tests, four files, exit 0.                                                                                                                    |
| Both exact Playwright commands in the command table exit 0.                                                                                                                  | met    | Expected-patterns: 30 passes; component-performance: 35 passes; all five configured projects.                                                                              |
| trunk fmt, trunk check, pnpm run package, both docs-check wrapper runs, and pnpm --filter docs run build exit 0; worker restoration succeeds.                                | met    | Independent commands exit 0; publint All good; Trunk one existing issue/no new findings; docs checks 0/0, worker restored/no backup.                                       |
| Authored README/guide document globally unique names and distinguish rejected literal source from valid unmatched cleaned source; generated mirrors were not edited by hand. | met    | Full authored diff read; generated static/docs/guides/expected-patterns.md and llms-full contain both fallback examples and uniqueness policy from normal build.           |
| git diff --name-only stays within scope; operator receives results for index update.                                                                                         | met    | 15f6b9f..7068933 contains exactly eight scoped paths; clean source tree after executor restores generated statistics; conductor marks DONE.                                |

## Spirit

The boundary is narrow and explicit: recognized groups with invalid bodies or globally duplicated names reject the whole template, while unexpected failures propagate. Standalone cleaning shares parsing validation. Component runtime/caching was not redesigned, and independent browser performance checks preserve prior guarantees.

## Scope & conduct

- Exactly eight scoped implementation/test/documentation paths in the reviewed source commit. Component and index changes are comments only; scanner, extraction, own-property storage and callback untrack remain intact.
- Normal docs build refreshed tracked statistics; a separate correction executor restored their exact committed bytes. No manual generated guide edits or statistics update was accepted.
- Guard independently reproduced red/green and all required gates; source equals snapshot after verification. No STOP condition remains.

## Residual risk / follow-ups

- Trusted regex execution remains outside algorithm timeout. Scanner scaling and ordered occurrence matching remain plans 006/007.
- Docs builds refresh a tracked statistics artifact; future docs verification must preserve its original bytes and inspect all generated tracked drift.
