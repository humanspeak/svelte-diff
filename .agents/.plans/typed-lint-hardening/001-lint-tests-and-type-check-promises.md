# Plan 001: Lint tests and type-check promise usage across owned code

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update this plan's row in
> `.agents/.plans/typed-lint-hardening/README.md` unless a reviewer told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 5bde0ad..HEAD -- eslint.config.mjs docs/eslint.config.mjs .trunk/trunk.yaml src/lib/SvelteDiffMatchPatch.test.ts`
> Then run:
> `git diff --stat -- eslint.config.mjs docs/eslint.config.mjs .trunk/trunk.yaml src/lib/SvelteDiffMatchPatch.test.ts`
> The dependency/toolchain upgrade is committed at the planned SHA and the
> working tree was clean except for this uncommitted plan batch. If an in-scope
> source/config file has changed, compare it with "Current state" and STOP on a
> mismatch.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none; preserve the recorded docs failure baseline
- **Category**: dx
- **Planned at**: commit `5bde0ad`, 2026-07-17

## Why this matters

The workspace has six `*.test.ts` files—three Vitest unit files under `src/lib/`
and three Playwright files under `tests/`—but both ESLint configs globally ignore
that filename pattern. The code therefore receives no ESLint feedback in the
places where promise-heavy test APIs are most common. The configs also provide no
type information to ESLint, so `@typescript-eslint/no-floating-promises` and
`@typescript-eslint/no-misused-promises` cannot run.

This plan closes those blind spots without adopting the entire type-checked
preset. That narrower choice is intentional: a dry run of the full preset
surfaced dozens of unrelated unsafe-type diagnostics and made the large docs
component tree expensive to lint. The result should be type-aware promise checks
for owned root and docs source/test files, ordinary ESLint for the shadcn tree,
and no blanket rule disabling.

## Current state

- `eslint.config.mjs` is the root package's flat ESLint config.
- `docs/eslint.config.mjs` is a separate, currently identical flat config for
  the docs package. Changes in this plan must be mirrored deliberately; do not
  assume editing one config affects the other.
- `.trunk/trunk.yaml` is the lint authority. `CLAUDE.md:11,18-19` requires
  `trunk fmt` and `trunk check`.
- `src/lib/SvelteDiffMatchPatch.test.ts` is the only current root test file
  found by the targeted dry run to have an ordinary lint violation.

Both ESLint configs currently contain this shape at lines 13-39:

```js
{
    ignores: [
        // ...
        '**/dist',
        '**/*.test.ts'
    ]
},
js.configs.recommended,
...ts.configs.recommended,
...svelte.configs['flat/recommended'],
// ...
{
    languageOptions: {
        parserOptions: {
            tsconfigRootDir: import.meta.dirname
        }
    }
}
```

The Trunk config currently excludes all rune modules from ESLint at
`.trunk/trunk.yaml:31-33`:

```yaml
- linters: [eslint]
  paths:
      - '**/*.svelte.ts'
```

That exclusion was added in commit `bf85395` for an ESLint 10 /
`svelte-eslint-parser` compatibility failure. With the current uncommitted
upgrade to `eslint-plugin-svelte` 3.20.0, this command succeeded for all four
existing rune modules when the plan was written:

```bash
trunk check --force \
  docs/src/lib/state/localStore.svelte.ts \
  docs/src/lib/shadcn/hooks/is-mobile.svelte.ts \
  docs/src/lib/shadcn/components/ui/data-table/data-table.svelte.ts \
  docs/src/lib/shadcn/components/ui/sidebar/context.svelte.ts
```

Before the config change, `trunk check` reported
`docs/src/lib/state/localStore.svelte.ts` as "ignored by trunk.yaml [eslint]".
The executor must repeat the forced check before removing the exclusion.

The repo-specific typed-lint facts established during planning are:

- `projectService: true` without `extraFileExtensions: ['.svelte']` produces a
  parsing error for every `.svelte` file.
- Root `src/**` and `tests/**` are included by the generated SvelteKit tsconfig.
  Docs `src/**` is included by `docs/.svelte-kit/tsconfig.json`.
- Root-only targeted promise rules produced no current promise diagnostics.
  Removing the test ignore exposed the unused `expectedSpan` local at
  `src/lib/SvelteDiffMatchPatch.test.ts:192`.
- A targeted docs run over owned code produced no current promise diagnostics.
  The full `recommendedTypeChecked` preset is not necessary to achieve this
  plan's goal.

Repository conventions to preserve:

- TypeScript functions are arrow functions and exported functions use
  Google-style JSDoc (`CLAUDE.md:7-11`). Config callbacks should follow the same
  style when practical.
- Suppressions use `trunk-ignore`, as exemplified at
  `src/lib/SvelteDiffMatchPatch.svelte:84-87`. Do not add `eslint-disable`.
- The existing shadcn override at the end of each ESLint config relaxes rules for
  `**/shadcn/components/ui/**`; keep it intact.
- Current commit messages use conventional prefixes, for example
  `fix(security): replace GROUP_REGEX with iterative parser to prevent ReDoS`.

## Commands you will need

| Purpose                | Command                                                                                                       | Expected on success                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Targeted format        | `trunk fmt eslint.config.mjs docs/eslint.config.mjs .trunk/trunk.yaml src/lib/SvelteDiffMatchPatch.test.ts`   | exit 0 or Trunk's documented "formatted files" result |
| Targeted lint          | `trunk check eslint.config.mjs docs/eslint.config.mjs .trunk/trunk.yaml src/lib/SvelteDiffMatchPatch.test.ts` | exit 0                                                |
| Full lint              | `trunk check --all`                                                                                           | exit 0                                                |
| Root type/Svelte check | `pnpm run check`                                                                                              | exit 0, no diagnostics                                |
| Docs type/Svelte check | `pnpm --filter docs run check`                                                                                | exit 0, no diagnostics                                |
| Root unit tests        | `pnpm run test:only`                                                                                          | all Vitest tests pass and process exits 0             |
| Docs unit tests        | `pnpm --filter docs run test:unit -- --run`                                                                   | all Vitest tests pass and process exits 0             |
| Root E2E tests         | `pnpm run test:e2e`                                                                                           | all Playwright projects pass and process exits 0      |

Do not use `pnpm lint` or raw ESLint as the final authority. Trunk selects and
versions ESLint in `.trunk/trunk.yaml` and processes the repository's inline
`trunk-ignore` directives.

## Scope

**In scope** (the only persistent files this plan may modify):

- `eslint.config.mjs`
- `docs/eslint.config.mjs`
- `.trunk/trunk.yaml`
- `src/lib/SvelteDiffMatchPatch.test.ts`
- `.agents/.plans/typed-lint-hardening/README.md` (status only)

Temporary guard files named `typed-lint-guard*` may be created under `src/lib/`
and `docs/src/lib/` during Steps 2 and 6, but must be deleted before the step
ends and must never be committed.

**Out of scope** (do not touch, even if related diagnostics appear):

- `package.json`, `docs/package.json`, `pnpm-lock.yaml`, and
  `pnpm-workspace.yaml` — dependency updates are concurrent user work.
- Docs type errors and the Vitest 4 `test.workspace` migration — these predate
  this plan and must be fixed outside this batch. Their current output is a
  comparison baseline, not a STOP condition unless this plan makes it worse.
- `docs/scripts/generate-social-images.ts` — concurrent work removed its command
  and dependency; do not decide whether to repair or delete it here.
- `docs/src/lib/shadcn/**` — keep ordinary linting but do not perform cleanup in
  imported/generated-style components.
- Any runtime behavior, public types, test assertions, or test structure beyond
  removing the unused local already identified at line 192.
- Broad adoption of `ts.configs.recommendedTypeChecked` or cleanup of its
  unrelated diagnostics.

## Git workflow

- Branch: `advisor/001-typed-lint-hardening`, or continue on the operator's
  branch if explicitly instructed.
- Commit message: `chore(eslint): lint tests and type-check promises`.
- Keep config and mechanical test cleanup in one logical commit unless the
  operator requests smaller commits.
- Do not stage, overwrite, or commit unrelated existing changes. Do not push or
  open a PR unless instructed.

## Steps

### Step 1: Record the mixed baseline before touching lint configuration

Run the two checks and two unit-test commands from the command table on the
untouched checkout. Also run `trunk check --all` and save its output for the
post-change comparison. The root baseline was rechecked on 2026-07-17 and is
green: `pnpm run check` reports zero errors/warnings, and
`pnpm run test:only` passes all 49 tests across three files.

The docs baseline is not green and is explicitly accepted for this plan.
`pnpm --filter docs run check` reports four errors and ten warnings in
`docs/vite.config.ts`, shadcn chart/sidebar files, and existing Svelte warnings.
`pnpm --filter docs run test:unit -- --run` fails during startup because Vitest
4 removed `test.workspace` in favor of `test.projects`.

These known docs failures are not blockers and are not authorization to widen
scope. Save their exact output. After the implementation, the docs commands must
either improve or reproduce the same failure set with no new path/diagnostic.

**Verify**:

```bash
pnpm run check
pnpm --filter docs run check
pnpm run test:only
pnpm --filter docs run test:unit -- --run
```

Expected: root commands exit 0; docs commands reproduce the recorded failures;
`trunk check --all` output is captured. STOP only if root is red or the docs
failure set differs materially from the recorded baseline.

### Step 2: Demonstrate the current lint blind spots

Create disposable guards before changing configuration:

- `src/lib/typed-lint-guard.ts` containing a standalone `Promise.resolve()`.
- `src/lib/typed-lint-guard.test.ts` containing the same expression.
- `src/lib/typed-lint-guard.svelte` with the expression in a TypeScript script.
- `docs/src/lib/typed-lint-guard.svelte.ts` containing the same expression.

Run normal Trunk lint on those paths. Current behavior should _not_ report
`@typescript-eslint/no-floating-promises`; the test guard is ignored by the flat
config and the rune-module guard is ignored by `.trunk/trunk.yaml`. Delete all
four files immediately afterward and confirm they are absent from `git status`.

If the promise rule already fires, the codebase has drifted and this plan's
configuration work must be re-evaluated: STOP.

**Verify**: `trunk check <the four guard paths>` reports no
`no-floating-promises` diagnostic and identifies the `.svelte.ts` path as
ignored; after deletion, `git status --short` contains no guard path.

### Step 3: Lint test files in both flat configs

In both `eslint.config.mjs` and `docs/eslint.config.mjs`, remove
`'**/*.test.ts'` from the global ignore list. Do not add a broad replacement
ignore and do not disable existing correctness rules for tests preemptively.

Run Trunk against all current test/spec files:

```bash
trunk check \
  src/lib/SvelteDiffMatchPatch.test.ts \
  src/lib/expectedPatterns.test.ts \
  src/lib/index.test.ts \
  tests/default.test.ts \
  tests/expected-patterns.test.ts \
  tests/snippets.test.ts \
  docs/src/demo.spec.ts
```

Fix only the known unused local by deleting the unused `expectedSpan` assignment
at `src/lib/SvelteDiffMatchPatch.test.ts:192`; the next line already queries and
asserts `titledSpans`. Do not rewrite the assertion or test behavior.

If Trunk reports additional errors, first confirm they are genuinely from
newly-included tests. Mechanical fixes are allowed only if they touch an in-scope
file. Any additional file or behavioral fix is a STOP condition.

**Verify**: the command above exits 0, and both ESLint configs no longer contain
`'**/*.test.ts'`.

### Step 4: Add scoped type information and promise rules

Keep `...ts.configs.recommended`; do **not** replace it with
`recommendedTypeChecked`. Add one explicit flat-config block to each config,
after the common language-options/rules block and before the existing Svelte and
shadcn-specific overrides.

For the root config, scope the block to owned runtime and test code:

```js
{
    files: ['src/**/*.{ts,svelte}', 'tests/**/*.ts'],
    languageOptions: {
        parserOptions: {
            projectService: true,
            tsconfigRootDir: import.meta.dirname,
            extraFileExtensions: ['.svelte']
        }
    },
    rules: {
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': 'error'
    }
}
```

For `docs/eslint.config.mjs`, use the same language options and rules, but scope
to `files: ['src/**/*.{ts,svelte}']` and add
`ignores: ['src/lib/shadcn/**']`. The ignore belongs only on this typed-rule
block: it must not globally remove shadcn files from ordinary ESLint.

Do not add `allowDefaultProject`: every file in these scoped blocks belongs to
the corresponding SvelteKit tsconfig. Do not type-lint root config files or
`docs/scripts/**` in this batch.

**Verify**: targeted Trunk lint from Step 3 plus
`trunk check src/lib/SvelteDiffMatchPatch.svelte docs/src/lib/state/localStore.svelte.ts`
exits 0. No parsing diagnostic mentions `projectService`, a missing project, or
the `.svelte` extension.

### Step 5: Remove the obsolete Trunk rune-module exclusion

First repeat the four-file `trunk check --force` command from "Current state".
It must exit 0 with the installed toolchain. Then remove only the
`.trunk/trunk.yaml` ignore block for ESLint on `**/*.svelte.ts`; preserve every
other current uncommitted Trunk change.

Run the same four-file command without `--force`. It must lint normally and must
not print an "ignored by trunk.yaml [eslint]" notice.

If the forced pre-check reproduces `scopeManager.addGlobals` or another parser
failure, keep the exclusion, report the installed ESLint/plugin versions, and
STOP. Do not change dependencies in this plan.

**Verify**:

```bash
trunk check \
  docs/src/lib/state/localStore.svelte.ts \
  docs/src/lib/shadcn/hooks/is-mobile.svelte.ts \
  docs/src/lib/shadcn/components/ui/data-table/data-table.svelte.ts \
  docs/src/lib/shadcn/components/ui/sidebar/context.svelte.ts
```

Expected: exit 0, all four files checked, no ignored-file notice.

### Step 6: Prove both typed promise rules are active at every parser boundary

Create disposable guards under the two packages:

- Root: `typed-lint-guard.ts`, `typed-lint-guard.test.ts`,
  `typed-lint-guard.svelte`, and `typed-lint-guard.svelte.ts` under `src/lib/`.
- Docs: the same four filenames under `docs/src/lib/`.

Each file should contain a standalone `Promise.resolve()` in the appropriate TS
or Svelte script context. In the root plain `.ts` guard, also add an arrow
function accepting `() => void` and call it with an `async` callback so
`no-misused-promises` has a deterministic trigger. Keep the snippets minimal and
do not import application code.

Run normal `trunk check`—not `--force`—on all eight paths. Expected diagnostics:

- all eight files report `@typescript-eslint/no-floating-promises`;
- the root plain `.ts` guard also reports
  `@typescript-eslint/no-misused-promises`;
- neither `.test.ts` file is ignored;
- neither `.svelte.ts` file is ignored;
- no file reports a project-service or parser error.

If any expected diagnostic is missing, STOP: the rule is not wired through that
config/parser path. Delete all guard files after recording the output.

**Verify**: after deletion, targeted Trunk lint from Steps 3 and 5 exits 0 and
`git status --short` contains no `typed-lint-guard` path.

### Step 7: Format and run the complete gate

Format only the persistent in-scope files first, then run full-repo lint and the
root/docs validation suites. Run E2E because this plan brings the Playwright
`tests/*.test.ts` files under lint and any accidental edits must be exercised.

**Verify**:

```bash
trunk fmt eslint.config.mjs docs/eslint.config.mjs .trunk/trunk.yaml src/lib/SvelteDiffMatchPatch.test.ts
trunk check --all
pnpm run check
pnpm --filter docs run check
pnpm run test:only
pnpm --filter docs run test:unit -- --run
pnpm run test:e2e
```

Expected: root commands, E2E, and plan-related Trunk checks exit 0. The docs
commands may reproduce only the exact Step 1 failures, and `trunk check --all`
may reproduce only its Step 1 baseline issues; neither may add a new diagnostic.
Then run `git diff --check` and `git status --short`; there are no whitespace
errors, no guard files, and no plan-caused modifications outside the persistent
in-scope list.

## Test plan

This is tooling configuration, so no runtime unit test is added. The red-first
equivalent is Step 2: disposable files demonstrate that current linting does not
catch floating promises in TS, tests, Svelte, or rune modules. Step 6 recreates
the same cases and requires deterministic diagnostics from both promise rules.
The files are deleted because intentionally failing lint fixtures do not belong
in the shipped package.

Existing tests remain the regression gate:

- root Vitest: `pnpm run test:only`;
- docs Vitest: `pnpm --filter docs run test:unit -- --run`;
- root Playwright: `pnpm run test:e2e`.

No test assertions should change.

## Done criteria

All must hold:

- [ ] `pnpm run check`, `pnpm run test:only`, and `pnpm run test:e2e` exit 0.
- [ ] Docs check/unit commands introduce no diagnostics beyond the recorded Step
      1 baseline.
- [ ] Neither ESLint config globally ignores `**/*.test.ts`.
- [ ] Both configs enable `no-floating-promises` and `no-misused-promises` only
      in the scoped typed blocks described in Step 4.
- [ ] Both typed blocks use `projectService: true` and
      `extraFileExtensions: ['.svelte']` without `allowDefaultProject`.
- [ ] Docs shadcn files remain ordinarily linted but are excluded from the
      type-aware block.
- [ ] `.trunk/trunk.yaml` no longer ignores ESLint on `**/*.svelte.ts`, and
      normal Trunk lint checks all four existing rune modules.
- [ ] Step 6 proves both rules fire at the expected parser/config boundaries,
      then all eight guard files are deleted.
- [ ] Targeted Trunk checks exit 0; `trunk check --all` introduces no issue
      beyond its recorded Step 1 baseline.
- [ ] No new `eslint-disable` comment exists:
      `git diff -U0 -- '*.ts' '*.svelte' | rg '^\+.*eslint-disable'` returns no
      match.
- [ ] No persistent file outside Scope was modified by this plan.
- [ ] `.agents/.plans/typed-lint-hardening/README.md` marks 001 `DONE`.

## STOP conditions

Stop and report rather than improvising if:

- The root Step 1 baseline is not green, or the docs/Trunk failures differ
  materially from the recorded accepted baseline.
- Either ESLint config no longer matches the current-state excerpt.
- An in-scope source/config file has changed since commit `5bde0ad`.
- Forced ESLint on `.svelte.ts` still hits the parser incompatibility that
  motivated commit `bf85395`.
- A typed block requires `allowDefaultProject`, a lint-only tsconfig, dependency
  changes, or files outside the scoped source/test paths.
- Enabling the two rules reports a real application floating-promise bug or any
  diagnostic requiring runtime code changes. Capture the path/rule and request a
  separate correctness plan.
- More than the known unused test local requires cleanup, or any fix would touch
  a file outside persistent Scope.
- A verification command fails twice after one reasonable in-scope correction.

## Maintenance notes

- New owned source/test directories must be added to the appropriate typed block
  or promise checks will silently miss them. Keep root and docs scopes explicit.
- If the shadcn tree becomes hand-maintained, reconsider its type-aware exclusion
  in a dedicated cleanup; do not remove it opportunistically.
- If `docs/scripts/generate-social-images.ts` survives the concurrent docs work,
  add scripts to a docs lint tsconfig or narrowly configured project-service
  scope and handle its top-level `main()` promise explicitly.
- A later full `recommendedTypeChecked` migration should be its own plan with
  categorized violation counts and performance measurements. Do not gradually
  disable preset rules in these configs without that audit.
- Reviewers should verify that any future `void promise` marker represents
  intentional fire-and-forget work with an explicit error path; `void` must not
  become a cosmetic way to silence a dropped promise.
