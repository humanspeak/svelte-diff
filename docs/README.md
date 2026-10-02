# Svelte Diff documentation

The Brutist v2 documentation site for [`@humanspeak/svelte-diff`](https://www.npmjs.com/package/@humanspeak/svelte-diff), built with SvelteKit and [`@humanspeak/docs-kit`](https://github.com/humanspeak/docs-kit).

## Development

Use Node 24.15.0 and pnpm 12.6.0. Run all commands below from the repository root.

For contributors editing the library and docs together:

```bash
pnpm install --frozen-lockfile
pnpm run package
pnpm --filter docs exec tsx scripts/fetch-github-stats.ts
pnpm run dev:all
```

The docs workspace consumes the library's generated `dist/index.js`; installing dependencies alone does not create it. Initial packaging generates that output and runs publint. `pnpm run dev:all` starts both the package watcher and the docs server, keeping the generated library output current as you edit.

GitHub stats in `docs/src/lib/github-stats.json` are generated and git-ignored. On fresh checkouts, run the generator above before docs dev or check; production builds refresh the stats automatically.

For docs-only edits, run `pnpm --filter docs dev` after initial packaging and GitHub stats generation.

The local server normally runs on <http://localhost:8523>. Vite can choose another port if it is occupied, so use the URL logged by the server.

## Verification

With no generated worker from a prior docs build, generate the library output, check docs source, then build:

```bash
pnpm run package
pnpm --filter docs exec tsx scripts/fetch-github-stats.ts
pnpm --filter docs check
pnpm --filter docs build
```

A prior docs build may create `docs/.svelte-kit/cloudflare/_worker.js`, which the ordinary source check can scan as source. When that worker exists, use this safe source-check recipe before or after a build, from `.github/workflows/docs-diff-modes.yml`:

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

The stale-backup guard stops the check if a backup already exists; stop and inspect it before proceeding. The wrapper temporarily moves the generated worker, restores it in `finally` even if the check fails, and propagates the check's exit code. It also works when no worker exists.

The production build also regenerates:

- the route-driven sitemap manifest and `/sitemap.xml`
- Markdown mirrors under `/docs/*.md` and `/examples/*.md`
- `/llms.txt` and `/llms-full.txt`
- Open Graph and Twitter social cards
- GitHub star data used by the shared site chrome

## Deployment

The site targets Cloudflare Workers through `@sveltejs/adapter-cloudflare`.

```bash
pnpm --filter docs deploy
```

The deploy build uses Vite's `indexnow` mode, which submits the generated route manifest to IndexNow on a best-effort basis.
