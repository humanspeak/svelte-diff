# Plan 004: Add compact rendering for unstyled equal text

> **Executor instructions**: Execute this plan exactly, including the red test
> and every verification. Stop on the listed conditions rather than expanding
> scope. Update this plan's row in
> `.agents/.plans/component-performance/README.md` when finished unless a
> reviewer told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 8e3082c..HEAD -- src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/lib/index.ts src/lib/index.test.ts README.md src/routes/tests/component-performance/004/+page.svelte tests/component-performance.test.ts`
> Plans 001–003 intentionally change the component, tests, and diagnostics. Confirm
> their README rows are DONE and their postconditions remain. STOP on any other
> mismatch with the rendering excerpts below.
>
> **Diagnostic route convention (2026-07-18)**: 004 owns
> `/tests/component-performance/004`. The unnumbered route is a navigation-only
> index. Do not run 004 on the index or mount another plan's workload here.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `003-decouple-processing-callback.md`
- **Category**: perf
- **Planned at**: commit `8e3082c`, 2026-07-17

## Why this matters

The built-in renderer wraps every equal fragment in a `<span>`, even when it has
no class or style. For multiline segments it renders one span per nonempty line
plus a `<br>` per newline. In a read-only 10,000-line diagnostic with 10% of
lines changed, the current shape implied 22,999 elements; 11,000 were unstyled
equal spans. Rendering those equal fragments as text would reduce element count
by about 48% for that case.

The package documentation explicitly describes default span rendering, so
silently changing the default could break consumer selectors and tests. This
plan adds an opt-in `compact` prop with a backward-compatible default of `false`.
Compact mode removes only unstyled built-in equal wrappers; custom equal
snippets and `rendererClasses.equal` retain their exact precedence and markup.

## Current state

The main template splits multiline segments and invokes a renderer per nonempty
line (`src/lib/SvelteDiff.svelte:156-185`):

```svelte
{:else if text.includes('\n')}
    {#each text.split('\n') as line, lineIndex (lineIndex)}
        {#if lineIndex > 0}{@render displayRenderers.lineBreak()}{/if}
        {#if line.length > 0}
            {@const renderer = operation === 0
                ? displayRenderers.equal
                : operation === -1
                  ? displayRenderers.remove
                  : displayRenderers.insert}
            {@render renderer(line)}
        {/if}
    {/each}
```

The fallback at `src/lib/SvelteDiff.svelte:202-204` always creates an element:

```svelte
{#snippet equalFallback(text: string)}
    <span class={rendererClasses.equal}>{text}</span>
{/snippet}
```

Public documentation at `src/lib/index.ts:46-76` says `rendererClasses` applies
to the default spans, and the root `README.md` documents all props and renderer
precedence. `src/lib/SvelteDiff.test.ts:80-119` is the precedence-test exemplar.

Constraints:

- Child snippet > `renderers.equal` > built-in behavior must remain.
- A nonempty `rendererClasses.equal` requires a span so its class has a target.
- Newlines must still produce the configured/default `lineBreak` snippet.
- Removed, inserted, and expected segments are unchanged by compact mode.
- Default `compact=false` preserves all existing DOM.
- Functions use arrow syntax; use Trunk for formatting/lint.

## Commands you will need

| Purpose              | Command                                                                                                                                                                                                         | Expected on success               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Targeted tests       | `pnpm vitest run src/lib/SvelteDiff.test.ts src/lib/index.test.ts --coverage.enabled=false --reporter=default`                                                                                                  | all component/type tests pass     |
| Diagnostic E2E       | `pnpm playwright test tests/component-performance.test.ts --project=chromium -g "004"`                                                                                                                          | compact card passes within 300 ms |
| Unit suite           | `pnpm vitest run src/lib --coverage.enabled=false --reporter=default`                                                                                                                                           | all library tests pass            |
| Type/Svelte check    | `pnpm check`                                                                                                                                                                                                    | exit 0                            |
| Package verification | `pnpm build`                                                                                                                                                                                                    | exit 0, including publint         |
| Format               | `trunk fmt src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/lib/index.ts src/lib/index.test.ts README.md src/routes/tests/component-performance/004/+page.svelte tests/component-performance.test.ts`   | exit 0                            |
| Lint                 | `trunk check src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/lib/index.ts src/lib/index.test.ts README.md src/routes/tests/component-performance/004/+page.svelte tests/component-performance.test.ts` | exit 0                            |

## Scope

**In scope**:

- `src/lib/SvelteDiff.svelte`
- `src/lib/SvelteDiff.test.ts`
- `src/lib/index.ts`
- `src/lib/index.test.ts` only if a compile-time prop assertion is needed
- `README.md`
- `src/routes/tests/component-performance/004/+page.svelte`
- `tests/component-performance.test.ts`
- `.agents/.plans/component-performance/README.md` (status only)

**Out of scope**:

- Making compact rendering the default.
- Changing insert/remove/expected elements or inline styles.
- Changing snippet signatures, precedence, or `lineBreak` semantics.
- `docs/**`, routes outside the dedicated 004 performance diagnostic, or
  generated package output.
- Coalescing diff segments or changing `diff-match-patch-ts` output.

## Git workflow

- Branch: `advisor/component-perf-004-compact-dom`, or continue on the
  operator's branch if instructed.
- Commit message: `feat(component): add compact diff rendering`.
- Do not push/open a PR unless instructed; preserve unrelated changes.

## Steps

### Step 1: Add a red compact-DOM test

In `src/lib/SvelteDiff.test.ts`, add a `SvelteDiff compact rendering` describe
block. Its anchor test should render 100 identical newline-separated lines with
`compact: true`, no equal snippet, and no equal renderer class. Assert:

- all original text is present in order;
- there are exactly 99 `<br>` elements;
- there are zero `<span>` elements.

The component currently ignores the unknown runtime prop and creates 100 equal
spans, so the DOM-count assertion must fail. If TypeScript rejects `compact`
before the test runs, use a narrowly typed test cast only for this red step and
remove it when Step 2 adds the prop.

**Verify**:
`pnpm vitest run src/lib/SvelteDiff.test.ts --coverage.enabled=false --reporter=default -t "renders multiline equal text without wrapper elements in compact mode"`
→ FAILS with spans present (or the expected missing-prop type error). If it
passes, STOP because the current DOM assumption is wrong.

### Step 2: Add and document the opt-in public prop

Add `compact?: boolean` to `SvelteDiffProps` in `src/lib/index.ts` with JSDoc:

- default `false`;
- when true, built-in equal segments without an equal class render as text;
- custom `equal` snippets/renderers and `rendererClasses.equal` still create
  whatever markup they request;
- line breaks continue through the `lineBreak` renderer.

Destructure `compact = false` in `src/lib/SvelteDiff.svelte` and add the matching
component `@property` documentation. Add the prop to the root README prop table
and performance section with one concise example. Do not edit generated docs or
the docs application.

If `src/lib/index.test.ts` contains the canonical type fixture, add `compact:
true` to one `SvelteDiffProps` value rather than creating a runtime-only type
test.

**Verify**: `pnpm check` → exit 0 with no unknown-prop or Svelte diagnostics.

### Step 3: Bypass only the unstyled built-in equal fallback

In `src/lib/SvelteDiff.svelte`, derive whether equal rendering is customized.
Compact raw-text rendering is allowed only when all are true:

- `compact` is true;
- no child `equal` snippet exists;
- no `renderers.equal` exists;
- `rendererClasses.equal` is absent or empty.

For a qualifying single-line equal segment, render `{text}` directly. For a
qualifying multiline equal segment, split on `\n`, render each nonempty line as
text, and invoke `displayRenderers.lineBreak()` at the same boundaries as
current code. Empty lines must still be represented by consecutive break
snippets.

All other paths must use existing `displayRenderers` precedence. Do not place
custom line-break snippets inside a `<span>`; they may contain arbitrary markup.
Keep keyed/unkeyed behavior unchanged unless Svelte requires a minimal syntax
change for raw text.

**Verify**:
`pnpm vitest run src/lib/SvelteDiff.test.ts --coverage.enabled=false --reporter=default -t "renders multiline equal text without wrapper elements in compact mode"`
→ passes with zero spans and 99 breaks.

### Step 4: Lock down compatibility and precedence

Add tests for:

- omitted/default `compact` retains the existing equal `<span>`;
- `compact: true` plus `rendererClasses.equal` renders classed spans;
- `compact: true` plus a child `equal` snippet uses that snippet;
- `compact: true` plus `renderers.equal` uses that renderer;
- compact mode does not remove insert/remove/expected spans;
- leading, trailing, and consecutive newlines preserve text and break count.

Follow the existing `textSnippet` and precedence tests. Avoid snapshots; assert
element counts, classes, and `textContent` directly.

**Verify**:
`pnpm vitest run src/lib/SvelteDiff.test.ts src/lib/index.test.ts --coverage.enabled=false --reporter=default`
→ all tests pass.

### Step 5: Activate the 004 DOM-weight diagnostic and 300 ms ceiling

Create `src/routes/tests/component-performance/004/+page.svelte` as a dedicated
compact-mode probe. Render 2,000 identical newline-separated lines
with `compact={true}`, no equal snippet/renderer, and no equal class. Place the
probe in a collapsed `<details>` element, not `display:none`, and retain a
`bind:this` wrapper so the diagnostic can count DOM elements.

After one warmup, perform five sequential updates where both original and
modified text change to a new but still-identical 2,000-line value. Measure from
the state change through the matching processing result and following `tick()`.
Set the committed ceiling to **300 ms per settled render**. The diagnostic passes only
when every sample is `<= 300 ms` and every settled probe has:

- zero `<span>` elements for equal text;
- exactly 1,999 `<br>` elements;
- exact complete text content;
- no insert/remove/expected elements.

Display sample values, ceiling, maximum, line count, current span/break counts,
text length, and all failure reasons. Populate the standard `data-status`,
`data-ceiling-ms`, and `data-elapsed-ms` attributes. Add a visible side-by-side
or otherwise obvious DOM capability preview that shows compact output and makes
the missing equal-text spans observable. Do not mount diagnostics 001–003.

Add a `004` Playwright test that navigates directly to
`/tests/component-performance/004` and uses the shared helper, then explicitly
assert the visible metrics say `spans: 0` and `breaks: 1999` and the capability
preview is visible. Include diagnostic text in failures.

**Verify**:
`pnpm playwright test tests/component-performance.test.ts --project=chromium -g "004"`
→ green 004 page, five samples all `<= 300 ms`, zero spans, 1,999 breaks, and a
visible compact-output preview.
Run three times; STOP and report samples if the fixed workload misses the
ceiling rather than weakening the threshold.

### Step 6: Run the complete gate

Format/lint only the in-scope files, then run all library tests, type checking,
and packaging.

**Verify**:

```bash
trunk fmt src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/lib/index.ts src/lib/index.test.ts README.md src/routes/tests/component-performance/004/+page.svelte tests/component-performance.test.ts
trunk check src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/lib/index.ts src/lib/index.test.ts README.md src/routes/tests/component-performance/004/+page.svelte tests/component-performance.test.ts
pnpm vitest run src/lib --coverage.enabled=false --reporter=default
pnpm check
pnpm build
pnpm playwright test tests/component-performance.test.ts --project=chromium -g "00[1-4]"
```

Expected: every command exits 0. `git status --short` lists only in-scope files
actually needed plus the batch README status update.

## Test plan

- Red-first anchor: `compact: true` currently renders 100 spans for 100 equal
  lines; after implementation it renders zero spans and 99 breaks.
- Preserve default DOM and every custom equal-renderer precedence path.
- Cover newline edge cases and unchanged insert/remove/expected markup.
- Prefer exact DOM counts over snapshots; retain the separate 300 ms browser
  ceiling as a user-perceived regression guard.
- Show PASS/FAIL and complete workload/timing/DOM diagnostics on the dedicated 004 page.

## Done criteria

- [ ] The Step 1 compact DOM test failed before implementation and passes.
- [ ] `compact` is typed and documented with default `false`.
- [ ] Qualifying equal text creates no wrapper elements in compact mode.
- [ ] Default DOM and custom renderer/class behavior are unchanged.
- [ ] Newline break counts and text content are exact.
- [ ] Diagnostic 004 visibly reports five samples, ceiling, maximum, and DOM
      counts; all 2,000-line settled renders complete in `<= 300 ms`.
- [ ] Trunk, all library tests, `pnpm check`, and `pnpm build` exit 0.
- [ ] No out-of-scope file is modified.
- [ ] The 004 row in the batch README is updated to DONE.

## STOP conditions

Stop and report if:

- The maintainer wants compact mode enabled by default; that is a public DOM
  compatibility decision requiring explicit semver/release direction.
- Raw equal text changes whitespace or line-break behavior in any test.
- Supporting compact mode requires changing snippet signatures or wrapping
  arbitrary custom snippets in invalid inline markup.
- Plan 003's result separation is lost or computation behavior changes.
- The fixed 2,000-line compact workload exceeds 300 ms in any of three
  consecutive verification runs after implementation.
- A verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Review compact and default paths together whenever rendering precedence changes.
- The DOM-count test is the permanent regression tripwire; keep it deterministic.
- Keep visible browser timing and DOM counts together so a future "faster" path
  cannot pass by silently restoring wrapper elements.
- A future major release may consider `compact=true` by default, but only with a
  migration note for consumers relying on default equal spans.
