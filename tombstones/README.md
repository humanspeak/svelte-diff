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

# 2. Old-name shim (then tombstone it)
npm publish ./tombstones/svelte-diff-match-patch
npm deprecate @humanspeak/svelte-diff-match-patch@"*" \
  "Renamed to @humanspeak/svelte-diff — same component, new name. https://diff.svelte.page"

# 3. Unscoped alias (left live, not deprecated)
npm publish ./tombstones/svelte-diff
```

## Maintenance

Both shims depend on `@humanspeak/svelte-diff@^0.1.5`. When the canonical package reaches `0.2.0` (or any new minor/major), bump the dependency range and version in both shims and republish — otherwise fresh installs of the shims resolve to a stale canonical version.
