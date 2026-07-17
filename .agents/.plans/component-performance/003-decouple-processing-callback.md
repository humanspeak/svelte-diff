# Plan 003: Decouple diff computation from processing callbacks

> **Executor instructions**: Execute every step and verification in order. Stop
> rather than improvising when a STOP condition occurs. When complete, update
> this plan's row in `.agents/.plans/component-performance/README.md` unless a
> reviewer told you they own the index.
>
> **Drift check (run first)**:
> `git diff --stat 8e3082c..HEAD -- src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/routes/tests/component-performance/+page.svelte tests/component-performance.test.ts`
> Plans 001 and 002 intentionally change these files. Confirm their compiled
> template, linear tagging, and diagnostic-page postconditions remain present.
> STOP if the computation/callback flow has
> otherwise been restructured already.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: `001-compile-expected-patterns-once.md`, `002-linearize-expected-region-tagging.md`
- **Category**: perf
- **Planned at**: commit `8e3082c`, 2026-07-17

## Why this matters

The current computation effect calls `onProcessing` synchronously. Because
Svelte tracks reactive values read anywhere in a synchronous effect call stack,
the callback prop becomes a dependency of the expensive diff computation.
Replacing only the callback can therefore run `diff_main`, cleanup, expected
pattern extraction, and display conversion again even when every algorithm
input is unchanged.

Separating a computed result from notification lets callback changes reuse the
same diff array. It also creates the state shape Plan 005 needs to make the pure
result SSR-visible while keeping callbacks client-only.

## Current state

`src/lib/SvelteDiff.svelte:93-144` mixes calculation, notification, and state
assignment:

```ts
const computeDiff = (text1: string, text2: string) => {
    // configure dmp, parse, diff, clean, and calculate timing
    onProcessing?.(timing, diffs, captures)

    if (captureRanges.length > 0) {
        displayDiffs = tagExpectedRegions(diffs as [number, string][], captureRanges)
    } else {
        displayDiffs = diffs.map(([operation, text]) => ({ operation, text }))
    }
}

$effect(() => {
    computeDiff(originalText, modifiedText)
})
```

The existing callback test at `src/lib/SvelteDiff.test.ts:39-53` verifies timing
shape only. It does not rerender or distinguish a cached diff result from a new
one. Tests use `render`/`waitFor` from `@testing-library/svelte` and `vi.fn()`;
follow that style.

After Plan 001, `computeDiff` should receive/reuse a compiled expected-pattern
plan. Preserve that behavior. Repository conventions require arrow functions,
Trunk formatting, and no public API changes in this plan.

## Commands you will need

| Purpose              | Command                                                                                                                                                    | Expected on success                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Targeted tests       | `pnpm vitest run src/lib/SvelteDiff.test.ts --coverage.enabled=false --reporter=default`                                                                   | all component tests pass                      |
| Diagnostic E2E       | `pnpm playwright test tests/component-performance.test.ts --project=chromium -g "003"`                                                                     | 003 callback swap visibly passes within 75 ms |
| Unit suite           | `pnpm vitest run src/lib --coverage.enabled=false --reporter=default`                                                                                      | all library tests pass                        |
| Type/Svelte check    | `pnpm check`                                                                                                                                               | exit 0                                        |
| Package verification | `pnpm build`                                                                                                                                               | exit 0                                        |
| Format               | `trunk fmt src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/routes/tests/component-performance/+page.svelte tests/component-performance.test.ts`   | exit 0                                        |
| Lint                 | `trunk check src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/routes/tests/component-performance/+page.svelte tests/component-performance.test.ts` | exit 0                                        |

## Scope

**In scope**:

- `src/lib/SvelteDiff.svelte`
- `src/lib/SvelteDiff.test.ts`
- `src/routes/tests/component-performance/+page.svelte`
- `tests/component-performance.test.ts`
- `.agents/.plans/component-performance/README.md` (status only)

**Out of scope**:

- Public props/types, renderer precedence, published component markup, and
  compact rendering. The shared diagnostic page is explicitly in scope.
- Server rendering; keep computation in a client effect until Plan 005.
- Changing timing field names or what `onProcessing` receives.
- Debouncing, throttling, asynchronous computation, or Web Workers.
- Expected-pattern helper internals except consuming Plan 001's compiled result.
- A second benchmark route or test suite; extend the shared loud diagnostics.

## Git workflow

- Branch: `advisor/component-perf-003-callback-effects`, or continue on the
  operator's branch if instructed.
- Commit message: `perf(component): decouple processing callback`.
- Do not push/open a PR unless instructed; preserve unrelated work.

## Steps

### Step 1: Add a red callback-only rerender test

In `src/lib/SvelteDiff.test.ts`, add a test named
`reuses the computed diff when only onProcessing changes`.

1. Render a nontrivial component with a first callback.
2. Wait for the first callback and save the exact diff array object from its
   second argument.
3. Use Testing Library's returned `rerender` function with identical algorithm
   props and a different callback function.
4. Wait for the new callback.
5. Assert the new callback receives the same diff array object with `toBe`, not
   merely an equal array with `toEqual`.

The intended notification behavior is that replacing the callback may notify
the new observer once with the latest result, but must not recompute that result.
Do not assert timing values or invocation order more tightly than necessary.

**Verify**:
`pnpm vitest run src/lib/SvelteDiff.test.ts --coverage.enabled=false --reporter=default -t "reuses the computed diff when only onProcessing changes"`
→ FAILS because current code recomputes and supplies a newly allocated diff
array. If `rerender` does not trigger the new callback, first confirm the test
uses complete props; do not weaken the identity assertion.

### Step 2: Make computation return one result object

In `src/lib/SvelteDiff.svelte`, define a private TypeScript result shape with:

- `timing` using the existing `{ main, cleanup, total }` shape;
- the raw `diffs` array passed to callbacks;
- optional `captures`;
- `displayDiffs` used by markup.

Refactor `computeDiff` so it returns that object and does not read
`onProcessing` or assign reactive state. It may configure the per-component
`DiffMatchPatch` instance and perform the existing synchronous algorithm, but
all observable outputs must be in the returned object.

Keep exact timing semantics for this plan. Do not expand `total` to cover
parsing or display conversion; that is a separate API decision.

**Verify**: `pnpm check` → exit 0, and searching the `computeDiff` body shows no
`onProcessing` read and no assignment to component `$state`.

### Step 3: Separate calculation and notification effects

Add one nullable `$state` holding the latest result. The calculation effect
must read only actual computation dependencies—`originalText`, `modifiedText`,
`timeout`, cleanup settings, and Plan 001's compiled template—and assign the
returned result.

Add a second effect that reads the latest result and `onProcessing`, returns
early before an initial result exists, then invokes the callback with the
stored timing, raw diffs, and captures. Markup should iterate the stored
`displayDiffs` (or an empty array before the first client computation).

This separation intentionally means changing the callback can notify it with
the cached result while leaving the calculation effect clean. Do not use a
module-level cache. Do not make calculation a `$derived` yet; that is Plan 005.

**Verify**:
`pnpm vitest run src/lib/SvelteDiff.test.ts --coverage.enabled=false --reporter=default -t "reuses the computed diff when only onProcessing changes"`
→ passes, including `toBe` identity for the raw diff array.

### Step 4: Cover real computation dependencies

Add or update rerender tests showing that changing each of these does produce a
new result: `originalText`, `modifiedText`, `cleanupSemantic`, and
`cleanupEfficiency`. One table-driven test is sufficient. Assert changed raw
diff identity and, where appropriate, changed DOM text. A timeout-only identity
assertion is optional because identical fast inputs can produce equivalent
output, but the effect must still read `timeout`.

Preserve the existing callback timing and capture tests.

**Verify**:
`pnpm vitest run src/lib/SvelteDiff.test.ts --coverage.enabled=false --reporter=default`
→ all component tests pass.

### Step 5: Activate the 003 callback diagnostic and 75 ms ceiling

Replace the 003 PENDING card in
`src/routes/tests/component-performance/+page.svelte` with a live harness around
a dedicated `SvelteDiff` instance. Use two 3,000-line texts with changes on
every tenth line so an accidental recomputation is material. After the initial
`onProcessing` call, retain the exact raw diff array object.

Perform five sequential callback-only prop swaps. For each swap, start a timer,
replace the callback state without changing any algorithm prop, wait for the new
callback, and record elapsed time. The card passes only if:

- every callback receives the exact retained raw diff object (`===`);
- all five callbacks arrive;
- every callback swap completes in `<= 75 ms`;
- samples, ceiling, text size, diff count, identity results, maximum, and
  failure reasons are visible and exposed through the standard `data-*` fields.

Use one warm callback before measuring. Do not include initial diff computation
in the 75 ms callback-swap ceiling. Do not hide the component with `display:
none`; place the rendered probe in a collapsed `<details>` element so a human
can inspect it without losing component lifecycle behavior.

Extend `tests/component-performance.test.ts` with a `003` test using the shared
card helper. It must assert visible PASS, max `<= 75`, and displayed
`identity matches: 5/5`. Assertion output must contain the diagnostic card text.

**Verify**:
`pnpm playwright test tests/component-performance.test.ts --project=chromium -g "003"`
→ the 003 card is green, shows five identity matches and max `<= 75 ms`. Run
three times. If the optimized callback-only path misses the ceiling, STOP and
report all samples rather than changing the workload or ceiling.

### Step 6: Run the complete gate

Run formatting, targeted lint, all library tests, type checking, and packaging.

**Verify**:

```bash
trunk fmt src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/routes/tests/component-performance/+page.svelte tests/component-performance.test.ts
trunk check src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/routes/tests/component-performance/+page.svelte tests/component-performance.test.ts
pnpm vitest run src/lib --coverage.enabled=false --reporter=default
pnpm check
pnpm build
pnpm playwright test tests/component-performance.test.ts --project=chromium -g "00[1-3]"
```

Expected: every command exits 0 and only in-scope files plus the README status
row are modified.

## Test plan

- Red-first anchor: callback-only rerender receives a new diff array today and
  must receive the identical cached array after separation.
- Verify new callbacks can observe the latest result once without recomputation.
- Verify actual algorithm-input changes produce new results.
- Exercise five callback-only swaps on the visible 3,000-line browser harness;
  require stable identity and a hard 75 ms maximum per swap.
- Preserve timing shape, capture callback argument, renderer behavior, and all
  existing tests.

## Done criteria

- [ ] The callback-only identity test failed before implementation and passes.
- [ ] `computeDiff` returns data and does not read callbacks or write state.
- [ ] Calculation and notification are separate reactive effects.
- [ ] Callback identity changes do not allocate a new raw diff array.
- [ ] Diagnostic 003 visibly reports identity results, five samples, ceiling,
      maximum, and failure reasons; all swaps complete in `<= 75 ms`.
- [ ] Actual computation prop changes still recompute.
- [ ] Trunk, all library tests, `pnpm check`, and `pnpm build` exit 0.
- [ ] No out-of-scope file is modified.
- [ ] The 003 row in the batch README is updated to DONE.

## STOP conditions

Stop and report if:

- Testing Library's `rerender` cannot preserve a mounted component in this
  version; do not replace the test with a timing threshold.
- Separating effects changes callback argument values or causes a reactive loop.
- Plan 001's compiled template is recomputed during callback-only rerenders.
- The change starts computing during SSR; that is deliberately Plan 005.
- The fixed callback-only workload exceeds 75 ms in any of three consecutive
  verification runs after recomputation is removed.
- A verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Keep callbacks out of pure computation dependencies. Any future observer prop
  should read the stored result in the notification effect.
- Review object identity in tests: it is the deterministic signal that no new
  `diff_main` result was allocated.
- Keep the visible timing ceiling alongside identity; the former catches user-
  perceived regressions while the latter proves the intended dependency fix.
- Plan 005 will replace the calculation `$state`/effect with an SSR-visible
  `$derived`, but should preserve the separate callback effect established here.
