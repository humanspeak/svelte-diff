# Plan 009: Clarify that exported helpers use the Svelte toolchain

> **Executor instructions**: Follow all steps and verification. STOP on the named conditions. The operator maintains the batch index unless delegated. The selected direction is documentation correction only: do not add headless support.
>
> Revision 2026-10-02: Plans 001–008 are DONE. Re-baseline to reviewed eb3b994 because 004 updated the shared README helper table and fallback policy. The unsupported introductory claim remains unchanged. Preserve the table, import example, four signatures and all completed 004 wording; only explanatory Programmatic API prose is in scope.
>
> **Drift check (run first)**: `git diff --stat eb3b994..HEAD -- README.md`. Compare the authored programmatic API section below against live text; preserve prior unrelated work. STOP on a conflicting section change.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `004-handle-invalid-pattern-compilation.md` operationally, to serialize README edits; this plan changes wording only
- **Category**: docs
- **Planned at**: commit `eb3b994`, 2026-10-02

## Why this matters

The README promises framework-agnostic helpers but documents imports from the Svelte-only package entry. That wording can send users toward unsupported plain Node integrations. Correct the promise while retaining the helpers, import example, and all existing exports. The operator explicitly selected wording clarification instead of a new headless entry point.

## Current state

- `README.md:309` begins the authored `Programmatic API` section. Line 311 reads:

  ```text
  The expected-pattern engine is also exported as framework-agnostic functions, so you can compute matches and tag diffs without mounting the component:
  ```

- `README.md:313` imports `parseExpectedPatterns`, `extractCaptures`, `tagExpectedRegions`, and `cleanTemplate` from `@humanspeak/svelte-diff`; preserve this example and the signatures table at line 322.
- `package.json:32` has only the `types` and `svelte` root export conditions. `src/lib/index.ts:3` imports `./SvelteDiff.svelte`. These are read-only evidence, not files to change.
- Exemplar wording: `docs/src/routes/docs/api/types/+page.svx:120` describes exports for integrations sharing the component's expected-region concepts without duplicating definitions. Use similarly precise component-oriented wording.
- The current authored claim search in README, docs README, own docs routes, and `docs/static/llms-prepend.md`/`llms-append.md` found this own-package framework-agnostic claim only in root README. Competitor descriptions can truthfully call other tools framework-agnostic; do not globally replace that phrase.
- `docs/vite.config.ts:30` generates doc mirrors and lines 35/41 generate llms assets. Generated mirrors are not authored sources and must never be manually edited. This README-only change does not require regenerating site assets unless a documented generator actually consumes this section; report such a dependency instead of editing generated copies by hand.
- `.trunk/trunk.yaml` is formatting/lint authority. Local environment is Node 24.15.0/pnpm 12.6.0. Advisor-observed library baseline: 123 unit tests and root typecheck zero errors/warnings.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Claim inventory | `rg -n 'framework[- ]agnostic|without mounting' README.md docs/README.md docs/src/routes/docs docs/static/llms-prepend.md docs/static/llms-append.md` | No unsupported own-package claim after editing; search can return 1 for no matches |
| Typecheck | `pnpm run check` | Exit 0, zero errors/warnings |
| Library tests | `pnpm exec vitest run src/lib/` | All pass; baseline 123 |
| Format | `trunk fmt` | Exit 0 |
| Lint | `trunk check` | Exit 0 |
| Hygiene | `git diff --check` | Exit 0 |

## Scope

**In scope**:

- `README.md`, authored Programmatic API explanatory prose only.

**Out of scope**:

- Package manifests/export maps, public APIs, source, helper behavior, headless subpaths, and tests.
- Competitor wording, ecosystem managed footer, unrelated README prose, own site routes, and hand-edited generated mirrors/llms output.

## Git workflow

- Use operator branch `chore/package-improvements`; baseline `eb3b994`.
- No commit, push, PR, or publication is authorized. Preserve other plans and prior work.
- Independent of other implementation plans. Avoid running release footer tooling; it is unnecessary for this authored section.

## Steps

### Step 1: Establish the precise authored scope

Read `README.md`'s Programmatic API section, the read-only package export map, and the own-doc claim inventory. Confirm the claim is the single authored unsupported promise. If another own source makes the same promise, STOP and ask the operator to expand exact scope; do not replace competitor claims or generated assets.

**Verify**: `rg -n 'framework[- ]agnostic|without mounting' README.md docs/README.md docs/src/routes/docs docs/static/llms-prepend.md docs/static/llms-append.md` → the known README line is the unsupported own-package claim. `git diff --stat eb3b994..HEAD -- README.md` → no unexplained conflicting Programmatic API edit.

### Step 2: Replace the framework-agnostic promise

Replace the introductory sentence with wording equivalent to: “The expected-pattern helpers are exported for use within a Svelte-aware toolchain. You can call them without mounting the component; the package entry still requires Svelte-aware module resolution and compilation.” Keep the existing import example and signatures. Add no plain Node compatibility promise or new import path.

**Verify**: `python3 -c 'from pathlib import Path; s=Path("README.md").read_text().split("## Programmatic API",1)[1].split("## Events",1)[0]; assert "framework-agnostic" not in s; assert "Svelte" in s and "toolchain" in s; assert "@humanspeak/svelte-diff" in s; assert all(x in s for x in ["parseExpectedPatterns","extractCaptures","tagExpectedRegions","cleanTemplate"]); print("Svelte-only helper wording OK")'` → prints `Svelte-only helper wording OK`, exit 0.

### Step 3: Run gates and prove the public contract stayed intact

Run `pnpm run check`, `pnpm exec vitest run src/lib/`, `trunk fmt`, `trunk check`, and `git diff --check`. Repeat the Step 2 assertion after formatting. Inspect `git diff -- README.md` and `git status --short` relative to your starting snapshot. README-only prose requires no package build or docs regeneration; if any generated tracked artifact changes incidentally, STOP rather than accepting it.

**Verify**: all gates exit 0; all library tests pass; this plan changes only the Programmatic API prose in README. Package/API code matches the executor starting snapshot.

## Test plan

- Explicit red-first exemption: documentation-only correction with no runtime/API change. Do not add a Node compatibility test for behavior the user explicitly chose not to support.
- Machine-check the corrected section and unchanged function/import presence. Existing library tests/typecheck guard against accidental contract edits; Trunk checks Markdown.
- Generated docs, if ever affected by a later authored-site change, must come from `pnpm --filter docs build` and the existing Vite plugins, not manual edits. Generation is outside this README-only plan.

## Done criteria

- [ ] Section assertion exits 0 and unsupported framework-agnostic wording is absent from the own helper section.
- [ ] Original helper import and four documented function names remain.
- [ ] `pnpm run check`, library tests, `trunk fmt`, `trunk check`, and `git diff --check` exit 0.
- [ ] Only scoped README prose changes are attributable to this plan; no exports, APIs, generated files, or competitor wording changes.
- [ ] Report completion to the index-owning operator; do not commit/push/PR.

## STOP conditions

- The live package now has independently supported headless exports, changing the premise.
- Another authored own-package unsupported claim requires an out-of-scope edit, or README section drift conflicts with the proposed correction.
- Verification fails twice after reasonable correction, or completing it requires source/API/generated file changes.

## Maintenance notes

- If a future separate feature introduces headless support, its compatibility tests and export map must land before documenting that promise.
- Preserve distinctions between this Svelte package and competitors whose APIs are truly framework-agnostic.
- Reviewers should check that the wording still accurately says functions may be called without mounting while explaining the package/toolchain requirement.
