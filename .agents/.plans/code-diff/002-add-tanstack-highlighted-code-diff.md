# Plan 002 (B): Add an optional TanStack-highlighted Svelte code diff

> **Executor instructions**: Implement the scoped first release below, verify all
> gates, and update this batch's README status unless your reviewer owns it. This
> plan does not authorize publishing, deploying, or replacing the docs highlighter.
>
> **Revision 2026-10-02**: The operator explicitly approved a release-age exception only for `@tanstack/highlight@1.0.0`. Add that exact version selector to `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` when implementing B. Keep `minimumReleaseAge: 2880` and all existing exclusions unchanged; no package-wide, wildcard, global, or transitive exception is authorized. Pin the docs dependency to 1.0.0 as well as the development dependency. A must pass before B is dispatched; re-baseline to A's reviewed snapshot then. This amendment records policy authorization only; no dependency has been installed.
>
> **Revision 2026-10-02**: A passed at reviewed snapshot `a4f19bc`: 186 library units, check 0/0, package/publint, docs before/build/after checks, 20 diff-mode / 40 performance / 35 capture browser cases. Re-baseline to that implementation. Existing docs CI already runs all docs tests; preserve `.github/workflows/docs-diff-modes.yml` byte-for-byte. Dependency manifests/policy are dispatched first, normal lock generation happens in an isolated temporary workspace, an executor copies the generated lock, and guard runs a frozen install writing ignored artifacts only before steps 2–5. No other gates change.
>
> **Drift check**: `git diff --stat a4f19bc..HEAD -- src/lib package.json pnpm-lock.yaml pnpm-workspace.yaml docs/package.json docs/src/lib docs/src/routes tests docs/tests .github/workflows/docs-diff-modes.yml`
> Plan A and package improvements are expected drift. Verify their resulting
> contracts explicitly; stop for conflicting changes rather than restoring the
> baseline excerpts or silently changing the design.

## Status

- **Priority**: P2; after package improvements and plan A
- **Effort**: L
- **Risk**: MED
- **Depends on**: `001-extract-shared-diff-core-and-literal-mode.md`
- **Category**: direction / feature
- **Planned at**: commit `a4f19bc`, 2026-10-02 (reviewed A snapshot)

## Why this matters

Users want to compare two code strings in a Svelte application with syntax colors
inside the diff body. Provide one combined code block with unchanged, deleted,
and inserted text; no GitHub patch input is needed. Tokenize each complete
source before composing the diff so fragments within strings/comments retain
their syntax context. Keep TanStack optional for existing text-diff users.

## Current state and required predecessor contract

- `src/lib/index.ts:45–54` defines remove/equal/insert snippets that receive only
  text, with no source offsets. `SvelteDiff.svelte:246–285` splits multiline text
  into snippet calls and `<br>` renderers. These hooks cannot alone reconstruct
  full-source syntax context.
- `package.json:32–36` exposes one Svelte entry; the only runtime dependency is
  `diff-match-patch-ts`. Keep existing root imports free of TanStack dependencies.
- Plan A must provide `computeDiff(before, after, options)` returning
  `{ timing, diffs, displayDiffs, captures? }` through the Svelte root, with
  `expectedPatterns:false` for literal source. Raw tuples are [-1|0|1,text].
  Use it directly; do not mount a hidden SvelteDiff or wait for a callback.
- `docs/src/lib/examples/line-diff/demos/LineDiff.svelte` supplies editable Before/
  After inputs, Reset, bounded keyboard-focusable output, and responsive layout.
  Its route uses `ExampleV2`, `CodeReferenceV2`, `demoCodeSample`, SEO context,
  and `RelatedReading`. Copy those conventions, not an unrelated design system.
- `docs/src/lib/examplesIndex.ts` drives example navigation;
  `docs/src/lib/docsNav.ts` owns docs links. Generated mirrors/sitemaps/demo
  loaders/social cards come from `docs/vite.config.ts` plugins.
- `docs/svelte.config.js` uses Shiki for ordinary documentation fences. It stays
  unchanged: this feature uses TanStack only for the actual code-diff body.
- Use arrow functions, public JSDoc, `.js` module specifiers, Svelte 5 runes,
  Testing Library units, and Playwright fixtures. Trunk controls formatting/lint.

## Verified TanStack contract and version

On 2026-10-02, read-only registry inspection reported `@tanstack/highlight` latest
**1.0.0**. Its published `dist/core.d.ts` was inspected directly in the registry
tarball; no dependency was installed during planning. The following are short
API signatures, not assumptions based solely on the site's v0 navigation label:

```ts
type HighlightToken = { className?: HighlightTokenClass; value: string }
type HighlightTokenResult = { code: string; lang: string; tokens: HighlightToken[] }
type Highlighter = {
    tokenize: (code: string, options?: HighlightOptions) => HighlightTokenResult
    // other public methods omitted
}
```

Tokens concatenate to the exact input. Syntax classes are semantic names mapped
to `th-*`; offset units are UTF-16. `createHighlighter` comes from
`@tanstack/highlight/core`, languages from individual `/languages/*` entries;
`createThemeCss` and GitHub theme modules generate theme CSS. Reference:
[core API](https://tanstack.com/highlight/latest/docs/reference/core),
[theme API](https://tanstack.com/highlight/latest/docs/reference/theme), and
[published package](https://www.npmjs.com/package/@tanstack/highlight/v/1.0.0).
Recheck the installed declaration contract before implementing; do not silently
switch to a different major or all-language root import if signatures drift.

## First-release API and rendering decisions

```svelte
<script lang="ts">
    import CodeDiff from '@humanspeak/svelte-diff/code'
    import { createHighlighter } from '@tanstack/highlight/core'
    import { ts } from '@tanstack/highlight/languages/ts'
    const highlighter = createHighlighter({ languages: [ts] })
</script>

<CodeDiff originalText={before} modifiedText={after}
    language="typescript" {highlighter} />
```

- Add `src/lib/code.ts`: default/named `CodeDiff`, public `CodeDiffProps` only.
  Export it through a new `./code` subpath with `types` and `svelte` conditions,
  matching the package's existing Svelte orientation. Do not re-export CodeDiff
  or import its adapter from the package root.
- Props: required `originalText`, `modifiedText`, and caller-created
  `highlighter: Pick<Highlighter,'tokenize'>`; `language='plaintext'`,
  `diffMode='word'`, `timeout=1`, `cleanupSemantic=false`,
  `cleanupEfficiency=0`, optional outer `class`, `ariaLabel='Code differences'`,
  and `rendererClasses?: { remove?: string; insert?: string }`.
  No expectedPatterns prop: always force false. Do not add processing callbacks
  or inherit all SvelteDiff rendering props in this first release.
- TanStack is an optional peer (`^1.0.0` plus `peerDependenciesMeta.optional`) and
  a pinned development dependency for tests. Docs declares its own direct
  dependency. Consumers of `./code` must install it; ordinary text-diff consumers
  do not. Root imports must contain no runtime import of optional TanStack code.
- One `<pre class="th-code svelte-code-diff ..."><code>…</code></pre>` tree.
  Render `<del>`/`<ins>` for changed runs, with nested syntax `<span>` elements,
  and plain text/spans for unchanged runs. Use native Svelte text escaping;
  never inject source, raw highlighter HTML, or arbitrary token values via `@html`.
  Use `data-diff="remove|insert|equal"` on operation wrappers for fixtures.
- Preserve syntax foreground colors; change backgrounds use CSS variables
  `--svelte-diff-remove-bg` / `--svelte-diff-insert-bg` with sensible defaults.
  No hard-coded foreground colors or default strike-through. Caller theme CSS
  controls `th-*`; include copyable theme setup in the public example.
- The code block uses `white-space:pre`, horizontal overflow, bounded fixture
  height, keyboard focus, and an accessible name. Include operation labels for
  assistive technology without adding visible text to source content.
- No gutters, line numbers, hunks, side-by-side alignment, context folding,
  virtualization, edit-in-place, patch parsing, or nested character refinement.

## Source-token composition algorithm

Create a private `codeDiff.ts` model helper (not a new root public API):

1. Keep three independent stages: literal raw diff computation with the shared
   core, complete original-source tokenization, and complete modified-source
   tokenization. The component owns separate derived caches for these stages.
   The pure composition helper receives the already computed tuples and both
   token results; it must not compute diffs or invoke the highlighter itself.
2. Turn token values into half-open source intervals by accumulating
   `value.length`. Include unclassified text; skip zero-length tokens.
3. Walk tuples with independent `beforePos` and `afterPos`: removal slices tokens
   from original and advances before only; insertion slices modified and advances
   after only; equal uses modified tokens and advances **both** positions.
4. Split token intervals at diff boundaries using monotonic token cursors. Repeated
   identical substrings must not use `indexOf` to recover positions. Complexity
   is O(source + tokens + diffs + output), not repeated whole-array filtering.
5. Produce operation runs containing typed text pieces. Joining runs except
   inserts reconstructs original exactly; joining except removes reconstructs
   modified exactly. Never tokenize the combined before+after body, which may
   be syntactically invalid. Never trim/normalize input before composition.

The browser HTML parser can normalize CR/CRLF in SSR text nodes. Keep exact
source/offset reconstruction assertions in model tests, and use
normalization-aware browser text expectations where necessary. Do not claim
DOM/clipboard round-tripping of raw line endings, change input strings to hide
differences, or mask a hydration error. Unicode code-unit diff limitations stay
consistent with the existing modes; no new grapheme guarantee is promised.

Keep diff computation and each full-source tokenization in separate derived
caches: changing only modified source must not retokenize original; changing
only theme/classes must not recompute/tokenize either source. Language/highlighter
identity changes invalidate both token caches. Preserve stable per-instance state
and avoid shared mutable global request caches.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Version/API preflight | `pnpm view @tanstack/highlight@1.0.0 version exports --json` | 1.0.0 with core/language/theme entry points |
| New model units | `pnpm exec vitest run src/lib/codeDiff.test.ts` | all contract cases pass |
| New component units | `pnpm exec vitest run src/lib/CodeDiff.test.ts` | escaping/semantics/cache tests pass |
| Root gates | `pnpm run check`; `pnpm exec vitest run src/lib/`; `pnpm run package` | zero check errors, all units, publint pass |
| Packaged Svelte consumer smoke | `node scripts/verify-code-diff-packaging.mjs` | text-only build has no TanStack module; selective code build has only registered languages |
| Format / lint | `trunk fmt`; `trunk check` | no new failures |
| Root browsers | `pnpm exec playwright test --config=playwright.config.ts tests/code-diff.test.ts tests/component-performance.test.ts` | all configured projects pass |
| Docs packaging | `pnpm run package`; `pnpm --filter docs build` | exit 0; artifacts regenerated |
| Docs source check | Python command below | zero errors/warnings; generated worker restored |
| Docs browsers | `pnpm exec playwright test --config=docs/playwright.config.ts docs/tests/code-diff.test.ts docs/tests/example-navigation.test.ts` | desktop/mobile Chromium pass |

Root baseline was 123 passing units and check 0/0. Full browser/build commands
were not executed during planning. Docs check after build uses the existing
worker move/restore `try/finally` procedure from
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

Never hand-edit generated Worker code or treat generated-output diagnostics as
source regressions. The docs build's GitHub stats fetch can require network access.

## Scope

**In scope**: create `src/lib/code.ts`, `src/lib/codeDiff.ts`,
`src/lib/codeDiff.test.ts`, `src/lib/CodeDiff.svelte`, `src/lib/CodeDiff.test.ts`,
`src/routes/tests/code-diff/+page.svelte`, `tests/code-diff.test.ts`,
`docs/src/lib/examples/code-diff/demos/CodeDiffDemo.svelte`,
`docs/src/routes/examples/code-diff/+page.svelte`,
`docs/src/routes/docs/guides/code-diffs/+page.svx`,
`docs/src/routes/docs/api/code-diff/+page.svx`, `docs/tests/code-diff.test.ts`,
`scripts/verify-code-diff-packaging.mjs`;
modify `package.json`, `pnpm-lock.yaml`, `docs/package.json`, `README.md`,
`pnpm-workspace.yaml` (only the authorized exact-version release-age exclusion),
`docs/src/lib/examplesIndex.ts`, `docs/src/lib/docsNav.ts`,
`docs/tests/example-navigation.test.ts` (update its fixed example order, titles,
and counters from eight to nine),
`docs/src/routes/docs/api/types/+page.svx`, `docs/src/lib/compare-data.ts`
(only our new capability claims), and
`.github/workflows/docs-diff-modes.yml` (run new docs test under existing suite).
Generated demo loaders/mirrors/social/sitemap/LLM artifacts may change only via
the existing docs build. Update this plan's README status.

**Out of scope**: Shiki/docs fence migration, root CodeDiff re-export, new Node
entry conditions, current SvelteDiff defaults, raw algorithm/tokenization changes,
release workflow redesign, broad dependency refresh, competitor research, and
all first-release exclusions above.

## Git workflow

Authored on `chore/package-improvements`; implementation starts only after that
batch and A complete. Operator chooses feature branch/worktree (suggestion
`feat/highlighted-code-diff`). Do not switch their working branch or publish,
deploy, commit, push, or open a PR unless execution authorization includes it.
Use conventional commit subjects such as `feat: add highlighted code diffs`.

## Steps

### Step 1: Verify the optional integration boundary and dependency contract

Confirm A's literal helper and installed/planned TanStack 1.0.0 declarations.
Add optional peer/dev/doc dependencies and `./code` export without changing root
runtime imports. Use pnpm, retain the 2880-minute minimumReleaseAge/workspace
policy, add only the approved `@tanstack/highlight@1.0.0` exclusion, and update
the lockfile normally; do not bypass release-age policy broadly. Create the
component entry and explicit props. This is net-new behavior, so no preexisting
runtime red test is required; write its contract tests alongside implementation.

**Verify**: `pnpm view @tanstack/highlight@1.0.0 version exports --json` -> stated
contract; `pnpm install --frozen-lockfile` after intentional manifest/lock refresh
-> exit 0; `pnpm run check` -> no new diagnostics; inspect `git diff -- package.json docs/package.json` -> only selected dependency/export changes.

### Step 2: Compose full-source syntax tokens with literal diff runs

Implement the model algorithm and independent reconstruction tests. Include a
multiline comment/string where an edit lies inside a larger syntax token,
repeated same text at different offsets, insertion/deletion-only inputs, unknown
language/plain text, empty strings, LF/CRLF/CR/tabs/final newline, emoji, and all
three diff modes. Include named regex source and HTML-like source as literal
content. Model tests supply independently tokenized complete inputs; composition
must invoke no tokenizer. Component tests spy tokenizer calls to prove two initial
full-source tokenizations rather than per-fragment calls. Assert classification against independently tokenized full
sources, not snapshots of the implementation's model structure.

**Verify**: model-unit command -> every reconstruction and token-context case
passes; `pnpm run check` -> no unsafe type escape needed in production.

### Step 3: Render semantic escaped code and preserve reactive caches

Implement one native Svelte pre/code body with changed-run wrappers and syntax
spans. Component tests assert exactly one pre/code, del/ins content, unchanged
syntax classes, literal HTML escaping/no executable descendants, no `<br>`
injection, original-source cache reuse on after-only edits, and no tokenization
on class-only rerenders. Provide the required highlighter through tests using
selective TS registration; include unknown-language plain-text fallback.

**Verify**: component-unit command -> all pass; root check/all-unit/package gates
-> green; `rg -n '@tanstack/highlight' src/lib/index.ts src/lib/SvelteDiff.svelte dist/index.js` -> no runtime TanStack imports in the ordinary entry.

### Step 4: Ship visible examples, authored docs, and browser verification

Create `/tests/code-diff` and public `/examples/code-diff` with editable TS source,
language/mode controls, Reset, multiline-context preset, and before/after clearly
labeled. Demo highlighter registers only used TS/JS/JSON languages; include
GitHub light/dark theme CSS scoped to the demo and existing dark selector. Avoid
shipping theme-generation code in the package component. Add guide/API pages,
navigation/example index entries, source URLs, SEO, copyable demo source, and
accurate generated discovery artifacts using existing build plugins. Update the
existing example-navigation test's fixed eight-example slug/title/order/counter
expectations to include the ninth example in the actual index order.

Browser tests verify initial syntax-colored changed/unchanged text without JS,
hydration without warnings, edits/mode/language fallback, literal regex/HTML
source, theme switch preserving source/DOM ownership, keyboard overflow scrolling,
and mobile page width. New docs tests run through the already configured docs CI
suite; do not add another duplicate workflow. Update only our comparison claims
now made obsolete by the optional feature, retaining the Svelte-only positioning.

**Verify**: root-browser command, docs packaging, docs source check with existing
worker workaround, and docs-browser command -> pass. Check generated
`docs/static/examples/code-diff.md` and `docs/static/docs/guides-code-diffs.md`
exist after the build and the example's show-code control exposes current source.

### Step 5: Verify package isolation and complete regression gates

Run root check, all units, package/publint, Trunk, root browsers, and docs gates
from the table. Create `scripts/verify-code-diff-packaging.mjs` using Node built-ins
and typed-via-JSDoc arrow helpers, following `docs/scripts/check-favicon.mjs`'s
standalone-script style. The script must create temporary directories outside
the repository, run `pnpm pack --out <temporary-artifact.tgz> --json`, and install
that artifact into two isolated Svelte/Vite consumer projects. Use the live
root's Svelte, Vite, and Svelte-plugin versions for these fixtures, not new
floating framework majors. Report installation/tool failures explicitly and
clean up temporary files/processes in `finally`; never run publish/deploy.

The text-only fixture imports the ordinary component from the packaged root,
does not declare TanStack, and must build successfully with no TanStack runtime
resolution or bundled module. The selective code fixture installs TanStack
1.0.0, imports the packaged `/code` component, registers only TS from its
individual language module, and must build successfully. A small Vite plugin
in each fixture records emitted chunks' `modules` keys in a JSON report; assert
the text-only report has no TanStack keys and the code fixture has no other
language modules or all-language root. Check source paths and the installed
declaration graph if the bundler module-report format differs; do not silently
drop the boundary assertion. These are Svelte-aware builds, never Node-import
compatibility tests. Package managers may resolve a cached peer automatically:
explicitly inspect the text fixture's installed manifest/graph and STOP if the
optional peer was installed despite the fixture omitting it.

**Verify**: `node scripts/verify-code-diff-packaging.mjs` -> exit 0, prints named
PASS results for text-only isolation and selective code-language bundling;
`git diff --check` -> exit 0; scoped files/artifacts only.

## Test plan

Net-new feature exemption applies to red-first ordering. Permanent tests must
observe source reconstruction, full-source context, safe native rendering,
SSR/hydration, optional package isolation, selective-language bundling, caching,
and public discoverability. Existing package and component-performance tests
remain regression gates. Do not substitute screenshots or a plausible-looking
HTML snapshot for offset/reconstruction checks.

## Done criteria

- [ ] `./code` exports the Svelte component and props, with optional peer metadata.
- [ ] Ordinary package root has no runtime TanStack import; isolation smoke passes.
- [ ] Both original and modified source reconstruct exactly from model output.
- [ ] Whole-source context tests and native escaping tests pass.
- [ ] Before/after token caches and theme/class-only updates meet specified counts.
- [ ] Single pre/code, del/ins, syntax colors, public demo/guide/API, and discovery artifacts exist.
- [ ] Root and docs type/unit/package/Trunk/browser gates pass without weakened old tests.
- [ ] No patch/headless/framework-agnostic features or Shiki migration were added.
- [ ] Only scoped changes remain and batch README status is updated.

## STOP conditions

Stop if A's literal helper is absent, the pinned TanStack declarations differ,
optional integration requires importing TanStack from the root, tokens cannot
reconstruct source, composition requires quadratic scans, hydration warnings
appear for accepted whitespace, scoped docs generation cannot locate the demo,
or a gate fails twice after a reasonable correction. If pnpm release-age policy
blocks 1.0.0, report the exact package/policy instead of disabling safeguards.

## Maintenance notes

Review UTF-16 pointer advancement and source choice whenever rendering changes.
Syntax colors depend on caller registrations/theme CSS; CodeDiff is a viewer,
not a language-service parser. Adding gutters or side-by-side layout later needs
its own alignment contract. Future callbacks must preserve package plan 002's
untracked consumer boundary. Revisit the optional peer range intentionally when
TanStack changes its token contract.
