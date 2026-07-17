<!-- Source: https://diff.svelte.page/docs/api/svelte-diff -->

# SvelteDiff API

> Complete SvelteDiff component API including props, renderer precedence, callbacks, and defaults.

**Source:** [https://diff.svelte.page/docs/api/svelte-diff](https://diff.svelte.page/docs/api/svelte-diff)

---

The package exports the component as both the default export and a named export.

```svelte
<script lang="ts">
    import SvelteDiff from '@humanspeak/svelte-diff'
    // or: import { SvelteDiff } from '@humanspeak/svelte-diff'
</script>
```

## Props

| Prop | Type | Default | Purpose |
|---|---|---:|---|
| `originalText` | `string` | required | The before/source text |
| `modifiedText` | `string` | required | The after/target text |
| `timeout` | `number` | `1` | Maximum diff computation time in seconds; `0` is unlimited |
| `cleanupSemantic` | `boolean` | `false` | Optimize edit boundaries for human readability |
| `cleanupEfficiency` | `number` | `4` | Edit cost used by efficiency cleanup; `0` disables it |
| `onProcessing` | `function` | — | Receive timing, raw tuples, and optional captures |
| `rendererClasses` | `RendererClasses` | `{}` | Classes for built-in segment spans |
| `renderers` | `Partial<Renderers>` | `{}` | Snippet map for individual segment types |
| `remove` | `Snippet<[string]>` | — | Direct child snippet for removed text |
| `insert` | `Snippet<[string]>` | — | Direct child snippet for inserted text |
| `equal` | `Snippet<[string]>` | — | Direct child snippet for unchanged text |
| `expected` | `Snippet<[string, string]>` | — | Direct child snippet for expected values |
| `lineBreak` | `Snippet<[]>` | — | Direct child snippet between lines |

## Cleanup precedence

The component computes a raw diff, then runs at most one cleanup pass:

1. If `cleanupSemantic` is `true`, semantic cleanup runs.
2. Otherwise, if `cleanupEfficiency > 0`, efficiency cleanup runs with that value as the edit cost.
3. Otherwise, the raw diff is rendered.

## Renderer precedence

Resolution happens independently for every segment type:

1. A direct child snippet such as `{#snippet insert(text)}`
2. The matching property in `renderers`
3. The built-in fallback span

That means you can override one type and leave all others on their defaults.

```svelte
<SvelteDiff {originalText} {modifiedText}>
    {#snippet insert(text: string)}
        <ins class="addition">+ {text}</ins>
    {/snippet}
</SvelteDiff>
```

## `onProcessing`

The callback runs after computation and cleanup.

```svelte
<script lang="ts">
    import type {
        SvelteDiffTiming,
        SvelteDiffTuple
    } from '@humanspeak/svelte-diff'

    function handleProcessing(
        timing: SvelteDiffTiming,
        diffs: SvelteDiffTuple[],
        captures?: Record<string, string>
    ) {
        console.log(timing.main, timing.cleanup, timing.total)
        console.log(diffs, captures)
    }
</script>

<SvelteDiff {originalText} {modifiedText} onProcessing={handleProcessing} />
```

Timing values are milliseconds measured with `performance.now()`.

## Expected patterns

If `originalText` contains named capture groups, the component tries to match those regions in `modifiedText` and renders successful matches as `expected` instead of additions/removals.

```svelte
<SvelteDiff
    originalText={'Release (?<version>v\\d+\\.\\d+\\.\\d+)'}
    modifiedText="Release v2.4.1"
/>
```

The group name is passed to the expected snippet and its matched value appears in the callback's `captures` object.

## Deprecated aliases

`SvelteDiffMatchPatch` and the `SvelteDiffMatchPatch*` type names remain available for compatibility. New code should use `SvelteDiff` and the shorter `SvelteDiff*` types.
