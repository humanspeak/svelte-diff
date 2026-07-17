<!-- Source: https://diff.svelte.page/examples/expected-patterns -->

# Expected Patterns

> Match dynamic versions, dates, and names as expected values and inspect captured groups live.

**Source:** [https://diff.svelte.page/examples/expected-patterns](https://diff.svelte.page/examples/expected-patterns)

**Markdown mirror:** [https://diff.svelte.page/examples/expected-patterns.md](https://diff.svelte.page/examples/expected-patterns.md)

---

This mirror preserves the prose, implementation notes, and runnable Svelte source behind the live example page.

## FIG-001: expected values.

Named patterns distinguish intentional dynamic values from genuine edits. Successful matches get expected styling and structured captures; invalid formats remain visible as normal diffs.

**Metadata:** tag: `PATTERNS` | groups: `3 named` | callback: `captures`

### Source

#### ExpectedPatterns.svelte

Source file: [src/lib/examples/expected-patterns/demos/ExpectedPatterns.svelte](https://github.com/humanspeak/svelte-diff/blob/main/docs/src/lib/examples/expected-patterns/demos/ExpectedPatterns.svelte)

```svelte
<script lang="ts">
    import SvelteDiff from '@humanspeak/svelte-diff'

    const originalText = 'Release (?<version>v\\d+\\.\\d+\\.\\d+)\nBuilt on (?<date>\\d{4}-\\d{2}-\\d{2}) by (?<team>.+)'
    let modifiedText = $state('Release v2.4.1\nBuilt on 2026-07-17 by Humanspeak')
    let captures = $state<Record<string, string>>({})
</script>

<div class="demo">
    <label>actual text<textarea bind:value={modifiedText} spellcheck="false"></textarea></label>
    <div class="grid">
        <div>
            <div class="label">rendered diff</div>
            <div class="diff-output output">
                <SvelteDiff
                    {originalText}
                    {modifiedText}
                    cleanupSemantic
                    onProcessing={(_timing, _diffs, next) => (captures = next ?? {})}
                    rendererClasses={{
                        remove: 'diff-remove',
                        insert: 'diff-insert',
                        equal: 'diff-equal',
                        expected: 'diff-expected'
                    }}
                />
            </div>
        </div>
        <div>
            <div class="label">captures</div>
            <pre>{JSON.stringify(captures, null, 2)}</pre>
        </div>
    </div>
</div>

<style>
    label { display: grid; gap: 0.5rem; padding: 1rem; border-bottom: 1px solid var(--brut-rule); font: 0.65rem var(--font-mono); text-transform: uppercase; }
    textarea { min-height: 6rem; resize: vertical; border: 1px solid var(--brut-rule); background: var(--brut-bg); color: var(--brut-ink); padding: 0.8rem; font: 0.8rem/1.5 var(--font-mono); text-transform: none; }
    .grid { display: grid; grid-template-columns: 2fr 1fr; }
    .grid > div + div { border-left: 1px solid var(--brut-rule); }
    .label { border-bottom: 1px solid var(--brut-rule); padding: 0.55rem 1rem; font: 0.65rem var(--font-mono); text-transform: uppercase; }
    .output, pre { min-height: 9rem; padding: 1.25rem; margin: 0; }
    pre { font: 0.75rem/1.6 var(--font-mono); color: var(--color-brand-500); overflow: auto; }
    @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } .grid > div + div { border-left: 0; border-top: 1px solid var(--brut-rule); } }
</style>
```
