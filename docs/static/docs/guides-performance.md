<!-- Source: https://diff.svelte.page/docs/guides/performance -->

# Timing and Performance

> Measure SvelteDiff computation and cleanup time, set timeouts, and avoid unnecessary work with large inputs.

**Source:** [https://diff.svelte.page/docs/guides/performance](https://diff.svelte.page/docs/guides/performance)

---

# Timing & Performance

SvelteDiff computes whenever `originalText`, `modifiedText`, or a cleanup option changes. The `onProcessing` callback exposes the cost of that work.

## Compact equal-text DOM

`compact` defaults to `true`. Unstyled built-in equal segments render as text instead of
wrapper spans, reducing DOM weight without changing text content or intrinsic line breaks when no
selectors or styles depend on the legacy wrapper. Custom equal snippets, `renderers.equal`, and
`rendererClasses.equal` retain their requested markup.

Use the legacy DOM only when existing selectors or styles require equal spans:

```svelte
<script lang="ts">
    import { SvelteDiff } from '@humanspeak/svelte-diff'
</script>

<SvelteDiff
    originalText="The old text"
    modifiedText="The new text"
    compact={false}
/>
```

## Measure a diff

```svelte
<script lang="ts">
    import type { SvelteDiffTiming } from '@humanspeak/svelte-diff'

    let timing = $state<SvelteDiffTiming>({ main: 0, cleanup: 0, total: 0 })
</script>

<SvelteDiff
    {originalText}
    {modifiedText}
    onProcessing={(nextTiming) => (timing = nextTiming)}
/>

<dl>
    <dt>Core algorithm</dt><dd>{timing.main.toFixed(2)} ms</dd>
    <dt>Cleanup</dt><dd>{timing.cleanup.toFixed(2)} ms</dd>
    <dt>Total</dt><dd>{timing.total.toFixed(2)} ms</dd>
</dl>
```

## Timeout

`timeout` is measured in seconds and maps to the underlying diff-match-patch timeout.

```svelte
<SvelteDiff {originalText} {modifiedText} timeout={0.5} />
```

The default is one second. Use `0` for no time limit. An unlimited timeout can be appropriate for controlled offline inputs, but is a poor default for arbitrary user content on the main thread.

The algorithm returns the best diff it has when the deadline is reached; timeout is not reported as an exception.

## Reactive input guidance

For large editor documents, debounce text input before updating the values passed to SvelteDiff. This keeps typing responsive and avoids recomputing intermediate states the reader never sees.

```typescript
let timer: ReturnType<typeof setTimeout>

function scheduleDiff(value: string) {
    clearTimeout(timer)
    timer = setTimeout(() => {
        modifiedText = value
    }, 200)
}
```

## Cleanup cost

`timing.cleanup` includes whichever cleanup pass was selected. Semantic cleanup generally does more readability work than efficiency cleanup. Measure with representative data instead of assuming the faster choice.

## Scope

The component performs character-level text diffing and renders the result. It does not virtualize large output, move computation to a worker, or expose incremental diff computation. For extremely large documents, consider preprocessing by line or using a specialized editor diff engine.

Use the [timing example](/examples/timing) to edit inputs and watch the callback values update.
