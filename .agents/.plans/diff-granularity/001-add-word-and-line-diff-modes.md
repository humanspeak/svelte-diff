# Plan 001: Add word and line diff modes with complete examples and documentation

> **Executor instructions:** Read this entire plan before editing. Follow the
> steps in order and run each verification gate. Stop on the conditions below;
> do not silently change the API, broaden scope, or weaken checks. Update the
> adjacent `README.md` status when finished, unless a supervising reviewer owns
> that index. This is an implementation handoff, not an instruction to publish.
>
> **Drift check, run first:**
> `git diff --stat 57a9526..HEAD -- src/lib src/routes/tests/diff-modes tests/diff-modes.test.ts README.md docs .github/workflows/docs-diff-modes.yml`
> Compare any changed files with the current-state excerpts and contracts below.
> Stop if the relevant implementation or documentation architecture has changed.
> Also inspect `git status --short`; do not overwrite unrelated work.

## Status

- **Priority:** P1
- **Effort:** L — several days including edge cases, examples, and browser coverage
- **Risk:** MED — token boundaries, expected captures, and SSR must remain consistent
- **Depends on:** none; existing component-performance plans 001–005 are already DONE
- **Category:** direction
- **Confidence:** HIGH in the gap and integration points; the implementation is not yet prototyped
- **Planned at:** commit `57a9526`, 2026-09-28

## Why this matters

The component currently renders character-level changes. Semantic cleanup can
improve readability, but does not promise whole-word or whole-line edits. Users
reviewing prose, configuration text, logs, and snapshots need that choice while
keeping the same two-string component API and custom renderers. Ship word and
line modes together with usable, discoverable examples and precise documentation.
Sentence segmentation and structural JSON comparison are separate future work.

## Current state and evidence

- `src/lib/SvelteDiff.svelte:69` destructures reactive props; `:96` defines the
  computation input/cache. At `:147` the current computation is:

  ```ts
  const startTotal = performance.now()
  const diffs = dmp.diff_main(diffText1, text2)
  const endMain = performance.now()

  const startCleanup = performance.now()
  if (semanticCleanup) {
      dmp.diff_cleanupSemantic(diffs)
  } else if (efficiencyCleanup > 0) {
      dmp.diff_cleanupEfficiency(diffs)
  }
  ```

  Capture extraction runs before this block, replacing the template with
  `extractResult.resolvedText`, or `compiledPattern.cleanedText` on mismatch.
  `tagExpectedRegions` runs after diff/cleanup. The result is computed by
  `$derived.by`, available during SSR; only callback delivery uses `$effect`.
- `src/lib/index.ts:95` exports `{ main, cleanup, total }` timing; `:115` aliases
  the dependency's `Diff` tuple as `SvelteDiffTuple`; `:121` begins `SvelteDiffProps`.
  Keep existing aliases and callback argument shapes.
- `src/lib/expectedPatterns.ts:483` documents offset tracking into modified text.
  Its forward sweep advances on equal/insert, not remove. It can split display
  segments at capture boundaries. Do not rewrite this algorithm.
- `src/lib/SvelteDiff.test.ts:56` verifies callback-only changes reuse tuple
  identity; `:80` verifies computation-input changes invalidate it. Later groups
  cover capture behavior, renderer precedence, compact DOM, and line breaks.
  Preserve all those contracts.
- `tests/component-performance.test.ts:300` tests meaningful SSR output with
  JavaScript disabled. Existing diagnostic routes and performance ceilings are
  established behavior, not a place to add new workloads.
- `docs/src/lib/compare-data.ts:22` currently says no word/line/sentence modes.
  Its jsdiff row at `:60` combines all granularities into one false cell.
  Update these claims accurately when the feature is complete.
- `.competitive-intel/state.json:88` records the combined granularity gap.
  It also includes sentence/JSON; implementing this plan will not close it fully.
- The installed `diff-match-patch-ts` 2.0.0 provides public `diff_lineMode`, but
  its encoder in `node_modules/diff-match-patch-ts/diff-match-patch-ts.umd.js`
  uses `String.fromCharCode(lineArrayLength)` without a token-capacity guard.
  Its `diff_lineMode_` is a different, private optimization that refines changes
  back into characters. Do not confuse either with a safe complete implementation.

Read-only baseline probes against the installed engine produced:

```text
cat -> car
character: [[0,"ca"],[-1,"t"],[1,"r"]]
line:      [[-1,"cat"],[1,"car"]]

count=10\nkeep=true\n -> count=20\nkeep=true\n
character: [[0,"count="],[-1,"1"],[1,"2"],[0,"0\nkeep=true\n"]]
line:      [[-1,"count=10\n"],[1,"count=20\n"],[0,"keep=true\n"]]
```

### Documentation architecture and conventions

The project is Svelte 5, SvelteKit, TypeScript, pnpm workspaces, and Vitest plus
Playwright. The docs application deploys to Cloudflare Workers. No product brief,
ADR, or design-spec file was found; use the existing examples and docs-kit design.
`CLAUDE.md` describes arrow functions, exported-function JSDoc, and Trunk as
conventions; its reference to `SvelteDiffMatchPatch.svelte` is stale. The actual
component is `SvelteDiff.svelte`.

Use four-space indentation, single quotes, no semicolons, Svelte runes, and typed
arrow functions. Root source imports use `.js` extensions for NodeNext; type-only
imports must stay type-only. Internal helpers can be module exports for tests but
must not be re-exported from the package root unless specified here.

`docs/src/routes/examples/cleanup-modes/+page.svelte:1` is the route exemplar:

```svelte
<script lang="ts">
    import { CodeReferenceV2, ExampleV2, formatSheetLabel, type ExampleSection } from '@humanspeak/docs-kit'
    import { demoCodeSample } from '$lib/demo-loaders'
    import CleanupModes from '$lib/examples/cleanup-modes/demos/CleanupModes.svelte'
</script>

{#snippet demo()}<CleanupModes />{/snippet}
{#snippet code()}
    <CodeReferenceV2 samples={[demoCodeSample('cleanup-modes/demos/CleanupModes.svelte', 'cleanup-modes', 'CleanupModes.svelte')]} columns={1} />
{/snippet}
```

The full exemplar also sets SEO fields, source URL, notes, `ExampleSection`, and
`ExampleV2` props. Copy that structure, not just the abbreviated excerpt.
Live demo components import the package root (`@humanspeak/svelte-diff`), use
`.diff-output` and shared diff classes, and reuse `--brut-*` design tokens.
`docs/src/lib/examples/live-editor/demos/LiveEditor.svelte` is the editable-input
and reset-button exemplar. The expected-pattern example shows captured values.

`docs/src/lib/docsNav.ts:44` owns guide/example navigation and breadcrumb lookup;
`docs/src/routes/examples/+page.svelte` owns the example index. Both need edits.
`docs/vite.config.ts` uses docs-kit plugins to discover routes/demo sources and
generate loaders, sitemap, Markdown mirrors, LLM references, and social cards.
These outputs are ignored; never hand-edit them or vendor docs-kit.

## Intended API and behavior — decisions for this release

```ts
export type SvelteDiffMode = 'character' | 'word' | 'line'

// Add to SvelteDiffProps:
diffMode?: SvelteDiffMode // default: 'character'
```

```svelte
<SvelteDiff originalText={before} modifiedText={after} diffMode="word" />
<SvelteDiff originalText={before} modifiedText={after} diffMode="line" />
```

1. **Compatibility:** omitted mode and explicit `character` follow the existing
   algorithm/cleanup path unchanged, including defaults. No required prop,
   renderer, tuple, callback, or timing-object shape changes.
2. **Word mode:** compare case-sensitively using lossless, deterministic tokens:
   Unicode letter/mark/number/underscore runs; horizontal whitespace runs;
   CRLF as one token; lone CR/LF tokens; and individual remaining code points
   for punctuation/symbols. A suitable lexer is
   `/\r\n|[\r\n]|[^\S\r\n]+|[\p{L}\p{M}\p{N}_]+|[^\s\p{L}\p{M}\p{N}_]/gu`.
   Joined tokens must reproduce the exact input. Preserve spaces, tabs, blank
   lines, punctuation, case, and normalization form. Apostrophes/hyphens are
   separators, not part of a word run. This is not locale-aware segmentation:
   a continuous CJK letter run is one token, and emoji grapheme clusters are
   not guaranteed atomic. State those limitations; do not use runtime-dependent
   `Intl.Segmenter` or introduce language-specific options in this release.
3. **Line mode:** tokens are full lines including their original LF, CRLF, or
   lone-CR terminator, with an unterminated final line preserved. Blank lines
   count. Do not normalize endings or ignore indentation. Changing a value
   replaces the complete affected line; no secondary character refinement.
   JSON here is plain source text, never parsed, sorted, or canonicalized.
4. **Cleanup:** `cleanupSemantic` and `cleanupEfficiency` apply only to
   `character`. Word/line use token boundaries directly and skip both cleanup
   passes. This must be explicit in JSDoc, reference tables, guide, examples,
   and demo controls. Never run text cleanup after decoding tokens, or semantic
   cleanup on synthetic token IDs. Internal diff merging is still permitted.
5. **Expected patterns:** retain extraction -> resolved/cleaned source -> diff
   -> tagging. Diff tokenization operates on the resolved source, not the regex
   template. Raw callback tuples reconstruct that source and the original
   modified text exactly. Expected annotations may split a displayed word/line;
   whole-token guarantees apply to raw diff boundaries, not snippet invocations.
   Removals remain removals: a replaced line can show a captured value in the
  deleted line as well as an expected annotation in its replacement. Explain
  and test this; do not silently suppress deleted source text.
   Use template `Release (?<version>v\\d+)` and actual `Release v2 ready` as
   one concrete fixture: resolved source is `Release v2`, and line mode replaces
   it with the complete actual line while annotating `v2` on the target side.
6. **Renderers:** preserve precedence, compact behavior, and existing newline
   handling. A line mode is a comparison unit, not a new file/hunk renderer or
   a promise that the insert/remove snippet receives an entire multiline tuple.
7. **Timing/cache:** add mode to every computation input, comparison, and call.
   Changing it recomputes; callback-only changes still reuse the tuple array.
   For token modes, `main` includes tokenization, encoding, diff, and decoding;
   `cleanup` is exactly zero; `total` covers the timed computation. Preserve
   character timing behavior. Expected-pattern preprocessing and DOM rendering
   remain outside these measurements, as they are today.
8. **Timeout/capacity:** retain seconds and `0` for unlimited. New token work
   uses one deadline, including token preparation; never renew a full timeout
   per stage/chunk. Deadline expiry may return a coarse replacement, not throw,
   drop text, return partial text, or silently switch to character granularity.
   This is a best-effort algorithm deadline, not a hard cap on regex extraction,
   allocation, or browser rendering. A token-capacity fallback is specified below.

## Scope

Only modify/create these authored files:

- `src/lib/SvelteDiff.svelte`, `src/lib/index.ts`
- `src/lib/diffModes.ts` (new internal helper), `src/lib/diffModes.test.ts` (new)
- `src/lib/SvelteDiff.test.ts`, `src/lib/index.test.ts`
- `src/routes/tests/diff-modes/+page.svelte` (new isolated browser fixture)
- `tests/diff-modes.test.ts` (new)
- `README.md`
- `docs/src/routes/+page.svelte` (mode selector, mode labels/links, mirror-count copy only)
- `docs/src/lib/docsNav.ts`, `docs/src/lib/compare-data.ts`
- `docs/src/routes/examples/+page.svelte`
- `docs/src/routes/examples/word-diff/+page.svelte` (new)
- `docs/src/routes/examples/line-diff/+page.svelte` (new)
- `docs/src/lib/examples/word-diff/demos/WordDiff.svelte` (new)
- `docs/src/lib/examples/line-diff/demos/LineDiff.svelte` (new)
- `docs/src/routes/docs/guides/diff-modes/+page.svx` (new)
- `docs/src/routes/docs/api/svelte-diff/+page.svx`
- `docs/src/routes/docs/api/types/+page.svx`
- `docs/src/routes/docs/getting-started/+page.svx`
- `docs/src/routes/docs/guides/cleanup/+page.svx`
- `docs/src/routes/docs/guides/expected-patterns/+page.svx`
- `docs/src/routes/docs/guides/performance/+page.svx`
- `docs/static/llms-prepend.md`
- `docs/playwright.config.ts`, `docs/tests/diff-modes.test.ts` (new)
- `.github/workflows/docs-diff-modes.yml` (new verification-only workflow)
- This batch's plan/index status and execution-evidence sections.

**Out of scope:** sentence/JSON modes; new dependencies or lockfile changes;
rewriting expected-pattern helpers; patch APIs; side-by-side file views; workers,
virtualization, debouncing, locale controls, or ignoring whitespace; changes to
default character output; changing existing performance ceilings/fixtures;
vendored components; deployment config; publishing/version bumps; other plan
batches. Preserve the homepage footer alignment and bounded keyboard-scrollable
output from `57a9526`. Leave competitive-intel snapshots unchanged: they describe
a dated observation, and their combined sentence/JSON gap remains partly open.

## Git workflow

Implement on a separate feature branch such as `feat/diff-granularity` in a clean
checkout/worktree that includes `57a9526` (or its merged equivalent). Do not put
implementation commits onto the existing SEO branch just because it is checked
out. If starting from fresh main, verify that it contains the homepage changes;
otherwise report the dependency instead of silently dropping them. Match observed
conventional commits, e.g. `feat: add word and line diff modes` and
`docs: document diff modes and add interactive examples`. No push, PR, merge,
release, or deployment without operator authorization.

## Commands and verification environment

Run from repository root unless a command says otherwise. Use Node 24 and the
declared pnpm 11.22.0. Scripts below are present at the planned commit; the two
diff-modes test files and docs Playwright config are created by this plan.

| Purpose | Command | Success |
| --- | --- | --- |
| Install, executor only | `pnpm install --frozen-lockfile` | exit 0; lockfile unchanged |
| Library typecheck | `pnpm run check` | 0 errors/warnings |
| Focused unit tests | `pnpm exec vitest run src/lib/diffModes.test.ts src/lib/SvelteDiff.test.ts src/lib/index.test.ts --reporter=verbose` | all pass after implementation |
| Full unit/coverage suite | `pnpm run test` | exit 0 |
| Package and root app build | `pnpm run build` | exit 0, including publint |
| Root browser tests | `pnpm exec playwright test --config=playwright.config.ts` | all five configured projects pass |
| Focused root browser tests | `pnpm exec playwright test tests/diff-modes.test.ts --project=chromium` | all new cases pass |
| Docs source check | `pnpm --filter docs check` | 0 errors/warnings; artifact caveat below |
| Docs production build | `pnpm --filter docs build` | exit 0, including favicon validation |
| Docs browser tests | `pnpm exec playwright test --config=docs/playwright.config.ts` | desktop/mobile tests pass |
| Formatting, executor only | `trunk fmt` | formatting applied; inspect resulting diff |
| Authoritative lint | `trunk check` | no failures |
| Whitespace/scope | `git diff --check` and `git status --short` | no errors; only scoped authored changes |

Trunk enables ESLint, Prettier, markdownlint, git-diff-check, security/dependency
scanners, and workflow validators. Do not substitute package-script lint or
disable hooks to make the gate pass. `.agents/.plans/**` is excluded by Trunk.

**Known environment traps, observed during the preceding SEO work:**

- The local Homebrew pnpm 11.25 launcher failed while switching to 11.22 with a
  native-binary identity/lockfile error. Use a correctly installed declared
  version, or explicitly invoke the installed version with
  `pnpm --pm-on-fail=ignore ...` and record it. That option skips version switching,
  not integrity validation of project dependencies. Nested publint/Playwright
  build commands also invoke pnpm: fix the command environment consistently,
  not the repository's packageManager or lockfile. Do not skip publint/hooks.
- Docs-kit generates `$lib/demo-loaders` during Vite startup/build. A completely
  fresh docs check may need those generated files first. After a docs build,
  `docs/src/worker-configuration.d.ts:12` imports the generated `_worker`, and
  `checkJs` can follow compiled JavaScript and report thousands of irrelevant
  errors. This is an existing artifact-dependent issue, not scope for this feature.
  Run the docs build, then this equivalent source check while temporarily moving
  only the ignored generated entry point, restoring it even on failure:

  ```bash
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

- The docs build refreshes tracked `docs/src/lib/github-stats.json`. Save its
  baseline and restore only the build's own incidental change before finishing.
  Do not commit refreshed stats with this feature. Generated mirrors/social
  cards/loaders are ignored. Do not run `deploy` or `build:indexnow` for validation.
- Docs dev actually runs on port 8523 (`docs/vite.config.ts`), despite an older
  port in `docs/README.md`. Root browser fixtures use 4173. Use 8524 for the new
  independent docs preview test server. Do not send docs tests to the root app.

Reference: https://github.com/google/diff-match-patch/wiki/Line-or-Word-Diffs
explains the encode/diff/decode approach. Its sample private API calls are not
the integration API to use here. The installed dependency source is the precise
implementation baseline. https://github.com/kpdecker/jsdiff#api explains why a
future JSON mode needs a separate normalization contract.

## Steps

### Step 1: Add failing behavior tests before adding the prop

In `src/lib/SvelteDiff.test.ts`, add a `diff modes` describe block modeled on the
existing component/callback tests. Render `cat` -> `car` with `diffMode: 'word'`,
`cleanupEfficiency: 0`, and remove/insert classes. Assert removed text is `cat`
and inserted text is `car`, rather than `t` and `r`. Add a line-mode case with
`count=10\nkeep=true\n` -> `count=20\nkeep=true\n` asserting whole-line raw tuples
through `onProcessing`, not just visible concatenated text.

To reach a behavioral failure before the new type exists, construct a local
props variable containing `diffMode: 'word' as const` (and likewise `line`) and
pass the variable to `render`; structural extra fields allow the existing
component to ignore it. Do not add `any`, suppression comments, or public types
just to turn this into a compiler-only failure.

**Verify:** `pnpm exec vitest run src/lib/SvelteDiff.test.ts -t 'diff modes' --reporter=verbose`
fails specifically on partial-character edits: `t` vs expected `cat`, and the
single digit vs expected full line. Record that failure. A setup/import failure
does not count. If the behavior already passes, stop and inspect drift.

### Step 2: Implement a lossless internal token-diff helper

Create `src/lib/diffModes.ts` and `src/lib/diffModes.test.ts`. Keep the existing
engine and the dependency list unchanged. Use the same lossless codec for word
and line modes so both have explicit token-capacity protection.

Suggested internal shape (the exact internal name is not public API):

```ts
export const computeTokenDiff = (
    dmp: DiffMatchPatch,
    before: string,
    after: string,
    mode: 'word' | 'line',
    timeout: number
): Diff[] => { /* tokenize, encode, compare, decode */ }
```

- Handle equality and empty inputs first. Empty/empty is `[]`; identical
  nonempty input is one equality; a one-sided input is a single insert/remove.
- Tokenize according to the contract above. Newline tokens include CRLF intact.
  Line scanning must not use a split/join that loses endings or invents a final
  newline. Avoid user-generated regexes or parsing JSON.
- Build a per-computation shared `Map<string, number>` for both sides. Assign
  IDs 1 through 65,535 and encode each token as exactly one UTF-16 code unit.
  Reserve ID 0. Use arrays/join rather than spreading a large array into
  `String.fromCharCode` or repeatedly rescanning previous tokens.
- Before allocating ID 65,536, stop and return a coarse full delete/insert of
  the exact input strings (omit empty operations). Never allow numeric wrap,
  token collisions, silent truncation, or a character-mode fallback. The same
  fallback applies for positive-deadline expiry during preparation/decoding.
  Equality/empty fast paths still take precedence over fallback.
- Call the public `dmp.diff_main(encodedBefore, encodedAfter, false, deadline)`.
  `false` is required: synthetic IDs can contain newline code units and must
  never trigger a second line-encoding pass. Preserve the existing configured
  `Diff_Timeout` so engine heuristics remain internally consistent.
- Derive the absolute engine deadline with `Date.now()` once at helper entry
  for positive timeout; unlimited uses the engine's unlimited convention. Check
  preparation/decoding progress at least once per 1,024 tokens and at stage
  boundaries. One very large token/allocation is not preemptible; document
  best-effort timing. Do not make timeout claims about expected-pattern regexes.
- Decode using indexed `charCodeAt`, **not** `for...of`, spread, or `Array.from`
  on the encoded string: adjacent surrogate-range IDs are separate tokens,
  not a single Unicode code point. Original Unicode text is restored verbatim.
- Return only valid `[-1|0|1, original text]` tuples, no empty segments. Adjacent
  same-operation tuples may be coalesced. Apply no semantic/efficiency cleanup.
  Do not call private dependency methods or import vendored internals.

Add helper tests for exact expected tuples, boundary integrity, reconstruction,
timeouts, token-capacity limits, and surrogate-range IDs as detailed below.

**Verify:** `pnpm exec vitest run src/lib/diffModes.test.ts --reporter=verbose`
passes. Step 1 component tests remain red until the next step. Run
`pnpm run check`; the helper adds no type errors.

### Step 3: Integrate the optional mode without regressing existing consumers

Add documented `SvelteDiffMode` and `diffMode` in `src/lib/index.ts`; update timing
JSDoc to distinguish token-mode work from the character path. Add the default
and `@property` entry in the component. Include mode in `ComputationInput`,
cache equality, and `computeDiff` arguments. Dispatch after resolving expected
patterns. Leave the character block behavior unchanged; token modes call the new
helper, skip cleanup, and set cleanup timing to zero. Do not move computation
into `$effect` or make parsing depend on mode.

Keep capture tagging, snippets, compact equal rendering, and callback delivery
unchanged. Extend index type coverage: all three literal modes are accepted,
`sentence` and `json` are rejected by TypeScript, and deprecated prop aliases
inherit the optional field. Add integration coverage from the test matrix below.

**Verify:** the focused unit command in the commands table and
`pnpm run check` both pass. Step 1 tests now return whole words/lines. Run the
existing full unit suite; callback identity and compact tests must still pass.

### Step 4: Add isolated browser coverage for modes and server rendering

Create `/tests/diff-modes` in the root app. Import `$lib/index.js`, render fixed
initial word and line examples during SSR, and provide labeled inputs and a
three-value mode selector for a separate interactive example. Include a small
expected-pattern case and semantic custom snippets. Keep fixtures small and
deterministic; do not add them to the component-performance routes.

Create `tests/diff-modes.test.ts` using existing Playwright style. Cover mode
switching with unchanged text, reactive edits, expected captures, custom markup,
line endings, and default-character equivalence. In a no-JavaScript context,
check actual initial remove/insert markup for both new modes. With JavaScript,
assert no new hydration/page errors and verify switching works after hydration.

**Verify:** `pnpm exec playwright test tests/diff-modes.test.ts --project=chromium`
passes. `pnpm run build` must succeed before marking the integration ready.

### Step 5: Build the public example pages and homepage selector

Create two separately addressable examples; do not satisfy this with only a
dropdown buried in an existing page:

| Route and demo | Required content and interaction |
| --- | --- |
| `/examples/word-diff`, `word-diff/demos/WordDiff.svelte` | Editable prose; initial `The cat sleeps.` -> `The car sleeps.`; character and word results for the same inputs; reset; visible explanation of whitespace/punctuation and cleanup behavior |
| `/examples/line-diff`, `line-diff/demos/LineDiff.svelte` | Editable configuration with `count=10` -> `count=20` and an unchanged line; character and line results; reset; preset illustrating blank lines/final newline; explanation that JSON/config input remains plain text |

Use `ExampleV2`, `CodeReferenceV2`, `demoCodeSample`, `ExampleSection`, and the
existing `ExampleLayoutV2`. Each route must set title, description, OG title,
tagline, feature list, and unique `ogSlug` (`examples-word-diff`,
`examples-line-diff`). Point its source URL at the matching demo in the GitHub
repository. Display actual copyable, self-contained demo source, not a divergent
hand-maintained snippet. Demos must import the published package name, not `$lib`
internals. Use `cleanupEfficiency={0}` on character comparison panes so the
unit difference is unambiguous; label the character pane as raw character mode.
The inspected `ExampleV2` renders an h2, not an h1. Supply one route-level h1
for each new example (using the existing `sr-only` utility if needed to preserve
the sheet layout); do not modify the shared layout or vendored component.

Each page needs labeled before/after fields, clear pane headings, semantic
remove/insert styling beyond color alone, a reset action, readable long text,
and links to the mode guide, API, other new example, and expected-pattern guide.
Use shared design tokens/classes; stack panes on narrow screens. Scroll long
outputs within a bounded, keyboard-focusable named region. Keep headers/footers
outside the scroll region. Do not add timing/debug dashboards to the public flow.

The existing **Compare two strings in Svelte** section on the homepage
(`docs/src/routes/+page.svelte`, `#compare-two-strings`) must expose the new modes
in its live demo, in addition to the dedicated example pages:

- Add a visibly labeled, keyboard-accessible `Diff mode` selector to the demo
  controls alongside Reset, with Character, Word, and Line choices. Use typed
  `SvelteDiffMode` state and pass it to the existing live component via `diffMode`.
  Default to Character on the server and client. Do not expose deferred modes.
- Switching modes immediately recomputes the comparison using the current before
  and after strings. Preserve both input values; selecting a mode must not replace
  user edits with sample text or require a separate submit action.
- Retain semantic cleanup for Character; use no cleanup for Word/Line. The output
  heading and footer must accurately identify the selected mode and effective
  cleanup, including when switching back to Character.
- Reset restores both original sample strings and Character mode. Link the mode
  guide and word/line examples contextually so visitors can explore the same
  capabilities from this section.
- Keep controls usable on narrow screens, the footer aligned to the panel bottom,
  and long output bounded and keyboard-scrollable in every mode. Changing modes
  must not move the footer into the scrolling output region.

Replace the hardcoded `15 mirrors` copy with count-independent wording so new
pages cannot make the homepage claim stale again.

Add the two example links to `docsNav.ts`, letting `buildBreadcrumbs` find them,
and add cards to the examples index. Add the mode guide to guide navigation.

**Verify:** `pnpm run package && pnpm --filter docs build` succeeds and discovers
both demo sources and all three new routes. Run the docs source-check procedure
above. Start `pnpm --filter docs dev` for inspection if needed; all links resolve
on the docs app, source tabs show `diffMode`, and no demo source import is missing.
Automated checks for these requirements are added in Step 7.

### Step 6: Complete the documentation and comparison claims

Create `/docs/guides/diff-modes` with frontmatter, SEO context, and a matching
`docs-guides-diff-modes` OG slug. Include:

- A character/word/line decision table with use cases and default behavior.
- Complete copyable Svelte examples including imports and defined input values.
- Before/after examples with concrete raw tuples for word and line cases.
- The cleanup matrix: character uses existing precedence; word/line skip both.
- Exact whitespace, punctuation, case, CRLF, final-newline, and Unicode behavior.
- Expected-pattern compatibility, resolved-source callback semantics, display
  splitting, and the duplicate captured-value caveat for a replaced line.
- Callback/reactivity/SSR behavior, timeout units, token-capacity/coarse fallback,
  and a statement that synchronous token modes do not virtualize or offload work.
- JSON as text, unsupported sentence/JSON modes, and links to both new examples,
  cleanup, expected patterns, API, and performance guidance.

Update all these authored surfaces together:

| File | Required change |
| --- | --- |
| `README.md` | Feature summary, mode type import, prop table/default, word/line snippets, guide/example links, cleanup qualification |
| `docs/src/routes/docs/api/svelte-diff/+page.svx` | `diffMode` prop, default, allowed values; scope cleanup precedence to character; callback/capture semantics |
| `docs/src/routes/docs/api/types/+page.svx` | Export/import and definition of `SvelteDiffMode`; timing meanings; tuples still contain original text |
| `docs/src/routes/docs/getting-started/+page.svx` | Small mode-choice section and next-step links; retain existing simple default example |
| `docs/src/routes/docs/guides/cleanup/+page.svx` | Distinguish granularity from cleanup; qualify all precedence/recommendations |
| `docs/src/routes/docs/guides/expected-patterns/+page.svx` | Mode interaction and capture-tagging caveat with a concrete changed-line example |
| `docs/src/routes/docs/guides/performance/+page.svx` | Include mode in recomputation inputs; describe token costs/deadline/fallback; remove obsolete character-only scope claim |
| `docs/static/llms-prepend.md` | Default and supported modes, cleanup scope, truthful token-mode limitations |
| `docs/src/lib/compare-data.ts` | Split word/line support from sentence/JSON support; word/line true for us, sentence/JSON false; update shared limitation copy without claiming feature parity |

Do not call line mode a structural JSON diff or word mode multilingual linguistic
segmentation. Preserve accurate jsdiff advantages (sentence/JSON, patches,
framework independence). Do not rewrite unrelated competitor metrics.

**Verify:** rebuild docs and run source checking. The following searches must
return **no matches** in authored files (ignore generated output):

```bash
rg -n 'Character-level diffing with cleanup — no word / line / sentence|The component performs character-level text diffing and renders the result' docs/src
```

`rg -n 'SvelteDiffMode|diffMode' src/lib/index.ts README.md docs/src/routes/docs docs/static/llms-prepend.md`
must show the public type, prop, examples, and guide coverage. Step 7 verifies
rendered pages and generated mirrors, not just source strings.

### Step 7: Automate docs verification and run the complete gate

Create `docs/playwright.config.ts` using the root Playwright dependency (no new
install/package change). Keep it independent of the root fixture config:

- `testDir: './tests'`, output/report paths under ignored `docs/test-results`.
- Desktop Chromium and mobile Chromium (Pixel 5) projects.
- `webServer.command: 'pnpm --filter docs run preview --host 127.0.0.1 --port 8524 --strictPort'`,
  port 8524, base URL `http://127.0.0.1:8524`, a 120-second startup allowance,
  and no reuse in CI. Run a docs production build before these tests.
- Do not expect root Playwright's 4173 server to expose docs routes.

In `docs/tests/diff-modes.test.ts`, verify:

1. Both examples and the guide return 200, have meaningful H1/title/description,
   correct production canonical URL, and no noindex directive. Navigation,
   breadcrumbs, index cards, and cross-links reach the intended pages.
2. Initial prose/config output demonstrates the promised atomic edits. Editing
   and reset work. On `/#compare-two-strings`, locate the labeled `Diff mode`
   selector and verify Character is initially selected. Enter fixed before/after
   strings with a changed word inside a longer line; switching to Word highlights
   the whole changed word, and Line highlights the whole changed line. Assert
   both inputs remain unchanged through all mode switches, output updates without
   submission, and mode/cleanup labels stay accurate when returning to Character.
   Verify keyboard selection, responsive control layout, and Reset restoring the
   original strings plus Character mode. Exercise long-output scrolling and footer
   alignment on this homepage demo in all three modes as well as the new examples.
3. Code panels show the actual `diffMode="word"`/`"line"` demo source. Test the
   displayed source content without relying on clipboard permissions in CI.
4. Each new example has meaningful initial HTML with JavaScript disabled; hydrated
   versions have no feature-related page errors or hydration mismatch warnings.
   Keep known external analytics/CSP failures separate from feature assertions.
5. At desktop and mobile sizes, document width stays within the viewport; a
   100-line sample produces internal output overflow; keyboard PageDown changes
   scrollTop while its footer stays below the output region. Reset returns to
   the initial content. Include a long unbroken string to catch width overflow.
6. `/sitemap.xml` contains the three new routes. Fetch
   `/docs/guides/diff-modes.md`, `/examples/word-diff.md`, and
   `/examples/line-diff.md`; all return 200 with current mode/source content.
   `/llms.txt` links new pages and `/llms-full.txt` includes the mode contract.
   Confirm declared social-card URLs resolve to nonempty images.

Create `.github/workflows/docs-diff-modes.yml` following existing workflow
conventions: pull_request and push-to-main triggers for `docs/**`, `src/lib/**`,
`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `svelte.config.js`,
`vite.config.ts`, `tsconfig.json`, and itself; contents-read only;
Ubuntu GitHub-hosted runner; Node 24; pnpm setup; frozen install; Chromium browser
installation; root package build; regular docs build; source check using the
artifact procedure above; new docs tests; failure artifacts under
`docs/test-results`. Pin action versions consistently with current repo
workflows. No secrets, publish, IndexNow submission, or deploy commands. Do not
rewrite existing workflows or their shard/performance thresholds.

**Verify in this order:**

```bash
pnpm run check
pnpm run test
pnpm run build
pnpm exec playwright test --config=playwright.config.ts
pnpm --filter docs build
# Run the docs source-check procedure in Commands above.
pnpm exec playwright test --config=docs/playwright.config.ts
trunk fmt
trunk check
git diff --check
git status --short
```

All commands must pass. Inspect formatter changes and re-run affected checks if
it changes semantics. Record exact results and any environment workaround in the
batch index. Restore incidental GitHub-stat updates and verify no out-of-scope
authored changes remain. Do not claim hosted CI passed unless it actually ran.

## Test matrix

Tests should prove behavior, not implementation layout. No blanket snapshots of
all diff tie-break choices and no real-time timeout assertions.

| Layer | Cases and required assertions |
| --- | --- |
| Helper golden cases | `cat` -> `car` removes/inserts whole words; changed config replaces full line and preserves unchanged line; insert/delete-only and empty/equal inputs |
| Losslessness | Rebuild source from operations other than insert and target from operations other than remove; exact equality including whitespace/newlines/Unicode for every fixture |
| Word tokens | Multiple spaces, tabs, NBSP, punctuation-only changes, apostrophes, hyphens, underscores, digits, combining marks, accented/non-Latin runs, emoji, lone surrogate code units; no text loss or normalization |
| Lines | LF/CRLF/lone CR, mixed endings, blank lines, trailing newline addition/removal, no final newline, long single line, reordered/repeated lines |
| Boundaries | Walk cumulative source and target offsets of raw tuples; every boundary is in the corresponding tokenizer-boundary set; test both cleanup props enabled to ensure they cannot split tokens |
| Capacity | Just below/at/above 65,535 distinct tokens shared across both texts; test IDs crossing the surrogate range, including adjacent high/low surrogate IDs representing different tokens; overflow reconstructs both complete inputs via coarse replacement |
| Deadline | Mock `Date.now` progression, restore it after each test; expiry during preparation/decoding returns full replacement; engine receives one deadline with checklines false; zero remains unlimited; avoid timer-dependent sleeps |
| Component compatibility | Omitted vs explicit character yields equal tuples/DOM; defaults unchanged; each mode recomputes on text/mode change; callback-only swaps preserve array identity; cleanup zero only in token modes |
| Patterns/renderers | Matches, mismatch placeholders, captures spanning words/lines, capture inside a replaced line, expected snippet group names, remove/insert/equal/snippet precedence, custom lineBreak, compact on/off |
| Types | Public mode union accepts three literals and rejects sentence/json using type assertions/expected compile errors; existing aliases remain assignable |
| Browser | New modes in initial SSR HTML, hydration, interactive mode changes, accessible controls and internal scrolling, desktop/mobile docs layouts and source display |
| Existing gates | Existing unit, snippet, default, expected-pattern, performance, and five-project root browser suites remain green |

Use `src/lib/SvelteDiff.test.ts` for component style and `tests/snippets.test.ts`
for browser interactions. For reconstruction with expected patterns, compare the
source projection to the resolved/cleaned source, not the original regex text.
For high-ID codec tests, generate fixtures deterministically rather than checking
in large text files. Exercise dictionary population on both sides, not only one.
The red-first component tests in Step 1 are required even though the prop is new:
the test demonstrates the concrete readability enhancement over current behavior.

## Done criteria

- [ ] All commands in the final gate pass; evidence recorded with versions.
- [ ] Step 1 failures are recorded and the same assertions now pass.
- [ ] `diffMode` defaults to character and `SvelteDiffMode` is publicly exported.
- [ ] Word/line raw tuples are lossless, token-aligned, and protected against
  timeout/capacity truncation and surrogate-ID decoding mistakes.
- [ ] Existing callback identity, expected-pattern, snippet, compact, SSR, and
  performance checks pass without weakening their assertions or ceilings.
- [ ] Two public example pages and one guide exist, are navigable, and pass
  desktop/mobile/SSR/source-panel tests against the built docs application.
- [ ] The homepage's Compare two strings in Svelte section has an accessible
  Character/Word/Line selector that immediately updates the current comparison
  without replacing input text; Reset restores sample strings and Character.
- [ ] Homepage mode/cleanup labels are accurate, and all three modes preserve
  responsive controls, bottom-aligned footer, and bounded keyboard scrolling.
- [ ] API, README, cleanup/performance/pattern guidance, comparisons, and LLM
  references agree on supported modes, defaults, and limitations.
- [ ] Generated sitemap, mirrors, LLM references, and social-card URLs include
  the new content and pass HTTP/content checks.
- [ ] The docs verification workflow validates without deployment permissions.
- [ ] No dependency, lockfile, version, unrelated generated-stat, or other
  out-of-scope authored changes; `git diff --check` is clean.
- [ ] Adjacent index status updated with results and any unresolved follow-up.

## STOP conditions

- Relevant source/docs-kit contracts differ from the excerpts or the proposed
  baseline branch does not contain the preceding SEO/homepage changes.
- Step 1 does not fail on the documented partial-character behavior.
- Token reconstruction or boundary invariants fail, or correctness appears to
  require private dependency APIs, a new library, or dropping/canonicalizing text.
- The installed dependency's deadline or code-unit behavior differs from this
  plan, or token-mode handling cannot meet the stated expected-pattern contract.
- SSR and browser output diverge, the cache loses callback-only identity, or
  an existing performance ceiling is exceeded. Report raw diagnostics; do not
  change thresholds or hide the feature from SSR.
- A verification fails twice after reasonable targeted fixes, or requires an
  out-of-scope source/config change. Distinguish pre-existing environment/tool
  failures from implementation defects rather than suppressing either.
- Docs-kit cannot discover the new source/mirror/social-card routes through the
  existing conventions. Report the exact missing artifact before altering its
  generator or vendoring library code.

## Maintenance and deferred work

Reviewers should scrutinize losslessness, dictionary overflow, cleanup scoping,
deadline reuse, and the distinction between raw tuples and expected-tag display
segments. Future tokenizers must preserve deterministic SSR/client boundaries.
Future changes to capture offsets must be tested across every mode.

Sentence mode needs an explicit language/segmentation policy. JSON mode needs
decisions about parsing errors, key order, formatting, arrays, and capture offsets;
jsdiff-style canonicalization is not simply another tokenizer. Neither belongs
in this release or its comparison claims. A token-array engine without a UTF-16
dictionary limit can be considered later if the documented coarse fallback is
insufficient for real users. Performance telemetry must not imply DOM rendering
or expected-pattern regex execution is covered by the algorithm timeout.

This planning pass did not run installs/builds/tests or change source. Its
commands come from inspected scripts and earlier session verification; the
executor must establish and report its own baseline before claiming success.
