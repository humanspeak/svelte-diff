# Guard log — 001 extract-shared-diff-core-and-literal-mode

## Checkpoint 1 — 2026-10-02 13:19 — PLAN AMENDED

ae5fe2a · pre-flight baseline

- Fresh main `068080b` includes PR #216, all completed package improvements, and capture DOM metadata. Re-baselined A and preserved all predecessor contracts; no unrelated source drift or public helper exists.
- Execution authorized on `feat/highlighted-code-diff`. Guard owns status records, source snapshots, and reproduced verification.
- Action: amended plan committed before dispatch; step 1 sent to a separate Codex executor.

## Checkpoint 2 — 2026-10-02 13:19 — ON TRACK

04c97bb · step 1 red-first snapshot

- Only `src/lib/SvelteDiff.test.ts` changed. Temporary prop intersection compiles and the ordinary commit hook passed after the executor corrected enum comparisons.
- Guard ran configured Node 24.15 `pnpm exec vitest run src/lib/SvelteDiff.test.ts -t 'literal source' --reporter=dot`: exactly two intended runtime failures, 62 skipped. Identical source became five tuples instead of one equal tuple; source reconstruction returned `const pattern = /<year>/;` instead of the original regex source.
- Tests retain exact tuple/source/DOM/capture assertions; no gates or earlier tests were weakened.
- Action: proceed with scoped implementation steps 2–5 through the executor.
