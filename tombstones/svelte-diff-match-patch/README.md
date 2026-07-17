# @humanspeak/svelte-diff-match-patch → @humanspeak/svelte-diff

This package has been **renamed to [@humanspeak/svelte-diff](https://www.npmjs.com/package/@humanspeak/svelte-diff)**.

This final version re-exports the new package, so existing installs keep working — but please migrate:

```bash
npm uninstall @humanspeak/svelte-diff-match-patch
npm install @humanspeak/svelte-diff
```

```diff
- import SvelteDiffMatchPatch from '@humanspeak/svelte-diff-match-patch'
+ import SvelteDiffMatchPatch from '@humanspeak/svelte-diff'
```

Everything else — the component, its props, and all exported types — is unchanged.

Docs: <https://diff.svelte.page> · Source: <https://github.com/humanspeak/svelte-diff>
