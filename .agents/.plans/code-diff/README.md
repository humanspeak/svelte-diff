# Code-diff plans

Execution started 2026-10-02 on `feat/highlighted-code-diff`, created from fresh
main `068080b` after package improvements and capture DOM metadata merged in
PR #216. Plan A is re-baselined to that reviewed state; plan B will be
reconciled again after A passes. Baseline: 172 library units.

Written with the improve skill on 2026-10-02 against fresh `origin/main`
`fa0cfc9`, on the planning branch `chore/package-improvements`. See the completed
[package-improvements batch](../../.plans-closed/package-improvements/README.md) record. These are
implementation handoffs for the maintainer-selected A–B feature, not source
changes or permission to publish/deploy.

## Execution order and status

| Plan | Audit option | Title | Priority | Effort | Risk | Depends on | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [001](001-extract-shared-diff-core-and-literal-mode.md) | A | Shared computation and literal source mode | P2 | M | MED | Package improvements complete | DONE — PASS at a4f19bc |
| [002](002-add-tanstack-highlighted-code-diff.md) | B | Optional TanStack-highlighted CodeDiff | P2 | L | MED | 001 | IN PROGRESS — dependency setup, then implementation |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (reason) | REJECTED (reason).
The operator/reviewer owns these rows unless they delegate updates. Executors
must read their whole plan, reconcile predecessor changes, and preserve earlier
regression tests; stale baseline excerpts are not instructions to revert fixes.

## Dependency notes and fixed choices

- **Package improvements → A → B**. A needs stabilized callback/template/parser
  contracts; B needs A's synchronous literal tuples and typed result.
- This stays an opinionated **Svelte package**. A exports a helper through the
  existing Svelte toolchain entry; it does not add Node/default resolution or
  revive framework-agnostic claims removed by package plan 009.
- Component `expectedPatterns` defaults true for compatibility. Public
  `computeDiff` defaults false for exact source; CodeDiff always forces false.
- B uses the optional Svelte `/code` entry and caller-created selective TanStack
  highlighter. Ordinary root imports gain no TanStack runtime dependency.
- Highlight the complete before and after sources independently, then compose
  source-coordinate token pieces with raw diffs. Deleted text uses before tokens;
  inserted/equal text uses after tokens. Never highlight isolated snippets or
  the syntactically mixed combined body.
- First release is one combined semantic pre/code body with diff backgrounds and
  syntax foreground colors. Existing text-diff markup and docs Shiki fences stay
  intact. Language registration/theme CSS remains explicit and copyable.
- Live examples, navigation, authored API/guide pages, source references, and
  generated discovery artifacts ship with B. They use existing docs-kit patterns,
  with desktop/mobile and no-JavaScript browser verification.

## Evidence and version baseline

The existing component's private calculation and text-only snippet API were
inspected directly. Root baseline: 123 passing unit tests, check 0/0. Builds and
browsers were not run during planning. Baseline source is unchanged on fresh
main apart from package version and README footer.

Read-only npm registry inspection on 2026-10-02 reported TanStack Highlight
1.0.0. Its published core/theme declarations were inspected in memory; the plans
use that contract and require an execution-time preflight. No dependency was
installed while writing these plans.

## Considered and rejected or deferred

- A JS-only/headless package export: rejected by maintainer's Svelte-only direction.
- Hidden SvelteDiff mounting plus onProcessing to obtain data: rejected; introduces
  lifecycle work and cannot supply initial synchronous code output cleanly.
- Per-snippet highlighting or diffing generated HTML: rejected; loses whole-source
  syntax context or compares renderer markup instead of source text.
- Making TanStack/all languages a mandatory root dependency: rejected; optional
  component and selective registration keep text-diff consumers lightweight.
- Side-by-side layout, gutters, line numbers, hunks, patch parsing, context folding,
  virtualization, workers, nested line/character refinement, and editor parser
  guarantees: deferred to separate contracts and plans.
- Migrating docs fence highlighting from Shiki: outside the user's request.
- Claiming source-offset fidelity implies browser DOM/clipboard preservation of
  raw CR/CRLF: rejected; model reconstruction stays exact, and HTML parsing needs
  normalization-aware browser assertions and explicit hydration verification.

## Release-age exception authorization

On 2026-10-02 the operator approved an exception only for
`@tanstack/highlight@1.0.0`. B may add that exact selector to
`pnpm-workspace.yaml` while retaining the 2880-minute policy and existing
exclusions. A passed at `a4f19bc`; B is re-baselined to that reviewed snapshot.
Dependency setup precedes implementation so the executor can inspect installed declarations.
Release infrastructure stays unchanged; existing docs CI already discovers new tests.
