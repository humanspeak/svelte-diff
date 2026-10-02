# Plan 005: Enforce library typechecks and pnpm input coverage in CI

> **Executor instructions**: Follow every step and verification; STOP on the named conditions. The operator maintains the batch index unless delegated. Do not implement library changes as part of this workflow plan.
>
> Revision 2026-10-02: Plan 001 is DONE and root check at reviewed 7068933 passes 0/0. Re-baseline shared workflow drift to this reviewed tip; completed pinned updater integration and credential isolation must remain unchanged. Source/test contract and gate policy are unchanged.
>
> **Drift check (run first)**: `git diff --stat 7068933..HEAD -- .github/workflows/run-tests.yml .github/workflows/npm-publish.yml`. Read the live workflow and compare excerpts. Plans 001 → 005 → 008 edit the publish workflow sequentially; the completed 001 change is already in the baseline and must be preserved. STOP on unrelated drift.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `001-pin-release-updater.md` for shared-workflow operational ordering; execute before 008
- **Category**: dx
- **Planned at**: commit `7068933`, 2026-10-02

## Why this matters

The library's build and runtime tests do not enforce its TypeScript contract. The PR test workflow also watches the obsolete npm lockfile rather than pnpm dependency inputs, so dependency-only PRs skip the library suites. Add the existing root check to PR and pre-publication verification and cover the actual pnpm/test baseline inputs without redesigning CI policy.

## Current state

- `package.json:49` defines `"check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json"`; line 60 defines coverage-enabled Vitest tests.
- `.github/workflows/run-tests.yml:12` includes `src/**`, `tests/**`, `package.json`, `package-lock.json`, config globs, and its own workflow path, but omits `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `vitest.setup.ts`, and root ESLint config.
- `.github/workflows/run-tests.yml:69` runs:

    ```yaml
    - name: Run unit tests
      run: |
          pnpm build
          pnpm test
    ```

- `.github/workflows/npm-publish.yml:289` has the same build/test commands in its build matrix. Its `build` result already gates publication; preserve that dependency graph.
- `vite.config.ts:19` declares `setupFiles: ['vitest.setup.ts']`. `vitest.setup.ts:1` configures matchers and timer mocks; changing it affects every test. `eslint.config.mjs:14` is the root lint baseline, with Trunk authority from `.trunk/trunk.yaml`.
- Exemplar: `.github/workflows/docs-diff-modes.yml:12` explicitly watches `pnpm-lock.yaml` and `pnpm-workspace.yaml`, and line 63 separately invokes the docs check. Root and docs checks are distinct.
- Node 24.15.0/pnpm 12.6.0 are the local environment. Advisor-observed baseline: root `pnpm exec svelte-check --tsconfig ./tsconfig.json` gave zero errors/warnings; `pnpm exec vitest run src/lib/ --reporter=dot` passed 123 tests. Workflows were inspected, not executed.

## Commands you will need

| Purpose                    | Command                                                       | Expected on success                                           |
| -------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| Typecheck                  | `pnpm run check`                                              | Exit 0, zero errors/warnings                                  |
| Library tests              | `pnpm exec vitest run src/lib/`                               | All pass; baseline 123                                        |
| Release updater regression | `node --test .github/scripts/refresh-release-readme.test.mjs` | All offline cases pass, including shared-workflow integration |
| Build/package              | `pnpm run build`                                              | Exit 0; package/publint succeed                               |
| Format                     | `trunk fmt`                                                   | Exit 0                                                        |
| Lint                       | `trunk check`                                                 | Exit 0                                                        |
| Hygiene                    | `git diff --check`                                            | Exit 0                                                        |

## Scope

**In scope**:

- `.github/workflows/run-tests.yml`
- `.github/workflows/npm-publish.yml`

**Out of scope**:

- Source, test assertions, manifests, lockfile, ESLint/Trunk settings, docs CI, release policy, Node matrix, cache redesign, and new workflow/test tooling.
- Root Playwright shutdown, telemetry uploader, and 001's updater integration.

## Git workflow

- Use `chore/package-improvements`; reviewed baseline `7068933`. Preserve operator work and earlier plan edits.
- No commits, pushes, PRs, or workflow dispatches are authorized.
- Serialize this plan between 001 and 008 if those plans are being executed. It has no behavioral dependency on them.

## Steps

### Step 1: Correct the PR workflow input paths

In `run-tests.yml`, replace `package-lock.json` with explicit `pnpm-lock.yaml` and `pnpm-workspace.yaml`. Add `vitest.setup.ts` and `eslint.config.mjs` as root baseline inputs. Keep the current source/test/config paths, docs exclusion, and branch policy. Do not add unrelated tooling policy paths.

**Verify**: `python3 -c 'from pathlib import Path; s=Path(".github/workflows/run-tests.yml").read_text(); p=s.split("        paths:\n",1)[1].split("\nconcurrency:",1)[0]; assert all("- "+x in p for x in ["pnpm-lock.yaml","pnpm-workspace.yaml","vitest.setup.ts","eslint.config.mjs"]); assert "package-lock.json" not in p; print("PR input paths OK")'` → prints `PR input paths OK`, exit 0.

### Step 2: Add root checks to both library verification blocks

Add a named `Check library types` step running `pnpm run check` after dependency installation and before the existing library build/test block in `run-tests.yml` and in the publish workflow's `build` job. Do not add it to unrelated release jobs or replace the docs check. Keep check failures blocking: no `continue-on-error`, conditional skip, or shell suppression. Preserve all existing jobs and their publication dependencies.

**Verify**: `rg -n -A 1 'name: Check library types' .github/workflows/run-tests.yml .github/workflows/npm-publish.yml` → exactly one named step in each file, each followed by `run: pnpm run check`. `pnpm run check` → zero errors/warnings, exit 0.

### Step 3: Run full gates and inspect workflow-only scope

Run `pnpm exec vitest run src/lib/`, `node --test .github/scripts/refresh-release-readme.test.mjs`, `pnpm run build`, `trunk fmt`, `trunk check`, and `git diff --check`. Repeat the Step 1 assertion, Step 2 search, and release updater regression after formatting. Inspect `git diff -- .github/workflows/run-tests.yml .github/workflows/npm-publish.yml` to confirm unchanged dependency graph and preserved prior-plan updater logic. The offline release tests were added by prerequisite 001; run them without modifying their scoped files.

**Verify**: all commands exit 0; baseline library tests pass; only scoped workflow changes are added by this plan. `git status --short` distinguishes prior operator work from this plan's changes.

## Test plan

- Explicit red-first exemption: this plan changes declarative CI configuration only, not application runtime behavior. Do not write an implementation-mirroring unit test for YAML.
- Machine assertions check actual trigger inputs and named check steps. `trunk check` supplies configured workflow/YAML/security linting; `.trunk/trunk.yaml` intentionally disables actionlint, so do not invent an actionlint gate.
- Run the real root typecheck, complete library tests, root build/package, and plan 001's offline release updater regression locally. The last gate protects the shared publish workflow's credential-isolation and updater ordering while this plan edits it. Do not dispatch CI or introduce a deliberately failing source file.

## Done criteria

- [ ] Step 1 path assertion exits 0; pnpm dependency files, test setup, and ESLint config are watched.
- [ ] Both workflows contain one unconditional blocking `pnpm run check` step before library build/tests.
- [ ] `pnpm run check`, `pnpm exec vitest run src/lib/`, `node --test .github/scripts/refresh-release-readme.test.mjs`, `pnpm run build`, `trunk fmt`, `trunk check`, and `git diff --check` exit 0.
- [ ] No source/config/policy changes outside the two workflow files are introduced by this plan.
- [ ] Report outcomes to the operator who maintains the index; do not commit/push/PR.

## STOP conditions

- The root check fails at the starting baseline or the added gate requires library fixes. Report errors; do not expand scope.
- Unexpected workflow drift changes the jobs, trigger schema, or release dependency graph.
- Prerequisite 001 is incomplete or its offline test/helper files are missing; do not skip its shared-workflow gate.
- A step fails twice after a reasonable correction or requires modifying out-of-scope files.
- Passing CI would require suppressing typecheck errors, weakening gates, adding secrets, or changing release policy.

## Maintenance notes

- New shared test setup/config files should be added to the PR paths when they can change library verification results.
- Keep root typecheck distinct from docs checks and from type-aware ESLint; each checks a different contract.
- Reviewers should confirm that dependency-only PRs now run library verification and release check failures block publication. Plan 008 must preserve these gates.
