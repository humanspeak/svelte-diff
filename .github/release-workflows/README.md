# Shared release safety

The authoritative source for this workflow family is this directory and the
release helpers in `../scripts/`. It extends the svelte-diff reference from
PR #216 (`51fe85747719a5ca0c1223198f55607956b2e67f`). Repository and Git history
inspection found no earlier publishing template, generator, reusable workflow,
or publishing sync mechanism in Humanspeak's packages, docs-kit, dotfiles, or
DevOps repository. The existing DevOps sync jobs manage labels, rulesets,
environments, and secrets. Docs-kit owns the README updater, not this publishing
workflow family.

## Sync a consumer

Use an isolated checkout of an immutable source commit. Review the consumer's
`.github/release-policy.json` and instructions, then run:

```sh
python3 .github/release-workflows/sync.py /path/to/consumer --revision SOURCE_COMMIT_SHA
python3 .github/release-workflows/sync.py /path/to/consumer --revision SOURCE_COMMIT_SHA --check
```

`--revision` must be the full 40-character SHA of the source checkout. The tool
vendors dependency-free helpers, adapts workflow fragments, and records hashes
of the resulting scripts and workflows in `.github/release-source.json`.
`--check` detects helper and workflow drift without writing. Unsupported initial
workflow layouts fail before any files are written. Repeated syncs are
idempotent. Existing jobs, gates, permissions, managers, signing, registry
commands, authentication, labels, and event provenance stay in the consumer.
Shared prepare, ownership, release creation, and cleanup fragments are refreshed
on subsequent syncs; repository-specific mutation/publication steps remain local
and are checked by the offline integration suite.

There is no runtime dependency on an unmerged source branch. Review consumer
changes and their checks, commit them, and open PRs labeled `skip-publish`.
Do not publish, merge, deploy, or dispatch a live release as part of syncing.

## Repository policy

- `manager`: retain npm or pnpm and the version selected by existing setup steps.
- `event`: `push` keeps original-commit merged-PR lookup; `pull_request` uses the
  original merge commit and event labels; `manual` permits main-only manual
  releases; `calver` retains signed, tag-only GitHub releases.
- `manifests`: canonical `package.json` followed only by actual lockstep aliases.
  Every manifest change is structurally limited to versions and alias ranges.
- `lockfile`: npm permits only the top-level and root-package version changes
  in `package-lock.json`. Dependency entries remain structurally identical.
  pnpm versioning does not change its lockfile; any such advancement is stale.
- `readme`: `managed` permits only changes inside one existing docs-kit marker
  pair. An unchanged README remains valid if a best-effort updater fails.
  `unchanged` forbids README changes and installs no updater. First-time footer
  installation must happen in a separate reviewed source commit.

Only svelte-diff has two tombstone/alias manifests. Ordinary consumers configure
one manifest. The helper's default policy contains no package-specific aliases
or README assumptions; the CLI requires the repository policy.

The updater is pinned to docs-kit commit
`882b87e6a73c408c6b31fe8a185e8d0ea397fa37`, which is the inspected docs-kit main
revision for this rollout. It uses built-in Node APIs, detects the current
package name without environment variables, and owns an existing MIT ecosystem
footer. It is suitable for the consumers already using that footer. Other
packages and docs-kit itself retain their existing README policy.

## Release guarantees and limits

All release workflows use `repository-release` with `cancel-in-progress: false`.
Under GitHub's default pending-run policy, a newer pending run replaces the older
pending run. Serialization guarantees neither execution of every event nor
original trigger order. See [GitHub's concurrency documentation](https://docs.github.com/en/actions/concepts/workflows-and-actions/concurrency).

Prepare resolves one SHA before testing. Every later code job consumes that
SHA. Push and PR-close events accept intervening commits only after proving each
is a single-parent, structurally verified metadata change; unrelated source,
configuration, dependency, file-mode, or ancestry changes skip the stale run.
Manual main requests select current main before testing. CalVer automatic
requests reject all main advancement. Immediately before mutation, main is
rechecked; no untested rebase or reset is allowed.

SemVer releases use an ordinary fast-forward main push followed by one explicit
annotated tag push. CalVer releases mutate no manifests or main ref. A rejected
main push prevents all later publication. Existing tag/release collisions and
ambiguous creation outcomes are retained for reconciliation.

Run identity, release commit, exact annotated tag object, and numeric release ID
are written atomically outside the checkout. Cleanup requires proven ownership,
protects replacement artifacts, uses an exact-object tag deletion lease, and
uses the recorded numeric release ID. Unknown registry outcomes retain metadata.
Canonical publication has its own step-outcome barrier even if recording state
subsequently fails. Successful CalVer release creation similarly prevents later
cleanup. Cleanup is safe to repeat.

## Validation

```sh
python3 -m unittest discover -s .github/release-workflows -p '*test.py'
node --test .github/scripts/*.test.mjs
```

Tests use temporary fixtures and mocked Git, GitHub, download, and registry
transports. They cover overlapping and stale runs, metadata chains, rejected
pushes, collisions, replacements, malformed and foreign state, ambiguous
outcomes, successful publication followed by failure, and repeated cleanup.
The shared sync tests cover npm/pnpm differences, manual tag selection,
idempotence, drift, and failure before partial writes. Run each consumer's source
check, build, units, and configured lint checks before committing.

Local validation does not exercise GitHub-hosted release execution, production
environments, actual GPG credentials, trusted publishing, or live publication.
Those remain an explicitly authorized rollout step after review.
