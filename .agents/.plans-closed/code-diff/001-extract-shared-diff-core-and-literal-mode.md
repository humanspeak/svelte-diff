# Plan 001 (A): Extract shared diff computation and support literal source

> **Executor instructions**: Follow every step and verification gate. This is an
> implementation handoff, not authorization to publish or deploy. Update this
> batch's README status when complete unless your reviewer owns the index.
>
> **Revision 2026-10-02**: Execution begins on `feat/highlighted-code-diff` from fresh main `068080b` after PR #216 merged. All ten package improvements are DONE; baseline is 172 passing library units. Preserve the untracked processing callback, ordered/reusable pattern extraction, invalid/duplicate literal fallback, linear discovery, and built-in `data-capture-name` / full `data-capture-value` metadata (including multiline fragments). The guard owns README status. Existing release infrastructure is outside this initiative; only B's expressly scoped docs CI integration is planned. Source excerpts below describe the prior structure; current code and completed regression tests are authoritative.
>
> **Drift check**: `git diff --stat 068080b..HEAD -- src/lib src/routes/tests/diff-modes tests/diff-modes.test.ts README.md docs/src/routes/docs`
> Compare changes with the excerpts below. Required package-improvement changes
> are expected drift: inspect their completed tests and preserve them. Stop for
> unrelated changes that invalidate this plan instead of restoring older code.

## Status

- **Priority**: P2; execute after the package-improvements batch
- **Effort**: M
- **Risk**: MED
- **Depends on**: package-improvements plans 002–007 and 009; all ten package
  improvements should finish before this initiative starts
- **Category**: direction / enhancement
- **Planned at**: commit `068080b`, 2026-10-02

## Why this matters

The package compares strings inside an opinionated Svelte application. A code
viewer needs the same diff algorithm without mounting an invisible component or
waiting for `onProcessing`. It also needs literal source: JavaScript regex
capture syntax must not be interpreted as an expected-value template. Extract
the existing computation, add a literal option, and preserve default component
behavior. This does **not** establish a framework-agnostic or plain-Node package.

## Current state

- `src/lib/SvelteDiff.svelte:123–159` owns an engine, unconditional template
  parsing, expected-pattern preprocessing, and character/token-mode diffing:

    ```ts
    const dmp = new DiffMatchPatch()
    const parseResult = $derived(parseExpectedPatterns(originalText))
    // Inside the local computeDiff:
    if (compiledPattern) {
        const extractResult = extractCaptures(text1, text2, compiledPattern)
        diffText1 = extractResult ? extractResult.resolvedText : compiledPattern.cleanedText
    }
    const diffs =
        mode === 'character'
            ? dmp.diff_main(diffText1, text2)
            : computeTokenDiff(dmp, diffText1, text2, mode, diffTimeout)
    ```

- `src/lib/SvelteDiff.svelte:99–104` returns `{ timing, diffs, captures,
displayDiffs }`. Its value-keyed cache at lines 191–223 retains tuple identity
  when only callback/rendering inputs change; the cached parser depends only on
  original text. Preserve both behaviors after extraction.
- `src/lib/diffModes.ts:13` exports the internal `computeTokenDiff` helper. Its
  shared UTF-16 dictionary, timeout fallback, and 65,535-token limit stay intact.
- `src/lib/index.ts:3–19` imports the Svelte component and exports it alongside
  expected-pattern helpers. `package.json:32–36` exposes only `types` and `svelte`
  conditions. Keep this Svelte package contract; no Node/default export condition
  or headless subpath is required.
- `src/lib/SvelteDiff.test.ts` uses Testing Library `render`, `rerender`, `vi.fn`,
  and `waitFor`; `src/lib/index.test.ts` checks exports and type assignments.
  Use these conventions. TypeScript functions are arrows, public helpers have
  JSDoc, formatting is four spaces/no semicolons, imports use `.js` specifiers.
- Existing DONE performance work requires compile-once templates, callback
  isolation/identity, compact text nodes, linear capture tagging, and initial SSR
  markup. Word/line modes skip both cleanup passes; character defaults remain
  semantic=false and efficiency=4. Pattern processing and rendering are outside
  diff timings and algorithm timeout.

## API and compatibility decisions

Implement these choices; do not invent another public API:

```ts
export interface SvelteDiffComputeOptions {
    diffMode?: SvelteDiffMode
    timeout?: number
    cleanupSemantic?: boolean
    cleanupEfficiency?: number
    expectedPatterns?: boolean
}
export interface SvelteDiffResult {
    timing: SvelteDiffTiming
    diffs: SvelteDiffTuple[]
    displayDiffs: DisplayDiff[]
    captures?: Record<string, string>
}
// Export through the existing Svelte-oriented package root.
export const computeDiff = (
    originalText: string,
    modifiedText: string,
    options: SvelteDiffComputeOptions = {}
): SvelteDiffResult => {
    /* shared computation */
}
```

- Public `computeDiff`: default `expectedPatterns=false`, character mode,
  timeout=1, cleanupSemantic=false, cleanupEfficiency=4. Explicit true enables
  exactly the component's current template pipeline after package fixes.
- Existing `SvelteDiff`: add `expectedPatterns?: boolean`, default **true**.
  Explicit false bypasses parsing, substitution, cleanup placeholders, and capture
  tagging. Both reconstructed sides are the exact input strings in literal mode.
- Preserve raw tuple operation values -1/0/1, timing units, renderer precedence,
  cleanup priority, and client-only callback delivery. Do not expose a mutable
  engine or compiled-pattern argument as part of the public helper.
- Keep reusable engine and cached parsed metadata in the component. Put the
  shared calculation in a private `computeDiffWithEngine` export from its own
  module, taking a configured engine, resolved option values, and compiled
  pattern or null. The public helper creates its own engine and optional parser
  result. Do not share a singleton engine across server requests.
- Include `expectedPatterns` in component computation inputs/cache equality.
  Toggle false->true->false must recompute and never reuse stale capture metadata.

## Commands you will need

| Purpose            | Command                                                                                                                | Expected on success                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Install if needed  | `pnpm install --frozen-lockfile`                                                                                       | exit 0; no manifest changes                                |
| Targeted red/green | `pnpm exec vitest run src/lib/SvelteDiff.test.ts -t 'literal source'`                                                  | red in step 1, green thereafter                            |
| Core units         | `pnpm exec vitest run src/lib/`                                                                                        | all tests pass; execution baseline is 172                  |
| Typecheck          | `pnpm run check`                                                                                                       | zero errors/warnings                                       |
| Format / lint      | `trunk fmt` / `trunk check`                                                                                            | no new failures; Trunk is authority                        |
| Package            | `pnpm run package`                                                                                                     | Svelte package and publint pass                            |
| Browser regression | `pnpm exec playwright test --config=playwright.config.ts tests/diff-modes.test.ts tests/component-performance.test.ts` | every configured project passes                            |
| Docs build         | `pnpm run package`; `pnpm --filter docs build`                                                                         | authored API/types/guide render; normal generators succeed |
| Docs source check  | Python wrapper below, before and after build                                                                           | zero errors/warnings; generated worker restored            |

The original audit used existing dependencies and got 123 passing units and root check
0/0; completed package improvements now establish 172 passing units. Browser/package gates are required execution gates, not claims already
verified by this planning session. Use the configured Node 24.15/pnpm 12.6
toolchain; report unavailable browsers/tools rather than claiming a pass.

Use the existing CI worker move/restore wrapper from
`.github/workflows/docs-diff-modes.yml:51–67`, run from repository root:

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

An existing backup is a STOP condition. Never edit generated Worker code or
weaken type checks to conceal generated-output diagnostics.

## Scope

**In scope**: `src/lib/computeDiff.ts` (create), `src/lib/computeDiff.test.ts`
(create), `src/lib/SvelteDiff.svelte`, `src/lib/SvelteDiff.test.ts`,
`src/lib/index.ts`, `src/lib/index.test.ts`,
`src/routes/tests/diff-modes/+page.svelte`, `tests/diff-modes.test.ts`, `README.md`,
`docs/src/routes/docs/api/svelte-diff/+page.svx`,
`docs/src/routes/docs/api/types/+page.svx`,
`docs/src/routes/docs/guides/diff-modes/+page.svx`, and this plan's status row.

**Out of scope**: package export conditions, new dependencies, tokenization engine
changes, expected-pattern bug fixes already owned by the earlier batch, syntax
highlighting, patches/hunks/files, sentence/JSON modes, and existing numbered
performance diagnostic workloads. Ignored generated docs outputs may change
only through the normal build. Generated docs files are not hand-edited; report
incidental tracked generation changes instead of silently expanding scope.

## Git workflow

These plans were authored on `chore/package-improvements` from fresh main.
Execution is authorized on `feat/highlighted-code-diff`, created from fresh main
`068080b`. A and B run serially on this branch. Do not switch the
operator's branch, commit, push, or open a PR without execution authorization.
Match conventional subjects such as `feat: add literal source diff computation`.

## Steps

### Step 1: Reproduce source rewriting with a failing component test

Add `supports literal source without interpreting named groups` to
`SvelteDiff.test.ts`. Compare identical source containing a valid named regex
capture while passing `expectedPatterns:false`. Use a deliberate test-only type
intersection to pass the new prop before its public type exists, so the failure
is runtime fidelity rather than a compiler error. Assert callback tuples equal
`[[0, source]]`, no captures/expected markup, and exact source text. Also assert
literal changed inputs reconstruct both original and modified source from raw
tuples. Follow existing callback/waitFor tests.

**Verify**: targeted red command above -> FAIL: original source is substituted
and identical inputs do not produce the expected single equal tuple. If it
passes, stop: an upstream literal mode may already exist.

### Step 2: Extract the shared core while preserving current behavior

Create `computeDiff.ts`; move existing configuration, preprocessing, algorithm,
cleanup, timing, and display tagging into the shared internal function. Keep
type-only imports to avoid runtime cycles through the component-bearing index.
Define/export the public options/result types and root helper. Preserve existing
component engine and compiled-result caching; initially call the shared function
with the current resolved default options. Remove duplicated local calculation.

Create `computeDiff.test.ts` covering modes, options, cleanup precedence, empty
inputs, lossless before/after reconstruction including tabs/LF/CRLF/CR/Unicode,
and explicit template matching/nonmatching. Do not assert elapsed milliseconds
or exact tuple segmentation where the contract permits equivalent diffs.

**Verify**: `pnpm exec vitest run src/lib/computeDiff.test.ts src/lib/diffModes.test.ts src/lib/expectedPatterns.test.ts` -> all pass.

### Step 3: Wire the literal option and preserve callback/cache contracts

Add the typed component prop/default, conditional derived parser, and cache key.
Replace step 1's temporary type intersection with the real prop. Add mode and
expectedPatterns toggles, default-vs-explicit-true compatibility, and callback
replacement identity tests. Preserve the earlier `untrack` callback fix. Literal
helper calls must never invoke regex processing; verify with a parser spy using
the existing unit mocking conventions where feasible.

**Verify**: `pnpm exec vitest run src/lib/SvelteDiff.test.ts src/lib/computeDiff.test.ts src/lib/index.test.ts` -> all pass, including formerly red fidelity test;
`pnpm run check` -> no errors/warnings.

### Step 4: Document the Svelte API and prove SSR/reactive behavior

Extend the existing diff-modes fixture with clearly labeled literal-code and
template comparisons. Add no-JavaScript assertions for intact regex source and
hydrated mode/pattern-toggle assertions with no page/hydration errors. Update
authored API/type/guide documentation and README: component true vs helper false
defaults must be explicit. Show `computeDiff` as a helper within a Svelte
toolchain, preserving the wording decision from package improvement 009.

**Verify**: `pnpm exec playwright test --config=playwright.config.ts tests/diff-modes.test.ts` -> all projects pass;
`rg -n 'expectedPatterns|computeDiff' README.md docs/src/routes/docs src/lib/index.ts` -> matching accurate declarations/examples.
Run the docs source-check wrapper, docs build, then the wrapper again -> exit 0,
authored pages render, and the worker is restored without a backup remaining.

### Step 5: Run complete gates

**Verify**: run root check, all unit tests, package gate, Trunk formatting/checks,
the browser regression command, and docs build/source-check gates in the command
table -> no new failures;
`git diff --check` -> exit 0; `git diff --name-only` -> only scoped files.

## Test plan

Step 1 is red-first because this enhances existing comparison behavior. Retain
regressions from the package batch, raw tuple reconstruction in every mode,
template defaults, parser cache counts, callback replacement identity, and SSR
without JavaScript. A new exported helper and types must be exercised through
the Svelte-aware root export test; there is deliberately no plain-Node consumer
test or framework-agnostic compatibility promise.

## Done criteria

- [ ] Formerly red literal-source component test and all core unit tests pass.
- [ ] Root `computeDiff`/types exist; defaults differ only as explicitly specified.
- [ ] No duplicate algorithm/cleanup implementation remains in the component.
- [ ] Root check/package/Trunk and specified browser gates pass.
- [ ] Existing callback identities, SSR, compact nodes, and performance ceilings survive.
- [ ] No package export/dependency changes or framework-agnostic claims were added.
- [ ] Scoped diff is clean and batch README status is updated.

## STOP conditions

Stop if prerequisite plans are incomplete, extraction needs a changed expected
matching contract, performance ceilings regress, literal mode still invokes
pattern preprocessing, public API conflicts with a newly added upstream helper,
or a verification fails twice after a reasonable correction. Expected drift
from completed prerequisites requires rereading, never reverting their fixes.

## Maintenance notes

Future diff options must be normalized in the public helper and included in the
component cache key. Keep computation synchronous and side-effect free aside
from engine-local work; callbacks remain a component concern. CodeDiff will
consume literal tuples and must never infer offsets from resolved templates.
