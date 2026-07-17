# Plan 002: Tag expected regions in one forward sweep

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. Stop
> at any condition listed below; do not improvise. Update this plan's row in
> `.agents/.plans/component-performance/README.md` when done unless a reviewer
> told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 8e3082c..HEAD -- src/lib/expectedPatterns.ts src/lib/expectedPatterns.test.ts src/routes/tests/component-performance/+page.svelte tests/component-performance.test.ts`
> Plan 001 intentionally changes both files. If its README row is DONE, compare
> its postconditions rather than expecting a clean diff. STOP if capture ranges
> are no longer sorted or `tagExpectedRegions` semantics differ from the current
> excerpts below.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: `001-compile-expected-patterns-once.md`
- **Category**: perf
- **Planned at**: commit `8e3082c`, 2026-07-17

## Why this matters

`tagExpectedRegions` currently filters the complete capture-range array for
every equal or inserted diff segment. With `D` display segments and `R` capture
ranges, that is O(D × R) even though both inputs progress monotonically through
`modifiedText`. A read-only synthetic diagnostic at the planned commit took
about 617 ms for 10,000 one-character segments and 5,000 ranges. A forward
cursor should reduce the work to O(D + R + actual overlaps).

## Current state

`extractCaptures` sorts ranges by start position before returning them
(`src/lib/expectedPatterns.ts:397-401`):

```ts
captureRangesInText2.sort((a, b) => a.start - b.start)
return { resolvedText, captures: allCaptures, captureRangesInText2 }
```

`tagExpectedRegions` then performs the repeated full scans in both insert and
equal branches (`src/lib/expectedPatterns.ts:454-506`):

```ts
for (const [operation, text] of diffs) {
    if (operation === -1) {
        result.push({ operation, text })
        continue
    }

    // insert branch
    const overlapping = captureRanges.filter((cr) => cr.start < segEnd && cr.end > segStart)
    // ...

    // equal branch repeats the same filter
    const overlapping = captureRanges.filter((cr) => cr.start < segEnd && cr.end > segStart)
}
```

Behavior that must remain exact:

- Remove (`-1`) segments do not advance `text2Pos`.
- Insert and equal segments advance `text2Pos` by `text.length`.
- Portions overlapping a capture become operation `0` with `expected` set.
- Non-overlapping portions retain their original operation.
- A single capture may span several adjacent diff segments.
- Existing tests at `src/lib/expectedPatterns.test.ts:161-255` are the behavior
  contract and structural exemplar.

Repository conventions require arrow functions, exported-function JSDoc, and
Trunk formatting/linting.

## Commands you will need

| Purpose              | Command                                                                                                                                                            | Expected on success                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| Targeted test        | `pnpm vitest run src/lib/expectedPatterns.test.ts --coverage.enabled=false --reporter=default`                                                                     | all expected-pattern tests pass       |
| Diagnostic E2E       | `pnpm playwright test tests/component-performance.test.ts --project=chromium -g "002"`                                                                             | 002 card visibly passes within 100 ms |
| Unit suite           | `pnpm vitest run src/lib --coverage.enabled=false --reporter=default`                                                                                              | all library tests pass                |
| Type/Svelte check    | `pnpm check`                                                                                                                                                       | exit 0                                |
| Package verification | `pnpm build`                                                                                                                                                       | exit 0, including publint             |
| Format               | `trunk fmt src/lib/expectedPatterns.ts src/lib/expectedPatterns.test.ts src/routes/tests/component-performance/+page.svelte tests/component-performance.test.ts`   | exit 0                                |
| Lint                 | `trunk check src/lib/expectedPatterns.ts src/lib/expectedPatterns.test.ts src/routes/tests/component-performance/+page.svelte tests/component-performance.test.ts` | exit 0                                |

## Scope

**In scope**:

- `src/lib/expectedPatterns.ts`
- `src/lib/expectedPatterns.test.ts`
- `src/routes/tests/component-performance/+page.svelte`
- `tests/component-performance.test.ts`
- `.agents/.plans/component-performance/README.md` (status only)

**Out of scope**:

- `src/lib/SvelteDiff.svelte`, renderers, public props, and DOM behavior.
- Expected-pattern parsing, regex compilation, and template caching from Plan 001.
- Changing the returned `DisplayDiff` shape or operation values.
- Adding benchmark dependencies or a second diagnostic page; extend Plan 001's
  shared page and Playwright suite.
- Supporting overlapping capture groups not produced by the current extractor.

## Git workflow

- Branch: `advisor/component-perf-002-linear-tagging`, or continue on the
  operator's branch if instructed.
- Commit message: `perf(component): linearize expected region tagging`.
- Do not push or open a PR unless instructed.
- Preserve unrelated changes and Plan 001's completed work.

## Steps

### Step 1: Add a deterministic red complexity test

In the `tagExpectedRegions` describe block of
`src/lib/expectedPatterns.test.ts`, add a test named
`reads sorted capture ranges approximately linearly`.

Construct 200 non-overlapping, sorted one-character capture ranges across 400
one-character equal diff segments. Wrap the range array in a `Proxy` whose
`get` trap increments a counter whenever a numeric array index is read. Call
`tagExpectedRegions`, assert the reconstructed output text is unchanged, assert
the expected regions are present, and assert numeric range reads are below
5,000.

The threshold is intentionally generous: an O(D + R + overlaps)
implementation should be far below it, while the current 400 × 200 `.filter`
implementation performs roughly 80,000 numeric element reads. Do not assert
elapsed time.

**Verify**:
`pnpm vitest run src/lib/expectedPatterns.test.ts --coverage.enabled=false --reporter=default -t "reads sorted capture ranges approximately linearly"`
→ FAILS because the numeric read counter exceeds 5,000. If it fails for output
correctness or TypeScript setup instead, fix the test; if it passes on current
code, STOP and report the invalid reproduction.

### Step 2: Replace repeated filters with a capture cursor

Refactor `tagExpectedRegions` in `src/lib/expectedPatterns.ts` to maintain one
forward range cursor alongside `text2Pos`:

1. Before processing a non-remove segment, advance the base range cursor past
   ranges whose `end <= segStart`.
2. Starting from that cursor, examine ranges only while
   `range.start < segEnd`.
3. Emit before/overlap/after slices exactly as current code does.
4. Do not permanently advance past a range whose `end > segEnd`; it must be
   revisited for the next diff segment when one capture spans several segments.
5. Preserve operation `1` outside expected portions of inserts, operation `0`
   outside expected portions of equals, and operation `0` inside expected
   portions of both.

Extract the duplicated insert/equal slicing into a small private arrow helper
only if that makes the invariants clearer. Avoid allocating `overlapping`
arrays. Do not mutate the incoming ranges.

Plan 001 must preserve sorted ranges from `extractCaptures`. Add a development
comment next to the cursor stating that order is required. Do not sort on every
segment. If direct helper robustness requires accepting unsorted input, sort a
single copy once at function entry and document the O(R log R) fallback; do not
reintroduce per-segment sorting or scanning.

**Verify**:
`pnpm vitest run src/lib/expectedPatterns.test.ts --coverage.enabled=false --reporter=default -t "reads sorted capture ranges approximately linearly"`
→ the new complexity test passes with fewer than 5,000 indexed reads.

### Step 3: Add boundary regression cases

Extend the existing behavior tests with these named cases if they are not
already covered:

- one expected range spanning two consecutive equal diff segments;
- one expected range spanning an insert followed by an equal segment;
- ranges ending exactly at a segment start and starting exactly at a segment end;
- several remove segments between text2-advancing segments;
- empty range array (existing pass-through behavior must remain).

Assert complete `DisplayDiff[]` arrays, not only text content.

**Verify**:
`pnpm vitest run src/lib/expectedPatterns.test.ts --coverage.enabled=false --reporter=default`
→ all existing and new tests pass.

### Step 4: Activate the loud 002 diagnostic with a 100 ms ceiling

In `src/routes/tests/component-performance/+page.svelte`, replace the 002
PENDING card created by Plan 001 with a live diagnostic. Import
`tagExpectedRegions` directly from the internal `$lib/expectedPatterns.js`
module; this test route is inside the repository and must not cause a new
package-root export.

Use exactly 10,000 one-character equal diff segments and 5,000 sorted,
non-overlapping one-character ranges—the same scale that took roughly 617 ms in
the read-only audit. Run one unmeasured warmup, then three measured sequential
samples. The card passes only when:

- every output reconstructs the input text;
- every expected range is represented correctly;
- every measured call is `<= 100 ms` (committed ceiling);
- the maximum, all samples, segment/range counts, output count, and any failure
  reason are visible and mirrored in `data-*` attributes.

Update the overall banner so 001 and 002 both participate while later cards
remain PENDING. A failed 002 sample must paint a red card; do not throw or log
only to the console.

Extend `tests/component-performance.test.ts` with a test whose title contains
`002`. Reuse Plan 001's diagnostic-card helper to require visible PASS and
elapsed `<=` the card's 100 ms ceiling. Include the card text in assertion
messages.

**Verify**:
`pnpm playwright test tests/component-performance.test.ts --project=chromium -g "002"`
→ the 002 card is green, shows three samples, and reports max `<= 100 ms`. Run
the command three times. If any optimized run exceeds the ceiling, STOP and
report all samples instead of changing the ceiling or workload.

### Step 5: Run the full gate and inspect complexity

Run formatting, lint, all unit tests, type checking, and package verification.
Also inspect the implementation with `rg` to prove no range-wide `.filter`
remains inside `tagExpectedRegions`.

**Verify**:

```bash
trunk fmt src/lib/expectedPatterns.ts src/lib/expectedPatterns.test.ts src/routes/tests/component-performance/+page.svelte tests/component-performance.test.ts
trunk check src/lib/expectedPatterns.ts src/lib/expectedPatterns.test.ts src/routes/tests/component-performance/+page.svelte tests/component-performance.test.ts
pnpm vitest run src/lib --coverage.enabled=false --reporter=default
pnpm check
pnpm build
pnpm playwright test tests/component-performance.test.ts --project=chromium -g "00[12]"
```

Expected: all commands exit 0; inspecting the function shows a forward cursor
and no `captureRanges.filter` call.

## Test plan

- Red-first anchor: proxy-counted indexed reads exceed 5,000 on the current
  nested scan and fall below 5,000 after the cursor implementation.
- Preserve exact output arrays for inserts, equals, removes, capture boundaries,
  and captures spanning more than one diff.
- Use deterministic access counts for the complexity proof and the browser's
  100 ms maximum as a separate end-to-end regression ceiling.
- Keep the 002 PASS/FAIL card, samples, workload, result counts, and reasons
  visible to humans and machine-readable to Playwright.
- Keep all existing expected-pattern tests green.

## Done criteria

- [ ] The Step 1 test failed against the nested-filter implementation and passes.
- [ ] `tagExpectedRegions` performs no full range `.filter` per diff segment.
- [ ] Complexity is O(D + R + actual overlaps) for sorted, non-overlapping ranges.
- [ ] Diagnostic 002 visibly passes three 10,000-segment/5,000-range samples,
      each in `<= 100 ms`, and its Chromium E2E test passes.
- [ ] All old/new expected-region output assertions pass exactly.
- [ ] Trunk, library tests, `pnpm check`, and `pnpm build` exit 0.
- [ ] Only in-scope files and the README status row are modified.
- [ ] The 002 row in the batch README is updated to DONE.

## STOP conditions

Stop and report if:

- Plan 001 no longer returns capture ranges sorted by ascending `start`.
- Existing behavior permits overlapping ranges and the cursor changes which
  group wins; resolving overlap semantics needs a separate decision.
- The optimized function changes any existing `DisplayDiff[]` assertion.
- A correct fix appears to require component or public API changes.
- The optimized fixed workload exceeds 100 ms in any of three consecutive
  verification runs; report raw samples instead of loosening the guard.
- A verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Future capture producers must return sorted ranges; add tests at that boundary.
- Complexity assertions should count operations/accesses, never milliseconds.
- Keep the operation-count test as the algorithmic proof and the visible timing
  ceiling as the user-facing regression guard; neither replaces the other.
- Reviewers should pay special attention to captures spanning segment boundaries;
  advancing the cursor too eagerly is the most likely regression.
