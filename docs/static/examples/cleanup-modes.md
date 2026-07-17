<!-- Source: https://diff.svelte.page/examples/cleanup-modes -->

# Cleanup Modes

> Compare raw, efficiency-cleaned, and semantic diff output for the same before and after strings.

**Source:** [https://diff.svelte.page/examples/cleanup-modes](https://diff.svelte.page/examples/cleanup-modes)

**Markdown mirror:** [https://diff.svelte.page/examples/cleanup-modes.md](https://diff.svelte.page/examples/cleanup-modes.md)

---

This mirror preserves the prose, implementation notes, and runnable Svelte source behind the live example page.

## FIG-001: cleanup modes.

One edit can have several valid segmentations. Compare raw, efficiency-cleaned, and semantic output for the same input before choosing a default.

**Metadata:** tag: `READABILITY` | modes: `3` | input: `identical`

### Source

#### CleanupModes.svelte

Source file: [src/lib/examples/cleanup-modes/demos/CleanupModes.svelte](https://github.com/humanspeak/svelte-diff/blob/main/docs/src/lib/examples/cleanup-modes/demos/CleanupModes.svelte)

```svelte
<script lang="ts">
    import SvelteDiff from '@humanspeak/svelte-diff'

    const originalText = 'The quick brown fox jumps over the lazy dog.'
    const modifiedText = 'The quick red fox leaped over a very lazy dog.'
</script>

<div class="modes">
    <section><h3>raw / no cleanup</h3><div class="diff-output"><SvelteDiff {originalText} {modifiedText} cleanupEfficiency={0} rendererClasses={{ remove: 'diff-remove', insert: 'diff-insert', equal: 'diff-equal' }} /></div></section>
    <section><h3>efficiency / cost 4</h3><div class="diff-output"><SvelteDiff {originalText} {modifiedText} cleanupEfficiency={4} rendererClasses={{ remove: 'diff-remove', insert: 'diff-insert', equal: 'diff-equal' }} /></div></section>
    <section><h3>semantic / readable</h3><div class="diff-output"><SvelteDiff {originalText} {modifiedText} cleanupSemantic rendererClasses={{ remove: 'diff-remove', insert: 'diff-insert', equal: 'diff-equal' }} /></div></section>
</div>

<style>
    .modes { display: grid; grid-template-columns: repeat(3, 1fr); }
    section + section { border-left: 1px solid var(--brut-rule); }
    h3 { margin: 0; padding: 0.65rem 1rem; border-bottom: 1px solid var(--brut-rule); font: 0.65rem var(--font-mono); text-transform: uppercase; letter-spacing: 0.08em; }
    section div { padding: 1.25rem; min-height: 12rem; }
    @media (max-width: 800px) { .modes { grid-template-columns: 1fr; } section + section { border-left: 0; border-top: 1px solid var(--brut-rule); } }
</style>
```
