# Plan 006: Bound rejected-pattern parsing to linear source traversal

> **Executor instructions**: Follow every step and verification command. Stop and report on the STOP conditions; do not improvise. Update only your row in the sibling README when finished, unless the reviewer maintains that index. This is an implementation handoff, not permission to publish, install dependencies, change existing diagnostic ceilings, or rewrite other plans.
>
> Revision 2026-10-02: Plans 001–005 are DONE. Re-baseline to reviewed 42ff699; preserve 003 own capture properties and 004 invalid/duplicate rejection plus all predecessor tests. Scanner remains unchanged. Codex cannot run browsers: dispatch Step 1 tests/fixture only, then guard reproduces the fixed browser red gate before a separate production-edit dispatch. This changes execution ownership, not thresholds, semantics, scope, or done criteria.
>
> **Drift check (run first)**: `git diff --stat 42ff699..HEAD -- src/lib/expectedPatterns.ts src/lib/expectedPatterns.test.ts src/routes/tests/component-performance/006/+page.svelte tests/component-performance.test.ts`
> Compare changes and the excerpts below before proceeding. Completed 003/004 changed capture storage and validation, but leave the scanner behavior and exemplar tests described here intact. Stop on an unexplained mismatch.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `004-handle-invalid-pattern-compilation.md`; retain its rejection contract and serialize shared parser/test edits before plan 007
- **Category**: perf
- **Planned at**: commit `42ff699`, 2026-10-02

## Why this matters

Rejected named groups repeatedly scan the same suffix, making malformed-input discovery quadratic even though the parser advertises linear scanning. A read-only primitive-string probe measured approximately 38/105/389/1525 ms for 5k/10k/20k/40k characters. This preprocessing runs before the diff algorithm's deadline. Make source discovery linear while preserving the existing expected-pattern language and the valid inner group discovered inside a rejected outer group.

## Current state

- `src/lib/expectedPatterns.ts` contains private `findNamedGroups`, used by public `parseExpectedPatterns` and `cleanTemplate`; it also contains extraction and tagging, which this plan does not redesign.
- `src/lib/expectedPatterns.test.ts` uses Vitest `describe`, `it`, and `expect`, importing helpers from `./expectedPatterns.js`.
- `src/routes/tests/component-performance/002/+page.svelte` is the diagnostic exemplar: render a running state before synchronous work, retain results and errors, expose `data-status`, `data-elapsed-ms`, and `data-ceiling-ms`, and allow rerun.
- `tests/component-performance.test.ts:12` defines `assertDiagnosticPass`, which waits for terminal status and checks the declared ceiling. Keep the existing 001–005 tests and thresholds unchanged; add an isolated 006 route and test.
- `vite.config.ts:16` includes `src/lib/**/*.test.ts`; `playwright.config.ts` runs five browser projects and builds/previews the app. The new browser workload must run with one worker when gathering baseline timing evidence.

`src/lib/expectedPatterns.ts:156` currently starts a fresh suffix scan for every candidate:

```ts
let depth = 1
let j = patternStart
let hasNestedNamedGroup = false
let inCharacterClass = false
while (j < text.length && depth > 0) {
    if (text[j] === '\\') {
        j += 2
        continue
    }
    // Character-class state and parenthesis depth are updated here.
    j++
}
```

`src/lib/expectedPatterns.ts:190` advances only one character after rejection:

```ts
if (depth === 0 && !hasNestedNamedGroup) {
    const pattern = text.slice(patternStart, j)
    const fullMatch = text.slice(startIndex, j + 1)
    results.push({ fullMatch, name, pattern, index: startIndex })
    i = j + 1
} else {
    i++
}
```

`src/lib/expectedPatterns.test.ts:585` checks only one malformed opener followed by 50k ordinary characters; it does not cover repeated candidates. The compatibility requirement at `src/lib/expectedPatterns.test.ts:605` is explicit:

```ts
const text = '(?<outer>(?<inner>foo))'
// The outer group is rejected due to nested named group,
// but the inner group is still found as a standalone match
expect(result!.groups).toHaveLength(1)
expect(result!.groups[0].name).toBe('inner')
expect(result!.groups[0].pattern).toBe('foo')
```

Named-group names remain ASCII `[a-zA-Z_][a-zA-Z0-9_]*`. Inside a candidate, escaped characters do not alter depth/class state, and parentheses inside character classes do not alter depth. This plan must preserve accepted groups, `matches` indices/full text, source order, fallback text, and `cleanTemplate` output. Arbitrary trusted regular-expression execution is an existing contract: this plan improves discovery, not regex execution limits.

## Commands you will need

Run from the repository root, using the installed pnpm 12 toolchain. Do not install packages or alter package-manager pins to get a command working.

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Targeted units | `pnpm test:only src/lib/expectedPatterns.test.ts` | All target tests pass after Step 2 |
| Red/green complexity test | `pnpm test:only src/lib/expectedPatterns.test.ts -t 'rejected candidates have bounded source traversal'` | Red in Step 1; green in Step 2 |
| New browser regression | `pnpm exec playwright test tests/component-performance.test.ts --grep '^006 ' --project=chromium --workers=1` | Diagnostic pass, three samples each at most 2000 ms |
| New browser matrix | `pnpm exec playwright test tests/component-performance.test.ts --grep '^006 ' --workers=1` | All five configured projects pass |
| Existing browser diagnostics | `pnpm exec playwright test tests/component-performance.test.ts --workers=2` | All existing and new diagnostics pass, original ceilings intact |
| Typecheck | `pnpm check` | Exit 0, zero errors/warnings in the root check |
| Complete units | `pnpm test:only` | Exit 0; baseline 123 tests plus selected-plan regressions |
| Package | `pnpm run package` | Exit 0; svelte-package and publint succeed |
| Format/lint | `trunk fmt` then `trunk check` | Exit 0; no out-of-scope formatting changes |
| Scope | `git status --short` and `git diff --check` | Only allowed edits; no whitespace errors |

Trunk is the lint authority (`.trunk/trunk.yaml`), even though package.json still has a legacy lint command. Browser commands invoke the configured local build/preview server; do not install browsers automatically when binaries are absent.

## Scope

**In scope** (only these implementation files):

- `src/lib/expectedPatterns.ts` — scanner and its inaccurate complexity comment only
- `src/lib/expectedPatterns.test.ts` — scanner complexity and semantic regressions
- `src/routes/tests/component-performance/006/+page.svelte` — create standalone diagnostic
- `tests/component-performance.test.ts` — append new 006 coverage, reuse existing helpers
- `.agents/.plans/package-improvements/README.md` — only status row if not reviewer-maintained

**Out of scope**:

- Public props/types/exports; no instrumentation argument, timing hook, or callback added to the production API
- Expected-pattern regex interpretation, compilation/extraction policy, duplicate-group semantics, capture storage, tagging, or diff timeouts
- Existing diagnostic routes/tests/ceilings 001–005, their DONE plan files, diagnostic overview, docs-kit, dependencies, generated files, package manifests, CI, and tombstone implementations

## Git workflow

- Continue the dispatched `chore/package-improvements` branch, or the isolated branch explicitly assigned by the reviewer. Do not reset other agents' edits.
- When commits are authorized, use a logical conventional message, e.g. `perf: linearize rejected expected-pattern parsing`, matching `c65e2e0 perf: speed up compact rendering and refresh project tooling (#215)`.
- Do not commit, push, open a PR, or publish unless the operator separately directs that action.

## Steps

### Step 1: Add a red complexity regression and freeze compatibility with primitive inputs

In `src/lib/expectedPatterns.test.ts`, add `rejected candidates have bounded source traversal`. Use a test-local counted string facade (a Proxy around a boxed string, explicitly cast only at the test call site) with malformed repeated candidate inputs at 64, 128, and 256 markers. Count source character reads from numeric indexing, character iteration, and character access methods; charge substring/string conversion work by the number of source characters traversed. Forward normal string results and methods correctly. Use a loose budget of `64 * primitiveInput.length + 128`, not exact loop counts, call names, or a particular scanner structure. Assert `parseExpectedPatterns` returns null and stays inside this budget for every scale; exercise `cleanTemplate` with the same observation seam if forwarding its final string operations is reliable.

This is a test-only observation seam, not a valid new public input type. A read-only probe of the current scanner recorded 55,072 / 220,736 / 883,840 indexed reads for 320 / 640 / 1280 source characters, exceeding the loose bound. The facade does not prove complexity of native operations or unobserved intermediate strings; the real-string browser regression below and code review of monotonic traversal are required independent evidence. Do not convert this into an assertion of an exact scanner implementation.

Add ordinary primitive-string semantic cases, modeling the existing tests: rejected closed outer with a valid inner; several levels of rejected outer candidates; an unclosed outer retaining a closed valid inner; escaped parentheses and brackets; parentheses and marker-like text in a character class within a valid group; an escaped closing parenthesis; an unterminated class; invalid name starters; a valid group after malformed text; adjacent valid groups; multiline/Unicode literals. Assert exact groups, parts/cleaned text, indices/full matches where relevant, and `cleanTemplate` output. Preserve current observable behavior even where the outer scan rejects a candidate and an independent later candidate scan finds an inner group. Record primitive outputs before changing source so the intended semantics are explicit.

Create the standalone 006 fixture. After painting `running`, call `parseExpectedPatterns` on a primitive 80,000-character string containing 16,000 repeated unclosed named markers. Run one small warmup, then three measured calls; all outputs must be null and every call must finish in at most **2000 ms**. Expose maximum elapsed time, ceiling, sample values, input length, output validity, and failure reasons. Errors must remain rendered as `fail`, not throw before diagnostics can be read. Reuse the 002 state/paint pattern and `assertDiagnosticPass` in a new Playwright test named `006 rejects repeated malformed patterns within the discovery ceiling`; validate three samples and rerun completion. Do not mount the other expensive diagnostics in this route.

**Browser ownership**: Codex Step 1 stops after adding tests/fixture and supported unit evidence, before editing production. Guard snapshots the additions, runs the unchanged-scanner browser red command, and records raw samples. If that gate passes, the named STOP still applies. Only a confirmed red authorizes the second executor dispatch for Steps 2–3.

**Verify**: `pnpm test:only src/lib/expectedPatterns.test.ts -t 'rejected candidates have bounded source traversal'` → FAIL on the source-traversal budget, not on a facade exception or missing method. `pnpm exec playwright test tests/component-performance.test.ts --grep '^006 ' --project=chromium --workers=1` → FAIL on the 2000-ms ceiling with output-null validation intact; retain raw samples. If the old implementation passes the real-string ceiling, STOP and report the measured result rather than tightening the ceiling ad hoc. Run `pnpm test:only src/lib/expectedPatterns.test.ts -t 'scanner compatibility'` → all new primitive compatibility cases PASS before editing production code; use this describe title for the new semantic group.

### Step 2: Eliminate repeated suffix scans while preserving candidate-local boundaries

Replace the rejected-candidate rescan behavior in private `findNamedGroups`. Use a monotonic discovery traversal or precomputed candidate-boundary metadata; whichever approach is chosen must inspect each source character a bounded number of times and avoid iterating all open candidates for each nested character. Track nesting information using stack/counters or equivalent O(n) metadata, not recursive traversal or repeated searches through suffixes. Delay substring creation until emitting a surviving group so rejected ancestors cannot allocate quadratic full-match strings.

Preserve candidate-local escape/class interpretation and rejected-outer/valid-inner behavior: globally skipping an invalid outer suffix, or merely advancing `i` to `j`, is not an acceptable fix because it drops supported inner matches. Do not silently make marker discovery outside candidates obey a new global regex lexer. If a single scanner cannot reproduce the primitive compatibility snapshots, stop instead of changing accepted syntax. Keep returned groups sorted in source order and non-overlapping as today; skip inner-looking markers inside an accepted group just as the current scanner does. Update the complexity comment to distinguish linear discovery from execution of user-supplied regex bodies.

**Verify**: `pnpm test:only src/lib/expectedPatterns.test.ts` → all old tests and new deterministic/semantic tests PASS. `pnpm exec playwright test tests/component-performance.test.ts --grep '^006 ' --project=chromium --workers=1` → all three primitive samples and rerun pass the unchanged 2000-ms ceiling, correct output, and metadata assertions.

### Step 3: Run independent browser and complete repository gates

Run the new regression in the five configured browser projects with one worker, then the complete component diagnostic suite with two workers. Review the production scanner for any repeated whole-suffix pass, ancestor-by-ancestor update loop, or allocation of discarded full matches. The facade and browser diagnostic complement this review; neither justifies leaving another quadratic path. Keep exact existing 001–005 ceilings and acceptance assertions unchanged.

**Verify**: `pnpm exec playwright test tests/component-performance.test.ts --grep '^006 ' --workers=1` → five projects PASS. `pnpm exec playwright test tests/component-performance.test.ts --workers=2` → all diagnostics PASS. `pnpm check`, `pnpm test:only`, `pnpm run package`, `trunk fmt`, `trunk check`, and `git diff --check` → each exits 0. `git status --short` → only scoped files/status row, excluding unrelated changes already present at dispatch. Report build-created artifacts and restore only your incidental tracked generated changes without discarding other work.

## Test plan

- Anchor red failure: repeated rejected candidates exceed a deliberately loose linear input-access budget; the primitive browser workload exceeds its fixed 2000-ms ceiling on the old scanner.
- Green result: both complexity observations pass without any threshold increase; the same primitive fixtures retain exact prior groups and template output.
- Existing exemplar: `expectedPatterns.test.ts:605` rejects the outer group but emits the inner group; `:617` covers escapes and `:626` covers character classes.
- Keep the existing single-opener 50k trailing-character test. It tests a distinct path; do not replace it with only the repeated-marker case.
- Maintain the facade as a counting input adapter, never as a replica scanner or expected-output oracle. A future native scanner may require an equivalent test-only traversal observer; retain real primitive cases and browser evidence when changing that observer.

## Done criteria

- [ ] The named Step 1 regression exists, its red failure was recorded, and it passes all three fixed scales under the fixed loose linear budget.
- [ ] Primitive compatibility cases pass through both public helpers; closed and unclosed rejected outers retain valid inner groups exactly as before.
- [ ] The 006 fixture contains three primitive 80k-character samples, each at most 2000 ms, and validates null output; the five-browser isolated test and rerun assertions pass.
- [ ] Existing 001–005 diagnostic tests and numerical ceilings are unchanged and pass.
- [ ] `pnpm check`, `pnpm test:only`, `pnpm run package`, `trunk check`, and `git diff --check` all exit 0.
- [ ] `git status --short` contains only scoped executor changes; no public types/exports/instrumentation props, dependency changes, or DONE plan edits.
- [ ] Reviewer receives red/green evidence, browser samples, and a brief account of how candidate-local boundary semantics remain compatible; status row updated if delegated.

## STOP conditions

- Scanner or exemplar semantics differ unexpectedly from the excerpts after known predecessor edits.
- The counting facade fails because it is not correctly forwarding string behavior; do not claim this as the red complexity failure.
- The primitive browser red workload passes the original scanner ceiling, or requires changing an existing DONE diagnostic threshold.
- Linear traversal requires changing how accepted groups, escaped markers, classes, rejected ancestors, source order, or malformed fallback behave.
- A new public instrumentation seam, dependency, recursive parser, or out-of-scope edit appears necessary.
- Any verification fails twice after a reasonable correction; missing pnpm/browser binaries require reporting, not installation or threshold relaxation.

## Maintenance notes

Review the algorithm's work on rejected ancestors, not only accepted patterns. A stack alone does not guarantee O(n): updating every ancestor or copying every rejected candidate can still be quadratic. Keep compatibility examples and real browser evidence when changing lexer boundaries. Regex execution remains trusted configuration and is outside this scanner complexity guarantee. Record the new scanner guarantee in the new batch index if needed; do not rewrite historical DONE plans.
