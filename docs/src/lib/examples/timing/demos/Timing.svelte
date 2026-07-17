<script lang="ts">
    import SvelteDiff, { type SvelteDiffTiming, type SvelteDiffTuple } from '@humanspeak/svelte-diff'

    let size = $state(100)
    let timing = $state<SvelteDiffTiming>({ main: 0, cleanup: 0, total: 0 })
    let segmentCount = $state(0)
    const base = $derived(Array.from({ length: size }, (_, i) => `line ${i + 1}: stable value`).join('\n'))
    const changed = $derived(base.replaceAll('stable value', 'updated value').replace('line 50', 'line fifty'))
    const processed = (next: SvelteDiffTiming, diffs: SvelteDiffTuple[]) => {
        timing = next
        segmentCount = diffs.length
    }
</script>

<div class="demo">
    <label>lines <input type="range" min="10" max="500" step="10" bind:value={size} /> <b>{size}</b></label>
    <div class="stats">
        <div><span>main</span><strong>{timing.main.toFixed(3)} ms</strong></div>
        <div><span>cleanup</span><strong>{timing.cleanup.toFixed(3)} ms</strong></div>
        <div><span>total</span><strong>{timing.total.toFixed(3)} ms</strong></div>
        <div><span>segments</span><strong>{segmentCount}</strong></div>
    </div>
    <div class="preview diff-output"><SvelteDiff originalText={base} modifiedText={changed} cleanupSemantic onProcessing={processed} rendererClasses={{ remove: 'diff-remove', insert: 'diff-insert', equal: 'diff-equal' }} /></div>
</div>

<style>
    label { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; border-bottom: 1px solid var(--brut-rule); font: 0.7rem var(--font-mono); text-transform: uppercase; }
    input { flex: 1; accent-color: var(--color-brand-500); }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); border-bottom: 1px solid var(--brut-rule); }
    .stats div { display: grid; gap: 0.35rem; padding: 1rem; }
    .stats div + div { border-left: 1px solid var(--brut-rule); }
    span { font: 0.6rem var(--font-mono); text-transform: uppercase; color: var(--brut-muted); }
    strong { font: 0.9rem var(--font-mono); color: var(--color-brand-500); }
    .preview { max-height: 13rem; overflow: auto; padding: 1rem; font-size: 0.7rem; }
    @media (max-width: 700px) { .stats { grid-template-columns: 1fr 1fr; } }
</style>
