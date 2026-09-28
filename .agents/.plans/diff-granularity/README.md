# Diff granularity implementation plan

Generated with the improve skill on 2026-09-28 against `57a9526`.
The maintainer selected the word-and-line feature and explicitly requested
example pages and complete documentation. This is a focused `plan` invocation,
not a general repository audit; no additional selection round is needed.

## Execution order and status

| Plan | Title | Priority | Effort | Risk | Depends on | Status |
| --- | --- | --- | --- | --- | --- | --- |
| [001](001-add-word-and-line-diff-modes.md) | Add word and line modes, examples, and docs | P1 | L | MED | — | IN PROGRESS |

Status values: TODO, IN PROGRESS, DONE, BLOCKED (reason), REJECTED (reason).
Read the entire plan before executing. Order within the plan is: red behavior
tests -> lossless helper -> component integration -> SSR/browser coverage ->
public examples -> documentation -> production/docs/CI verification.

## Vetted evidence and decisions

| Finding | Category | Impact | Effort | Risk | Confidence | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Expose word/line comparison units | Direction | Predictable prose/config edits through the existing component API | L including delivery | MED | HIGH | `src/lib/SvelteDiff.svelte:147`; `.competitive-intel/state.json:88` |
| Preserve cleanup and capture contracts explicitly | Correctness constraint | Avoid losing granularity or offset accuracy when introducing modes | Included | MED | HIGH | `src/lib/SvelteDiff.svelte:135`; `src/lib/SvelteDiff.svelte:151`; `src/lib/expectedPatterns.ts:483` |
| Ship examples, guides, and generated discovery surfaces together | Docs/DX | Users can find, understand, and copy the feature correctly | Included | LOW | HIGH | `docs/src/lib/docsNav.ts:44`; `docs/src/routes/examples/cleanup-modes/+page.svelte:1`; `docs/vite.config.ts` |

This is one cohesive implementation plan because the type/behavior contract must
land together with its claims, examples, and regression coverage. The executor
may use multiple logical commits on its feature branch. It must not publish,
deploy, or change the current SEO branch without separate authorization.

The plan deliberately fixes these choices for its executor:

- Optional `diffMode: 'character' | 'word' | 'line'`, default character.
- Existing engine retained; no new dependency; shared lossless token codec.
- Character cleanup behavior unchanged; word/line skip both cleanup passes.
- Exact whitespace/line-ending preservation and deterministic word tokenization.
- Expected patterns retain their existing preprocessing and display tagging.
- `/examples/word-diff`, `/examples/line-diff`, and `/docs/guides/diff-modes`.
- The homepage's **Compare two strings in Svelte** live demo gets an accessible
  Character/Word/Line selector. Switching preserves entered text and immediately
  updates the diff and mode/cleanup labels; Reset restores samples and Character.
  Preserve responsive controls, the bottom-aligned footer, and keyboard scrolling.
- Complete navigation, copyable source, generated mirrors, sitemap/LLM/social
  metadata, and automated docs browser verification, including homepage modes.

## Dependency notes

The component-performance batch is already DONE. Preserve its compile-once
patterns, forward capture sweep, callback identity, compact DOM, SSR behavior,
and performance ceilings. Do not reopen those plans or mix their diagnostic
workloads into the new feature fixture.

The starting checkout must include `57a9526` or its merged equivalent so the
homepage SEO links, bottom-aligned footer, and bounded keyboard scrolling survive.
Check drift when execution begins; this document does not fetch or update main.

## Considered and rejected or deferred

- Shipping sentence/JSON immediately: deferred. Each needs a separate semantic
  contract; neither is implied by word/line support. Keep their limitations clear.
- Treating all character diffs as unreadable: rejected. Semantic cleanup already
  improves prose; the feature adds explicit granularity, not a replacement default.
- Running semantic cleanup after token decoding: rejected because it can split
  the requested units. Running it on encoded IDs gives synthetic IDs text semantics.
- Replacing the engine with jsdiff: not required for this scope; adds dependency
  and compatibility decisions without first exhausting the current architecture.
- Calling the dependency's public line helper without guards: rejected for this
  plan; its inspected encoder lacks an explicit UTF-16 token-capacity check.
- Locale-dependent `Intl.Segmenter`: deferred to avoid unversioned SSR/client
  tokenization differences and an underspecified multilingual promise.
- Claiming full granularity-gap closure or rewriting dated competitive-intel
  snapshots: rejected. Sentence/JSON remain outside this release.
- Reworking pnpm launchers, generated Worker types, stale docs dev-port prose,
  or broader CI/deployment behavior: outside this feature. Known verification
  traps and narrow artifact workarounds are documented in the plan.

## Audit boundary and execution evidence

Read: component/types/capture pipeline, relevant tests, existing performance
plans, package and CI scripts, Trunk configuration, docs routes/navigation,
example conventions, generated-content configuration, and the installed engine's
line encoder/deadline behavior. Small read-only engine probes confirmed the
character-vs-line examples quoted in the plan.

Not audited: general security/dependency posture, unrelated algorithms/routes,
all competitor claims, deployment reliability, SEO results, sentence segmentation,
structural JSON behavior, or a benchmark comparison of alternative engines.
No implementation changes, install/build/test runs, commits, or issue creation
were performed for this planning request.

Executor/reviewer: append actual red-test evidence, tool versions, gate results,
browser coverage, and any reported STOP condition here. Do not mark DONE until
the complete plan's acceptance criteria are satisfied.

### Dispatch preflight — 2026-09-28

- Operator authorized dispatch, including the homepage mode selector.
- Fetched `origin/main`: still `587814f`. Created `feat/diff-granularity` from
  `57a9526`, preserving the required local SEO/footer/scroll changes atop fresh
  main. The SEO branch remains unchanged; the feature branch has no upstream.
- Scoped source drift from the planned baseline is empty; no contract amendment
  is needed. Only these plan files were untracked before dispatch.
- Guard owns plan status, commits, independent verification, and close-out;
  the serial Codex executor owns implementation. No push, PR, or deployment.
