# Plan 005: Render the initial diff during SSR

> **Executor instructions**: Follow every step and verification in order. This
> plan deliberately depends on the four preceding component-performance plans;
> do not execute it against the original component shape. Stop and report any
> STOP condition rather than improvising. Update this plan's row in
> `.agents/.plans/component-performance/README.md` when done unless a reviewer
> told you they maintain the index.
>
> **Revision 2026-07-19**: Plan 004 was approved and merged with compact
> rendering as the default for 0.4.0 and `compact={false}` as the legacy
> equal-span escape hatch. Preserve both paths during SSR and hydration; this
> supersedes the original opt-in predecessor assumption without changing Plan
> 005's SSR scope or gates. Re-baseline the plan at `6fdbfba`.
>
> **Revision 2026-07-19**: Cap the complete Playwright matrix at two workers.
> The unconstrained ten-worker run repeatedly failed inherited 25–100 ms
> browser ceilings under CPU contention while all 005 tests passed; the same
> 110-test matrix passed with two workers in 50.1 seconds versus 46.2 seconds
> for the failing run and about 72 seconds serially. Preserve all five projects,
> tests, workloads, assertions, and ceilings. Re-baseline the plan at `266eb52`.
>
> **Drift check (run first)**:
> `git diff --stat 266eb52..HEAD -- src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/routes/tests/component-performance/005/+page.svelte tests/component-performance.test.ts`
> Confirm Plans 001–004 are marked DONE and satisfy the expected predecessor
> state below. Changes from those plans are expected; unrelated computation or
> SSR changes are a STOP condition.
>
> **Diagnostic route convention (2026-07-18)**: 005 owns
> `/tests/component-performance/005`. The unnumbered route is a navigation-only
> index. Do not run 005 on the index or mount diagnostics 001–004 here.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `001-compile-expected-patterns-once.md`, `002-linearize-expected-region-tagging.md`, `003-decouple-processing-callback.md`, `004-add-compact-dom-rendering.md`
- **Category**: perf
- **Planned at**: commit `266eb52`, 2026-07-19

## Why this matters

Svelte `$effect` does not run during server rendering. At the planned commit,
`displayDiffs` starts empty and is populated only after the component mounts,
so SvelteKit sends an empty diff container, then computes and inserts the result
during hydration. That delays useful content, creates avoidable layout work, and
makes the component ineffective for no-JavaScript rendering.

SSR matters for this library. The pure calculation should therefore be a
`$derived` value consumed by markup, while `onProcessing` remains in a client
effect. Server and client will each calculate the result in their own runtime;
this plan improves first response content and hydration stability rather than
claiming to eliminate client computation.

## Current and expected predecessor state

At commit `8e3082c`, `src/lib/SvelteDiff.svelte:90-144` initializes an empty
array and computes only in an effect:

```ts
let displayDiffs = $state<DisplayDiff[]>([])

$effect(() => {
    computeDiff(originalText, modifiedText)
})
```

A read-only Svelte server compilation confirmed the generated server component
iterates the initial empty `displayDiffs`; it contains the `computeDiff`
declaration but no call.

Before this plan starts, predecessors must have produced this conceptual shape:

- Plan 001: expected-pattern metadata is a `$derived` compiled only from
  `originalText` and reused by computation.
- Plan 002: expected range tagging uses a forward cursor.
- Plan 003: `computeDiff` returns one result object containing timing, raw diffs,
  captures, and display diffs; a calculation effect stores it; a separate
  callback effect invokes `onProcessing`.
- Plan 004: markup defaults to compact equal rendering, while
  `compact={false}` preserves the legacy equal-span DOM.

Plans 001–004 created isolated numbered diagnostics and shared Playwright
coverage. This plan creates the final `/tests/component-performance/005` SSR
page. The unnumbered performance route and application root remain index and
regression fixtures respectively; neither may contain the SSR workload.

Repository conventions: arrow functions, public JSDoc, Trunk format/lint, and
conventional commits. Preserve all public props and callback arguments.

## Commands you will need

| Purpose                     | Command                                                                                                                                                        | Expected on success                        |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| SSR red/green test          | `pnpm playwright test tests/component-performance.test.ts --project=chromium -g "005"`                                                                         | loud no-JS SSR card passes within 3,000 ms |
| Targeted browser regression | `pnpm playwright test tests/component-performance.test.ts tests/default.test.ts tests/expected-patterns.test.ts --project=chromium`                            | all targeted Chromium tests pass           |
| Unit suite                  | `pnpm vitest run src/lib --coverage.enabled=false --reporter=default`                                                                                          | all library tests pass                     |
| Type/Svelte check           | `pnpm check`                                                                                                                                                   | exit 0                                     |
| Package verification        | `pnpm build`                                                                                                                                                   | exit 0, including publint                  |
| Full E2E                    | `pnpm playwright test --workers=2`                                                                                                                             | all configured browser projects pass       |
| Format                      | `trunk fmt src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/routes/tests/component-performance/005/+page.svelte tests/component-performance.test.ts`   | exit 0                                     |
| Lint                        | `trunk check src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/routes/tests/component-performance/005/+page.svelte tests/component-performance.test.ts` | exit 0                                     |

## Scope

**In scope**:

- `src/lib/SvelteDiff.svelte`
- `src/lib/SvelteDiff.test.ts` only for hydration/callback regressions if needed
- `src/routes/tests/component-performance/005/+page.svelte`
- `tests/component-performance.test.ts`
- `.agents/.plans/component-performance/README.md` (status only)

**Out of scope**:

- Every route outside the dedicated 005 component-performance diagnostic.
- Public prop/type changes, new SSR flags, or a client-only opt-out API.
- Worker offloading, async diffing, streaming, or server-side caching across users.
- Changing diff, cleanup, expected-pattern, compact-rendering, or callback semantics.
- Docs application and generated package artifacts.

## Git workflow

- Branch: `advisor/component-perf-005-ssr-diffs`, or continue on the operator's
  branch if instructed.
- Commit message: `perf(component): render initial diff during SSR`.
- Do not push/open a PR unless instructed; preserve all predecessor work and
  unrelated changes.

## Steps

### Step 1: Create a loud no-JavaScript 005 red-test page

In `src/routes/tests/component-performance/005/+page.svelte`, create an SSR
probe that compares two fixed, distinctive strings
and supplies unique classes `ssr-diagnostic-equal`, `ssr-diagnostic-remove`,
and `ssr-diagnostic-insert`. Keep the probe inside the visible 005 diagnostic.

Make PASS/FAIL work without page JavaScript by rendering both messages and
using CSS `:has(...)` selectors:

- default state: a large red `FAIL — diff missing from server HTML` is visible
  and the green PASS message is hidden;
- when the diagnostic contains all three unique diff classes: hide FAIL and show a
  large green `PASS — diff present in server HTML`;
- display static diagnostics for workload, required classes, and the committed
  **3,000 ms local preview navigation ceiling**.

The no-JavaScript state must not depend on `onMount`, attribute mutation, or a
console log. With JavaScript enabled, integrate the probe into an 005-only
banner and machine-readable diagnostic state after mount. After the
window `load` event, read the current `PerformanceNavigationTiming.duration`,
show the actual duration beside the 3,000 ms ceiling, and populate
`data-ceiling-ms`/`data-elapsed-ms`. The JavaScript-enabled diagnostic passes only when
the SSR classes are present and navigation duration is `<= 3,000`; do not use
an average or hide a failed value.

In `tests/component-performance.test.ts`, add a separate describe block with
`test.use({ javaScriptEnabled: false })` and a test whose title contains `005`.
Measure `page.goto('/tests/component-performance/005')` with Node's
`performance.now()`, then assert inside `diagnostic-005`:

- the green PASS text is visible and red FAIL text is hidden;
- all three unique diff classes are present and visible;
- distinctive diff text is inside the probe, not merely elsewhere on the page;
- navigation completes in `<= 3,000 ms`.

Include actual elapsed time and the entire diagnostic text in assertion messages.
Against the effect-only current architecture, the test must fail on the visible
red message/missing classes even if navigation is fast.

**Verify**:
`pnpm playwright test tests/component-performance.test.ts --project=chromium -g "005"`
→ FAILS because the no-JavaScript page visibly shows SSR FAIL and lacks the
three classes. If it passes before implementation, inspect raw server HTML and
STOP because the audited assumption changed.

### Step 2: Replace the calculation effect with an SSR-visible derived result

In `src/lib/SvelteDiff.svelte`, replace Plan 003's nullable calculation `$state`
and calculation `$effect` with `$derived.by(() => computeDiff(...))`. Pass/read
all actual algorithm dependencies inside the derived callback:

- `originalText` and `modifiedText`;
- `timeout`, `cleanupSemantic`, and `cleanupEfficiency`;
- Plan 001's compiled expected-pattern result.

The returned result object must be non-null and must contain the same raw diffs,
captures, timing, and display diffs established in Plan 003. Markup must read
`processingResult.displayDiffs`, which forces calculation during server render.

Keep the `DiffMatchPatch` instance per component, not module-global. Its timeout
and edit-cost mutation must remain isolated to that instance. `performance.now`
is available in the supported Node 22/24 and browser/Worker targets; do not add
a browser-only guard that would suppress server calculation.

Do not call `onProcessing` inside the derived callback. Svelte derived
expressions must remain free of external notification side effects.

**Verify**: `pnpm check` → exit 0, and a source inspection shows no calculation
`$effect`, no nullable empty result, and markup directly consumes the derived
display result.

### Step 3: Preserve client-only callback notification

Keep Plan 003's separate `$effect` for `onProcessing`. It should read the
derived result and the latest callback, then invoke the callback with the same
three arguments. Because `$effect` is client-only, SSR must render markup but
must not invoke user callbacks on the server.

Run the callback-only rerender identity test from Plan 003. Changing only
`onProcessing` must rerun notification with the same raw diff array and must not
invalidate the derived computation.

If needed, add a focused component test proving the initial client callback
still fires once with timing/diffs/captures after mounting. Do not assert exact
timing numbers or make server callback behavior observable through a new API.

**Verify**:
`pnpm vitest run src/lib/SvelteDiff.test.ts --coverage.enabled=false --reporter=default`
→ all component tests pass, including cached diff identity and existing capture
callback assertions.

### Step 4: Turn the loud SSR diagnostic green and verify hydration parity

Run the no-JavaScript test; it must now show the green PASS message, hide the
red FAIL message, see all three diff classes, and navigate within 3,000 ms.
Then run the performance page, root tests, and expected-pattern tests with
normal JavaScript. Normal hydration must produce no console errors, duplicate
text, missing classes, or failed existing assertions. The 005-only banner must
show PASS, and the page must visibly show the browser navigation duration,
3,000 ms ceiling, and rendered SSR diff capability. Do not run 001–004 here.

If Playwright does not already fail on console errors, add a local listener in
the SSR/hydration test for `pageerror` and hydration-related console errors; do
not create a repository-wide console policy in this plan.

**Verify**:

```bash
pnpm playwright test tests/component-performance.test.ts --project=chromium -g "005"
pnpm playwright test tests/component-performance.test.ts tests/default.test.ts tests/expected-patterns.test.ts --project=chromium
```

Expected: both commands exit 0; the no-JavaScript response contains visible diff
markup and JavaScript hydration preserves it.

### Step 5: Run the complete SSR/component gate

Format and lint in-scope files, then run unit tests, type checking, package
verification, and the complete Playwright matrix. The Playwright command invokes
the configured build/preview server; do not launch a separate server manually.

**Verify**:

```bash
trunk fmt src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/routes/tests/component-performance/005/+page.svelte tests/component-performance.test.ts
trunk check src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/routes/tests/component-performance/005/+page.svelte tests/component-performance.test.ts
pnpm vitest run src/lib --coverage.enabled=false --reporter=default
pnpm check
pnpm build
pnpm playwright test --workers=2
```

Expected: every command exits 0 across all configured projects. `git status
--short` lists only in-scope files and the README status update; test reports and
generated build output must not be committed.

## Test plan

- Red-first anchor: a Chromium context with JavaScript disabled visibly shows a
  red SSR FAIL before this change and a green PASS with equal/remove/insert
  output afterward.
- Enforce a 3,000 ms ceiling around local preview navigation and print actual
  elapsed time plus card diagnostics on failure.
- Preserve the callback-only raw diff identity test from Plan 003.
- Run normal JavaScript root and expected-pattern tests to catch hydration drift.
- Run all unit and browser projects before completion.
- Do not use snapshots or raw source strings outside the result container as SSR
  evidence.

## Done criteria

- [ ] The no-JavaScript test failed before implementation and passes afterward.
- [ ] Initial server HTML contains meaningful diff markup.
- [ ] Diagnostic 005 visibly flips from red FAIL to green PASS without
      JavaScript and local preview navigation completes in `<= 3,000 ms`.
- [ ] With JavaScript, the 005 page banner shows diagnostic 005 PASS.
- [ ] Pure computation is `$derived`; no calculation `$effect` remains.
- [ ] `onProcessing` remains client-only and receives unchanged arguments.
- [ ] Callback-only changes reuse the same raw diff array.
- [ ] The compact default and `compact={false}` legacy DOM both hydrate without
      duplication/errors.
- [ ] Trunk, all library tests, `pnpm check`, `pnpm build`, and the two-worker
      full Playwright matrix exit 0.
- [ ] No route except the dedicated 005 diagnostic page, public API, docs app, or other
      out-of-scope file is modified.
- [ ] The 005 row in the batch README is updated to DONE.

## STOP conditions

Stop and report if:

- Any predecessor plan is not DONE or its required state is missing.
- Server execution of `diff-match-patch-ts` or `performance.now` fails in the
  repository's supported build/preview target.
- SSR and client produce different diff segmentation or hydration errors.
- Making SSR work requires invoking `onProcessing` on the server or adding a
  public opt-in/opt-out prop.
- The no-JavaScript test can pass only by weakening the loud diagnostic or using
  client JavaScript; the probe must reflect actual server HTML.
- Optimized local preview navigation exceeds 3,000 ms in any of three
  consecutive verification runs; report elapsed times before changing it.
- Server rendering exposes a correctness/security issue with user-controlled
  snippets that is outside this performance plan.
- A verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Server and client each compute independently. Do not claim cross-runtime CPU
  savings; the win is complete initial HTML and stable hydration.
- Large server-side diffs consume request CPU up to the configured timeout.
  Cross-request caching or an SSR opt-out, if later desired, needs a separate API
  design with tenant/data isolation considerations.
- Keep user callbacks in effects and pure result production in derived state.
- Review future renderer changes in both JavaScript-enabled and disabled tests.
- Keep the CSS-visible PASS/FAIL state: it lets humans diagnose SSR with scripts
  disabled and prevents E2E from being the only place the result is legible.
