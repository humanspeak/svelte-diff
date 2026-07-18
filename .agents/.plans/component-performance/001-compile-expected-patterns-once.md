# Plan 001: Compile expected-pattern metadata once per original text

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update this plan's row in
> `.agents/.plans/component-performance/README.md` unless a reviewer told you
> they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 8e3082c..HEAD -- src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/lib/expectedPatterns.ts src/lib/expectedPatterns.test.ts src/routes/tests/component-performance/001/+page.svelte tests/component-performance.test.ts`
> If an in-scope file changed, compare the excerpts below with the live code.
> STOP if the parsing and extraction flow no longer matches this plan.
>
> **Diagnostic route revision (2026-07-18)**: 001 owns
> `/tests/component-performance/001`. The unnumbered route is a navigation-only
> index. Do not run 001 on the index or add cards/workloads for other plans to
> the 001 page.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `8e3082c`, 2026-07-17

## Why this matters

When `modifiedText` changes but `originalText` is stable, the component still
rescans the original template several times. It finds named groups in
`parseExpectedPatterns`, finds them again in `groupByLine`, recompiles every
per-line `RegExp`, and finds them a third time in `resolveTemplate`. The live
editor use case updates `modifiedText` on every keystroke, so immutable template
work should be compiled once and reused until `originalText` changes.

A read-only synthetic diagnostic at the planned commit measured about 354 ms in
`extractCaptures` for a 5,000-group template. That input is deliberately large,
but it exposes the avoidable scaling and repeated setup work this plan removes.

## Current state

- `src/lib/SvelteDiff.svelte` owns reactive diff computation.
- `src/lib/expectedPatterns.ts` parses templates, builds line regexes, extracts
  captures, resolves templates, and tags display ranges.
- `src/lib/expectedPatterns.test.ts` is the unit-test exemplar for all expected
  pattern helpers.
- `src/lib/SvelteDiff.test.ts` is the component rerender/DOM test location.
- `src/routes/tests/component-performance/001/+page.svelte` is the dedicated
  browser-visible diagnostic surface for this plan. The unnumbered route is an
  index only; Plans 002–005 each own a separate numbered route.
- `tests/component-performance.test.ts` does not exist yet. This plan creates
  the Playwright suite and a reusable assertion helper for diagnostic cards.

The component reparses inside every computation (`src/lib/SvelteDiff.svelte:99`):

```ts
const parseResult = parseExpectedPatterns(text1)
if (parseResult) {
    const extractResult = extractCaptures(text1, text2, parseResult)
```

The parse result contains only groups and string parts
(`src/lib/expectedPatterns.ts:51-55`), while extraction discards that work and
rescans (`src/lib/expectedPatterns.ts:239-244`):

```ts
interface ParseResult {
    groups: ParsedGroup[]
    parts: string[]
}

const groupByLine = (originalText: string, _parseResult: ParseResult) => {
    const matches = findNamedGroups(originalText)
    const lines = originalText.split('\n')
```

Every extraction builds new regex objects and resolution rescans again
(`src/lib/expectedPatterns.ts:372-397` and `414-416`):

```ts
for (const [, { lineText, groups }] of lineMap) {
    const regex = buildLineRegex(lineText, groups)
    const match = regex.exec(modifiedText)
}

const resolvedText = resolveTemplate(originalText, allCaptures)
// resolveTemplate calls findNamedGroups(text) again
```

Repository conventions:

- TypeScript functions use arrow functions; exported functions have
  Google-style JSDoc (`CLAUDE.md`).
- Formatting and lint authority is Trunk (`.trunk/trunk.yaml`), not the stale
  package lint scripts.
- Preserve all public `SvelteDiff` props and rendered behavior.
- Keep `parseExpectedPatterns`, `extractCaptures`, and `cleanTemplate` exports
  usable by their existing tests even though they are not re-exported from the
  package root.

## Commands you will need

| Purpose              | Command                                                                                                                                                                                                                     | Expected on success                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Targeted tests       | `pnpm vitest run src/lib/expectedPatterns.test.ts src/lib/SvelteDiff.test.ts --coverage.enabled=false --reporter=default`                                                                                                   | all targeted tests pass                            |
| Diagnostic E2E       | `pnpm playwright test tests/component-performance.test.ts --project=chromium -g "001"`                                                                                                                                      | 001 card visibly passes within its ceiling         |
| Unit suite           | `pnpm vitest run src/lib --coverage.enabled=false --reporter=default`                                                                                                                                                       | all library tests pass                             |
| Type/Svelte check    | `pnpm check`                                                                                                                                                                                                                | exit 0, no errors                                  |
| Package verification | `pnpm build`                                                                                                                                                                                                                | Vite build, `svelte-package`, and `publint` exit 0 |
| Format               | `trunk fmt src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/lib/expectedPatterns.ts src/lib/expectedPatterns.test.ts src/routes/tests/component-performance/001/+page.svelte tests/component-performance.test.ts`   | exit 0                                             |
| Lint                 | `trunk check src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/lib/expectedPatterns.ts src/lib/expectedPatterns.test.ts src/routes/tests/component-performance/001/+page.svelte tests/component-performance.test.ts` | exit 0                                             |

## Scope

**In scope** (the only persistent files this plan may modify):

- `src/lib/SvelteDiff.svelte`
- `src/lib/SvelteDiff.test.ts`
- `src/lib/expectedPatterns.ts`
- `src/lib/expectedPatterns.test.ts`
- `src/routes/tests/component-performance/001/+page.svelte` (create)
- `tests/component-performance.test.ts` (create)
- `.agents/.plans/component-performance/README.md` (status only)

**Out of scope**:

- `src/lib/index.ts` and every public prop/type change.
- `docs/**`, every route except the dedicated component-performance test page,
  and every E2E file except `tests/component-performance.test.ts`.
- Changing expected-pattern matching semantics, regex syntax, capture ordering,
  or the cleaned fallback text.
- Replacing `diff-match-patch-ts`, adding dependencies, or changing diff cleanup.
- Optimizing `tagExpectedRegions`; that is Plan 002.

## Git workflow

- Branch: `advisor/component-perf-001-compile-patterns`, or continue on the
  operator's branch if explicitly instructed.
- Commit message: `perf(component): compile expected patterns once`.
- Do not push or open a PR unless instructed.
- Do not stage, overwrite, or commit unrelated worktree changes.

## Steps

### Step 1: Add red tests for a reusable compiled template

In `src/lib/expectedPatterns.test.ts`, add a `describe` block proving that one
call to `parseExpectedPatterns` returns all immutable artifacts needed for more
than one extraction. Name the new internal structures clearly; the required
contract is:

- source group matches and their source positions are retained;
- cleaned fallback text is precomputed;
- per-line group metadata is retained;
- each per-line regex is compiled once and remains the same object when the
  parse result is reused for two `extractCaptures` calls.

The test should parse a two-line/two-group template, retain references to the
compiled line regexes, call extraction against two different modified strings,
and assert both capture results plus referential equality of the regex objects.
Against current code, the test must fail because the parse result exposes no
compiled line matchers or cleaned template.

Do not use elapsed-time assertions. They are noisy in CI and do not prove reuse.

**Verify**:
`pnpm vitest run src/lib/expectedPatterns.test.ts --coverage.enabled=false --reporter=default -t "reuses compiled expected-pattern metadata"`
→ FAILS because compiled line metadata/cleaned text is absent from the current
parse result. If it passes without implementation, STOP: the reproduction does
not describe the current code.

### Step 2: Turn the parse result into the compiled template plan

In `src/lib/expectedPatterns.ts`, extend the internal `ParseResult` so it owns
the immutable work currently repeated later. Use descriptive internal types,
for example `CompiledLinePattern`; exact property names may vary, but the result
must contain:

- the existing `groups` and `parts` fields so existing tests remain meaningful;
- the ordered `GroupMatch[]` from the single `findNamedGroups` scan;
- `cleanedText`, assembled from those retained matches;
- ordered per-line entries containing line text, groups with `indexInLine`, and
  the `RegExp` returned by `buildLineRegex`.

Build line positions in one forward pass. Precompute line start offsets while
splitting the template, then advance a line cursor through already ordered
matches. Do not retain the existing nested "scan all lines for every match"
loops at lines 248-268.

Move declarations as needed so `parseExpectedPatterns` can call the line-plan
builder and `buildLineRegex` without circular initialization. All functions
must remain arrow functions. Do not export the new internal types from
`src/lib/index.ts`.

**Verify**:
`pnpm vitest run src/lib/expectedPatterns.test.ts --coverage.enabled=false --reporter=default -t "reuses compiled expected-pattern metadata"`
→ the metadata-shape assertions pass; extraction assertions may remain red
until Step 3.

### Step 3: Consume retained matches and regexes without rescanning

Refactor `extractCaptures` to consume compiled line entries directly. It must
not call `findNamedGroups`, split the original template into lines, or call
`buildLineRegex`. Reusing a non-global/non-sticky `RegExp` with the existing `d`
flag is safe; explicitly reset `lastIndex = 0` defensively before `exec` so a
future flag change cannot leak state.

Refactor template resolution to walk the retained ordered matches from the
parse result rather than calling `findNamedGroups` again. Preserve the exact
rules for missing captures and the exact `resolvedText` output.

Keep the standalone `cleanTemplate(text)` export and its existing tests. It may
still parse when called independently, but the component's already-parsed
fallback must use `parseResult.cleanedText` rather than call `cleanTemplate`
and scan again.

Change `extractCaptures`' internal signature only if doing so makes the compiled
contract clearer. If changed, update every direct call in
`src/lib/SvelteDiff.svelte` and `src/lib/expectedPatterns.test.ts`; do not expose
a new package-root API.

**Verify**:
`pnpm vitest run src/lib/expectedPatterns.test.ts --coverage.enabled=false --reporter=default`
→ all expected-pattern tests, including the Step 1 test, pass.

### Step 4: Cache parsing by `originalText` in the component

In `src/lib/SvelteDiff.svelte`, derive the compiled parse result from
`originalText` outside `computeDiff`, then pass/read that result during
computation. A change to `modifiedText`, `timeout`, cleanup settings, or
`onProcessing` must not call `parseExpectedPatterns` again. A change to
`originalText` must compile exactly once and update the result.

Use a Svelte `$derived` expression for this cache; do not add an unbounded module
`Map`, because component instances and arbitrary user text must remain
collectable. Keep actual diff computation in its current effect for this plan;
Plans 003 and 005 own reactive and SSR restructuring.

Add a component test in `src/lib/SvelteDiff.test.ts` that renders an expected
pattern, rerenders with only `modifiedText` changed, and verifies both capture
outputs. If a stable module spy can observe `parseExpectedPatterns`, also assert
one compilation; do not add production instrumentation solely for the test.

**Verify**:
`pnpm vitest run src/lib/SvelteDiff.test.ts --coverage.enabled=false --reporter=default`
→ all component tests pass and both modified values render as expected.

### Step 5: Create the loud browser diagnostic harness and 001 ceiling

Create `src/routes/tests/component-performance/001/+page.svelte`. This is a test
and human-diagnostic route, not product documentation. It must be useful when a
developer opens it manually:

- a large heading that names the 001 capability;
- an 001 banner with highly visible `RUNNING`, `PASS`, or `FAIL` state;
- a `Run diagnostic 001` button and automatic execution after mount;
- one `data-testid="diagnostic-001"` result surface and no other plan workloads;
- strong green/red/blue styling for pass/fail/running—failure
  must not be hidden in the console;
- each live card exposes `data-status`, `data-ceiling-ms`, and
  `data-elapsed-ms`, and displays a `<dl>` plus `<pre>` containing workload,
  sample values, ceiling, observed maximum, and failure reasons;
- a failed diagnostic stays rendered and does not throw before diagnostics are
  painted.

Implement diagnostic 001 against a mounted `SvelteDiff` instance. Use a stable
750-line template with one named group per line, perform one warmup followed by
five changes to only `modifiedText`, and time each change from state assignment
until the matching `onProcessing` callback and following `tick()` complete.
Display every sample. Set the committed ceiling to **250 ms per change** and
mark the diagnostic PASS only when all five changes produce correct captures/output
and the maximum sample is `<= 250`.

The ceiling is intentionally a browser wall-clock guard, while Step 1's object
identity test proves the specific optimization. Do not replace either one with
the other. Use `performance.now()` and run samples sequentially. Do not average
away a slow sample.

Create `tests/component-performance.test.ts`. Add a small helper that locates a
numbered diagnostic, waits until it leaves `running`, reads its visible text for the
assertion message, requires `data-status="pass"`, parses the elapsed/ceiling
attributes, and asserts elapsed `<=` ceiling. Add the first test with `001` in
its title. The test must navigate directly to `/tests/component-performance/001`.
On failure, the assertion message must include the diagnostic's displayed
diagnostics so CI output is actionable.

**Verify**:
`pnpm playwright test tests/component-performance.test.ts --project=chromium -g "001"`
→ the page shows a green 001 PASS diagnostic, five sample values, max `<= 250 ms`,
and a visible mounted-component capability preview. If the optimized implementation cannot meet the
ceiling in three consecutive local runs, STOP and report the samples rather
than silently loosening it.

### Step 6: Run the complete component gate

Format the six source/test files, run targeted Trunk lint, then run the unit,
diagnostic E2E, typecheck, and package commands from the table. Inspect
`git status` and remove generated tracked-file changes if the package command
unexpectedly creates them; never discard pre-existing user changes.

**Verify**:

```bash
trunk fmt src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/lib/expectedPatterns.ts src/lib/expectedPatterns.test.ts src/routes/tests/component-performance/001/+page.svelte tests/component-performance.test.ts
trunk check src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/lib/expectedPatterns.ts src/lib/expectedPatterns.test.ts src/routes/tests/component-performance/001/+page.svelte tests/component-performance.test.ts
pnpm vitest run src/lib --coverage.enabled=false --reporter=default
pnpm check
pnpm build
pnpm playwright test tests/component-performance.test.ts --project=chromium -g "001"
```

Expected: every command exits 0; `git status --short` contains only in-scope
source/test changes and the plan index status update.

## Test plan

- Red-first anchor: `reuses compiled expected-pattern metadata` fails because
  the current parse result lacks reusable line regexes and cleaned text.
- Cover two extractions from one parse result and assert the same regex objects
  are reused.
- Cover exact capture values, capture ranges, resolved text, and cleaned fallback.
- Rerender the component with stable `originalText` and changing `modifiedText`.
- Exercise the same behavior in a visible browser page with five sequential
  750-group updates and a hard 250 ms maximum per change.
- Model assertions and fixtures after the existing parse/extract blocks in
  `src/lib/expectedPatterns.test.ts`.

## Done criteria

- [ ] The Step 1 test exists, failed before implementation, and passes afterward.
- [ ] One `findNamedGroups` scan creates all immutable metadata used by extraction.
- [ ] `extractCaptures` does not split/rescan the original template or compile regexes.
- [ ] Component updates to only `modifiedText` reuse the compiled parse result.
- [ ] `/tests/component-performance/001` visibly reports 001 PASS/FAIL, samples,
      workload, ceiling, maximum, and failure reasons.
- [ ] Diagnostic 001 completes every measured change in `<= 250 ms` and its
      Chromium E2E test passes.
- [ ] Existing capture, fallback, and renderer behavior remains green.
- [ ] Targeted Trunk check, all library tests, `pnpm check`, and `pnpm build` exit 0.
- [ ] No file outside Scope is modified, except the batch README status row.
- [ ] The 001 row in the batch README is updated to DONE.

## STOP conditions

Stop and report if:

- Existing tests reveal that callers depend on fresh `RegExp` object identity or
  mutable `lastIndex` behavior.
- Reuse changes capture order, partial matching, cleaned placeholders, or ranges.
- A correct implementation requires changing a package-root export or public prop.
- Svelte `$derived` cannot cache parsing without also changing SSR behavior; SSR
  belongs to Plan 005.
- The fixed 750-line browser workload cannot pass the 250 ms ceiling in three
  consecutive runs after the optimization; report raw samples before changing
  workload or ceiling.
- Any verification command fails twice after a reasonable fix attempt.

## Maintenance notes

- Treat the parse result as an immutable compiled plan. If future work adds
  global/sticky regex flags, reset or clone state deliberately before execution.
- Reviewers should search for `findNamedGroups(` and `buildLineRegex(` calls and
  confirm the component hot path reaches each only through parsing.
- Plan 002 assumes capture ranges stay sorted and will optimize range tagging;
  preserve `captureRangesInText2.sort(...)`.
- Keep the diagnostic page intentionally loud and machine-readable. Later plans
  must create their own numbered pages and may reuse the E2E helper; they must
  not mount their workloads on 001 or the unnumbered index.
