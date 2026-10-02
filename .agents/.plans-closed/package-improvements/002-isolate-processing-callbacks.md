# Plan 002: Isolate processing callback reads from effect dependencies

> **Executor instructions**: Read this plan completely and follow each step in order. Run each verification command and confirm its expected result before continuing. On a STOP condition, report instead of improvising. The operator maintains `.agents/.plans/package-improvements/README.md`; report your completion to them rather than editing their index unless explicitly delegated.
>
> **Drift check (run first)**: `git diff --stat fa0cfc9..HEAD -- src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/lib/test/ProcessingCallbackFixture.svelte`. Compare any changed in-scope files with the excerpts below. Reconcile explicitly listed prerequisite changes; stop on unrelated drift or assumptions that no longer hold. Also run `git status --short` to identify pre-existing local changes.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `fa0cfc9`, 2026-10-02

## Why this matters

`onProcessing` runs inside a tracking effect. Consumer callbacks that read and increment their own Svelte state become dependencies of that effect and can repeatedly notify themselves without a new diff, ultimately reaching Svelte's effect update limit. Isolating the callback body prevents feedback while retaining notifications for new results and replacement callback identities.

## Current state

- `src/lib/SvelteDiff.svelte:188–229` owns computation caching and observer notification. The current callback invocation is:

```ts
$effect(() => {
    const result = processingResult
    onProcessing?.(result.timing, result.diffs, result.captures)
})
```

- `src/lib/SvelteDiff.test.ts:56–84` already establishes callback replacement semantics:

```ts
await rerender({ ...props, onProcessing: secondCallback })
await waitFor(() => {
    expect(secondCallback).toHaveBeenCalled()
})
expect(secondCallback.mock.calls[0][1]).toBe(firstDiffs)
```

- The same file at lines 87–136 checks recomputation when computation props change. `vite.config.ts:26–31` includes `src/lib/**/*.test.ts`; its Svelte testing plugin and browser condition support real rune behavior. `vitest.setup.ts:15–23` installs fake timers before each test: avoid arbitrary sleeps; use `flushSync`/`tick` for deterministic state settling and follow existing `waitFor` patterns for notification assertions.
- `src/routes/tests/component-performance/003/+page.svelte:49–58` is an existing style exemplar: typed arrow callback with a short JSDoc comment. Match this convention in a new small fixture, without modifying the diagnostic page.

The Svelte 5/TypeScript library deliberately defaults to character diffing. Word/line diffs remain lossless and skip cleanup. Preserve automatic expected-pattern interpretation for valid templates, compiled-pattern reuse on target-only edits, cached diff array identity on callback-only edits, forward expected-region tagging, compact DOM rendering, and meaningful SSR. Do not reopen the completed `.agents/.plans/component-performance/` initiative. Regex extraction remains outside the algorithm timeout by design.

## Commands you will need

Use the existing pnpm 12.6.0/Node toolchain. No install, dependency changes, builds, commits, pushes, or PRs are authorized by this planning task; the commands below are gates for a separately authorized executor. Run from the executor checkout root.

| Purpose           | Command                         | Expected on success                         |
| ----------------- | ------------------------------- | ------------------------------------------- |
| Typecheck         | `pnpm run check`                | exit 0; 0 errors, 0 warnings                |
| All library units | `pnpm exec vitest run src/lib/` | exit 0; all existing and new tests pass     |
| Format            | `trunk fmt`                     | exit 0; inspect changed files against scope |
| Lint              | `trunk check`                   | exit 0; no new findings                     |
| Package           | `pnpm run package`              | exit 0; svelte-package and publint succeed  |

`.trunk/trunk.yaml:25–87` enables the repository lint/format tools and ignores plan Markdown. Trunk is authoritative; do not substitute the legacy `pnpm run lint` command. The operator-reported audit baseline for the unchanged library contains 123 passing tests and `svelte-check` 0 errors/0 warnings; the fa0cfc9 refresh changes package/README versions only. This planning pass did not rerun those gates. Counts will increase as sibling plans land.

| Browser integration gate                    | Command                                                                                       | Expected on success                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------ |
| Cached callback / compact / SSR diagnostics | `pnpm exec playwright test --config=playwright.config.ts tests/component-performance.test.ts` | exit 0; all configured projects pass |

## Scope

**In scope** (only files to modify):

- `src/lib/SvelteDiff.svelte` — import `untrack` and isolate observer execution.
- `src/lib/SvelteDiff.test.ts` — add focused observer dependency tests.
- `src/lib/test/ProcessingCallbackFixture.svelte` — create a minimal test-only parent using actual `$state` and arrow callbacks.

**Out of scope**:

- `src/lib/expectedPatterns.ts`, `src/lib/diffModes.ts`, public props/types and renderer markup.
- Diagnostic routes, browser-test configuration, dependencies, generated files, docs application, and completed performance plans/indexes.

## Git workflow

- Initiative branch: `chore/package-improvements`, created from fresh `origin/main` at `fa0cfc9`. The operator controls whether each executor uses this checkout or an isolated per-plan worktree; do not create, switch, or merge branches on your own.
- This plan authorizes a handoff, not execution. Once separately authorized, implement only this plan's scope. Do not install dependencies, commit, push, or open a PR unless the operator explicitly authorizes it.
- If commits are later authorized, use the repository's conventional style, for example `fix: isolate processing callback dependencies`; history exemplar: `c65e2e0 perf: speed up compact rendering and refresh project tooling (#215)`.
- The operator owns the batch README. Report completion and gate results to them; do not edit the index unless specifically delegated.

## Steps

### Step 1: Add a failing regression with real consumer state

Create `src/lib/test/ProcessingCallbackFixture.svelte`, importing `SvelteDiff` via `../SvelteDiff.svelte`. Accept a typed `observe: (value: number) => void` prop and an `incrementOnProcessing?: boolean` prop, default true. Use `let counter = $state(0)` and a stable local arrow callback that reads counter, calls `observe(counter)`, then increments only when `incrementOnProcessing && counter < 3`. This bounded guard stops the baseline feedback after four notifications, so the red test cannot hang the suite. Render the component with constant `originalText="a"`/`modifiedText="b"`, a counter output, and a button with an arrow handler that increments counter. Add short JSDoc for the callback explaining the bounded guard.

In `src/lib/SvelteDiff.test.ts`, following the existing notification tests, add `it('does not subscribe to state read and written by onProcessing', ...)`. Render the fixture with `observe = vi.fn()`, settle with `flushSync` and `await tick()` (import from `svelte`), then assert exactly one notification and visible counter value `1`. Do not merely assert a callback happened. Add a second test `it('does not notify when state only read by onProcessing changes', ...)` with `incrementOnProcessing: false`: assert one initial call, click the increment button, settle, and assert it stays one. The second test isolates dependency tracking from self-written state.

**Verify**: `pnpm exec vitest run src/lib/SvelteDiff.test.ts -t 'does not subscribe to state read and written by onProcessing'` → FAIL, expected 1 notification but received 4 (counter is 3). A framework update-depth failure indicates the guard was implemented incorrectly; repair the fixture before continuing.

**Verify**: `pnpm exec vitest run src/lib/SvelteDiff.test.ts -t 'does not notify when state only read by onProcessing changes'` → FAIL, expected 1 notification but received 2 after the button click. If either passes against baseline, STOP: the test did not observe tracked rune reads.

### Step 2: Untrack only callback execution

Import `untrack` from `svelte` in `src/lib/SvelteDiff.svelte`. Read both `processingResult` and `onProcessing` inside the effect before entering `untrack`; retain them as `result` and `callback`. Invoke `callback?.(result.timing, result.diffs, result.captures)` inside `untrack(() => { ... })`. Do not place the effect's result/callback reads inside `untrack`, defer invocation, add notification state, or change caching. This preserves callback replacement notifications with the exact cached array.

**Verify**: `pnpm exec vitest run src/lib/SvelteDiff.test.ts -t 'does not subscribe|does not notify|reuses the computed diff|recomputes when'` → PASS for both new regressions, the cached-array replacement test, and computation dependency cases.

### Step 3: Verify the full library and published behavior

Run each command independently: `pnpm run check`; `pnpm exec vitest run src/lib/`; `pnpm exec playwright test --config=playwright.config.ts tests/component-performance.test.ts`; `trunk fmt`; `trunk check`; `pnpm run package`. Inspect `git diff --name-only` and `git status --short`; formatting must not introduce source changes outside scope. If formatting changes code, rerun affected unit tests and typecheck. Report commands and results to the operator for the index update.

**Verify**: all commands exit 0; typecheck 0 errors/0 warnings; diagnostics continue meeting their existing ceilings, callback swaps receive the identical cached array, and SSR/compact tests remain green.

## Test plan

- The bounded real `$state` fixture is essential: a plain JavaScript variable or mocked `vi.fn()` alone cannot reproduce tracked callback reads.
- Anchor tests fail baseline with notification counts 4 and 2, respectively; green counts remain 1. A direct state assignment with no reads is not this bug and should not be described as a reproduction.
- Existing replacement-callback identity and computation dependency tests must pass unchanged. Preserve callback exception propagation; `untrack` must not swallow consumer errors.
- Browser diagnostics provide integration coverage of callback caching, compact rendering, and SSR without adding a new UI surface.

## Done criteria

- [ ] Both named new dependency regressions exist and pass after demonstrating baseline failure.
- [ ] Existing replacement callback receives the same diff array; computation input changes still notify.
- [ ] `pnpm run check` exits 0 with 0 errors/0 warnings.
- [ ] `pnpm exec vitest run src/lib/` exits 0.
- [ ] `pnpm exec playwright test --config=playwright.config.ts tests/component-performance.test.ts` exits 0.
- [ ] `trunk fmt`, `trunk check`, and `pnpm run package` exit 0.
- [ ] `git diff --name-only` contains only scoped source/test paths; ignored generated outputs are not committed.
- [ ] Completion and gate results are sent to the operator for the batch status row.

## STOP conditions

Stop and report if baseline source differs beyond declared sibling work, either red test passes before the fix, the bounded fixture loops indefinitely, callback replacement stops receiving cached results, verification fails twice after a reasonable fix attempt, or any fix requires out-of-scope files. Do not broaden this into computation/cache refactoring.

## Maintenance notes

Keep result and callback identity reads tracked whenever the observer effect changes. Future consumers may read arbitrary synchronous rune state in callbacks; only their callback bodies belong inside `untrack`. Preserve exception behavior and synchronous effect notification timing.
