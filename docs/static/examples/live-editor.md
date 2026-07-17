<!-- Source: https://diff.svelte.page/examples/live-editor -->

# Live Editor

> Edit before and after text and watch SvelteDiff recompute semantic output reactively.

**Source:** [https://diff.svelte.page/examples/live-editor](https://diff.svelte.page/examples/live-editor)

**Markdown mirror:** [https://diff.svelte.page/examples/live-editor.md](https://diff.svelte.page/examples/live-editor.md)

---

This mirror preserves the prose, implementation notes, and runnable Svelte source behind the live example page.

## FIG-001: live editor.

Two rune-backed textareas feed `SvelteDiff` directly. Edit either document and normal Svelte reactivity produces the next comparison without an imperative recompute call.

**Metadata:** tag: `REACTIVE` | inputs: `reactive` | cleanup: `semantic`

### Source

#### LiveEditor.svelte

Source file: [src/lib/examples/live-editor/demos/LiveEditor.svelte](https://github.com/humanspeak/svelte-diff/blob/main/docs/src/lib/examples/live-editor/demos/LiveEditor.svelte)

```svelte
<script lang="ts">
    import SvelteDiff from '@humanspeak/svelte-diff'

    const initialOriginal = 'A focused library should do one thing well.\nThe API should stay small.'
    const initialModified = 'A great library should do one thing exceptionally well.\nThe public API should stay small.'
    let originalText = $state(initialOriginal)
    let modifiedText = $state(initialModified)

    const reset = () => {
        originalText = initialOriginal
        modifiedText = initialModified
    }
</script>

<div class="editor">
    <div class="inputs">
        <label>before<textarea bind:value={originalText} spellcheck="false"></textarea></label>
        <label>after<textarea bind:value={modifiedText} spellcheck="false"></textarea></label>
    </div>
    <div class="result-head"><span>output / semantic</span><button type="button" onclick={reset}>↻ reset</button></div>
    <div class="diff-output result">
        <SvelteDiff
            {originalText}
            {modifiedText}
            cleanupSemantic
            rendererClasses={{ remove: 'diff-remove', insert: 'diff-insert', equal: 'diff-equal' }}
        />
    </div>
</div>

<style>
    .inputs { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid var(--brut-rule); }
    label { display: grid; gap: 0.5rem; padding: 1rem; font: 0.65rem var(--font-mono); text-transform: uppercase; letter-spacing: 0.08em; }
    label + label { border-left: 1px solid var(--brut-rule); }
    textarea { min-height: 10rem; resize: vertical; border: 1px solid var(--brut-rule); background: var(--brut-bg); color: var(--brut-ink); padding: 0.85rem; font: 0.8rem/1.6 var(--font-mono); text-transform: none; letter-spacing: 0; }
    .result-head { display: flex; justify-content: space-between; align-items: center; padding: 0.55rem 1rem; border-bottom: 1px solid var(--brut-rule); font: 0.65rem var(--font-mono); text-transform: uppercase; }
    button { border: 1px solid var(--brut-rule); padding: 0.3rem 0.55rem; text-transform: uppercase; cursor: pointer; }
    .result { min-height: 9rem; padding: 1.5rem; }
    @media (max-width: 700px) { .inputs { grid-template-columns: 1fr; } label + label { border-left: 0; border-top: 1px solid var(--brut-rule); } }
</style>
```
