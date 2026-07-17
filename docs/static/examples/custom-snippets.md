<!-- Source: https://diff.svelte.page/examples/custom-snippets -->

# Custom Snippets

> Replace SvelteDiff fallback spans with semantic del and ins elements using Svelte 5 snippets.

**Source:** [https://diff.svelte.page/examples/custom-snippets](https://diff.svelte.page/examples/custom-snippets)

**Markdown mirror:** [https://diff.svelte.page/examples/custom-snippets.md](https://diff.svelte.page/examples/custom-snippets.md)

---

This mirror preserves the prose, implementation notes, and runnable Svelte source behind the live example page.

## FIG-001: custom snippets.

Direct Svelte 5 snippets replace the fallback renderer one segment at a time. Own the markup you need while every omitted segment keeps its default behavior.

**Metadata:** tag: `RENDERING` | markup: `del + ins` | precedence: `child first`

### Source

#### CustomSnippets.svelte

Source file: [src/lib/examples/custom-snippets/demos/CustomSnippets.svelte](https://github.com/humanspeak/svelte-diff/blob/main/docs/src/lib/examples/custom-snippets/demos/CustomSnippets.svelte)

```svelte
<script lang="ts">
    import SvelteDiff from '@humanspeak/svelte-diff'

    const originalText = 'The status is pending. Owner: Sam.'
    const modifiedText = 'The status is approved. Owner: Jordan.'
</script>

<div class="demo diff-output">
    <SvelteDiff {originalText} {modifiedText} cleanupSemantic>
        {#snippet remove(text: string)}
            <del><span aria-hidden="true">−</span>{text}</del>
        {/snippet}
        {#snippet insert(text: string)}
            <ins><span aria-hidden="true">+</span>{text}</ins>
        {/snippet}
        {#snippet equal(text: string)}
            <span class="equal">{text}</span>
        {/snippet}
    </SvelteDiff>
</div>

<style>
    .demo { padding: 2rem; min-height: 12rem; display: grid; place-items: center; font-size: 1.05rem; }
    del, ins { display: inline-flex; gap: 0.25rem; align-items: baseline; padding: 0.12rem 0.35rem; text-decoration: none; border: 1px solid currentColor; margin-inline: 0.12rem; }
    del { color: #dc2626; background: color-mix(in oklab, #ef4444 12%, transparent); }
    ins { color: #16a34a; background: color-mix(in oklab, #22c55e 12%, transparent); }
    del span, ins span { font-weight: 800; }
    .equal { opacity: 0.78; }
</style>
```
