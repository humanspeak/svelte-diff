<!-- Source: https://diff.svelte.page/examples/basic-diff -->

# Basic Diff

> Render a readable Svelte 5 text diff with two strings, semantic cleanup, and class-based styling.

**Source:** [https://diff.svelte.page/examples/basic-diff](https://diff.svelte.page/examples/basic-diff)

**Markdown mirror:** [https://diff.svelte.page/examples/basic-diff.md](https://diff.svelte.page/examples/basic-diff.md)

---

This mirror preserves the prose, implementation notes, and runnable Svelte source behind the live example page.

## FIG-001: basic diff.

Start with two plain strings and let `SvelteDiff` own the comparison. Semantic cleanup makes the result readable while stable classes provide the styling hooks.

**Metadata:** tag: `START` | cleanup: `semantic` | rendering: `classes`

### Source

#### BasicDiff.svelte

Source file: [src/lib/examples/basic-diff/demos/BasicDiff.svelte](https://github.com/humanspeak/svelte-diff/blob/main/docs/src/lib/examples/basic-diff/demos/BasicDiff.svelte)

```svelte
<script lang="ts">
    import SvelteDiff from '@humanspeak/svelte-diff'

    const originalText = `The release is small, careful, and ready for Tuesday.
Documentation will follow after launch.`
    const modifiedText = `The release is focused, polished, and ready for Thursday.
Documentation ships with the launch.`
</script>

<div class="demo">
    <div class="legend" aria-label="Diff legend">
        <span><i class="removed"></i> removed</span>
        <span><i class="inserted"></i> inserted</span>
    </div>
    <div class="diff-output output">
        <SvelteDiff
            {originalText}
            {modifiedText}
            cleanupSemantic
            rendererClasses={{
                remove: 'diff-remove',
                insert: 'diff-insert',
                equal: 'diff-equal'
            }}
        />
    </div>
</div>

<style>
    .demo { padding: 2rem; }
    .output { border: 1px solid var(--brut-rule); padding: 1.5rem; min-height: 11rem; }
    .legend { display: flex; gap: 1.5rem; margin-bottom: 1rem; font: 0.7rem var(--font-mono); text-transform: uppercase; letter-spacing: 0.08em; }
    .legend span { display: inline-flex; align-items: center; gap: 0.45rem; }
    .legend i { width: 0.8rem; height: 0.8rem; border: 1px solid var(--brut-rule); }
    .legend .removed { background: color-mix(in oklab, #ef4444 30%, transparent); }
    .legend .inserted { background: color-mix(in oklab, #22c55e 30%, transparent); }
</style>
```
