<!-- Source: https://diff.svelte.page/docs/migration -->

# Migration Guide

> Migrate from the previous SvelteDiffMatchPatch name or a hand-built diff rendering loop to SvelteDiff.

**Source:** [https://diff.svelte.page/docs/migration](https://diff.svelte.page/docs/migration)

---

## From `SvelteDiffMatchPatch`

The component was renamed to `SvelteDiff`. The old export remains as a deprecated alias, so migration can be incremental.

```diff
- import { SvelteDiffMatchPatch } from '@humanspeak/svelte-diff'
+ import { SvelteDiff } from '@humanspeak/svelte-diff'

- <SvelteDiffMatchPatch {originalText} {modifiedText} />
+ <SvelteDiff {originalText} {modifiedText} />
```

The default import already resolves to `SvelteDiff`:

```svelte
<script lang="ts">
    import SvelteDiff from '@humanspeak/svelte-diff'
</script>
```

Rename deprecated types the same way:

| Deprecated | Current |
|---|---|
| `SvelteDiffMatchPatchProps` | `SvelteDiffProps` |
| `SvelteDiffMatchPatchTiming` | `SvelteDiffTiming` |
| `SvelteDiffMatchPatchDiff` | `SvelteDiffTuple` |

## From a custom `diff-match-patch` loop

A typical manual integration configures an instance, calls `diff_main`, runs cleanup, and maps operations to markup. SvelteDiff owns that wiring.

```svelte
<SvelteDiff
    {originalText}
    {modifiedText}
    timeout={1}
    cleanupSemantic
    onProcessing={(timing, diffs) => {
        console.log({ timing, diffs })
    }}
/>
```

Move your operation-specific markup into `remove`, `insert`, and `equal` snippets. If your old implementation needs fuzzy matching or patch application, keep the lower-level library for that work—SvelteDiff deliberately exposes only the rendered text-diff use case.

## Callback field names

Current timing fields are `main`, `cleanup`, and `total`, all in milliseconds. Avoid older examples that refer to `computeTime` or `cleanupTime`.

## Expected patterns

Expected patterns are opt-in. Existing plain strings behave exactly as before. Only `originalText` values containing valid named capture groups activate expected-region matching.

## Verify the migration

1. Confirm both strings update reactively.
2. Compare cleanup mode output on representative documents.
3. Check custom snippets per segment type.
4. Update callback code to the current timing fields.
5. Add expected patterns only where variation is genuinely intentional.
