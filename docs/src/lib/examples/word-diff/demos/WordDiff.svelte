<script lang="ts">
    import SvelteDiff from '@humanspeak/svelte-diff'

    const initialOriginal = 'The cat sleeps.'
    const initialModified = 'The car sleeps.'
    let originalText = $state(initialOriginal)
    let modifiedText = $state(initialModified)
    const reset = () => {
        originalText = initialOriginal
        modifiedText = initialModified
    }
</script>

<div class="editor">
    <div class="inputs">
        <label>Before<textarea bind:value={originalText} spellcheck="false"></textarea></label>
        <label>After<textarea bind:value={modifiedText} spellcheck="false"></textarea></label>
    </div>
    <div class="controls"><button type="button" onclick={reset}>Reset</button></div>
    <p>Word tokens preserve spaces, tabs, punctuation, and case. Apostrophes and hyphens separate word runs. Unicode letters, marks, numbers, and underscores form runs; continuous CJK text is one token and emoji grapheme clusters are not guaranteed atomic. Both cleanup props are ignored in word mode. The raw character pane disables cleanup.</p>
    <div class="panes">
        <section>
            <h2>Raw character mode</h2>
            <!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable results must be keyboard focusable.) -->
            <div class="diff-output" role="region" aria-label="Raw character result" tabindex="0">
                <SvelteDiff {originalText} {modifiedText} cleanupEfficiency={0}>
                    {#snippet remove(text)}<del class="diff-remove">{text}</del>{/snippet}
                    {#snippet insert(text)}<ins class="diff-insert">{text}</ins>{/snippet}
                </SvelteDiff>
            </div>
            <footer>Character · cleanup off</footer>
        </section>
        <section>
            <h2>Word mode</h2>
            <!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable results must be keyboard focusable.) -->
            <div class="diff-output" role="region" aria-label="Word result" tabindex="0">
                <SvelteDiff {originalText} {modifiedText} diffMode="word">
                    {#snippet remove(text)}<del class="diff-remove">{text}</del>{/snippet}
                    {#snippet insert(text)}<ins class="diff-insert">{text}</ins>{/snippet}
                </SvelteDiff>
            </div>
            <footer>Word · cleanup skipped</footer>
        </section>
    </div>
</div>

<style>
    .editor { min-width: 0; }
    .inputs, .panes { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
    label { display: grid; gap: 0.5rem; padding: 1rem; min-width: 0; font: 0.75rem var(--font-mono); }
    textarea { width: 100%; box-sizing: border-box; min-height: 8rem; resize: vertical; border: 1px solid var(--brut-rule); background: var(--brut-bg); color: var(--brut-ink); padding: 0.85rem; font: 0.8rem/1.6 var(--font-mono); }
    .controls { display: flex; flex-wrap: wrap; gap: 1rem; padding: 1rem; }
    button { border: 1px solid var(--brut-rule); padding: 0.4rem 0.7rem; background: var(--brut-bg); color: var(--brut-ink); cursor: pointer; }
    p { padding: 1rem; }
    section { display: grid; grid-template-rows: auto 1fr auto; min-width: 0; border: 1px solid var(--brut-rule); }
    h2, footer { padding: 0.75rem 1rem; margin: 0; font: 0.75rem var(--font-mono); }
    footer { border-top: 1px solid var(--brut-rule); }
    .diff-output { min-height: 8rem; max-height: 24rem; overflow: auto; overflow-wrap: anywhere; white-space: pre-wrap; padding: 1rem; }
    .diff-output:focus-visible { outline: 2px solid var(--brut-accent); outline-offset: -2px; }
    @media (max-width: 700px) { .inputs, .panes { grid-template-columns: minmax(0, 1fr); } }
</style>
