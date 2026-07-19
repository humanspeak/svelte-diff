# Plan 004: Add compact rendering for unstyled equal text

> **Executor instructions**: Execute this plan exactly, including the red test
> and every verification. Stop on the listed conditions rather than expanding
> scope. Update this plan's row in
> `.agents/.plans/component-performance/README.md` when finished unless a
> reviewer told you they maintain the index.
>
> **Revision 2026-07-19**: Tighten the settled-render ceiling from 300 ms to
> 25 ms at maintainer request after repeated local samples peaked near 10 ms.
> Re-baseline the plan at `ded1d12`; workload and DOM assertions are unchanged.
>
> **Revision 2026-07-19**: Default `compact` to `true` for the 0.4.0 minor
> release at maintainer direction. Preserve `compact={false}` as the legacy-DOM
> escape hatch, document the migration, and make the 004 preview prove both
> paths. Re-baseline the plan at `a82afb4`.
>
> **Drift check (run first)**:
> `git diff --stat a82afb4..HEAD -- src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/lib/index.ts src/lib/index.test.ts README.md src/routes/tests/component-performance/004/+page.svelte tests/component-performance.test.ts`
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
- **Planned at**: commit `a82afb4`, 2026-07-19

## Why this matters

The built-in renderer wraps every equal fragment in a `<span>`, even when it has
no class or style. For multiline segments it renders one span per nonempty line
plus a `<br>` per newline. In a read-only 10,000-line diagnostic with 10% of
lines changed, the current shape implied 22,999 elements; 11,000 were unstyled
equal spans. Rendering those equal fragments as text would reduce element count
by about 48% for that case.

The package documentation explicitly describes default span rendering, so
changing the default can break consumer selectors and tests. The maintainer has
chosen that compatibility boundary for the 0.4.0 minor release so ordinary
consumers receive the DOM reduction without discovering an opt-in. The
`compact={false}` escape hatch preserves the legacy wrappers during migration.
Custom equal snippets and `rendererClasses.equal` retain their exact precedence
and markup in both modes.

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
- Default `compact=true` removes unstyled built-in equal wrappers.
- Explicit `compact=false` preserves the legacy equal-span DOM.
- Functions use arrow syntax; use Trunk for formatting/lint.

## Commands you will need

| Purpose              | Command                                                                                                                                                                                                         | Expected on success              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Targeted tests       | `pnpm vitest run src/lib/SvelteDiff.test.ts src/lib/index.test.ts --coverage.enabled=false --reporter=default`                                                                                                  | all component/type tests pass    |
| Diagnostic E2E       | `pnpm playwright test tests/component-performance.test.ts --project=chromium -g "004"`                                                                                                                          | compact card passes within 25 ms |
| Unit suite           | `pnpm vitest run src/lib --coverage.enabled=false --reporter=default`                                                                                                                                           | all library tests pass           |
| Type/Svelte check    | `pnpm check`                                                                                                                                                                                                    | exit 0                           |
| Package verification | `pnpm build`                                                                                                                                                                                                    | exit 0, including publint        |
| Docs verification    | `pnpm --filter docs check && pnpm --filter docs build`                                                                                                                                                          | docs check/build exit 0          |
| Format               | `trunk fmt src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/lib/index.ts src/lib/index.test.ts README.md src/routes/tests/component-performance/004/+page.svelte tests/component-performance.test.ts`   | exit 0                           |
| Lint                 | `trunk check src/lib/SvelteDiff.svelte src/lib/SvelteDiff.test.ts src/lib/index.ts src/lib/index.test.ts README.md src/routes/tests/component-performance/004/+page.svelte tests/component-performance.test.ts` | exit 0                           |

## Scope

**In scope**:

- `src/lib/SvelteDiff.svelte`
- `src/lib/SvelteDiff.test.ts`
- `src/lib/index.ts`
- `src/lib/index.test.ts` only if a compile-time prop assertion is needed
- `README.md`
- `src/routes/tests/component-performance/004/+page.svelte`
- `tests/component-performance.test.ts`
- `docs/src/routes/docs/api/svelte-diff/+page.svx`
- `docs/src/routes/docs/getting-started/+page.svx`
- `docs/src/routes/docs/guides/performance/+page.svx`
- `docs/src/routes/docs/migration/+page.svx`
- Generated docs mirrors produced from those source pages
- `.agents/.plans/component-performance/README.md` (status only)

**Out of scope**:

- Removing the `compact={false}` legacy-DOM escape hatch.
- Changing insert/remove/expected elements or inline styles.
- Changing snippet signatures, precedence, or `lineBreak` semantics.
- Docs paths outside the named pages and their generated mirrors, routes outside
  the dedicated 004 performance diagnostic, or generated package output.
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
the default `compact` value, no equal snippet, and no equal renderer class. Assert:

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

### Step 2: Add and document the public prop and new default

Add `compact?: boolean` to `SvelteDiffProps` in `src/lib/index.ts` with JSDoc:

- default `true`, with `false` restoring legacy equal spans;
- when true, built-in equal segments without an equal class render as text;
- custom `equal` snippets/renderers and `rendererClasses.equal` still create
  whatever markup they request;
- line breaks continue through the `lineBreak` renderer.

Destructure `compact = true` in `src/lib/SvelteDiff.svelte` and add the matching
component `@property` documentation. Add the prop to the root README prop table,
performance section, and a concise 0.4.0 migration note showing
`compact={false}`. Update the docs API, performance, getting-started, and
migration pages plus their generated mirrors.

If `src/lib/index.test.ts` contains the canonical type fixture, add
`compact: false` to one `SvelteDiffProps` value to prove the legacy opt-out is
typed rather than creating a runtime-only type test.

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

- omitted/default `compact` removes unstyled equal wrappers;
- `compact: false` retains the legacy equal `<span>`;
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

### Step 5: Activate the 004 DOM-weight diagnostic and 25 ms ceiling

Create `src/routes/tests/component-performance/004/+page.svelte` as a dedicated
default-compact probe. Render 2,000 identical newline-separated lines with no
explicit `compact` prop, no equal snippet/renderer, and no equal class. Place the
probe in a collapsed `<details>` element, not `display:none`, and retain a
`bind:this` wrapper so the diagnostic can count DOM elements.

After one warmup, perform five sequential updates where both original and
modified text change to a new but still-identical 2,000-line value. Measure from
the state change through the matching processing result and following `tick()`.
Set the committed ceiling to **25 ms per settled render**. The diagnostic passes only
when every sample is `<= 25 ms` and every settled probe has:

- zero `<span>` elements for equal text;
- exactly 1,999 `<br>` elements;
- exact complete text content;
- no insert/remove/expected elements.

Display sample values, ceiling, maximum, line count, current span/break counts,
text length, and all failure reasons. Populate the standard `data-status`,
`data-ceiling-ms`, and `data-elapsed-ms` attributes. Add a visible side-by-side
capability preview comparing `compact={false}` legacy output with the new default
and making the missing equal-text spans observable. Do not mount diagnostics
001–003.

Add a `004` Playwright test that navigates directly to
`/tests/component-performance/004` and uses the shared helper, then explicitly
assert the visible metrics say `spans: 0` and `breaks: 1999` and the capability
preview is visible. Include diagnostic text in failures.

**Verify**:
`pnpm playwright test tests/component-performance.test.ts --project=chromium -g "004"`
→ green 004 page, five samples all `<= 25 ms`, zero spans, 1,999 breaks, and a
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

- Red-first anchor: before implementation, a default render creates 100 spans
  for 100 equal lines; after compact rendering becomes the default, it creates
  zero spans and 99 breaks.
- Preserve legacy DOM behind `compact={false}` and every custom equal-renderer
  precedence path.
- Cover newline edge cases and unchanged insert/remove/expected markup.
- Prefer exact DOM counts over snapshots; retain the separate 25 ms browser
  ceiling as a user-perceived regression guard.
- Show PASS/FAIL and complete workload/timing/DOM diagnostics on the dedicated 004 page.

## Done criteria

- [ ] The Step 1 compact DOM test failed before implementation and passes.
- [ ] `compact` is typed and documented with default `true`, with
      `compact={false}` preserving legacy equal spans.
- [ ] Qualifying equal text creates no wrapper elements in compact mode.
- [ ] The new default removes unstyled equal wrappers; explicit legacy mode and
      custom renderer/class behavior remain unchanged.
- [ ] Newline break counts and text content are exact.
- [ ] Diagnostic 004 visibly reports five samples, ceiling, maximum, and DOM
      counts; all 2,000-line settled renders complete in `<= 25 ms`.
- [ ] Trunk, all library tests, `pnpm check`, and `pnpm build` exit 0.
- [ ] No out-of-scope file is modified.
- [ ] The 004 row in the batch README is updated to DONE.

## STOP conditions

Stop and report if:

- Release metadata does not mark this default-DOM change as a 0.4.0 minor and
  breaking change.
- Raw equal text changes whitespace or line-break behavior in any test.
- Supporting compact mode requires changing snippet signatures or wrapping
  arbitrary custom snippets in invalid inline markup.
- Plan 003's result separation is lost or computation behavior changes.
- The fixed 2,000-line compact workload exceeds 25 ms in any of three
  consecutive verification runs after implementation.
- A verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Review compact and default paths together whenever rendering precedence changes.
- The DOM-count test is the permanent regression tripwire; keep it deterministic.
- Keep visible browser timing and DOM counts together so a future "faster" path
  cannot pass by silently restoring wrapper elements.
- Keep the 0.4.0 migration note and `compact={false}` escape hatch available for
  consumers relying on the former default equal spans.
