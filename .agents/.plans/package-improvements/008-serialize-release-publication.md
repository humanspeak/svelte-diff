# Plan 008: Serialize publication and clean up only artifacts owned by the current run

> **Executor instructions**: Follow each step and verify its expected output. Stop and report on the STOP conditions. Update your sibling README row only if the reviewer delegates index maintenance. This plan authorizes implementation and offline tests, not a live release, remote mutation, dependency installation, workflow dispatch, credential access, commit, push, or PR.
>
> **Drift check (run first)**: `git diff --stat fa0cfc9..HEAD -- .github/workflows/npm-publish.yml .github/scripts/release-publication.mjs .github/scripts/release-publication.test.mjs`
> Plans 001 and 005 intentionally change this workflow. Confirm their pin and verification gates are present and retain them. Compare all remaining relevant behavior with the excerpts below; stop on unexplained differences.

## Status

- **Priority**: P1
- **Effort**: L — workflow choreography, ownership state, and offline behavioral tests span multiple failure stages
- **Risk**: MED
- **Depends on**: `001-pin-release-updater.md`, then `005-enforce-library-ci-gates.md`; execute 008 after both are DONE
- **Category**: bug
- **Planned at**: commit `fa0cfc9`, 2026-10-02

## Why this matters

Two release runs can derive the same version from their event checkouts. The losing run's failure cleanup deletes the release and tag by version name without checking whether it created them, potentially removing metadata belonging to the successful run. Serializing only the final job is insufficient: a queued event may still carry an old manifest, and blindly switching to current main after tests would publish untested source. Establish one immutable tested checkout, handle stale triggers explicitly, and treat release cleanup as an ownership-checked operation that stops once canonical publication succeeds.

## Current state

- `.github/workflows/npm-publish.yml` runs for relevant pushes to main and manual dispatch. It recovers merged-PR labels/title/URL using `context.sha`, excludes direct pushes from automatic publication, honors `skip-publish`, and selects major/minor/patch labels for version bumping.
- `check-if-merged` supplies `should_run`, label flags, and PR metadata. Build, Playwright, coverage, and publication jobs use separate default event checkouts; there is no release concurrency group.
- Publication uses environment `production`, imports a signing key, refreshes the README, updates the canonical and shim version manifests, pushes a version commit/tag, creates a release, then publishes through pnpm/OIDC.
- `001-pin-release-updater.md` creates `.github/scripts/refresh-release-readme.sh` and its native Node regression. Its integration contract retains the unique `Bump version` and following `Create Release` step names, with exactly one `bash .github/scripts/refresh-release-readme.sh` invocation after `pnpm version` and before token-bearing remote configuration. Preserve those names and the in-step order; do not move that helper to an opaque command that breaks its offline integration test.
- `005-enforce-library-ci-gates.md` adds one unconditional `Check library types` / `run: pnpm run check` step before build/unit tests in the publish `build` matrix, retaining publication's build/Playwright/coverage dependencies. Do not regress these gates while moving checkout/version handling. Plan 005 changes both workflows, but this plan modifies only npm-publish.yml.
- `.github/workflows/trunk-check.yml:3` demonstrates repository concurrency syntax, but its `cancel-in-progress: true` is inappropriate for a publishing workflow: release mutations must not be cancelled by a newer event.
- Root unit discovery (`vite.config.ts:16`) includes only `src/lib/**/*.test.ts`. Use native Node tests for the new `.mjs` release helper; do not put release tooling in the published library or change the test inclusion pattern/dependencies.

`npm-publish.yml:99` documents the existing event provenance policy:

```bash
# Pushes publish only when the commit landed via a merged PR;
# direct pushes to main stay unpublished.
if [[ "$EVENT_NAME" == "push" && "$PR_FOUND" != "true" ]]; then
    echo "should_run=false" >> $GITHUB_OUTPUT
else
    echo "should_run=true" >> $GITHUB_OUTPUT
fi
```

`npm-publish.yml:539` derives a version from whichever manifest the publishing job checked out:

```bash
pnpm version "$BUMP_TYPE" --no-git-tag-version
PACKAGE_VERSION=$(node -p "require('./package.json').version")
NEW_VERSION="v${PACKAGE_VERSION}"
echo "new_version=$NEW_VERSION" >> "$GITHUB_OUTPUT"
```

`npm-publish.yml:589` pushes without reconciling the tested baseline:

```bash
git push
git push --tags
```

`npm-publish.yml:639` schedules cleanup for any failure. Its version-format validation does not establish ownership:

```bash
gh release delete "$RELEASE_VERSION" --yes || true
git tag -d "$RELEASE_VERSION" || true
git push --delete origin "$RELEASE_VERSION" || true
```

`npm-publish.yml:623` performs canonical publication; the following shim publication is best-effort and must remain so. An error after canonical publication must never remove already-published release metadata. Credential values must never be printed, persisted in test fixtures, or embedded in this plan or its implementation; refer to credential types/environment variable names only.

## Commands you will need

Run from the repository root with the installed pnpm 12/Node 24 toolchain. Do not install dependencies or run a live release to verify this work.

| Purpose | Command | Expected on success |
| --- | --- | --- |
| New release behavior tests | `node --test .github/scripts/release-publication.test.mjs` | All offline tests pass after implementation |
| Red ownership regression | `node --test --test-name-pattern='never deletes pre-existing release artifacts' .github/scripts/release-publication.test.mjs` | Red in Step 1; green in Step 4 |
| Script syntax | `node --check .github/scripts/release-publication.mjs` | Exit 0 |
| Root typecheck | `pnpm check` | Exit 0; zero root errors/warnings |
| Complete root units | `pnpm test:only` | Exit 0; baseline 123 plus selected-plan regressions |
| Predecessor updater gate | `node --test .github/scripts/refresh-release-readme.test.mjs` | All offline cases pass, including workflow order |
| Build/package gate | `pnpm run build` | Exit 0; svelte-package and publint succeed |
| Repository formatting/lint | `trunk fmt` then `trunk check` | Exit 0; YAML, shell, JavaScript, and security checks pass |
| Scope/whitespace | `git status --short` and `git diff --check` | Only scoped executor changes; exit 0 |

The build job must retain unconditional `pnpm run check`, `pnpm build`, and `pnpm test` (coverage-enabled) in CI, plus the new native release tests; local final gates include the updater test and build listed above. The authoritative lint command is Trunk, not package.json's legacy lint command. Do not weaken suppressions, test predicates, gate dependency lists, or assertion thresholds to make this plan pass.

## Scope

**In scope** (only these implementation files):

- `.github/workflows/npm-publish.yml`
- `.github/scripts/release-publication.mjs` — create importable functions plus guarded command-line entry for baseline/state/publication cleanup operations
- `.github/scripts/release-publication.test.mjs` — create Node tests with temporary fixture directories and mocked git/gh/pnpm transports
- `.agents/.plans/package-improvements/README.md` — your status row only if delegated

**Out of scope**:

- Other workflows; dependency manifests/lockfiles; library/components/docs; package API or version-policy redesign
- Editing shim source/manifests in the checkout during implementation; the existing release-time manifest update remains part of the workflow
- Removing OIDC/provenance, GPG signing, production environment, label rules, skip behavior, pinned updater, or plan-005 verification gates
- Changing environment protection settings, assuming environments themselves provide locking, live GitHub/npm calls, workflow dispatch, or registry publication
- Historical DONE plans, generated output, committing/pushing/opening PRs

## Git workflow

- Continue the dispatched `chore/package-improvements` branch or the reviewer's assigned isolation branch. Do not overwrite other selected-plan work.
- When commits are separately authorized, use a logical conventional message such as `fix: serialize releases and guard artifact cleanup` (exemplar: `3c0b722 fix(docs): unhang Playwright under pnpm 12 and fix guide mirror path (#212)`).
- No remote mutations or publication during implementation or verification.

## Steps

### Step 1: Reproduce destructive cleanup with an offline behavioral test

Create `.github/scripts/release-publication.test.mjs` using `node:test`, `node:assert/strict`, and temporary directories cleaned in `finally`. Test the actual workflow cleanup invocation, not a guessed replacement policy. Read the workflow and extract the `run:` body of its named `Cleanup on failure` step using its indentation boundary; fail loudly if the step cannot be located. Execute that body with Bash in a fixture checkout and a mock-only transport environment: git, gh, pnpm, and curl must be fake executables that append argument arrays to a fixture call log and return configured fixture output; real Node/Bash may run, but every outbound transport is replaced. No ambient credentials, no real remote URLs, and no fallthrough from mocks to actual programs.

Add the test `never deletes pre-existing release artifacts`: supply a valid fixture version, a pre-existing release/tag represented by mocked transport output, and absent current-run ownership state. Assert no remote deletion command is emitted and success/no-op is returned. The present shell block violates this by deleting release/tag solely by version. Add `keeps published metadata after canonical registry success`, with fixture state marked canonical-published, asserting zero release/tag deletion even when another step fails. The current code also fails this assertion.

Initially the tests exercise the unmodified shell block; do not import a nonexistent helper and call that a reproduction. Keep this integration seam after the workflow switches to the helper, so the test proves that the configured cleanup entry point honors state, not just that a standalone policy function looks correct. The test environment may explicitly pass the fixture Node executable needed by the future helper; Node subprocesses must still see mock git/gh/pnpm/curl through PATH.

**Verify**: `node --test --test-name-pattern='never deletes pre-existing release artifacts' .github/scripts/release-publication.test.mjs` → FAIL because the call log contains forbidden release/tag deletions. `node --test --test-name-pattern='keeps published metadata after canonical registry success' .github/scripts/release-publication.test.mjs` → FAIL for the same observed destructive side effect. Stop if failure comes from extraction, unavailable binaries, or accidental real transport.

### Step 2: Pin one tested baseline under a non-cancelling workflow concurrency group

Add **workflow-level** concurrency before jobs, using a fixed repository-wide release group that includes both main-push and manual release events, with `cancel-in-progress: false`. The lock must cover preparation, every checkout/test gate, and mutation; a publish-job-only lock leaves tested baselines stale. Do not include event SHA/run ID in the group, because that would give each run an independent lock. Do not assume the `production` environment queues safely. Document that GitHub concurrency is not a FIFO guarantee: pending runs may be superseded; correctness must rely on stale-baseline checks, not every trigger receiving a turn.

Add a read-only prepare job, conditioned on the existing merged-PR/manual `should_run` policy. Fetch current main and output a validated immutable `checkout_sha` plus `ready`/`stale` outcome. Retain PR lookup and labels from the **original triggering commit**, never look up labels from a later version commit. Apply the following exact policy in `release-publication.mjs`, with injectable array-argument subprocess transport:

1. A qualifying push can select its event SHA if it equals current main. If current main is a descendant and the intervening difference consists exclusively of recognized release metadata updates, select current main **before tests** to get the fresh package version. Recognized means the whole diff contains only canonical package.json `version`, shim package.json `version` plus canonical dependency version range, and the exact managed README ecosystem footer block maintained by the pinned updater. Parse JSON and compare every other field structurally; do not trust commit author/message, file allowlists alone, or strip the entire manifest. Reject unrecognized changes outside the managed README block. Validate ancestry, version transitions, and the shim version/range relationship rather than accepting arbitrary edits to these fields.
2. If main differs in source, dependencies, non-version configuration, unrelated README text, or any other content, mark this push **stale**, summarize `no release created; use a fresh qualifying main event or manual retry`, and perform no mutation/cleanup. Do not merge/rebase arbitrary newer source after tests, publish an old checkout over new main, or auto-dispatch a replacement run. A manual retry selects current main during prepare and runs every gate on it. Manual release requests from a non-main ref must terminate as unsupported/no-op with a clear summary; do not silently release that branch.
3. Preserve `skip-publish`, major/minor/patch labels, and manual skip. A stale or skipped run has no ownership state and must never enter artifact cleanup. It must not be reported as a successful publication.

Preparation needs one explicitly declared bootstrap checkout at the original
event SHA to load the read-only baseline-selection helper; it cannot consume its
own not-yet-produced output. This checkout must not run build/test/publication or
write operations. Keep metadata-only provenance discovery separate from code
verification. Configuration assertions must recognize this sole preparation
exception explicitly, rather than allow arbitrary checkouts without a prepared ref.

Set an explicit `ref: ${{ needs.prepare.outputs.checkout_sha }}` in **every downstream code checkout** that participates in debug/lint/typecheck, build/unit, Playwright, coverage-dependent code, and publication. Arrange `needs` so all plan-005 gates consume the same preparation output. Never fetch and reset to a different source after a successful gate. Before tests, log only the selected commit SHA, original event SHA, stale/ready outcome, and version; no secrets.

Add offline behavioral cases for equal SHA, version-only advancement, source advancement, manifest dependency change hidden in package.json, direct push with no merged PR, labels on the original event, manual main/non-main/skip, ancestry failure, and malformed remote output. Add configuration assertions that extract every checkout and gate dependency, require a shared prepared ref, require one non-cancelling group, and preserve plan-005 gates. Static YAML checks supplement actual state-machine tests; they are not their replacement.

**Verify**: `node --test --test-name-pattern='baseline|provenance|workflow concurrency|tested checkout' .github/scripts/release-publication.test.mjs` → all cases PASS; source-different or unrecognized advancement makes zero mutation calls and zero cleanup calls. `node --check .github/scripts/release-publication.mjs` → exit 0. `trunk check .github/workflows/npm-publish.yml .github/scripts/release-publication.mjs .github/scripts/release-publication.test.mjs` → exit 0.

### Step 3: Track current-run artifacts and protect the baseline at mutation time

Initialize an atomic run-state JSON file under `$RUNNER_TEMP`, scoped to GitHub run ID and run attempt; never commit it. Store only non-secret identifiers: run/attempt, prepared base SHA, version, version commit SHA, local/remote annotated tag object ID, release numeric ID, which remote creations have confirmed success, registry outcome, and canonical-publication completion. Read/write state via validated functions in `release-publication.mjs`; use atomic replace, reject malformed fields or another run's state, and avoid logging full subprocess environments. Distinguish `not attempted`, `confirmed created`, and `unknown outcome`; unknown ownership must retain artifacts and warn, never authorize deletion.

Immediately before any version mutation, fetch and require remote main to equal the exact prepared/tested SHA. If it advanced during tests, stop as stale/no-op before creating artifacts and require a fresh tested retry. Create a local release branch from the prepared SHA rather than relying on detached checkout implicit push behavior. Keep updater pinning, GPG signing, existing canonical/shim version mutations, and release notes. Validate the complete working-tree delta before creating the version commit: only planned version/managed README changes may ship; the package source and all other manifest fields must remain the tested baseline.

Push the version commit to main with a normal explicit fast-forward push (`HEAD:refs/heads/main`), **never force**. If main changes between the check and push, ordinary Git rejection prevents overwriting newer source. Do not push tags after that rejection; record that no remote artifact was created. Push only the new explicit tag ref, not `--tags`; record its annotated tag object OID and peeled version commit SHA only after a confirmed successful creation. If an existing remote tag or release is found, do not reuse/delete it or proceed to registry publication; report a version collision and leave it intact.

Create the GitHub release through an API operation whose creation response contains its numeric ID. Record that ID only after success, together with the expected tag and version commit. Do not infer ownership by subsequently finding a release with the same name: after an ambiguous response it may be somebody else's. Preserve release title/body/PR URL behavior, and use structured body-file/request handling rather than embedding runtime strings into code. A returned creation ID cannot authorize cleanup if the state does not belong to this run/attempt.

After canonical `pnpm publish --provenance --access public --no-git-checks` returns success, immediately mark canonical publication completed in atomic state. Cleanup must also have an independent publication-step-success guard so a later state-write failure cannot delete published metadata. If publish was attempted and its result is ambiguous (e.g. the client errored after an accepted upload), retain metadata and report manual reconciliation unless an authoritative registry query proves the version absent. Failed/unavailable registry checks must retain artifacts. Keep shim errors best-effort and preserve canonical metadata after shim/notification/telemetry failures.

**Verify**: `node --test --test-name-pattern='creation|ownership state|main advanced|publish outcome|collision' .github/scripts/release-publication.test.mjs` → all PASS. Fixtures must show no tag push after failed main push, explicit one-tag push, no mutation after stale source, state recorded only after confirmed creations, same tested parent for the version commit, and retained metadata for canonical success or ambiguous registry outcome. `node --check .github/scripts/release-publication.mjs` → exit 0.

### Step 4: Replace unconditional rollback with ownership-checked cleanup

Switch the named workflow `Cleanup on failure` step to the new helper, passing the run-state path and run/attempt identifiers; keep its name so Step 1's behavior harness executes the real configured entry point. Guard the step against canonical publication success as well as consulting validated state. Missing/malformed/foreign state, stale baseline, absent creation confirmations, or canonical-success/unknown registry outcome must return a clear no-op/warning with **zero remote deletions**.

For a confirmed created release, retrieve it by the stored numeric ID and verify ID/tag and the expected version commit relationship. Delete only via that exact numeric ID, not `gh release delete <version>`. If a release/tag now belongs to a different commit, retain and warn. Missing artifacts are idempotent no-ops. Delete a confirmed owned remote tag only when its current annotated tag-object OID and peeled commit match stored state; use a compare-and-swap ref deletion (Git force-with-lease for the exact expected tag-object OID) so a change after inspection cannot delete a replacement. A version-name regex or a plain `git push --delete` is insufficient. Do not roll back the branch/version commit on failure.

Add cases where run A created an artifact but run B now owns the same tag name, the stored tag OID changes between inspection and deletion, release IDs differ, only a tag was created, only local artifacts exist, cleanup runs twice, and registry publication succeeds before a downstream failure. The expected behavior is deletion only of confirmed current-run identities before publication, with replacement artifacts preserved. Cleanup exceptions should be surfaced as warnings with identifiers; do not introduce broad silent exception swallowing.

**Verify**: `node --test .github/scripts/release-publication.test.mjs` → all tests PASS, including the original two red reproductions. Test logs demonstrate no version-name-only remote delete, lease rejection preserves replacement tags, numeric-ID-only release deletion, and zero deletion after successful canonical publication. `rg -n 'git push --tags|gh release delete|git push --delete' .github/workflows/npm-publish.yml .github/scripts/release-publication.mjs` → no matches in live code (test references are exempt).

### Step 5: Wire offline tests into the release gate and run complete checks

Run `node --test .github/scripts/release-publication.test.mjs` in the existing `build` verification matrix alongside the blocking `Check library types` step added by plan 005, before publication can become eligible. Keep every existing required gate in its dependency list. Tests must use fixtures and mock transports only; a gate must never dispatch a workflow, push GitHub refs, or query a real registry as a test side effect. Review job-level output propagation, failed-step outputs, OIDC permissions, and all `if` branches for ready/stale/skipped/published outcomes. A failed version step's early `new_version` output must no longer be sufficient to trigger deletion.

**Verify**: `node --test .github/scripts/release-publication.test.mjs`, `node --check .github/scripts/release-publication.mjs`, `node --test .github/scripts/refresh-release-readme.test.mjs`, `pnpm check`, `pnpm test:only`, `pnpm run build`, `trunk fmt`, `trunk check`, and `git diff --check` → each exits 0. `rg -n -A 1 'name: Check library types' .github/workflows/npm-publish.yml` → one unconditional step with `run: pnpm run check`; offline workflow dependency assertions prove it blocks publication. `git status --short` → only scoped executor changes, preserving unrelated predecessor work. Hosted workflow execution is deferred until the operator authorizes a real run; report that limitation explicitly instead of claiming live release validation.

## Test plan

- Red anchor executes today's actual cleanup shell against mocked transports and proves pre-existing or already-published metadata is deleted. Green executes the workflow's replacement helper invocation and observes no deletion in those situations.
- Use Node's built-in test runner and injected `execFile`-style argument-array transport in the helper; use actual temporary local Git repositories when useful for ancestry/metadata diff tests, with no network remote. Mock gh/registry response bodies and call results, including partial and ambiguous failures. All fake binaries must reject unexpected commands rather than invoke real tools.
- Cover lifecycle states from prepare through success and cleanup, not merely YAML token presence. Assert state/side effects and tested commit identity; do not mirror the helper's branching into a second expected-policy implementation.
- Validate immutable checkout propagation and preserved event/label/skip provenance in the workflow. Include every code-consuming job, including predecessors introduced by 005.
- Scope assertions distinguish exact JSON version-only changes from dependency/source changes; ownership assertions distinguish annotated tag object identity from its peeled commit.
- Repeat cleanup to prove idempotence. Unknown outcome, malformed state, foreign run IDs, changed remote identities, and published state must all preserve metadata.
- Native release tests run in CI in addition to the existing root library suite; no new dependency, install script, or library export is needed.

## Done criteria

- [ ] Step 1's two observed-side-effect reproductions were recorded red and now pass through the actual configured cleanup entry point.
- [ ] One fixed whole-workflow concurrency group covers push/manual release runs with `cancel-in-progress: false`; no environment-lock assumption.
- [ ] Every downstream verification/publication checkout uses the same validated prepare SHA; the sole read-only preparation bootstrap is explicitly exempted, and every required plan-005 gate runs before publication eligibility.
- [ ] Version-only main advancement is validated structurally before testing; source/config/dependency advancement becomes stale/no-op, with no mutation or cleanup.
- [ ] A main change after testing causes no mutation, or a normal fast-forward push rejection; no force push or untested reset/rebase exists.
- [ ] Tests verify original trigger labels, merged-PR-only automatic publication, skip/major/minor/patch, manual-main selection, and stale-run retry messaging.
- [ ] Cleanup requires current-run confirmed creation state, exact release numeric ID, annotated tag OID/peeled commit, and tag deletion lease; replacements and pre-existing identities survive.
- [ ] Canonical publish success and ambiguous registry outcome retain release/tag metadata even after downstream errors or state-write failure; shim publishing remains best-effort.
- [ ] All native release tests run in the CI verification gate; all listed local final commands exit 0; no real remote mutation occurred during tests.
- [ ] Only scoped files changed; updater pin, OIDC/provenance, signing, environment, and predecessor gates remain intact. Status row updated if delegated.

## STOP conditions

- Plan 001 or 005 is incomplete, its behavior cannot be retained, or workflow excerpts drift beyond those known changes.
- Safe baseline selection requires assuming latest main was tested when only an earlier SHA passed, changing label/event provenance, or accepting manifest differences based only on file names/commit messages.
- The hosted concurrency behavior is assumed to be FIFO or pending-run-preserving; the stale/no-op policy must still work under superseded pending runs.
- A test reaches an actual remote, accesses ambient secrets, or cannot constrain subprocess transport; stop immediately and report the unintended boundary crossing without credential values.
- Numeric release-creation ID, annotated tag-object identity, creation confirmation, or lease-protected deletion cannot be obtained using existing tooling. Retain metadata; do not fall back to deletion by version name.
- Canonical registry success or unknown upload outcome could lead to rollback after a later failure/state-write error.
- An existing operator workflow relies on manual release from non-main refs, or recognized release metadata requires accepting source/dependency changes; report this policy conflict rather than broadening the allowlist silently.
- A verification fails twice after a reasonable correction, or an out-of-scope edit/dependency/live release appears necessary.

## Maintenance notes

The tested SHA, trigger provenance, and artifact ownership are independent facts; preserve all three when reorganizing CI. Adding another code-consuming job requires explicit prepared-ref propagation and inclusion in the release gate. A future release updater may change allowed metadata fields; review structural baseline comparison and working-tree validation together. Canonical publication is the rollback barrier: registry publication cannot be undone safely by removing GitHub metadata. Failed/unknown remote responses may intentionally leave artifacts for manual reconciliation; retention is preferable to deleting somebody else's or already-published release. No live release validation is part of this plan.
