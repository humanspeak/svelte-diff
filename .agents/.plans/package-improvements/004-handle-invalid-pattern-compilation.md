# Plan 004: Treat invalid expected templates as literal source text

> **Executor instructions**: Read fully, execute steps in order, and confirm each command's expected result. On a STOP condition report instead of improvising. The operator owns the sibling README; report completion and results for their update.
>
> **Drift check (run first)**: `git diff --stat fa0cfc9..HEAD -- src/lib/expectedPatterns.ts src/lib/expectedPatterns.test.ts src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/lib/index.ts tests/expected-patterns.test.ts README.md docs/src/routes/docs/guides/expected-patterns/+page.svx`. Compare live code with excerpts. Prerequisite 003 changes capture assignment, and independent plan 002 may untrack observer bodies; these are expected declared changes. Stop for unrelated mismatch. Check `git status --short` for pre-existing local changes.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `003-preserve-capture-property-names.md`; precedes `006-linearize-rejected-pattern-parsing.md` and `007-match-template-occurrences-in-order.md` to serialize shared engine/test changes and establish their rejection contract
- **Category**: bug
- **Planned at**: commit `fa0cfc9`, 2026-10-02

## Why this matters

A balanced named-group marker can contain an invalid regex body, and two independent source-code regexes can reuse a group name. Current automatic compilation throws during component rendering, including SSR and edits, instead of allowing a normal string comparison. Define rejected templates as literal text and make standalone cleaning consistent with that decision. Duplicate names anywhere in a template are rejected as a whole: a public `Record<string, string>` cannot represent differing values for multiple occurrences of one name, and silently overwriting them corrupts resolution.

## Current state

- `src/lib/expectedPatterns.ts:243–276` builds a per-line regex and directly returns `new RegExp(pattern, 'd')`.
- `src/lib/expectedPatterns.ts:336–362` compiles during parsing with no error boundary:

```ts
const matches = findNamedGroups(text)
if (matches.length === 0) return null
// build groups, parts, matches and cleanedText...
return {
    groups,
    parts,
    matches,
    cleanedText,
    linePatterns: compileLinePatterns(text, matches)
}
```

- `src/lib/expectedPatterns.ts:379–391` currently cleans balanced group markers even when compilation would fail:

```ts
const matches = findNamedGroups(text)
if (matches.length === 0) return text
// each group is replaced by <name>, without compiling or name uniqueness validation
```

- `src/lib/SvelteDiff.svelte:125` derives `parseExpectedPatterns(originalText)`. Lines 143–151 resolve a successfully parsed template or use its cleaned placeholder text when extraction does not match. If parsing returns null, it already compares the original literally; do not conflate invalid-template fallback with a valid template that has no target match.
- `src/lib/expectedPatterns.test.ts:65–77` tests incomplete syntax/invalid names but not invalid balanced regex bodies. `src/lib/SvelteDiff.test.ts:263–272` explicitly requires cleaned placeholders for valid patterns that fail extraction; preserve that behavior.
- `tests/expected-patterns.test.ts:22–41` fills existing `text1`/`text2` controls; route `src/routes/tests/expected-patterns/+page.svelte:46–76` exposes these controls and `diff-result`, `.diff-expected`, `.diff-remove`, `.diff-insert`. No new fixture route is needed.
- `README.md:307–327` currently states ordinary diff behavior for no groups, and the Programmatic API row says parsing returns null only when no groups exist; cleaner is described as replacing named syntax unconditionally. These authored descriptions must reflect the new rejection policy.
- `docs/src/routes/docs/guides/expected-patterns/+page.svx:78–88` currently says:

```text
If the capture groups do not match, SvelteDiff cleans the template before computing the normal diff.
The pattern body is still compiled as JavaScript regular expression syntax.
```

  Its line 102 says mismatches use cleaned placeholders. Clarify that only a valid parsed template with a missing target match is cleaned; rejected invalid/duplicate templates are literal. The guide's examples/frontmatter are authored MDsveX; preserve that format and existing trusted-pattern guidance.
- `docs/vite.config.ts:29–40` runs docMirrorsPlugin and llmsFullPlugin during a normal build, and `docs/package.json:7–11` exposes build/check scripts. Generated docs mirrors are build outputs, not authored files to patch by hand.
- Match the exported typed arrow/JSDoc convention at `src/lib/expectedPatterns.ts:328–336`. Helpers take string input and return a documented nullable result. Tests use `describe`/`it`/`expect`; add `vi` only for narrowly scoped error-class tests.

The component deliberately interprets valid expected patterns automatically; keep that default. Character remains default, word/line remain lossless and skip cleanup. Preserve compiled-pattern reuse on target-only edits, cached callback identity, linear expected-region tagging, compact DOM, and SSR from the DONE component-performance initiative. Regex extraction remains outside the algorithm timeout by design. Do not add a new parser dependency or change the public ParseResult/ExtractResult/callback type shapes.

## Commands you will need

Use the already installed pnpm 12.6.0/Node toolchain. These are gates for a separately authorized executor; the planning task does not authorize execution, installs, dependency changes, commits, pushes, or PRs.

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Typecheck | `pnpm run check` | exit 0; 0 errors, 0 warnings |
| All library units | `pnpm exec vitest run src/lib/` | exit 0; every existing/new test passes |
| Browser integration | `pnpm exec playwright test --config=playwright.config.ts tests/expected-patterns.test.ts` | exit 0; all configured projects pass |
| Completed performance behavior | `pnpm exec playwright test --config=playwright.config.ts tests/component-performance.test.ts` | exit 0; existing ceilings, cached identity, compact DOM, SSR pass |
| Format | `trunk fmt` | exit 0; inspect resulting diff for scope |
| Lint | `trunk check` | exit 0; no new findings |
| Package | `pnpm run package` | exit 0; svelte-package/publint succeed |
| Authored guide typecheck | Python wrapper below | exit 0; no newly introduced diagnostics; generated worker restored |
| Authored guide rendering/mirror generation | `pnpm --filter docs run build` | exit 0; normal build generates mirrors/llms outputs |

Trunk is authoritative (`.trunk/trunk.yaml:25–87`); do not substitute legacy package lint scripts. The operator-reported audit baseline for the unchanged library is 123 passing tests and `svelte-check` 0 errors/0 warnings; fa0cfc9 changes package/README versions only. This planning pass did not rerun those gates. Counts can increase as sibling plans land. Playwright config starts the repository preview server at port 4173 and runs configured desktop/mobile projects; do not replace it with docs-app configuration.

Run this docs source-check wrapper from repository root, before and after the
docs build. It preserves the generated Cloudflare worker exactly as existing
CI does in `.github/workflows/docs-diff-modes.yml:51–67`:

```sh
python3 - <<'PY'
from pathlib import Path
import subprocess
worker = Path('docs/.svelte-kit/cloudflare/_worker.js')
backup = worker.with_suffix('.js.source-check-backup')
assert not backup.exists(), 'Existing backup: stop and inspect'
moved = worker.exists()
if moved:
    worker.rename(backup)
try:
    result = subprocess.run(['pnpm', '--filter', 'docs', 'check'])
finally:
    if moved:
        backup.rename(worker)
raise SystemExit(result.returncode)
PY
```

Do not hand-edit generated Worker code or weaken checking to hide generated
diagnostics. An existing backup is a STOP condition.

## Scope

**In scope** (only these files):

- `src/lib/expectedPatterns.ts` — parse/clean validation and JSDoc.
- `src/lib/expectedPatterns.test.ts` — invalid compilation, duplicate policy, and unexpected-error regressions.
- `src/lib/SvelteDiff.svelte` — component documentation comment only; existing null parse fallback should already suffice.
- `src/lib/SvelteDiff.test.ts` — literal fallback callback/rendering and recovery checks.
- `src/lib/index.ts` — originalText/expected capture contract documentation only.
- `tests/expected-patterns.test.ts` — browser edits/recovery using existing controls.
- `README.md` — Expected Patterns and Programmatic API sections only (lines 228–329); introductory wording belongs to plan 009 and must execute sequentially afterward.
- `docs/src/routes/docs/guides/expected-patterns/+page.svx` — authored named syntax/failure behavior/word-line explanations only.
- Ignored generated docs outputs may be regenerated only by the normal docs build; no handwritten mirrors or generated-output commits.

**Out of scope**:

- Rewriting `findNamedGroups` (006), changing extraction matching order (007), changing storage (003), adding a literal opt-out prop (a separate code-diff plan).
- Renderer/callback/cache implementation, timeout semantics, public type shape, README sections outside Expected Patterns/Programmatic API, other docs application sources, route fixtures, build/CI configuration, dependencies, generated outputs, completed performance plans/indexes.

## Git workflow

- Initiative branch: `chore/package-improvements`, from fresh `origin/main` at `fa0cfc9`. The operator selects the checkout or per-plan worktree. Do not independently switch, create, or merge branches.
- Execute only after separate authorization. Do not install dependencies, commit, push, or open a PR without explicit operator authorization.
- If commits are later authorized, follow conventional history, for example `fix: preserve literal text for invalid expected patterns`; repository exemplar `c65e2e0 perf: speed up compact rendering and refresh project tooling (#215)`.
- The operator owns `.agents/.plans/package-improvements/README.md`. Send completion/gate results for their status update; do not edit it unless explicitly delegated.

## Steps

### Step 1: Add failing parser and cleaner contract tests

In `src/lib/expectedPatterns.test.ts`, add a describe block `invalid expected templates`. Add table-driven tests named `returns null for invalid balanced regex bodies` using `(?<bad>*)` and `(?<bad>[z-a])` (quantifier and invalid class range), and `rejects duplicate capture names across a whole template` using both `(?<id>\d+) (?<id>\w+)` and `A: (?<id>\w+)\nB: (?<id>\w+)` as actual newline-separated TypeScript strings. Assert `parseExpectedPatterns(input) === null`; asserting null naturally fails on an unexpected throw. Add `leaves invalid expected templates literal in cleanTemplate`, checking cleaner returns input unchanged for all rows. Add a mixed valid/invalid source case to ensure rejection is all-or-nothing, never partial cleaning.

**Verify**: `pnpm exec vitest run src/lib/expectedPatterns.test.ts -t 'invalid expected templates'` → FAIL. Current parser throws `SyntaxError` for invalid bodies/same-line duplicate names, incorrectly returns a parse result for cross-line duplicate names, and cleaner replaces invalid markers. If all rows pass on baseline, STOP and check drift.

### Step 2: Make parsing rejection explicit and narrowly catch compilation errors

In `parseExpectedPatterns`, check name uniqueness across all found matches with a `Set<string>` before constructing a result; any duplicate returns null. This policy rejects duplicates even if occurrences would happen to capture equal values. Keep accepted name grammar unchanged (`__proto__` and `constructor` remain valid distinct names).

Compile the line patterns behind a narrow boundary around `compileLinePatterns`. Catch `error`, return null only when `error instanceof SyntaxError`, and rethrow every other error. Do not catch broadly around component rendering or quietly return a half-compiled result. Build/return metadata only when compilation succeeds.

Make standalone `cleanTemplate` use the same validation semantics: call `parseExpectedPatterns(text)` once and return `parsed?.cleanedText ?? text`. Remove the now-duplicated unconditional cleaning loop. There must be no parse/clean recursion: parsing itself constructs cleanedText directly, never by calling `cleanTemplate`. This keeps component changes compiled once per original text and eliminates mismatched helper/component behavior. Valid parse plus unmatched target still uses `<name>` placeholders.

Update JSDoc for parse and clean: return null/original literal input when no supported named groups are found, recognized groups fail regex compilation, or duplicate recognized names occur. Names must be unique across the entire template. Do not change scanner handling of surrounding malformed text or rejected outer groups; parser plan 006 owns that behavior. Update relevant originalText/expected-pattern notes in `index.ts` and component comment without changing props or defaults.

**Verify**: `pnpm exec vitest run src/lib/expectedPatterns.test.ts` → PASS, including invalid rows, existing malformed syntax, valid cleaning, nested-group legacy behavior, compiled reuse, and Unicode/class parsing.

### Step 3: Verify unexpected failures and actual component fallback

Add `it('rethrows unexpected regex compilation errors', ...)` in the helper test file. Temporarily replace the global RegExp constructor with a constructable test double that throws a sentinel `TypeError`; assert parsing a recognized valid marker throws the same sentinel. Save/restore the native constructor in `try/finally` so no global replacement leaks. Do not use an arrow-only constructor mock that fails with its own unrelated TypeError. The only intended assertion is that the sentinel is not swallowed by the SyntaxError boundary.

Add `it('compares invalid templates literally and recovers after valid edits', ...)` in `src/lib/SvelteDiff.test.ts`, patterned on lines 207–238. First render identical original/modified `(?<bad>*)`: no throw, no expected spans, callback captures undefined, and raw tuple reconstruction for operations <=0 and >=0 equals the literal input. Rerender through a same-line duplicate source, a cross-line duplicate source, a valid unmatched template (must still clean), and a valid matched template (captures/styling restored). Assert callback values and source reconstruction, not just visible text.

Add browser test `test('keeps invalid templates literal and recovers to expected captures', ...)` in the existing expected-pattern suite. Collect `pageerror`; fill both controls with identical invalid input, assert `diff-result` literal text and zero expected spans, then fill the valid year example and assert expected year span returns. Add duplicate-name input to the same test or a separate table and assert no page errors. Existing valid non-match browser test remains unchanged.

**Verify**: `pnpm exec vitest run src/lib/expectedPatterns.test.ts src/lib/SvelteDiff.test.ts` → PASS, including sentinel rethrow, literal callback reconstruction, and recovery.

**Verify**: `pnpm exec playwright test --config=playwright.config.ts tests/expected-patterns.test.ts` → PASS in all configured projects, including the new edit/recovery test with zero page errors.

### Step 4: Document rejection and validate authored guide output

In `README.md` Expected Patterns, state that names must be globally unique across the template and invalid recognized regex bodies or duplicate names cause ordinary literal comparison with captures undefined. Clearly distinguish a valid template that fails to match its target, which still substitutes readable `<name>` placeholders. Update the Programmatic API descriptions: parse returns null for no supported groups or rejected patterns; cleanTemplate returns unchanged literal input when parsing rejects it. Provide a short example pair for `(?<bad>*)` literal rejection versus a valid year template with nonmatching target and cleaned `<year>` placeholder. Leave README introductory wording to plan 009.

In `docs/src/routes/docs/guides/expected-patterns/+page.svx`, document global name uniqueness near Named capture syntax, distinguish the two fallback cases under Failure behavior, and clarify Word and line modes so invalid templates retain original source while valid unmatched templates use placeholders. Preserve trusted regex guidance and the note that algorithm timeout does not bound regex extraction. Do not promise that every malformed surrounding substring rejects otherwise recognized groups; candidate scanning remains a separate contract.

**Verify**: `rg -n 'unique|literal|invalid|duplicate|clean|parseExpectedPatterns' README.md docs/src/routes/docs/guides/expected-patterns/+page.svx` → authored sections contain the name uniqueness and distinct fallback contracts.

**Verify**: the documented Python wrapper → exit 0, no new diagnostics. `pnpm --filter docs run build` → exit 0, authored guide renders and normal plugin build regenerates mirrors/llms output. Run the wrapper again after build and verify the worker is restored with no backup remaining. Inspect generated guide text to ensure both cases appear. Do not hand-edit generated mirrors or deploy docs. If the docs baseline has pre-existing failures, record them and STOP instead of expanding scope.

### Step 5: Run the full gates

Run each independently: `pnpm run check`; `pnpm exec vitest run src/lib/`; `pnpm exec playwright test --config=playwright.config.ts tests/expected-patterns.test.ts`; `pnpm exec playwright test --config=playwright.config.ts tests/component-performance.test.ts`; `trunk fmt`; `trunk check`; `pnpm run package`; the documented Python docs-check wrapper; `pnpm --filter docs run build`; the wrapper again. Inspect `git diff --name-only` and `git status --short`. Rerun affected tests/check if formatting changes source. Report results to the operator.

**Verify**: every gate exits 0; typecheck 0 errors/0 warnings; performance diagnostics retain compiled reuse and existing ceilings; published package validation passes; only scoped tracked files change.

## Test plan

- Red-first parser/cleaner matrix proves balanced bad bodies and duplicate names violate the chosen contract at baseline.
- Duplicate names are globally unsupported, even across lines or with equal captured values. This is the explicit prerequisite contract for plan 007; do not introduce occurrence overwrite behavior.
- Unexpected non-SyntaxError failures propagate; globals restore after the sentinel test.
- Component tests distinguish invalid-template literal fallback from valid-template unmatched-target cleaned fallback and valid matched extraction. Browser edit tests assert recovery and zero runtime errors.
- Existing compiled-regex identity/reuse tests and performance diagnostic 001 must continue passing: standalone cleaner validation must not add component recompilation.

## Done criteria

- [ ] All named invalid-template tests demonstrated baseline failures and now pass.
- [ ] Duplicate names anywhere produce null parse and unchanged cleanTemplate input.
- [ ] Invalid regex SyntaxError is rejected; sentinel TypeError is rethrown.
- [ ] Component callbacks reconstruct literal invalid sources; valid unmatched/matched behaviors remain distinct and documented.
- [ ] `pnpm run check` exits 0 with 0 errors/0 warnings.
- [ ] `pnpm exec vitest run src/lib/` exits 0.
- [ ] Both exact Playwright commands in the command table exit 0.
- [ ] `trunk fmt`, `trunk check`, `pnpm run package`, both docs-check wrapper runs, and `pnpm --filter docs run build` exit 0; worker restoration succeeds.
- [ ] Authored README/guide document globally unique names and distinguish rejected literal source from valid unmatched cleaned source; generated mirrors were not edited by hand.
- [ ] `git diff --name-only` stays within scope; operator receives results for index update.

## STOP conditions

Stop if the duplicate rejection policy conflicts with an already published documented contract in live code, the fixture no longer exposes the cited controls, the parser/cleaner red cases pass at baseline, unexpected errors cannot propagate without out-of-scope changes, unrelated drift exists, a verification fails twice after a reasonable attempt, or the change appears to require a new error type/API/dependency. Do not silently accept duplicates or remove non-match cleaned fallback.

## Maintenance notes

The default auto interpretation remains enabled for valid templates; literal opt-out belongs to separate work. Keep parser rejection and cleanTemplate behavior synchronized. Any future API supporting repeated names requires an occurrence-valued representation rather than silently replacing the Record contract. Plan 007 must inherit rejection and preserve it; plan 006 must not confuse syntactic candidate discovery with validation.
