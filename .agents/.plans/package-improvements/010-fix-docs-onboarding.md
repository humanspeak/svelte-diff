# Plan 010: Document initial packaging, watch mode, and reliable docs checks

> **Executor instructions**: Follow every step and verification. STOP on named conditions. The operator maintains the batch index unless delegated. This plan corrects documentation; do not rewrite development tooling.
>
> **Drift check (run first)**: `git diff --stat fa0cfc9..HEAD -- docs/README.md`. Compare the live development/verification sections to the excerpts below. STOP on conflicting drift.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `fa0cfc9`, 2026-10-02

## Why this matters

The docs workspace consumes generated library output, but its onboarding instructions start the docs server before that output exists and give the wrong port. Its simple check command also omits the generated Cloudflare worker trap already handled in CI. Document the working package/watch/check procedure so contributors can use existing tooling without discovering these requirements through failures.

## Current state

- `docs/README.md:9` currently instructs:

  ```sh
  pnpm install
  pnpm --filter docs dev
  ```

- `docs/README.md:14` claims port 8235. `docs/vite.config.ts:85` actually contains `server: { port: 8523, fs: { allow: ['..'] } }`.
- `docs/package.json:22` uses `"@humanspeak/svelte-diff": "workspace:*"`, while `package.json:35` resolves the library to `./dist/index.js`. Install alone does not generate this output.
- Existing root scripts at `package.json:52`:

  ```json
  "dev:all": "concurrently -k -n pkg,docs -c green,cyan \"pnpm -w -r --filter @humanspeak/svelte-diff run dev:pkg\" \"pnpm --filter docs run dev\"",
  "dev:pkg": "svelte-kit sync && svelte-package --watch"
  ```

- `package.json:57` packages with `svelte-kit sync && svelte-package && publint`. Recommend initial `pnpm run package` before either docs-only dev or `pnpm run dev:all`.
- `docs/README.md:19` documents `pnpm --filter docs check` then build. The ordinary check is useful before a docs build; after build, generated `docs/.svelte-kit/cloudflare/_worker.js` can be scanned as source. Exemplar `.github/workflows/docs-diff-modes.yml:53` moves this generated file to `.js.source-check-backup`, runs `pnpm --filter docs check`, and restores it in a Python `finally`, propagating the exit code. Preserve that safety pattern in the documented post-build command.
- `docs/package.json:7` builds via GitHub stats fetch, Vite, and favicon checks. Builds generate sitemap, mirrors, llms assets, and cards; retain the existing list in `docs/README.md:23`. Do not hand-edit generated output.
- `.trunk/trunk.yaml` is lint/format authority. Local versions: Node 24.15.0, pnpm 12.6.0. Advisor-observed baseline: library tests 123 pass; root check zero errors/warnings. Dev startup and docs builds were not run by the advisor.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Initial library output | `pnpm run package` | Exit 0; `dist/index.js` exists; publint succeeds |
| Both development watchers | `pnpm run dev:all` | Package watcher and docs server start; docs uses 8523 if free |
| Docs-only development | `pnpm --filter docs dev` | Docs server starts after initial packaging |
| Docs build | `pnpm --filter docs build` | Exit 0; generated artifacts rebuilt |
| Docs source check | Documented Python wrapper from Step 2 | Exit 0; worker restored if initially present |
| Root typecheck | `pnpm run check` | Exit 0; zero errors/warnings |
| Library tests | `pnpm exec vitest run src/lib/` | All pass; baseline 123 |
| Format/lint | `trunk fmt` then `trunk check` | Both exit 0 |
| Hygiene | `git diff --check` | Exit 0 |

## Scope

**In scope**:

- `docs/README.md`

**Out of scope**:

- Manifests/scripts, Vite/Svelte/TypeScript/Playwright config, workflow rewrite, library source, and generated docs/worker artifacts.
- Fresh dependency installation in the operator's existing workspace, Cloudflare deployment, IndexNow submission, or new shell helpers.
- Any toolchain fix prompted by the documentation verification; report it separately.

## Git workflow

- Work on operator branch `chore/package-improvements`, baseline `fa0cfc9`.
- No commit, push, PR, deployment, or release is authorized. Preserve operator files and other plans.
- Independent of other plans; the docs CI wrapper is an existing exemplar, not a dependency to introduce.

## Steps

### Step 1: Correct initial setup and watch instructions

In `docs/README.md`, state Node 24.15.0 and pnpm 12.6.0, with commands run from repository root. Show `pnpm install --frozen-lockfile`, then `pnpm run package`, then `pnpm run dev:all` for contributors editing library and docs together. Explain that `pnpm --filter docs dev` is the alternative when only editing docs after initial packaging; the package watcher keeps generated library output current. Correct the normal URL to `http://localhost:8523`; Vite can choose another port if occupied, so the logged URL is authoritative.

**Verify**: `python3 -c 'from pathlib import Path; s=Path("docs/README.md").read_text(); assert "localhost:8523" in s and "localhost:8235" not in s; assert all(x in s for x in ["pnpm install --frozen-lockfile","pnpm run package","pnpm run dev:all","pnpm --filter docs dev","24.15.0","12.6.0"]); assert s.index("pnpm run package") < s.index("pnpm run dev:all"); print("Docs onboarding commands OK")'` → prints `Docs onboarding commands OK`, exit 0.

### Step 2: Document pre-build checks and the generated-worker workaround

Keep a clear normal sequence: initial package output, docs source check, then docs build. Explain that a prior docs build may create a generated worker that the ordinary source check scans. Include the existing CI Python wrapper as the safe post-build source-check recipe, run from root:

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

Name `.github/workflows/docs-diff-modes.yml` as the source of this recipe. Explain the stale-backup guard and restoration on failure. Do not advise deleting the worker, weakening TS checking, checking generated bundles, or modifying tooling. Keep the existing generated-artifact list and deployment section.

**Verify**: `python3 -c 'from pathlib import Path; s=Path("docs/README.md").read_text(); assert all(x in s for x in ["docs/.svelte-kit/cloudflare/_worker.js",".js.source-check-backup","finally:","backup.rename(worker)","result.returncode","docs-diff-modes.yml"]); print("Worker-check recipe present")'` → prints `Worker-check recipe present`, exit 0.

### Step 3: Verify the documented build/check procedure and gates

Run `pnpm run package`, `pnpm run check`, and `pnpm exec vitest run src/lib/`. Run the documented Python check wrapper before the docs build, then `pnpm --filter docs build`, then that wrapper again. Confirm that the post-build worker is restored and no backup remains. Do not invoke deploy/build:indexnow. Starting long-lived dev servers is unnecessary for this docs-only change; port and script names are verified against their actual config, avoiding a duplicate runtime test.

Run `trunk fmt`, `trunk check`, `git diff --check`, and the Step 1/2 assertions after formatting. Inspect `git status --short` against the executor's starting snapshot. Docs build may regenerate tracked assets: do not silently accept or discard them. STOP and report incidental tracked generated changes for the operator to decide; only docs README is authorized in this plan.

**Verify**: all commands exit 0; library tests pass; both wrapper runs succeed; `python3 -c 'from pathlib import Path; p=Path("docs/.svelte-kit/cloudflare/_worker.js"); assert p.exists(); assert not p.with_suffix(".js.source-check-backup").exists(); print("Worker restored")'` → prints `Worker restored`; only docs README changes are attributable to this plan.

## Test plan

- Explicit red-first exemption: authored onboarding documentation only; this plan intentionally changes no runtime/tooling behavior. Do not add tests mirroring README sentences.
- Static assertions establish correct setup order, port, versions, and complete restoration recipe. Execute the existing package/build/source-check commands to verify the examples and the generated-worker handling, with root tests/typecheck and Trunk as full gates.
- Do not install again in an existing workspace, deploy, submit IndexNow updates, or rewrite scripts. A fresh clone smoke check can be done in a separate operator-approved environment later; this plan does not destroy generated output to emulate one.

## Done criteria

- [ ] Both README assertions exit 0; port 8235 is absent and package generation precedes dev:all.
- [ ] Existing `dev:all` and docs-only alternatives are documented without adding scripts.
- [ ] Documented Python wrapper preserves the worker and propagates the check exit code; both before/after-build checks pass and no backup remains.
- [ ] Root package/typecheck/tests, docs build, `trunk fmt`, `trunk check`, and `git diff --check` exit 0.
- [ ] Only `docs/README.md` contains changes attributable to this plan; report generated tracked drift instead of accepting it.
- [ ] Report completion and verification to the operator who maintains the index; do not commit/push/PR/deploy.

## STOP conditions

- Port, script names, workspace package name, or worker/check implementation drift invalidates the excerpted recipe.
- A `.js.source-check-backup` file already exists; inspect with the operator before proceeding, never overwrite it.
- Docs build/check fails twice, requires credentials unavailable locally, or fixing onboarding requires modifying tooling.
- Build regeneration modifies tracked output or unrelated authored files; report exact paths without secret values.

## Maintenance notes

- Update README when the docs port, package watcher, pnpm/Node versions, or Cloudflare adapter/check trap changes.
- The worker workaround is intentionally documented as the current CI procedure, not a permanent design commitment. A future tooling fix should remove it from both CI and docs together.
- Reviewers should confirm a fresh contributor sees why packaging is required and can choose the appropriate watcher without guessing.
