# Package improvement plans

Written with the improve skill on 2026-10-02 against fresh `origin/main` commit
`fa0cfc9` (package v0.4.2), on `chore/package-improvements`. This is a planning
batch: no source implementation, commit, push, PR, publication, or deployment
was performed or is authorized by creation of these files.

The maintainer selected audit findings 1–10. Numbers preserve that mapping.
Finding 9 was explicitly changed from headless compatibility to **removing the
framework-agnostic wording**: this remains an opinionated Svelte package.

## Execution order and status

Execute 001 through 010 in order by default. Operational dependencies below
prevent shared-file conflicts even where fixes are otherwise independent.
An operator/reviewer owns these status rows unless they delegate updates.

| Plan | Title | Priority | Effort | Risk | Depends on | Status |
| --- | --- | --- | --- | --- | --- | --- |
| [001](001-pin-release-updater.md) | Pin the release updater and isolate credentials | P1 | M | MED | — | DONE |
| [002](002-isolate-processing-callbacks.md) | Isolate processing callback state reads | P1 | S | LOW | — | DONE |
| [003](003-preserve-capture-property-names.md) | Preserve accepted capture property names | P1 | S | LOW | 002, shared component tests | DONE |
| [004](004-handle-invalid-pattern-compilation.md) | Reject invalid templates without rendering failures | P1 | M | MED | 003, shared parser/tests | TODO |
| [005](005-enforce-library-ci-gates.md) | Enforce root typechecks and pnpm CI input coverage | P1 | S | LOW | 001, shared release workflow | TODO |
| [006](006-linearize-rejected-pattern-parsing.md) | Bound rejected-pattern discovery to linear traversal | P1 | M | MED | 004 | TODO |
| [007](007-match-template-occurrences-in-order.md) | Match expected template contexts in source order | P1 | M | MED | 004, 006 | TODO |
| [008](008-serialize-release-publication.md) | Serialize publication and protect owned artifacts | P1 | L | MED | 001, 005 | TODO |
| [009](009-align-svelte-only-documentation.md) | Correct Svelte-only helper documentation | P2 | S | LOW | 004, shared README sections | TODO |
| [010](010-fix-docs-onboarding.md) | Document initial packaging, watchers, and docs checks | P2 | S | LOW | — | TODO |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (reason) | REJECTED (reason).
Effort includes regression verification; 001/004/008 are larger than the initial
audit estimate because their concrete plans include behavior tests and explicit
release/error-policy choreography. Do not infer execution authorization from
this index; follow the operator's dispatch instructions.

## Dependency notes

- Workflow sequence **001 → 005 → 008** preserves pinned updater isolation,
  adds root verification, then changes release preparation/concurrency/cleanup.
  Reconcile the live workflow after each predecessor; never replace it with a
  stale excerpt. A release candidate must be the exact checkout verified by its
  gates; serializing jobs alone does not solve version-baseline drift.
- Parser/extraction sequence **003 → 004 → 006 → 007** preserves safe own-property
  capture storage, establishes invalid/duplicate rejection, linearizes discovery,
  and introduces ordered target matching. All accepted template names are unique
  across the template after 004. Cached regex state must reset after every use.
- 002 is independent at runtime but shares component unit tests with later plans;
  those plans must retain untracked callback execution and callback-identity
  dependencies. 009 changes documentation, not exports or runtime APIs.
- Existing `.agents/.plans/component-performance/` plans 001–005 are DONE and
  remain regression constraints. New performance fixture 006 belongs to this
  batch; do not rewrite earlier plans, change their workloads/ceilings, or mount
  their workloads inside the new route.
- Package improvements finish before the separate [code-diff batch](../code-diff/README.md).
  There, A supplies shared literal computation and B consumes it for syntax
  highlighting. Do not begin the component extraction while these fixes are
  still changing its contracts.

## Evidence and baseline

All findings were inspected and vetted against the library/workflows. Read-only
unit execution passed **123 tests in four files**; root svelte-check reported
**0 errors / 0 warnings**. Fresh main differs from the audit checkout only in
package version and the managed README footer, so those source results apply.
The planning session did not run builds, formatters, browser suites, or release
workflows; each plan explicitly specifies execution gates.

Direct in-memory probes reproduced callback re-notification, reserved-name
capture loss, regex compilation failures, repeated-context misattribution, and
quadratic malformed-marker discovery. Release races are code-backed mechanisms,
not live production experiments. The pinned external updater was read at its
immutable revision; credential values are never copied into these plans.

The ordinary docs check after a build scanned generated Cloudflare/server
outputs. Use the existing CI worker move/restore procedure when verifying docs;
do not present generated-output diagnostics as source-code regressions or disable
type checking to hide them.

## Considered and rejected or deferred

- Framework-agnostic/headless export support: **rejected by maintainer**. Plan
  009 corrects the unsupported wording, keeping public exports unchanged.
- Applying the docs pnpm-process shutdown fix to root Playwright: rejected as an
  unproven equivalence; root invokes npm, and no root shutdown failure was reproduced.
- Reopening DONE performance/diff-granularity/typed-lint initiatives: rejected;
  new fixes retain their contracts and tests instead.
- Claiming capture-key loss is prototype pollution: rejected; the observed string
  setter behavior loses a value, and the plan is a correctness fix.
- Treating documented trusted-regex execution outside diff timeout as a newly
  discovered vulnerability: rejected; parser discovery scaling is the concrete
  new issue addressed by 006.
- Three high devalue advisories from the production-workspace dependency audit:
  deferred dependency maintenance, not selected as another plan. The affected
  version is 5.9.1 and patched version is 5.9.3; triggering application data paths
  were not established. No confirmed exploit claim is made.
- Broad dependency upgrades, deployment/SEO/competitor audits, sentence/structural
  JSON modes, and patches/files/hunks: outside this batch.

## Audit boundary

Covered: published component/core helpers/types, relevant unit/browser test
design, own docs integration and onboarding, package manifests, Trunk/test
configuration, and release/verification workflow paths. Not exhaustively audited:
vendored dependencies, tombstone implementations, full browser behavior, private
docs-kit internals beyond the pinned updater and relevant read-only loaders,
production deployment/runtime, or every third-party competitive claim.

## Dispatch record

Execution authorized on 2026-10-02: run package improvements serially until STOP or COMPLETE. Guard owns commits and status rows; no live release or PR. Plan 001 passed at 687b7c4 with a documented Darwin runtime-key clarification and independently reproduced red/green tests.

Plan 002 passed at b3448d3: 125 units and 35 diagnostics across all five browser projects, with independent baseline callback-count reproductions. Plan 003 is re-baselined to this reviewed source tip because 002 added component tests.

Plan 003 passed at 40c286c: 131 units, 25 expected-pattern browser cases, and independent reserved-name baseline replay. Plan 004 is re-baselined to the completed parser/storage and callback predecessors; its docs source-check baseline passes 0/0 with the existing worker wrapper.
