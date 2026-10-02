# Plan 007: Match repeated template occurrences in source order

> **Executor instructions**: Read fully, follow steps in order, and confirm each verification result. Stop and report if a STOP condition occurs. The operator maintains the batch README; send completion/gate results rather than editing their index unless delegated.
>
> Revision 2026-10-02: Plans001–006 are DONE. Re-baseline to reviewed88b1b41 and shifted helper/component anchors. Preserve003 own capture properties,004 global invalid/duplicate literal rejection,006 linear discovery plus all tests/fixture/ceilings, and002 untracked callbacks unconditionally. Extraction and regex search flags remain unchanged at this baseline; ordering policy, scope and done criteria are unchanged.
>
> **Drift check (run first)**: `git diff --stat 88b1b41..HEAD -- src/lib/expectedPatterns.ts src/lib/expectedPatterns.test.ts src/lib/SvelteDiff.test.ts tests/expected-patterns.test.ts`. Compare the excerpts against live code. Completed prerequisites004/006 and capture storage003 are already in the baseline; retain them and their tests, never restore old code. Stop on unrelated drift or missing prerequisite behavior. Run `git status --short` to separate pre-existing local changes.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: `004-handle-invalid-pattern-compilation.md` and `006-linearize-rejected-pattern-parsing.md`; extraction series executes 003 → 004 → 006 → 007 to serialize shared engine/test changes and preserve validated parser behavior
- **Category**: bug
- **Planned at**: commit `88b1b41`, 2026-10-02

## Why this matters

Every compiled line currently starts searching the target at index zero. For template lines sharing an `Item:` prefix, distinct groups intended for Alpha and Beta both capture Alpha, generating a false difference for Beta and tagging the first item twice. Extract each template line after the prior matched occurrence while keeping ranges in absolute UTF-16 offsets. The public capture Record cannot represent different values for repeated uses of one name; plan 004 therefore rejects duplicate names globally, and this plan must preserve that policy rather than silently overwriting captures.

## Current state

- `src/lib/expectedPatterns.ts:266–299` builds context-prefixed, gap-flexible line regexes with `new RegExp(pattern, 'd')`. Literal context is escaped, the gap permits extra target content, and named group bodies retain regex behavior.
- `src/lib/expectedPatterns.ts:458–485` executes each regex independently:

```ts
for (const { groups, regex } of parseResult.linePatterns) {
    const match = regex.exec(modifiedText)
    if (!match || !match.groups || !match.indices?.groups) {
        return null
    }
    // each group's value and match.indices.groups[name] become a capture/range
}
```

- `src/lib/expectedPatterns.ts:486–492` resolves the source and sorts absolute capture ranges; `tagExpectedRegions` uses a forward cursor from line 543. Preserve the latter algorithm and correct offsets.
- `src/lib/expectedPatterns.test.ts:348–374` verifies differently prefixed lines but not repeated context. Its tests at lines151–198 reuse one compiled result against different targets and assert regex object identity; follow that shape for state-reset regressions.
- `src/lib/SvelteDiff.test.ts:289–320` checks target-only edits with unchanged template, and lines345–354 require cleaned placeholder fallback for valid templates that fail extraction. Those contracts apply when a later occurrence is missing or out of order.
- `tests/expected-patterns.test.ts:22–41` edits the existing `text1`/`text2` controls and queries expected/remove/insert classes inside `diff-result`. Use that route as-is; no fixture change is needed.
- Functions in `expectedPatterns.ts` are typed arrow functions with JSDoc, exemplified by `extractCaptures` at lines438–455. Add comments/JSDoc for whole-target ordering, absolute positions, and reset behavior; do not add a class or helper package.

Completed prerequisite004 makes parsing return null and cleanTemplate preserve original text for duplicate names anywhere in a template and for regex SyntaxError, while unexpected errors propagate. Completed prerequisite006 linearizes candidate scanning: preserve its behavior, fixed-budget tests and browser diagnostic. Automatic valid-template interpretation, character default, word/line losslessness and no cleanup, compiled reuse, cached callback identity, linear tagging, compact markup, and SSR remain settled. Regex extraction is outside the diff algorithm deadline by design.

## Commands you will need

Use the existing pnpm 12.6.0/Node environment; no new installs or dependency changes. These gates are for a separately authorized executor, not permission to execute/commit from this planning task.

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Typecheck | `pnpm run check` | exit 0; 0 errors, 0 warnings |
| Library units | `pnpm exec vitest run src/lib/` | exit 0; all tests pass |
| Expected-pattern browser integration | `pnpm exec playwright test --config=playwright.config.ts tests/expected-patterns.test.ts` | exit 0; every configured project passes |
| Completed performance behavior | `pnpm exec playwright test --config=playwright.config.ts tests/component-performance.test.ts` | exit 0; existing ceilings and SSR/compact/cached identity pass |
| Format | `trunk fmt` | exit 0; inspect scope of changed files |
| Lint | `trunk check` | exit 0; no new findings |
| Package | `pnpm run package` | exit 0; svelte-package and publint pass |

Trunk is repository lint/format authority (`.trunk/trunk.yaml:25–87`), not legacy package lint scripts. The operator-reported audit baseline for the unchanged library is 123 passing unit tests and svelte-check 0 errors/0 warnings; fa0cfc9 changes package/README versions only and this planning pass did not rerun those gates; prerequisite tests increase counts. Use root Playwright configuration, which serves preview at 4173 and runs desktop/mobile projects, rather than docs-app tooling.

## Scope

**In scope** (only these files):

- `src/lib/expectedPatterns.ts` — regex search flags, extraction cursor/state reset, and related JSDoc.
- `src/lib/expectedPatterns.test.ts` — repeated context, order, absolute offsets, zero-length and reuse cases.
- `src/lib/SvelteDiff.test.ts` — rendering/callback integration for repeated occurrences.
- `tests/expected-patterns.test.ts` — repeated-context target edits using existing fixture controls.

**Out of scope**:

- Rewriting parser scanning or reopening 004's error/duplicate policy; repeated equal duplicate names remain rejected too.
- Changes to `tagExpectedRegions`, callback implementation, renderer/cache/component implementation, public type shape, regex suffix anchoring, timeout, diffModes.
- Routes, docs app/README, configs, dependency manifests, generated files, DONE performance plans/indexes.

## Git workflow

- Initiative branch `chore/package-improvements` starts from fresh `origin/main` at `fa0cfc9`. The operator chooses direct checkout or isolated worktree and controls dependency integration; do not independently create/switch/merge branches.
- Execute only when separately authorized. No installs, commits, pushes, or PRs without explicit authorization.
- If commits are authorized later, follow conventional history (`c65e2e0 perf: speed up compact rendering and refresh project tooling (#215)`), e.g. `fix: match expected template occurrences in order`.
- The operator owns the sibling README; report completion and gate results for their status update.

## Steps

### Step 1: Add a failing repeated-context extraction regression

In `src/lib/expectedPatterns.test.ts`, add `it('matches repeated template context in source order', ...)`, following the existing multiline extraction test. Use source `Item: (?<first>\w+)\nItem: (?<second>\w+)` and target `Item: Alpha\nItem: Beta` as strings containing actual newlines (escape regex backslashes correctly in TypeScript). Assert captures `{first: 'Alpha', second: 'Beta'}`, resolvedText equals target, and absolute ranges `[{name: 'first', start: 6, end: 11}, {name: 'second', start: 18, end: 22}]`. Assert slicing target by each range recovers its expected captured value.

**Verify**: `pnpm exec vitest run src/lib/expectedPatterns.test.ts -t 'matches repeated template context in source order'` → FAIL: second is `Alpha` rather than `Beta`, resolved second line is Alpha, and both ranges point at the first capture. If baseline passes, STOP and inspect already-landed changes.

### Step 2: Introduce a whole-target search cursor without recompilation

In `buildLineRegex`, retain the `d` flag and add `g` so each precompiled regex can search from `lastIndex` while evaluating anchors/lookbehind against the full target. Keep regexes compiled once in parse metadata; do not create a new regex per extraction or search `modifiedText.slice(cursor)`, since suffix slicing changes start-anchor/lookbehind semantics and requires offset rebasing.

In `extractCaptures`, initialize a local target search cursor at zero per invocation. Before each line's one `exec(modifiedText)`, set its compiled regex `lastIndex` to that cursor. Use a narrow `try/finally` to reset `lastIndex` to zero immediately after exec, whether it succeeds, fails, or throws. Use the match object's absolute `indices` directly. After validating/recording that line's captures, advance the cursor to `match.index + match[0].length`. This consumes the full matched context/gap/groups of that occurrence, preventing the next line from rematching earlier target text. Keep null result if any later occurrence is absent. Retain the final range sort or prove its removal separately; this plan does not authorize tagging changes.

Zero-width matches consume zero characters; permit the next finite source line to begin at the same boundary. Do not force `cursor + 1`, which skips valid adjacent data. There is one exec per compiled source line, not an unbounded match loop, so empty captures cannot create an infinite loop. Match must not begin before cursor. Do not alter RegExp body semantics, suffix anchoring, or gap flexibility.

Update build/extract JSDoc to state source-order whole-target search, absolute UTF-16 indices, and per-call lastIndex reset. Keep duplicate-name rejection from 004; no overwrite workaround is permitted.

**Verify**: `pnpm exec vitest run src/lib/expectedPatterns.test.ts -t 'matches repeated template context|compiled expected-pattern metadata|extractCaptures'` → PASS for the anchor regression, existing reuse, ordinary multiline, and partial extra-content matching.

### Step 3: Pin order boundaries, absolute offsets, and cached regex reuse

Add focused helper tests in `src/lib/expectedPatterns.test.ts`:

- `preserves absolute capture offsets after leading content and CRLF`: use a header and Unicode supplementary character, repeated contexts, and CRLF. Calculate expected UTF-16 indices with target.indexOf(value), assert exact start/end and target slices. For the simple CRLF target `Item: Alpha\r\nItem: Beta`, ranges are 6–11 and 19–23.
- `does not reuse an earlier occurrence when a later line is missing`: two source Item lines, one target Item line → extraction null. Baseline would incorrectly reuse Alpha.
- `rejects target occurrences that reverse source context order`: source `A: (?<first>\w+)\nB: (?<second>\w+)`, target `B: Beta\nA: Alpha` → null; no earlier-target fallback after matching A.
- `resets compiled regex search state after success and failure`: retain regex references from one parsed result; extract two differing targets, then a missing-second-line target, then a complete target again. Each complete extraction has current values/ranges, missing returns null, references are unchanged, and each lastIndex is zero afterward.
- `keeps whole-target anchors and lookbehind semantics`: use source `A: (?<first>Alpha)\n(?<second>^Beta)` with target `A: AlphaBeta` → null. The first match ends just before Beta; searching a sliced suffix would wrongly let `^Beta` match. Separately use source `(?<first>Alpha)\n(?<second>(?<=Alpha)Beta)` with target `AlphaBeta` → captures Alpha/Beta at 0–5 and 5–9. Whole-target lookbehind can see Alpha; a sliced suffix loses that context. These are extraction-helper tests, not claims that resolved source equals either target.
- `allows empty captures at a shared boundary without skipping following content`: a zero-width first line `(?<empty>)` followed by a source line with distinct named group, target `Alpha` → empty value and zero range 0–0, followed by Alpha 0–5; extraction terminates and reused metadata behaves identically.
- Retain 004 tests that duplicate names on same/different lines return null and cleanTemplate literal text, regardless of whether target values agree. If prerequisites did not provide these tests, STOP instead of changing policy here.

Add `it('renders distinct repeated-context captures and updates them independently', ...)` in `src/lib/SvelteDiff.test.ts`. For the repeated Item source, assert titled first/second spans contain Alpha/Beta, no removal/insertion styling for fully resolved matching text, and callback captures/raw tuples reconstruct the resolved source and target. Rerender target with second value Gamma, assert first remains Alpha, second becomes Gamma, and capture ranges/markup do not retain Beta or tag Alpha twice. Follow the existing target-only edit test; preserve compiled reuse/cached behavior.

**Verify**: `pnpm exec vitest run src/lib/expectedPatterns.test.ts src/lib/SvelteDiff.test.ts` → PASS for all new edges, prerequisites, and existing behavior. Every cached regex retains identity and lastIndex zero across failed and successful extractions.

### Step 4: Add browser repeated-occurrence coverage and run full gates

In `tests/expected-patterns.test.ts`, add `test('matches repeated template contexts in order across target edits', ...)`. Use existing controls to set the repeated Item source and Alpha/Beta target. Assert `span[title="first"]` has Alpha, `span[title="second"]` has Beta, and zero `.diff-remove`/`.diff-insert` elements. Change Beta to Gamma and assert the second expected value updates independently with no stale Beta. Collect pageerrors and assert none. Do not change fixture markup.

**Verify**: `pnpm exec playwright test --config=playwright.config.ts tests/expected-patterns.test.ts` → all configured projects PASS, including the new test.

Then run independently `pnpm run check`; `pnpm exec vitest run src/lib/`; `pnpm exec playwright test --config=playwright.config.ts tests/expected-patterns.test.ts`; `pnpm exec playwright test --config=playwright.config.ts tests/component-performance.test.ts`; `trunk fmt`; `trunk check`; `pnpm run package`. Inspect `git diff --name-only` and `git status --short`, and rerun affected tests/typecheck if formatting changes implementation. Report gate results.

**Verify**: all commands exit 0, typecheck 0 errors/0 warnings, performance ceilings/SSR/compact behavior remain unchanged, package validates, and source diff remains scoped.

## Test plan

- Step 1 is the red anchor: current second capture Alpha becomes correct Beta only after ordered search.
- Missing later occurrence and reversed context tests prevent falling back to already consumed target text.
- Absolute index tests cover LF, CRLF, leading extra text and UTF-16 Unicode. Same-line adjacent groups and multiline capture bodies retain existing behavior.
- Whole-input anchor/lookbehind tests guard against suffix-slicing shortcuts; empty captures guard against artificial character advancement.
- Success/failure/recovery on the same ParseResult is mandatory because `g` makes cached regexes internally stateful; cleanup and identity assertions pin reuse.
- Duplicate names remain rejected by prerequisite 004: no Record-valued API can safely represent multiple different occurrences under the same name.
- Browser test proves ordered expected markup survives reactive edits; component/performance gates preserve completed optimizations and SSR.

## Done criteria

- [ ] The repeated-context red test demonstrated baseline failure and now passes with exact ranges 6–11 and 18–22.
- [ ] Missing/reversed occurrences fail extraction; component retains cleaned fallback for valid unmatched templates.
- [ ] Cached compiled regex references stay identical and lastIndex resets after success/failure.
- [ ] Empty captures, whole-input anchor/lookbehind behavior, Unicode/CRLF absolute offsets pass.
- [ ] 004 duplicate/error policy and 006 parser regression tests remain green.
- [ ] `pnpm run check` exits 0 with 0 errors/0 warnings.
- [ ] `pnpm exec vitest run src/lib/` exits 0.
- [ ] Both listed root Playwright suite commands exit 0.
- [ ] `trunk fmt`, `trunk check`, `pnpm run package` exit 0.
- [ ] Scoped tracked-file diff only; completion and gate results delivered to operator for index update.

## STOP conditions

Stop if 004 duplicate-name/literal rejection behavior is absent, scanner plan 006 has unresolved failing regressions, the anchor red test passes before changes, consumers require reverse-order or overlapping repeated line matches as a documented contract, global regex state cannot be safely reset while preserving reuse, unrelated baseline drift appears, a gate fails twice after a reasonable fix attempt, or implementation requires out-of-scope files. Do not invent duplicate-name occurrence arrays or silently change Record semantics.

## Maintenance notes

Compiled global regexes are scratch search state even though parse metadata is retained; each use must initialize and reset lastIndex. Future extraction concurrency/reentrancy must preserve that ownership. Keep indices in whole-target UTF-16 coordinates, and revisit order semantics explicitly if later APIs introduce optional/reordered template lines. Do not remove duplicate rejection without designing an occurrence-aware public representation.
