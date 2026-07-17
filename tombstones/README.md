# Tombstones

Shim packages published once as part of the rename from `@humanspeak/svelte-diff-match-patch` to `@humanspeak/svelte-diff`. Each re-exports the canonical package so installs of the old/alias names keep working.

- `svelte-diff/` — claims the unscoped npm name as a functional alias. Stays live (not deprecated) so `npm install svelte-diff` works.
- `svelte-diff-match-patch/` — final version of the old scoped name, deprecated after publish so consumers get a migration nudge.

## Publish order

The canonical package must exist first:

```bash
# 1. From the repo root — publish @humanspeak/svelte-diff@0.1.5
pnpm run build
npm publish --access public

# 2. Old-name shim (its manifest carries a "deprecated" field, so the
#    published version arrives pre-deprecated; the explicit deprecate
#    below tombstones the older, already-published versions too)
npm publish ./tombstones/svelte-diff-match-patch
npm deprecate @humanspeak/svelte-diff-match-patch@"*" \
  "Renamed to @humanspeak/svelte-diff — same component, new name. https://diff.svelte.page"

# 3. Unscoped alias (left live, not deprecated)
npm publish ./tombstones/svelte-diff
```

## Maintenance (automated)

After the first manual publishes above, the release workflow (`.github/workflows/npm-publish.yml`) keeps the shims in lockstep automatically: on every release it rewrites both shims' `version` and `@humanspeak/svelte-diff` dependency range to the new canonical version (included in the version-bump commit), then publishes both right after the canonical package. The old-name shim's `deprecated` manifest field means each new version of it arrives pre-deprecated without any extra `npm deprecate` call.

One-time setup: on npmjs.com, add this repo's workflow as a trusted publisher (OIDC) for all three package names — `@humanspeak/svelte-diff`, `@humanspeak/svelte-diff-match-patch`, and `svelte-diff` — or the automated publishes will fail with an auth error (main release unaffected; shim publishes are best-effort warnings).
